"""
API endpoints for managing resource relationships
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import ResourceRelationship, Resource
from app.schemas import (
    ResourceRelationshipCreate,
    ResourceRelationshipUpdate,
    ResourceRelationshipResponse,
    ResourceRelationshipWithResources
)
from app.routers.auth import get_current_user
from app.services.relationship_extractor import RelationshipExtractor

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.post("/extract")
def extract_relationships(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Extract relationships from resource data (CloudFormation stacks, VPCs, ARNs, etc.)"""
    try:
        count = RelationshipExtractor.extract_all_relationships(db)
        return {
            "message": f"Successfully extracted {count} new relationships",
            "count": count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract relationships: {str(e)}"
        )


@router.get("/", response_model=List[ResourceRelationshipResponse])
def get_relationships(
    source_id: Optional[int] = None,
    target_id: Optional[int] = None,
    relationship_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all resource relationships with optional filtering"""
    query = db.query(ResourceRelationship)
    
    if source_id:
        query = query.filter(ResourceRelationship.source_resource_id == source_id)
    if target_id:
        query = query.filter(ResourceRelationship.target_resource_id == target_id)
    if relationship_type:
        query = query.filter(ResourceRelationship.relationship_type == relationship_type)
    
    relationships = query.offset(skip).limit(limit).all()
    return relationships


@router.get("/with-resources", response_model=List[ResourceRelationshipWithResources])
def get_relationships_with_resources(
    source_id: Optional[int] = None,
    target_id: Optional[int] = None,
    relationship_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get relationships with full resource details"""
    query = db.query(ResourceRelationship)
    
    if source_id:
        query = query.filter(ResourceRelationship.source_resource_id == source_id)
    if target_id:
        query = query.filter(ResourceRelationship.target_resource_id == target_id)
    if relationship_type:
        query = query.filter(ResourceRelationship.relationship_type == relationship_type)
    
    relationships = query.offset(skip).limit(limit).all()
    return relationships


@router.get("/{relationship_id}", response_model=ResourceRelationshipWithResources)
def get_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific relationship by ID"""
    relationship = db.query(ResourceRelationship).filter(
        ResourceRelationship.id == relationship_id
    ).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    
    return relationship


@router.post("/", response_model=ResourceRelationshipResponse, status_code=status.HTTP_201_CREATED)
def create_relationship(
    relationship: ResourceRelationshipCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new resource relationship"""
    # Verify both resources exist
    source = db.query(Resource).filter(Resource.id == relationship.source_resource_id).first()
    target = db.query(Resource).filter(Resource.id == relationship.target_resource_id).first()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source resource {relationship.source_resource_id} not found"
        )
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target resource {relationship.target_resource_id} not found"
        )
    
    # Check if relationship already exists
    existing = db.query(ResourceRelationship).filter(
        ResourceRelationship.source_resource_id == relationship.source_resource_id,
        ResourceRelationship.target_resource_id == relationship.target_resource_id,
        ResourceRelationship.relationship_type == relationship.relationship_type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This relationship already exists"
        )
    
    # Create new relationship
    db_relationship = ResourceRelationship(**relationship.model_dump())
    db.add(db_relationship)
    db.commit()
    db.refresh(db_relationship)
    
    return db_relationship


@router.put("/{relationship_id}", response_model=ResourceRelationshipResponse)
def update_relationship(
    relationship_id: int,
    relationship_update: ResourceRelationshipUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing relationship"""
    db_relationship = db.query(ResourceRelationship).filter(
        ResourceRelationship.id == relationship_id
    ).first()
    
    if not db_relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    
    # Update fields
    update_data = relationship_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_relationship, field, value)
    
    db.commit()
    db.refresh(db_relationship)
    
    return db_relationship


@router.delete("/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a relationship"""
    db_relationship = db.query(ResourceRelationship).filter(
        ResourceRelationship.id == relationship_id
    ).first()
    
    if not db_relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    
    db.delete(db_relationship)
    db.commit()
    
    return None


@router.get("/types/available", response_model=List[dict])
def get_relationship_types(
    current_user = Depends(get_current_user)
):
    """Get available relationship types"""
    return [
        {"value": "uses", "label": "Uses", "description": "Source resource uses target resource"},
        {"value": "consumes", "label": "Consumes", "description": "Source resource consumes data/events from target"},
        {"value": "applies_to", "label": "Applies To", "description": "Source policy/rule applies to target resource"},
        {"value": "attached_to", "label": "Attached To", "description": "Source is physically attached to target (e.g., EBS to EC2)"},
        {"value": "depends_on", "label": "Depends On", "description": "Source depends on target for functionality"},
        {"value": "connects_to", "label": "Connects To", "description": "Network connection between resources"},
        {"value": "routes_to", "label": "Routes To", "description": "Traffic is routed from source to target"},
        {"value": "manages", "label": "Manages", "description": "Source manages or controls target"},
        {"value": "monitors", "label": "Monitors", "description": "Source monitors target resource"},
        {"value": "backs_up", "label": "Backs Up", "description": "Source is a backup of target"},
    ]
