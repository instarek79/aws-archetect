"""
Import Router - Handle file uploads and data imports
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import Resource
from ..services.import_service import import_service
from ..routers.auth import get_current_user

router = APIRouter(prefix="/api/import", tags=["import"])


class AnalyzeRequest(BaseModel):
    sheet_name: str
    sample_data: List[Dict[str, Any]]


class ImportRequest(BaseModel):
    resources: List[Dict[str, Any]]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_ai: Optional[str] = Form("false"),
    current_user: dict = Depends(get_current_user)
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
    current_user: dict = Depends(get_current_user)
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
    sheet_data: List[Dict[str, Any]],
    field_mappings: Dict[str, str],
    type_specific_mappings: Dict[str, str],
    resource_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Apply mappings and validate data before actual import
    """
    # Apply mappings
    transformed = import_service.apply_mappings(
        data=sheet_data,
        mappings=field_mappings,
        type_specific_mappings=type_specific_mappings,
        resource_type=resource_type
    )
    
    # Validate
    validation_result = import_service.validate_resources(transformed)
    
    return validation_result


@router.post("/execute")
async def execute_import(
    request: ImportRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Execute the actual import of validated resources
    """
    imported_count = 0
    errors = []
    
    for resource_data in request.resources:
        try:
            # Remove import warnings if present
            resource_data.pop('_import_warnings', None)
            
            # Create resource
            resource = Resource(**resource_data)
            db.add(resource)
            imported_count += 1
            
        except Exception as e:
            errors.append({
                "resource": resource_data.get("name", "Unknown"),
                "error": str(e)
            })
    
    try:
        db.commit()
        return {
            "success": True,
            "imported_count": imported_count,
            "error_count": len(errors),
            "errors": errors
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
