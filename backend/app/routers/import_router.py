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
    type_specific_mappings: Optional[Dict[str, str]] = None
    resource_type: str


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_ai: Optional[str] = Form("false"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Excel or CSV file and parse it
    Auto-detects AWS Resource Explorer format for direct import
    Optional AI parsing to clean and validate data
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Read file content
    content = await file.read()
    
    # Convert string to boolean
    use_ai_bool = use_ai.lower() == "true"
    
    # Parse file with optional AI
    result = import_service.parse_file(content, file.filename, use_ai=use_ai_bool)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    # Check if this is AWS Resource Explorer format
    sheets = result.get("sheets", {})
    if not sheets and result.get("file_type") == "csv":
        # For CSV, the data is in a single "default" sheet
        sheets = {"data": result.get("data", [])}
    
    # Check first sheet for AWS Resource Explorer columns
    for sheet_name, sheet_data in sheets.items():
        if sheet_data and len(sheet_data) > 0:
            columns = list(sheet_data[0].keys())
            
            if import_service.is_aws_resource_explorer_format(columns):
                logger.info(f"Detected AWS Resource Explorer format in {file.filename}")
                
                # Parse using AWS Resource Explorer parser
                parsed_resources = import_service.parse_aws_resource_explorer(sheet_data)
                
                # Get resource type summary
                type_counts = {}
                for r in parsed_resources:
                    t = r.get('type', 'unknown')
                    type_counts[t] = type_counts.get(t, 0) + 1
                
                result["aws_resource_explorer"] = True
                result["parsed_resources"] = parsed_resources
                result["resource_count"] = len(parsed_resources)
                result["resource_types"] = type_counts
                result["auto_mapped"] = True
                result["message"] = f"Detected AWS Resource Explorer format. Found {len(parsed_resources)} resources across {len(type_counts)} resource types."
                
                logger.info(f"Parsed {len(parsed_resources)} resources: {type_counts}")
                break
    
    return result


@router.post("/analyze")
async def analyze_data(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Use LLM to analyze data and suggest field mappings with intelligent ARN extraction
    """
    result = import_service.analyze_with_llm(
        sample_data=request.sample_data,
        sheet_name=request.sheet_name
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    # Add helpful hints about what will be auto-extracted
    analysis = result.get("analysis", {})
    
    extraction_hints = []
    
    # Check for ARN column
    arn_column = analysis.get("arn_column")
    if arn_column and arn_column != "null" and arn_column != "None":
        extraction_hints.append(f"✅ ARN detected in column '{arn_column}'")
        extraction_hints.append("  → Will auto-extract account_id from ARN")
        extraction_hints.append("  → Will auto-extract region from ARN")
        extraction_hints.append("  → Will auto-extract resource_id from ARN")
    
    # Check for IP fields in mappings
    field_mappings = analysis.get("field_mappings", {})
    if field_mappings:
        if any("public_ip" in str(v).lower() for v in field_mappings.values()):
            extraction_hints.append("✅ Public IP will be saved to network fields")
        if any("private_ip" in str(v).lower() for v in field_mappings.values()):
            extraction_hints.append("✅ Private IP will be saved to network fields")
        if any("tags" in str(v).lower() for v in field_mappings.values()):
            extraction_hints.append("✅ Tags will be saved to tags field (not description)")
        if any("vpc" in str(v).lower() for v in field_mappings.values()):
            extraction_hints.append("✅ VPC/Network fields properly mapped")
    
    if not extraction_hints:
        extraction_hints.append("ℹ️  Basic field mapping applied")
    
    result["extraction_hints"] = extraction_hints
    
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
        type_specific_mappings=request.type_specific_mappings or {},
        resource_type=request.resource_type
    )
    
    # Validate
    validation_result = import_service.validate_resources(transformed)
    
    return validation_result


@router.post("/test")
async def test_import():
    """Simple test endpoint"""
    print("TEST ENDPOINT CALLED")
    return {"status": "ok", "message": "Import router is working"}


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
    import re
    logger = logging.getLogger(__name__)
    
    print(f"\n\n=== IMPORT EXECUTE CALLED === Resources: {len(request.resources)} ===\n\n")
    
    created_count = 0
    updated_count = 0
    errors = []
    
    logger.info(f"Starting import of {len(request.resources)} resources for user {current_user.id}")
    
    if len(request.resources) > 0:
        logger.info(f"First resource sample: {list(request.resources[0].keys())[:10]}")
    
    for idx, resource_data in enumerate(request.resources):
        try:
            # Remove import warnings if present
            resource_data.pop('_import_warnings', None)
            
            # Add current user as creator
            resource_data['created_by'] = current_user.id
            
            logger.info(f"Creating resource: {resource_data.get('name', 'Unknown')}")
            
            # Get valid Resource model fields (all fields from enhanced model)
            valid_fields = {
                'name', 'type', 'region', 'arn', 'account_id', 'resource_id',
                'status', 'environment', 'cost_center', 'owner', 'application', 'project',
                'vpc_id', 'subnet_id', 'availability_zone', 'security_groups',
                'public_ip', 'private_ip', 'dns_name', 'endpoint',
                'instance_type', 'resource_creation_date',
                'type_specific_properties', 
                'dependencies', 'connected_resources', 'attached_to', 'parent_resource',
                'child_resources', 'target_resources', 'source_resources',
                'encryption_enabled', 'public_access', 'compliance_status',
                'monthly_cost_estimate', 'last_cost_update',
                'tags', 'description', 'notes', 'created_by',
                'aws_service', 'aws_resource_type', 'last_reported_at'
            }
            
            # Extract type_specific_properties from resource_data
            type_specific_props = resource_data.get('type_specific_properties', {})
            if not isinstance(type_specific_props, dict):
                type_specific_props = {}
            
            # Move 'os' and other EC2-specific fields to type_specific_properties
            ec2_specific_fields = ['os', 'ami_id', 'key_pair', 'ebs_optimized', 'monitoring', 'platform']
            for field in ec2_specific_fields:
                if field in resource_data and resource_data[field]:
                    type_specific_props[field] = resource_data[field]
            
            # Filter resource_data to only include valid fields
            filtered_data = {k: v for k, v in resource_data.items() if k in valid_fields}
            
            # SMART: Save ALL unmapped columns to description (don't lose any data!)
            unmapped_fields = {}
            for key, value in resource_data.items():
                if key not in valid_fields and key not in ec2_specific_fields and value is not None and value != '':
                    unmapped_fields[key] = value
            
            if unmapped_fields:
                # Convert unmapped fields to readable description
                unmapped_desc = ", ".join([f"{k}: {v}" for k, v in unmapped_fields.items()])
                existing_desc = filtered_data.get('description', '')
                if existing_desc:
                    filtered_data['description'] = f"{existing_desc} | Additional: {unmapped_desc}"
                else:
                    filtered_data['description'] = f"Additional fields: {unmapped_desc}"
                logger.info(f"  Saved {len(unmapped_fields)} unmapped fields to description")
            
            # Parse ARN if present to extract account_id and region
            arn = filtered_data.get('arn') or resource_data.get('arn')
            if arn and isinstance(arn, str):
                # ARN format: arn:aws:service:region:account-id:resource-type/resource-id
                arn_match = re.match(r'arn:aws:[^:]+:([^:]*):([^:]+):(.+)', arn)
                if arn_match:
                    arn_region, arn_account, arn_resource = arn_match.groups()
                    
                    # Extract account_id from ARN if not already set
                    if not filtered_data.get('account_id') and arn_account:
                        filtered_data['account_id'] = arn_account
                        logger.info(f"  Extracted account_id from ARN: {arn_account}")
                    
                    # Extract region from ARN if not already set
                    if not filtered_data.get('region') and arn_region:
                        filtered_data['region'] = arn_region
                        logger.info(f"  Extracted region from ARN: {arn_region}")
                    
                    # Extract resource_id from ARN if not already set
                    if not filtered_data.get('resource_id') and arn_resource:
                        # Handle different ARN formats (e.g., "instance/i-123" or "i-123")
                        if '/' in arn_resource:
                            filtered_data['resource_id'] = arn_resource.split('/')[-1]
                        else:
                            filtered_data['resource_id'] = arn_resource
            
            # Auto-fill required fields with smart defaults
            if not filtered_data.get('region'):
                # Try to extract from availability_zone (e.g., "eu-west-3c" -> "eu-west-3")
                az = filtered_data.get('availability_zone', '')
                if az and len(az) > 1:
                    filtered_data['region'] = az[:-1]  # Remove last character (zone letter)
                    logger.info(f"  Extracted region from AZ: {filtered_data['region']}")
                else:
                    filtered_data['region'] = 'unknown'
            
            if not filtered_data.get('name'):
                filtered_data['name'] = f"Resource-{resource_data.get('resource_id', 'Unknown')}"
            
            if not filtered_data.get('type'):
                # Try to detect type from ARN
                if arn and isinstance(arn, str):
                    arn_parts = arn.split(':')
                    if len(arn_parts) >= 3:
                        service = arn_parts[2]
                        # Map AWS service to resource type
                        service_map = {
                            'ec2': 'ec2',
                            'rds': 'rds',
                            's3': 's3',
                            'lambda': 'lambda',
                            'elasticloadbalancing': 'elb',
                            'ecs': 'ecs',
                            'eks': 'eks'
                        }
                        filtered_data['type'] = service_map.get(service, service)
                        logger.info(f"  Detected type from ARN: {filtered_data['type']}")
                else:
                    filtered_data['type'] = 'unknown'
            
            # Auto-detect status from state field if present
            if not filtered_data.get('status') or filtered_data.get('status') == 'unknown':
                state = resource_data.get('state') or resource_data.get('instance_state')
                if state:
                    filtered_data['status'] = state.lower()
                    logger.info(f"  Detected status: {state}")
            
            # Auto-detect environment from name or tags
            if not filtered_data.get('environment'):
                name = filtered_data.get('name', '').lower()
                # Check for common environment indicators in name
                env_keywords = {
                    'prod': 'production',
                    'production': 'production',
                    'stg': 'staging',
                    'staging': 'staging',
                    'stage': 'staging',
                    'dev': 'development',
                    'development': 'development',
                    'test': 'testing',
                    'testing': 'testing',
                    'qa': 'qa',
                    'uat': 'uat'
                }
                for keyword, env in env_keywords.items():
                    if keyword in name:
                        filtered_data['environment'] = env
                        logger.info(f"  Detected environment from name: {env}")
                        break
            
            # Add type_specific_properties if we collected any
            if type_specific_props:
                filtered_data['type_specific_properties'] = type_specific_props
                logger.info(f"  Added type_specific_properties: {list(type_specific_props.keys())}")
            
            # SMART UPSERT: Check if resource already exists by resource_id
            existing_resource = None
            if filtered_data.get('resource_id'):
                existing_resource = db.query(Resource).filter(
                    Resource.resource_id == filtered_data['resource_id'],
                    Resource.created_by == current_user.id
                ).first()
            
            if existing_resource:
                # UPDATE existing resource
                logger.info(f"  ⚠️  Resource exists! Updating: {existing_resource.name}")
                for key, value in filtered_data.items():
                    if key != 'created_by':  # Don't change creator
                        setattr(existing_resource, key, value)
                db.commit()  # Commit each update individually
                logger.info(f"  ✅ Updated existing resource")
                updated_count += 1
            else:
                # CREATE new resource
                resource = Resource(**filtered_data)
                db.add(resource)
                db.commit()  # Commit each insert individually
                logger.info(f"  ✅ Created new resource")
                created_count += 1
            
        except Exception as e:
            db.rollback()  # Rollback failed transaction
            logger.error(f"Failed to create resource: {str(e)}")
            errors.append({
                "resource": resource_data.get("name", "Unknown"),
                "error": str(e)[:200]  # Truncate error message
            })
            # Continue with next resource instead of failing all
            continue
    
    try:
        total_count = created_count + updated_count
        logger.info(f"Import complete: {total_count} resources ({created_count} new, {updated_count} updated), {len(errors)} errors")
        return {
            "success": True,
            "imported_count": total_count,
            "created_count": created_count,
            "updated_count": updated_count,
            "error_count": len(errors),
            "errors": errors,
            "message": f"Successfully imported {total_count} resources ({created_count} created, {updated_count} updated)"
        }
    except Exception as e:
        logger.error(f"Database commit failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
