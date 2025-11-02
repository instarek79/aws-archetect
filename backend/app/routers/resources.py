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


# ARN Parse Request Schema
class ARNParseRequest(BaseModel):
    arn: str


class ARNParseResponse(BaseModel):
    valid: bool
    info: dict
    message: str


@router.get("/", response_model=List[ResourceResponse])
def get_resources(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all resources for the authenticated user"""
    resources = db.query(Resource).filter(
        Resource.created_by == current_user.id
    ).offset(skip).limit(limit).all()
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
