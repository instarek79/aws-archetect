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
    Build URL flow chains: Route53 URLs → ALB → EC2 instances
    with connected CloudFront, S3, Pipelines for each URL.
    Returns a list of URL entries with their full resource chain.
    """
    import json
    
    # Get all Route53 zones (management account ending 318)
    route53_zones = db.query(Resource).filter(Resource.type == 'route53').all()
    
    # Get all resources by type for matching
    all_resources = db.query(Resource).all()
    
    # Index resources by type
    resources_by_type = {}
    resources_by_id = {}
    resources_by_vpc = {}
    resources_by_account = {}
    
    for r in all_resources:
        resources_by_id[r.id] = r
        if r.type not in resources_by_type:
            resources_by_type[r.type] = []
        resources_by_type[r.type].append(r)
        if r.vpc_id:
            if r.vpc_id not in resources_by_vpc:
                resources_by_vpc[r.vpc_id] = []
            resources_by_vpc[r.vpc_id].append(r)
        if r.account_id:
            if r.account_id not in resources_by_account:
                resources_by_account[r.account_id] = []
            resources_by_account[r.account_id].append(r)
    
    # Get all relationships
    from app.models import ResourceRelationship
    relationships = db.query(ResourceRelationship).all()
    
    # Build relationship maps
    outgoing_map = {}  # source_id -> [target_ids]
    incoming_map = {}  # target_id -> [source_ids]
    rel_details = {}   # (source_id, target_id) -> relationship
    
    for rel in relationships:
        if rel.source_resource_id not in outgoing_map:
            outgoing_map[rel.source_resource_id] = []
        outgoing_map[rel.source_resource_id].append(rel.target_resource_id)
        
        if rel.target_resource_id not in incoming_map:
            incoming_map[rel.target_resource_id] = []
        incoming_map[rel.target_resource_id].append(rel.source_resource_id)
        
        rel_details[(rel.source_resource_id, rel.target_resource_id)] = rel
    
    def resource_to_dict(r):
        """Convert resource to a summary dict"""
        props = {}
        if r.type_specific_properties:
            try:
                props = json.loads(r.type_specific_properties) if isinstance(r.type_specific_properties, str) else r.type_specific_properties
            except:
                props = {}
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
            "type_specific_properties": props,
            "tags": r.tags if r.tags else {},
        }
    
    def find_connected_by_type(resource_id, target_types):
        """Find connected resources of specific types via relationships"""
        connected = []
        seen = set()
        
        # Check outgoing
        for tid in outgoing_map.get(resource_id, []):
            r = resources_by_id.get(tid)
            if r and r.type in target_types and r.id not in seen:
                connected.append(r)
                seen.add(r.id)
        
        # Check incoming
        for sid in incoming_map.get(resource_id, []):
            r = resources_by_id.get(sid)
            if r and r.type in target_types and r.id not in seen:
                connected.append(r)
                seen.add(r.id)
        
        return connected
    
    def find_by_vpc_and_type(vpc_id, target_types, exclude_ids=None):
        """Find resources in same VPC of specific types"""
        if not vpc_id:
            return []
        exclude = exclude_ids or set()
        results = []
        for r in resources_by_vpc.get(vpc_id, []):
            if r.type in target_types and r.id not in exclude:
                results.append(r)
        return results
    
    def find_by_account_and_type(account_id, target_types, exclude_ids=None):
        """Find resources in same account of specific types"""
        if not account_id:
            return []
        exclude = exclude_ids or set()
        results = []
        for r in resources_by_account.get(account_id, []):
            if r.type in target_types and r.id not in exclude:
                results.append(r)
        return results
    
    url_flows = []
    
    for zone in route53_zones:
        zone_props = {}
        if zone.type_specific_properties:
            try:
                zone_props = json.loads(zone.type_specific_properties) if isinstance(zone.type_specific_properties, str) else zone.type_specific_properties
            except:
                zone_props = {}
        
        zone_name = zone.name or ''
        zone_account = zone.account_id or ''
        
        # Find ALBs/ELBs connected to this Route53 zone
        alb_types = {'elb', 'alb', 'nlb', 'elasticloadbalancing'}
        connected_albs = find_connected_by_type(zone.id, alb_types)
        
        # Also find ALBs in same account whose DNS might match
        if not connected_albs:
            account_albs = find_by_account_and_type(zone_account, alb_types)
            connected_albs = account_albs
        
        # For each ALB, find connected EC2 instances
        for alb in connected_albs:
            ec2_types = {'ec2', 'instance'}
            connected_ec2s = find_connected_by_type(alb.id, ec2_types)
            
            # Also find EC2s in same VPC
            if not connected_ec2s and alb.vpc_id:
                connected_ec2s = find_by_vpc_and_type(alb.vpc_id, ec2_types)
            
            # Find CloudFront distributions connected to this zone or ALB
            cf_types = {'cloudfront'}
            connected_cf = find_connected_by_type(zone.id, cf_types)
            if not connected_cf:
                connected_cf = find_connected_by_type(alb.id, cf_types)
            if not connected_cf:
                connected_cf = find_by_account_and_type(zone_account, cf_types)
            
            # Find S3 buckets in same account
            s3_types = {'s3'}
            connected_s3 = find_by_account_and_type(zone_account, s3_types)
            
            # Find Pipelines in same account
            pipeline_types = {'codepipeline', 'codebuild', 'codecommit', 'codedeploy'}
            connected_pipelines = find_by_account_and_type(zone_account, pipeline_types)
            
            # Find RDS in same VPC as ALB
            rds_types = {'rds', 'aurora', 'dynamodb'}
            connected_rds = find_connected_by_type(alb.id, rds_types)
            if not connected_rds and alb.vpc_id:
                connected_rds = find_by_vpc_and_type(alb.vpc_id, rds_types)
            
            url_flows.append({
                "url": zone_name,
                "zone": resource_to_dict(zone),
                "alb": resource_to_dict(alb),
                "ec2_instances": [resource_to_dict(e) for e in connected_ec2s[:10]],
                "cloudfront": [resource_to_dict(cf) for cf in connected_cf[:5]],
                "s3_buckets": [resource_to_dict(s) for s in connected_s3[:10]],
                "pipelines": [resource_to_dict(p) for p in connected_pipelines[:10]],
                "databases": [resource_to_dict(d) for d in connected_rds[:5]],
                "account_id": zone_account,
            })
        
        # If no ALBs found, still create an entry for the zone
        if not connected_albs:
            # Find any resources in same account
            cf_types = {'cloudfront'}
            connected_cf = find_by_account_and_type(zone_account, cf_types)
            s3_types = {'s3'}
            connected_s3 = find_by_account_and_type(zone_account, s3_types)
            pipeline_types = {'codepipeline', 'codebuild', 'codecommit', 'codedeploy'}
            connected_pipelines = find_by_account_and_type(zone_account, pipeline_types)
            ec2_types = {'ec2', 'instance'}
            connected_ec2s = find_by_account_and_type(zone_account, ec2_types)
            rds_types = {'rds', 'aurora', 'dynamodb'}
            connected_rds = find_by_account_and_type(zone_account, rds_types)
            
            url_flows.append({
                "url": zone_name,
                "zone": resource_to_dict(zone),
                "alb": None,
                "ec2_instances": [resource_to_dict(e) for e in connected_ec2s[:10]],
                "cloudfront": [resource_to_dict(cf) for cf in connected_cf[:5]],
                "s3_buckets": [resource_to_dict(s) for s in connected_s3[:10]],
                "pipelines": [resource_to_dict(p) for p in connected_pipelines[:10]],
                "databases": [resource_to_dict(d) for d in connected_rds[:5]],
                "account_id": zone_account,
            })
    
    return url_flows


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
