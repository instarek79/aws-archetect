from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Resource, User
from app.schemas import ResourceCreate, ResourceUpdate, ResourceResponse
from app.routers.auth import get_current_user
from app.utils.arn_parser import parse_arn, extract_resource_info_from_arn, validate_arn

router = APIRouter(prefix="/resources", tags=["resources"])

# Linked/metadata resources - not counted as main resources but shown separately
LINKED_RESOURCE_TYPES = {
    'config',                    # AWS Config rules - monitoring/compliance
    'security_group_rule',       # Rules belong to security groups
    'rds_snapshot',              # Backups for RDS
    'rds_backup',                # Auto-backups for RDS
    'aurora_snapshot',           # Backups for Aurora
    'snapshot',                  # EBS snapshots
    'rds_parameter_group',       # RDS config
    'rds_option_group',          # RDS config
    'aurora_parameter_group',    # Aurora config
    'db_subnet_group',           # RDS networking config
    'dhcp_options',              # VPC config
    'resource-explorer-2',       # AWS internal indexing
    'flow_log',                  # VPC logging config
    'ipam',                      # IP address management
    'ipam_scope',                # IPAM metadata
    'ipam_discovery',            # IPAM metadata
    'ipam_discovery_assoc',      # IPAM metadata
    'network_insights',          # Analysis tools
    'route53',                   # Hosted zones - shown in Navigator
    'route53_record',            # DNS records - shown in Navigator
}


# ARN Parse Request Schema
class ARNParseRequest(BaseModel):
    arn: str


class ARNParseResponse(BaseModel):
    valid: bool
    info: dict
    message: str


@router.get("/stats")
def get_resource_stats(
    db: Session = Depends(get_db)
):
    """Get resource statistics for dashboard - separates main resources from linked/metadata"""
    from sqlalchemy import func, not_
    
    # Count by type (all resources) - no user filter
    type_counts = db.query(
        Resource.type, func.count(Resource.id)
    ).group_by(Resource.type).all()
    
    # Separate main resources from linked resources
    main_types = {}
    linked_types = {}
    main_total = 0
    linked_total = 0
    
    for t, c in type_counts:
        if t in LINKED_RESOURCE_TYPES:
            linked_types[t] = c
            linked_total += c
        else:
            main_types[t] = c
            main_total += c
    
    # Count by region (main resources only) - no user filter
    region_counts = db.query(
        Resource.region, func.count(Resource.id)
    ).filter(
        not_(Resource.type.in_(LINKED_RESOURCE_TYPES))
    ).group_by(Resource.region).all()
    by_region = {r: c for r, c in region_counts if r}
    
    # Count by status (main resources only) - no user filter
    status_counts = db.query(
        Resource.status, func.count(Resource.id)
    ).filter(
        not_(Resource.type.in_(LINKED_RESOURCE_TYPES))
    ).group_by(Resource.status).all()
    by_status = {s: c for s, c in status_counts if s}
    
    # Network resources (VPCs, Subnets, Security Groups) - no user filter
    vpc_count = db.query(func.count(func.distinct(Resource.vpc_id))).filter(
        Resource.vpc_id.isnot(None)
    ).scalar()
    
    subnet_count = db.query(func.count(Resource.id)).filter(
        Resource.type == 'subnet'
    ).scalar()
    
    security_group_count = db.query(func.count(Resource.id)).filter(
        Resource.type == 'security_group'
    ).scalar()
    
    # Count unique availability zones - no user filter
    az_count = db.query(func.count(func.distinct(Resource.availability_zone))).filter(
        Resource.availability_zone.isnot(None)
    ).scalar()
    
    # Count by account (main resources only) - no user filter
    account_counts = db.query(
        Resource.account_id, func.count(Resource.id)
    ).filter(
        Resource.account_id.isnot(None),
        Resource.account_id != '',
        not_(Resource.type.in_(LINKED_RESOURCE_TYPES))
    ).group_by(Resource.account_id).all()
    by_account = {a: c for a, c in account_counts if a}
    
    # Count by environment (main resources only) - no user filter
    env_counts = db.query(
        Resource.environment, func.count(Resource.id)
    ).filter(
        Resource.environment.isnot(None),
        Resource.environment != '',
        not_(Resource.type.in_(LINKED_RESOURCE_TYPES))
    ).group_by(Resource.environment).all()
    by_environment = {e: c for e, c in env_counts if e}
    
    return {
        "total": main_total,
        "total_all": main_total + linked_total,
        "by_type": main_types,
        "by_region": by_region,
        "by_status": by_status,
        "by_account": by_account,
        "by_environment": by_environment,
        "network": {
            "vpcs": vpc_count,
            "subnets": subnet_count,
            "security_groups": security_group_count,
            "availability_zones": az_count
        },
        "type_count": len(main_types),
        "region_count": len(by_region),
        "linked": {
            "total": linked_total,
            "by_type": linked_types
        }
    }


@router.get("/", response_model=List[ResourceResponse])
def get_resources(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all resources - no authentication required"""
    resources = db.query(Resource).offset(skip).limit(limit).all()
    return resources


@router.post("/parse-arn", response_model=ARNParseResponse)
def parse_resource_arn(
    request: ARNParseRequest,
    current_user: User = Depends(get_current_user)
):
    """Parse AWS ARN and extract resource information"""
    arn = request.arn.strip()
    
    if not validate_arn(arn):
        return ARNParseResponse(
            valid=False,
            info={},
            message="Invalid ARN format"
        )
    
    try:
        info = extract_resource_info_from_arn(arn)
        
        if not info:
            return ARNParseResponse(
                valid=False,
                info={},
                message="Unable to parse ARN"
            )
        
        return ARNParseResponse(
            valid=True,
            info=info,
            message="ARN parsed successfully"
        )
    except Exception as e:
        return ARNParseResponse(
            valid=False,
            info={},
            message=f"Error parsing ARN: {str(e)}"
        )


@router.get("/url-flows")
def get_url_flows(
    db: Session = Depends(get_db)
):
    """
    Build URL flow chains from individual route53_record resources.
    Each DNS record (A, CNAME, ALIAS) is matched to ALB/CloudFront/EC2
    across ALL accounts by comparing record values to resource dns_name fields.
    Also includes manually linked resources via relationships.
    """
    import json
    
    def get_props(r):
        if not r.type_specific_properties:
            return {}
        try:
            return json.loads(r.type_specific_properties) if isinstance(r.type_specific_properties, str) else r.type_specific_properties
        except:
            return {}
    
    def resource_to_dict(r):
        return {
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "resource_id": r.resource_id,
            "account_id": r.account_id,
            "region": r.region,
            "status": r.status,
            "vpc_id": r.vpc_id,
            "subnet_id": r.subnet_id,
            "private_ip": r.private_ip,
            "public_ip": r.public_ip,
            "dns_name": r.dns_name,
            "instance_type": r.instance_type,
            "environment": r.environment,
            "type_specific_properties": get_props(r),
            "tags": r.tags if r.tags else {},
        }
    
    # Get all route53_record resources (individual DNS records)
    dns_records = db.query(Resource).filter(Resource.type == 'route53_record').all()
    
    # Get ALL resources across all accounts for matching
    all_resources = db.query(Resource).filter(Resource.type != 'route53_record', Resource.type != 'route53').all()
    
    # Build lookup indexes for matching DNS record values to resources
    # Index by dns_name (lowercase) for ALBs, CloudFront, etc.
    dns_name_index = {}  # dns_name -> resource
    public_ip_index = {}  # public_ip -> resource
    resources_by_id = {}
    resources_by_vpc = {}  # vpc_id -> [resources]
    
    for r in all_resources:
        resources_by_id[r.id] = r
        # Index by dns_name
        if r.dns_name:
            dns_name_index[r.dns_name.lower().rstrip('.')] = r
        # Index by type_specific_properties dns_name
        props = get_props(r)
        if props.get('dns_name'):
            dns_name_index[props['dns_name'].lower().rstrip('.')] = r
        if props.get('domain_name'):
            dns_name_index[props['domain_name'].lower().rstrip('.')] = r
        # Index by public IP
        if r.public_ip:
            public_ip_index[r.public_ip] = r
        if props.get('public_ip'):
            public_ip_index[props['public_ip']] = r
        # Index by VPC
        if r.vpc_id:
            resources_by_vpc.setdefault(r.vpc_id, []).append(r)
    
    # Get all relationships for manual links
    from app.models import ResourceRelationship
    relationships = db.query(ResourceRelationship).all()
    outgoing_map = {}
    incoming_map = {}
    for rel in relationships:
        outgoing_map.setdefault(rel.source_resource_id, []).append(rel.target_resource_id)
        incoming_map.setdefault(rel.target_resource_id, []).append(rel.source_resource_id)
    
    def find_linked_resources(resource_id):
        """Find all resources linked via relationships"""
        linked = []
        seen = set()
        for tid in outgoing_map.get(resource_id, []):
            r = resources_by_id.get(tid)
            if r and r.id not in seen:
                linked.append(r)
                seen.add(r.id)
        for sid in incoming_map.get(resource_id, []):
            r = resources_by_id.get(sid)
            if r and r.id not in seen:
                linked.append(r)
                seen.add(r.id)
        return linked
    
    def match_record_to_resources(record):
        """Match a DNS record's values to actual resources across all accounts"""
        props = get_props(record)
        record_values = props.get('record_values', [])
        alias_target = props.get('alias_target')
        
        matched = []
        seen_ids = set()
        
        # Check alias target first (most reliable)
        if alias_target and alias_target.get('dns_name'):
            alias_dns = alias_target['dns_name'].lower().rstrip('.')
            # Direct match
            if alias_dns in dns_name_index:
                r = dns_name_index[alias_dns]
                if r.id not in seen_ids:
                    matched.append(r)
                    seen_ids.add(r.id)
            else:
                # Partial match - ALB dns names can be long
                for key, r in dns_name_index.items():
                    if alias_dns in key or key in alias_dns:
                        if r.id not in seen_ids:
                            matched.append(r)
                            seen_ids.add(r.id)
        
        # Check record values (IPs, CNAMEs)
        for val in record_values:
            val_clean = val.lower().rstrip('.')
            # Direct DNS name match
            if val_clean in dns_name_index:
                r = dns_name_index[val_clean]
                if r.id not in seen_ids:
                    matched.append(r)
                    seen_ids.add(r.id)
            # IP match
            elif val in public_ip_index:
                r = public_ip_index[val]
                if r.id not in seen_ids:
                    matched.append(r)
                    seen_ids.add(r.id)
            else:
                # Partial DNS match
                for key, r in dns_name_index.items():
                    if val_clean in key or key in val_clean:
                        if r.id not in seen_ids:
                            matched.append(r)
                            seen_ids.add(r.id)
        
        # Also include manually linked resources
        for r in find_linked_resources(record.id):
            if r.id not in seen_ids:
                matched.append(r)
                seen_ids.add(r.id)
        
        return matched
    
    def find_downstream(resource, seen_ids):
        """Given a matched resource (ALB), find its downstream EC2, RDS, etc."""
        downstream = []
        # Via relationships
        for r in find_linked_resources(resource.id):
            if r.id not in seen_ids:
                downstream.append(r)
                seen_ids.add(r.id)
        # Via same VPC for ALBs
        if resource.vpc_id and resource.type in ('elb', 'alb', 'nlb', 'elasticloadbalancing'):
            for r in resources_by_vpc.get(resource.vpc_id, []):
                if r.id not in seen_ids and r.type in ('ec2', 'instance', 'rds', 'aurora', 'dynamodb', 'elasticache', 'ecs', 'eks'):
                    downstream.append(r)
                    seen_ids.add(r.id)
        return downstream
    
    url_flows = []
    
    for record in dns_records:
        props = get_props(record)
        record_type = props.get('record_type', '')
        record_values = props.get('record_values', [])
        zone_name = props.get('zone_name', '')
        
        # Auto-match record values to resources
        direct_matches = match_record_to_resources(record)
        
        # Categorize matched resources
        albs = []
        cloudfront_list = []
        ec2_list = []
        db_list = []
        s3_list = []
        pipeline_list = []
        other_list = []
        seen_ids = {record.id}
        
        for r in direct_matches:
            seen_ids.add(r.id)
            if r.type in ('elb', 'alb', 'nlb', 'elasticloadbalancing'):
                albs.append(r)
            elif r.type == 'cloudfront':
                cloudfront_list.append(r)
            elif r.type in ('ec2', 'instance'):
                ec2_list.append(r)
            elif r.type in ('rds', 'aurora', 'dynamodb', 'elasticache'):
                db_list.append(r)
            elif r.type == 's3':
                s3_list.append(r)
            elif r.type in ('codepipeline', 'codebuild', 'codecommit', 'codedeploy'):
                pipeline_list.append(r)
            else:
                other_list.append(r)
        
        # For each ALB, find downstream resources (EC2, RDS, etc.)
        for alb in albs:
            downstream = find_downstream(alb, seen_ids)
            for r in downstream:
                if r.type in ('ec2', 'instance'):
                    ec2_list.append(r)
                elif r.type in ('rds', 'aurora', 'dynamodb', 'elasticache'):
                    db_list.append(r)
                elif r.type == 's3':
                    s3_list.append(r)
                elif r.type in ('codepipeline', 'codebuild', 'codecommit', 'codedeploy'):
                    pipeline_list.append(r)
                else:
                    other_list.append(r)
        
        # For each EC2, find downstream databases
        for ec2 in list(ec2_list):
            downstream = find_downstream(ec2, seen_ids)
            for r in downstream:
                if r.type in ('rds', 'aurora', 'dynamodb', 'elasticache'):
                    db_list.append(r)
                elif r.type == 's3':
                    s3_list.append(r)
        
        url_flows.append({
            "url": record.name,
            "record_id": record.id,
            "record_type": record_type,
            "record_values": record_values,
            "zone_name": zone_name,
            "account_id": record.account_id,
            "record": resource_to_dict(record),
            "albs": [resource_to_dict(r) for r in albs],
            "cloudfront": [resource_to_dict(r) for r in cloudfront_list],
            "ec2_instances": [resource_to_dict(r) for r in ec2_list],
            "databases": [resource_to_dict(r) for r in db_list],
            "s3_buckets": [resource_to_dict(r) for r in s3_list],
            "pipelines": [resource_to_dict(r) for r in pipeline_list],
            "other": [resource_to_dict(r) for r in other_list],
            "has_connections": len(direct_matches) > 0,
        })
    
    # Sort: connected first, then alphabetically
    url_flows.sort(key=lambda f: (not f['has_connections'], f['url']))
    
    return url_flows


class URLLinkRequest(BaseModel):
    record_id: int
    target_resource_id: int
    label: str = "manual_dns_link"


@router.post("/url-link")
def link_url_to_resource(
    request: URLLinkRequest,
    db: Session = Depends(get_db)
):
    """Manually link a Route53 DNS record to any resource"""
    from app.models import ResourceRelationship
    
    record = db.query(Resource).filter(Resource.id == request.record_id).first()
    target = db.query(Resource).filter(Resource.id == request.target_resource_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="DNS record not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target resource not found")
    
    # Check if link already exists
    existing = db.query(ResourceRelationship).filter(
        ResourceRelationship.source_resource_id == request.record_id,
        ResourceRelationship.target_resource_id == request.target_resource_id
    ).first()
    
    if existing:
        return {"message": "Link already exists", "relationship_id": existing.id}
    
    rel = ResourceRelationship(
        source_resource_id=request.record_id,
        target_resource_id=request.target_resource_id,
        relationship_type="routes_to",
        label=request.label,
        description=f"DNS record {record.name} routes to {target.name}",
        direction="unidirectional",
        auto_detected="no",
        confidence="high",
        status="active",
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    
    return {"message": "Link created", "relationship_id": rel.id}


@router.delete("/url-link/{relationship_id}")
def unlink_url_from_resource(
    relationship_id: int,
    db: Session = Depends(get_db)
):
    """Remove a manual link between a DNS record and a resource"""
    from app.models import ResourceRelationship
    
    rel = db.query(ResourceRelationship).filter(ResourceRelationship.id == relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    db.delete(rel)
    db.commit()
    return {"message": "Link removed"}


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific resource by ID"""
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.created_by == current_user.id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    return resource


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    resource_data: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new resource"""
    # Create resource with current user as creator
    db_resource = Resource(
        **resource_data.model_dump(),
        created_by=current_user.id
    )
    
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    
    return db_resource


@router.patch("/{resource_id}/vpc")
def update_resource_vpc(
    resource_id: int,
    vpc_id: str = None,
    subnet_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update resource VPC and subnet assignment"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    # Update VPC and subnet
    if vpc_id is not None:
        resource.vpc_id = vpc_id if vpc_id else None
    if subnet_id is not None:
        resource.subnet_id = subnet_id if subnet_id else None
    
    db.commit()
    db.refresh(resource)
    
    return {
        "message": "Resource VPC assignment updated",
        "resource_id": resource_id,
        "vpc_id": resource.vpc_id,
        "subnet_id": resource.subnet_id
    }


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    resource_data: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing resource"""
    # Get resource and verify ownership
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.created_by == current_user.id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    # Update only provided fields
    update_data = resource_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resource, field, value)
    
    db.commit()
    db.refresh(resource)
    
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a resource"""
    # Get resource and verify ownership
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.created_by == current_user.id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    db.delete(resource)
    db.commit()
    
    return None
