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
    import ipaddress
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
    
    # Get ALL resources across all accounts for matching (exclude only route53 zones, keep everything else)
    all_resources = db.query(Resource).filter(Resource.type != 'route53').all()
    
    # Build lookup indexes for matching DNS record values to resources
    dns_name_index = {}  # dns_name -> resource (exact lowercase, stripped trailing dot)
    name_index = {}      # resource name (lowercase) -> resource
    public_ip_index = {}  # public_ip -> resource
    private_ip_index = {} # private_ip -> resource
    resources_by_id = {}
    resources_by_vpc = {}  # vpc_id -> [resources]
    elb_resources = []     # all load balancers for name-based matching
    
    for r in all_resources:
        resources_by_id[r.id] = r
        # Index by top-level dns_name
        if r.dns_name:
            dns_name_index[r.dns_name.lower().rstrip('.')] = r
        # Index by type_specific_properties dns_name / domain_name
        props = get_props(r)
        if props.get('dns_name'):
            dns_name_index[props['dns_name'].lower().rstrip('.')] = r
        if props.get('domain_name'):
            dns_name_index[props['domain_name'].lower().rstrip('.')] = r
        # Index by resource name (useful for ALB name matching)
        if r.name:
            name_index[r.name.lower()] = r
        # Index by public/private IP
        if r.public_ip:
            public_ip_index[r.public_ip] = r
        if r.private_ip:
            private_ip_index[r.private_ip] = r
        if props.get('public_ip'):
            public_ip_index[props['public_ip']] = r
        # Index by VPC
        if r.vpc_id:
            resources_by_vpc.setdefault(r.vpc_id, []).append(r)
        # Collect ELBs for name-based matching
        if r.type in ('elb', 'alb', 'nlb', 'elasticloadbalancing'):
            elb_resources.append(r)
    
    # Get all relationships for manual links
    from app.models import ResourceRelationship
    relationships = db.query(ResourceRelationship).all()
    outgoing_map = {}
    incoming_map = {}
    rel_lookup = {}  # (source_id, target_id) -> relationship
    for rel in relationships:
        outgoing_map.setdefault(rel.source_resource_id, []).append(rel.target_resource_id)
        incoming_map.setdefault(rel.target_resource_id, []).append(rel.source_resource_id)
        rel_lookup[(rel.source_resource_id, rel.target_resource_id)] = rel
        rel_lookup[(rel.target_resource_id, rel.source_resource_id)] = rel
    
    def get_neighbors(resource_id):
        """Get all resources connected via relationships (both directions)"""
        neighbors = []
        for tid in outgoing_map.get(resource_id, []):
            r = resources_by_id.get(tid)
            if r:
                neighbors.append(r)
        for sid in incoming_map.get(resource_id, []):
            r = resources_by_id.get(sid)
            if r:
                neighbors.append(r)
        return neighbors
    
    def try_match_elb_by_name(dns_value):
        """ALB dns_name format: name-hash.region.elb.amazonaws.com"""
        dns_lower = dns_value.lower().rstrip('.')
        results = []
        for elb in elb_resources:
            elb_name = (elb.name or '').lower()
            if not elb_name:
                continue
            if dns_lower.startswith(elb_name):
                results.append(elb)
                continue
            elb_dns = (elb.dns_name or '').lower().rstrip('.')
            if elb_dns and elb_dns == dns_lower:
                results.append(elb)
                continue
            elb_props_dns = (get_props(elb).get('dns_name', '') or '').lower().rstrip('.')
            if elb_props_dns and elb_props_dns == dns_lower:
                results.append(elb)
        return results

    def match_record_direct(record):
        """Match a DNS record's values to resources via dns_name/IP + ALB name matching"""
        props = get_props(record)
        record_values = props.get('record_values', [])
        alias_target = props.get('alias_target')
        matched = []
        seen_ids = set()
        
        def add(r):
            if r.id not in seen_ids:
                matched.append(r)
                seen_ids.add(r.id)
        
        # 1. Alias target (Route53 ALIAS records)
        if alias_target and alias_target.get('dns_name'):
            alias_dns = alias_target['dns_name'].lower().rstrip('.')
            if alias_dns in dns_name_index:
                add(dns_name_index[alias_dns])
            else:
                for elb in try_match_elb_by_name(alias_dns):
                    add(elb)
                if not matched:
                    for key, r in dns_name_index.items():
                        if alias_dns in key or key in alias_dns:
                            add(r)
        
        # 2. Record values (IPs, CNAMEs)
        for val in record_values:
            v = val.lower().rstrip('.')
            if v in dns_name_index:
                add(dns_name_index[v]); continue
            if val in public_ip_index:
                add(public_ip_index[val]); continue
            if val in private_ip_index:
                add(private_ip_index[val]); continue
            elb_hits = try_match_elb_by_name(v)
            if elb_hits:
                for e in elb_hits: add(e)
                continue
            for key, r in dns_name_index.items():
                if v in key or key in v:
                    add(r)
        
        # 3. Resources linked via relationships to this DNS record
        for r in get_neighbors(record.id):
            add(r)
        
        return matched

    def bfs_collect(start_ids, record_id):
        """BFS through ALL relationships starting from start_ids.
        Returns dict of resource_id -> resource for the entire reachable chain.
        Skips route53/route53_record types to avoid looping back.
        Also collects relationship IDs traversed."""
        visited = set(start_ids)
        visited.add(record_id)
        queue = list(start_ids)
        collected = {}
        collected_rel_ids = set()
        
        while queue:
            rid = queue.pop(0)
            r = resources_by_id.get(rid)
            if r:
                collected[rid] = r
            for neighbor in get_neighbors(rid):
                # Track the relationship
                rel = rel_lookup.get((rid, neighbor.id))
                if rel:
                    collected_rel_ids.add(rel.id)
                if neighbor.id not in visited and neighbor.type not in ('route53', 'route53_record'):
                    visited.add(neighbor.id)
                    queue.append(neighbor.id)
        
        return collected, collected_rel_ids

    # Resource type categorization
    ELB_TYPES = {'elb', 'alb', 'nlb', 'elasticloadbalancing'}
    EC2_TYPES = {'ec2', 'instance'}
    DB_TYPES = {'rds', 'aurora', 'dynamodb', 'elasticache'}
    CF_TYPES = {'cloudfront'}
    S3_TYPES = {'s3'}
    PIPE_TYPES = {'codepipeline', 'codebuild', 'codecommit', 'codedeploy'}
    
    def is_ip(value):
        try:
            ipaddress.ip_address(value)
            return True
        except Exception:
            return False

    def is_public_ip(value):
        try:
            ip = ipaddress.ip_address(value)
            return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved)
        except Exception:
            return False

    def is_certificate_validation_record(record_name, record_type, record_values):
        name = (record_name or '').lower()
        rtype = (record_type or '').upper()
        values = [str(v).lower() for v in (record_values or [])]

        if rtype != 'CNAME':
            return False
        if '_acme-challenge' in name:
            return True
        if any('acm-validations.aws' in v for v in values):
            return True
        return False

    url_flows = []
    
    for record in dns_records:
        props = get_props(record)
        record_type = props.get('record_type', '')
        record_values = props.get('record_values', [])
        zone_name = props.get('zone_name', '')
        
        # Step 1: Auto-match record values to direct targets (ALBs, CloudFront, etc.)
        direct_matches = match_record_direct(record)
        
        # Step 2: BFS through relationships from all direct matches to find full chain
        start_ids = {r.id for r in direct_matches}
        all_chain, chain_rel_ids = bfs_collect(start_ids, record.id)
        
        # Also collect relationships from the record itself
        for tid in outgoing_map.get(record.id, []):
            rel = rel_lookup.get((record.id, tid))
            if rel:
                chain_rel_ids.add(rel.id)
        for sid in incoming_map.get(record.id, []):
            rel = rel_lookup.get((record.id, sid))
            if rel:
                chain_rel_ids.add(rel.id)
        
        # Build connections list with relationship details
        connections = []
        for rel_id in chain_rel_ids:
            for rel in relationships:
                if rel.id == rel_id:
                    connections.append({
                        "id": rel.id,
                        "source_id": rel.source_resource_id,
                        "target_id": rel.target_resource_id,
                        "type": rel.relationship_type,
                        "label": rel.label or rel.relationship_type,
                        "auto_detected": rel.auto_detected,
                    })
                    break
        
        # Categorize all collected resources
        albs, cloudfront_list, ec2_list, db_list = [], [], [], []
        s3_list, pipeline_list, other_list = [], [], []
        
        for r in all_chain.values():
            if r.type in ELB_TYPES:
                albs.append(r)
            elif r.type in CF_TYPES:
                cloudfront_list.append(r)
            elif r.type in EC2_TYPES:
                ec2_list.append(r)
            elif r.type in DB_TYPES:
                db_list.append(r)
            elif r.type in S3_TYPES:
                s3_list.append(r)
            elif r.type in PIPE_TYPES:
                pipeline_list.append(r)
            else:
                other_list.append(r)
        
        total_connections = len(all_chain)

        ip_targets = [val for val in record_values if isinstance(val, str) and is_ip(val)]
        unmatched_public_ips = []
        matched_ip_targets = []
        for ip_val in ip_targets:
            if ip_val in public_ip_index or ip_val in private_ip_index:
                matched_ip_targets.append(ip_val)
            elif is_public_ip(ip_val):
                unmatched_public_ips.append(ip_val)

        is_cert_validation = is_certificate_validation_record(record.name, record_type, record_values)
        has_invalid_a_target = record_type in ('A', 'AAAA') and len(unmatched_public_ips) > 0
        is_provider_or_external_a_record = (
            record_type in ('A', 'AAAA') and
            len(unmatched_public_ips) > 0 and
            total_connections == 0
        )

        target_accounts = sorted({r.account_id for r in all_chain.values() if r.account_id})
        load_balancer_names = sorted({r.name for r in albs if r.name})
        record_target_ips = sorted({val for val in ip_targets})
        classification_labels = []
        if is_cert_validation:
            classification_labels.append('certificate_validation')
        if has_invalid_a_target:
            classification_labels.append('invalid_ip_target')
        if is_provider_or_external_a_record:
            classification_labels.append('provider_or_external_a_record')

        important_path_count = len(cloudfront_list) + len(s3_list) + len(pipeline_list)
        
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
            "has_connections": total_connections > 0,
            "connections": connections,
            "important_path_count": important_path_count,
            "classification": {
                "is_certificate_validation": is_cert_validation,
                "has_invalid_a_target": has_invalid_a_target,
                "is_provider_or_external_a_record": is_provider_or_external_a_record,
                "unmatched_public_ips": unmatched_public_ips,
                "matched_ip_targets": matched_ip_targets,
                "labels": classification_labels,
            },
            "grouping": {
                "target_accounts": target_accounts,
                "load_balancers": load_balancer_names,
                "target_ips": record_target_ips,
            },
        })
    
    # Sort with focus on demonstrative paths first (CloudFront/S3/Pipelines), then connected, then URL
    url_flows.sort(key=lambda f: (
        -(f.get('important_path_count', 0)),
        not f['has_connections'],
        not f.get('classification', {}).get('has_invalid_a_target', False),
        f['url']
    ))
    
    return url_flows


class URLLinkRequest(BaseModel):
    source_resource_id: int
    target_resource_id: int
    label: str = "manual_link"


@router.post("/url-link")
def link_resources(
    request: URLLinkRequest,
    db: Session = Depends(get_db)
):
    """Manually link any two resources (e.g. DNS→ALB, ALB→EC2, EC2→RDS)"""
    from app.models import ResourceRelationship
    
    source = db.query(Resource).filter(Resource.id == request.source_resource_id).first()
    target = db.query(Resource).filter(Resource.id == request.target_resource_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source resource not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target resource not found")
    
    # Check if link already exists
    existing = db.query(ResourceRelationship).filter(
        ResourceRelationship.source_resource_id == request.source_resource_id,
        ResourceRelationship.target_resource_id == request.target_resource_id
    ).first()
    
    if existing:
        return {"message": "Link already exists", "relationship_id": existing.id}
    
    rel = ResourceRelationship(
        source_resource_id=request.source_resource_id,
        target_resource_id=request.target_resource_id,
        relationship_type="routes_to",
        label=request.label,
        description=f"{source.name} → {target.name}",
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
def unlink_resources(
    relationship_id: int,
    db: Session = Depends(get_db)
):
    """Remove a manual link between resources"""
    from app.models import ResourceRelationship
    
    rel = db.query(ResourceRelationship).filter(ResourceRelationship.id == relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    db.delete(rel)
    db.commit()
    return {"message": "Link removed"}


@router.get("/url-connections/{resource_id}")
def get_resource_connections(
    resource_id: int,
    db: Session = Depends(get_db)
):
    """Get all connections (relationships) for a specific resource in Navigator"""
    from app.models import ResourceRelationship
    
    rels = db.query(ResourceRelationship).filter(
        (ResourceRelationship.source_resource_id == resource_id) |
        (ResourceRelationship.target_resource_id == resource_id)
    ).all()
    
    result = []
    for rel in rels:
        source = db.query(Resource).filter(Resource.id == rel.source_resource_id).first()
        target = db.query(Resource).filter(Resource.id == rel.target_resource_id).first()
        result.append({
            "id": rel.id,
            "source_id": rel.source_resource_id,
            "target_id": rel.target_resource_id,
            "source_name": source.name if source else "Unknown",
            "source_type": source.type if source else "",
            "target_name": target.name if target else "Unknown",
            "target_type": target.type if target else "",
            "relationship_type": rel.relationship_type,
            "label": rel.label or rel.relationship_type,
            "auto_detected": rel.auto_detected,
        })
    return result


class RemoveConnectionRequest(BaseModel):
    source_resource_id: int
    target_resource_id: int


@router.post("/url-remove-connection")
def remove_connection(
    request: RemoveConnectionRequest,
    db: Session = Depends(get_db)
):
    """Remove connection between two resources (both directions)"""
    from app.models import ResourceRelationship
    
    rels = db.query(ResourceRelationship).filter(
        ((ResourceRelationship.source_resource_id == request.source_resource_id) &
         (ResourceRelationship.target_resource_id == request.target_resource_id)) |
        ((ResourceRelationship.source_resource_id == request.target_resource_id) &
         (ResourceRelationship.target_resource_id == request.source_resource_id))
    ).all()
    
    if not rels:
        raise HTTPException(status_code=404, detail="No connection found between these resources")
    
    count = len(rels)
    for rel in rels:
        db.delete(rel)
    db.commit()
    return {"message": f"Removed {count} connection(s)", "count": count}


class EditResourceRequest(BaseModel):
    name: str = None
    environment: str = None
    notes: str = None
    status: str = None


@router.patch("/url-resource/{resource_id}")
def edit_navigator_resource(
    resource_id: int,
    request: EditResourceRequest,
    db: Session = Depends(get_db)
):
    """Edit resource fields from Navigator (name, environment, notes, status)"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    import json
    updated = []
    if request.name is not None:
        resource.name = request.name
        updated.append("name")
    if request.environment is not None:
        resource.environment = request.environment
        updated.append("environment")
    if request.status is not None:
        resource.status = request.status
        updated.append("status")
    if request.notes is not None:
        props = resource.type_specific_properties or {}
        if isinstance(props, str):
            try:
                props = json.loads(props)
            except:
                props = {}
        props['navigator_notes'] = request.notes
        resource.type_specific_properties = props
        updated.append("notes")
    
    db.commit()
    db.refresh(resource)
    return {"message": f"Updated: {', '.join(updated)}", "updated_fields": updated}


@router.get("/url-search-resources")
def search_resources_for_linking(
    q: str = "",
    type_filter: str = "",
    db: Session = Depends(get_db)
):
    """Search resources for manual linking in Navigator. Returns matching resources."""
    query = db.query(Resource).filter(
        Resource.type.notin_(['route53', 'route53_record', 'config', 'security_group_rule',
                              'rds_snapshot', 'rds_backup', 'aurora_snapshot', 'snapshot',
                              'rds_parameter_group', 'rds_option_group', 'aurora_parameter_group',
                              'db_subnet_group', 'dhcp_options', 'flow_log'])
    )
    if type_filter:
        query = query.filter(Resource.type == type_filter)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (Resource.name.ilike(search)) |
            (Resource.resource_id.ilike(search)) |
            (Resource.dns_name.ilike(search)) |
            (Resource.private_ip.ilike(search)) |
            (Resource.public_ip.ilike(search))
        )
    results = query.limit(30).all()
    
    import json
    def get_props(r):
        if not r.type_specific_properties:
            return {}
        try:
            return json.loads(r.type_specific_properties) if isinstance(r.type_specific_properties, str) else r.type_specific_properties
        except:
            return {}
    
    output = []
    for r in results:
        props = get_props(r)
        output.append({
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "resource_id": r.resource_id,
            "account_id": r.account_id,
            "region": r.region,
            "status": r.status,
            "vpc_id": r.vpc_id,
            "private_ip": r.private_ip,
            "public_ip": r.public_ip,
            "dns_name": r.dns_name or props.get('dns_name', ''),
            "instance_type": r.instance_type,
            "type_specific_properties": props,
        })
    return output


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
