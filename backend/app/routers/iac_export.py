from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Resource, ResourceRelationship
from app.routers.auth import get_current_user

router = APIRouter(prefix="/iac", tags=["iac-export"])


class ExportRequest(BaseModel):
    format: str  # 'cloudformation' or 'terraform'
    resource_ids: List[int] = []


def generate_cloudformation(resources: List[Resource], relationships: List[ResourceRelationship]) -> str:
    """Generate CloudFormation template from resources"""
    template = {
        "AWSTemplateFormatVersion": "2010-09-09",
        "Description": "Auto-generated CloudFormation template",
        "Parameters": {
            "Environment": {
                "Type": "String",
                "Default": "development",
                "AllowedValues": ["development", "staging", "production"]
            }
        },
        "Resources": {},
        "Outputs": {}
    }

    for resource in resources:
        logical_id = sanitize_name(resource.name or f"Resource{resource.id}")
        cfn_resource = convert_to_cfn(resource)
        if cfn_resource:
            template["Resources"][logical_id] = cfn_resource

    import json
    return json.dumps(template, indent=2)


def generate_terraform(resources: List[Resource], relationships: List[ResourceRelationship]) -> str:
    """Generate Terraform HCL from resources"""
    tf = """terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

"""

    for resource in resources:
        tf_resource = convert_to_terraform(resource)
        if tf_resource:
            tf += tf_resource + "\n\n"

    return tf


def convert_to_cfn(resource: Resource) -> dict:
    """Convert resource to CloudFormation format"""
    props = resource.type_specific_properties or {}
    
    type_map = {
        "ec2": ("AWS::EC2::Instance", {
            "InstanceType": props.get("instance_type", "t3.micro"),
            "ImageId": props.get("ami_id", "ami-xxxxx"),
        }),
        "lambda": ("AWS::Lambda::Function", {
            "FunctionName": resource.name,
            "Runtime": props.get("runtime", "python3.11"),
            "Handler": props.get("handler", "index.handler"),
            "Code": {"ZipFile": "# Lambda code"},
        }),
        "rds": ("AWS::RDS::DBInstance", {
            "DBInstanceIdentifier": resource.name,
            "Engine": props.get("engine", "mysql"),
            "DBInstanceClass": props.get("instance_class", "db.t3.micro"),
        }),
        "s3": ("AWS::S3::Bucket", {
            "BucketName": resource.name,
        }),
    }
    
    if resource.type in type_map:
        cfn_type, properties = type_map[resource.type]
        return {
            "Type": cfn_type,
            "Properties": properties
        }
    
    return None


def convert_to_terraform(resource: Resource) -> str:
    """Convert resource to Terraform HCL"""
    props = resource.type_specific_properties or {}
    name = sanitize_name(resource.name)
    
    type_map = {
        "ec2": ("aws_instance", f"""resource "aws_instance" "{name}" {{
  ami           = "{props.get("ami_id", "ami-xxxxx")}"
  instance_type = "{props.get("instance_type", "t3.micro")}"
  
  tags = {{
    Name = "{resource.name}"
  }}
}}"""),
        "lambda": ("aws_lambda_function", f"""resource "aws_lambda_function" "{name}" {{
  function_name = "{resource.name}"
  runtime       = "{props.get("runtime", "python3.11")}"
  handler       = "{props.get("handler", "index.handler")}"
  role          = aws_iam_role.{name}_role.arn
  
  filename      = "lambda.zip"
}}"""),
        "s3": ("aws_s3_bucket", f"""resource "aws_s3_bucket" "{name}" {{
  bucket = "{resource.name}"
  
  tags = {{
    Name = "{resource.name}"
  }}
}}"""),
    }
    
    if resource.type in type_map:
        return type_map[resource.type][1]
    
    return ""


def sanitize_name(name: str) -> str:
    """Sanitize resource name for IaC"""
    return name.replace("-", "_").replace(" ", "_").lower()


@router.post("/export")
async def export_infrastructure(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export architecture as Infrastructure as Code"""
    
    # Get resources
    if request.resource_ids:
        resources = db.query(Resource).filter(
            Resource.id.in_(request.resource_ids),
            Resource.user_id == current_user.id
        ).all()
    else:
        resources = db.query(Resource).filter(
            Resource.user_id == current_user.id
        ).all()
    
    # Get relationships
    resource_ids = [r.id for r in resources]
    relationships = db.query(ResourceRelationship).filter(
        ResourceRelationship.source_resource_id.in_(resource_ids),
        ResourceRelationship.target_resource_id.in_(resource_ids)
    ).all()
    
    # Generate IaC
    if request.format == "cloudformation":
        code = generate_cloudformation(resources, relationships)
        filename = "template.json"
    elif request.format == "terraform":
        code = generate_terraform(resources, relationships)
        filename = "main.tf"
    else:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    return {
        "format": request.format,
        "filename": filename,
        "code": code,
        "resource_count": len(resources)
    }
