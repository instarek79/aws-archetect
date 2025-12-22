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
