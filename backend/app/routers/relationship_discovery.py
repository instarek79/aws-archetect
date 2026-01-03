from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.services.relationship_discovery import discover_and_import_relationships

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.post("/discover")
async def discover_relationships(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Automatically discover relationships between existing resources
    Based on:
    - CloudFormation stack IDs
    - VPC/Subnet associations
    - Lambda event sources
    - CodePipeline connections
    - ARN references
    """
    try:
        result = discover_and_import_relationships(db, current_user.id)
        return {
            "success": True,
            "discovered": result['discovered'],
            "imported": result['imported'],
            "message": result['message']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")
