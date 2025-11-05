"""
Import Router - Handle file uploads and data imports
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import Resource, User
from ..services.import_service import import_service
from ..routers.auth import get_current_user

router = APIRouter(prefix="/api/import", tags=["import"])


class AnalyzeRequest(BaseModel):
    sheet_name: str
    sample_data: List[Dict[str, Any]]


class ImportRequest(BaseModel):
    resources: List[Dict[str, Any]]


class PreviewRequest(BaseModel):
    sheet_data: List[Dict[str, Any]]
    field_mappings: Dict[str, str]
    type_specific_mappings: Optional[Dict[str, str]] = {}
    resource_type: str


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_ai: Optional[str] = Form("false"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Excel or CSV file and parse it
    Optional AI parsing to clean and validate data
    """
    # Read file content
    content = await file.read()
    
    # Convert string to boolean
    use_ai_bool = use_ai.lower() == "true"
    
    # Parse file with optional AI
    result = import_service.parse_file(content, file.filename, use_ai=use_ai_bool)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/analyze")
async def analyze_data(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Use LLM to analyze data and suggest field mappings
    """
    result = import_service.analyze_with_llm(
        sample_data=request.sample_data,
        sheet_name=request.sheet_name
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result


@router.post("/preview")
async def preview_import(
    request: PreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Apply mappings and validate data before actual import
    """
    # Apply mappings
    transformed = import_service.apply_mappings(
        data=request.sheet_data,
        mappings=request.field_mappings,
        type_specific_mappings=request.type_specific_mappings,
        resource_type=request.resource_type
    )
    
    # Validate
    validation_result = import_service.validate_resources(transformed)
    
    return validation_result


@router.post("/execute")
async def execute_import(
    request: ImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute the actual import of validated resources
    """
    import logging
    logger = logging.getLogger(__name__)
    
    imported_count = 0
    errors = []
    
    logger.info(f"Starting import of {len(request.resources)} resources for user {current_user.id}")
    
    for resource_data in request.resources:
        try:
            # Remove import warnings if present
            resource_data.pop('_import_warnings', None)
            
            # Add current user as creator
            resource_data['created_by'] = current_user.id
            
            logger.info(f"Creating resource: {resource_data.get('name', 'Unknown')}")
            
            # Get valid Resource model fields
            valid_fields = {
                'name', 'type', 'region', 'arn', 'account_id', 'resource_id',
                'status', 'environment', 'cost_center', 'owner',
                'vpc_id', 'subnet_id', 'availability_zone', 'security_groups',
                'public_ip', 'private_ip', 'instance_type', 'resource_creation_date',
                'type_specific_properties', 'dependencies', 'connected_resources',
                'tags', 'description', 'notes', 'created_by'
            }
            
            # Filter resource_data to only include valid fields
            filtered_data = {k: v for k, v in resource_data.items() if k in valid_fields}
            
            # Auto-fill required fields with defaults if missing
            if not filtered_data.get('region'):
                # Try to extract from availability_zone (e.g., "eu-west-3c" -> "eu-west-3")
                az = filtered_data.get('availability_zone', '')
                if az and len(az) > 1:
                    filtered_data['region'] = az[:-1]  # Remove last character (zone letter)
                else:
                    filtered_data['region'] = 'unknown'
            
            if not filtered_data.get('name'):
                filtered_data['name'] = f"Resource-{resource_data.get('resource_id', 'Unknown')}"
            
            if not filtered_data.get('type'):
                filtered_data['type'] = 'unknown'
            
            # Create resource
            resource = Resource(**filtered_data)
            db.add(resource)
            imported_count += 1
            
        except Exception as e:
            logger.error(f"Failed to create resource: {str(e)}")
            import traceback
            traceback.print_exc()
            errors.append({
                "resource": resource_data.get("name", "Unknown"),
                "error": str(e)
            })
    
    try:
        logger.info(f"Committing {imported_count} resources to database")
        db.commit()
        logger.info(f"✅ Successfully imported {imported_count} resources")
        return {
            "success": True,
            "imported_count": imported_count,
            "error_count": len(errors),
            "errors": errors
        }
    except Exception as e:
        logger.error(f"Database commit failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
