"""
AWS Connection and Scanning API Router
Handles AWS credential configuration and resource scanning
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import logging

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.services.aws_scanner import AWSScanner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/aws", tags=["aws-connect"])


class AWSCredentials(BaseModel):
    """AWS credentials for connecting to AWS account"""
    aws_access_key_id: str
    aws_secret_access_key: str
    region: str = "us-east-1"
    aws_session_token: Optional[str] = None


class ScanRequest(BaseModel):
    """Request to scan AWS resources"""
    credentials: AWSCredentials
    resource_types: Optional[List[str]] = None  # If None, scan all


class ScanResponse(BaseModel):
    """Response from AWS scan"""
    status: str
    message: str
    resources_found: Dict[str, int]
    import_stats: Optional[Dict[str, int]] = None


@router.post("/test-connection", response_model=Dict[str, Any])
async def test_aws_connection(
    credentials: AWSCredentials,
    current_user: User = Depends(get_current_user)
):
    """
    Test AWS connection with provided credentials
    Returns account ID and available regions if successful
    """
    try:
        scanner = AWSScanner(
            aws_access_key_id=credentials.aws_access_key_id,
            aws_secret_access_key=credentials.aws_secret_access_key,
            region=credentials.region,
            session_token=credentials.aws_session_token
        )
        
        account_id = scanner.get_account_id()
        
        # Get available regions
        import boto3
        ec2 = boto3.client('ec2', region_name=credentials.region,
                          aws_access_key_id=credentials.aws_access_key_id,
                          aws_secret_access_key=credentials.aws_secret_access_key,
                          aws_session_token=credentials.aws_session_token)
        regions = [region['RegionName'] for region in ec2.describe_regions()['Regions']]
        
        return {
            "status": "success",
            "message": "Successfully connected to AWS",
            "account_id": account_id,
            "current_region": credentials.region,
            "available_regions": regions
        }
        
    except Exception as e:
        logger.error(f"AWS connection test failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to connect to AWS: {str(e)}")


@router.post("/scan", response_model=ScanResponse)
async def scan_aws_resources(
    scan_request: ScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scan AWS account for resources and import them into the database
    """
    try:
        credentials = scan_request.credentials
        scanner = AWSScanner(
            aws_access_key_id=credentials.aws_access_key_id,
            aws_secret_access_key=credentials.aws_secret_access_key,
            region=credentials.region,
            session_token=credentials.aws_session_token
        )
        
        # Scan resources
        logger.info(f"Starting AWS scan for user {current_user.id} in region {credentials.region}")
        
        if scan_request.resource_types:
            # Scan specific resource types
            resources = {}
            for resource_type in scan_request.resource_types:
                if resource_type == 'ec2':
                    resources['ec2'] = scanner.scan_ec2_instances()
                elif resource_type == 'rds':
                    resources['rds'] = scanner.scan_rds_instances()
                elif resource_type == 'lambda':
                    resources['lambda'] = scanner.scan_lambda_functions()
                elif resource_type == 's3':
                    resources['s3'] = scanner.scan_s3_buckets()
                elif resource_type == 'elb':
                    resources['elb'] = scanner.scan_load_balancers()
                elif resource_type == 'vpc':
                    resources['vpc'] = scanner.scan_vpcs()
                elif resource_type == 'ecs':
                    resources['ecs'] = scanner.scan_ecs_clusters()
                elif resource_type == 'eks':
                    resources['eks'] = scanner.scan_eks_clusters()
                elif resource_type == 'dynamodb':
                    resources['dynamodb'] = scanner.scan_dynamodb_tables()
                elif resource_type == 'sns':
                    resources['sns'] = scanner.scan_sns_topics()
                elif resource_type == 'sqs':
                    resources['sqs'] = scanner.scan_sqs_queues()
                elif resource_type == 'apigateway':
                    resources['apigateway'] = scanner.scan_api_gateways()
                elif resource_type == 'codepipeline':
                    resources['codepipeline'] = scanner.scan_codepipeline()
        else:
            # Scan all resources
            resources = scanner.scan_all_resources()
        
        # Count resources found
        resources_found = {
            resource_type: len(resource_list) 
            for resource_type, resource_list in resources.items()
        }
        
        # Import to database
        import_stats = scanner.import_resources_to_db(db, current_user.id, resources)
        
        return ScanResponse(
            status="success",
            message=f"Scan complete. Found {sum(resources_found.values())} resources.",
            resources_found=resources_found,
            import_stats=import_stats
        )
        
    except Exception as e:
        logger.error(f"AWS scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan AWS resources: {str(e)}")


@router.post("/scan-async")
async def scan_aws_resources_async(
    scan_request: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start an asynchronous AWS scan (for large accounts)
    Returns immediately and processes in background
    """
    def run_scan():
        try:
            credentials = scan_request.credentials
            scanner = AWSScanner(
                aws_access_key_id=credentials.aws_access_key_id,
                aws_secret_access_key=credentials.aws_secret_access_key,
                region=credentials.region,
                session_token=credentials.aws_session_token
            )
            
            resources = scanner.scan_all_resources()
            scanner.import_resources_to_db(db, current_user.id, resources)
            
            logger.info(f"Background AWS scan completed for user {current_user.id}")
        except Exception as e:
            logger.error(f"Background AWS scan failed: {e}")
    
    background_tasks.add_task(run_scan)
    
    return {
        "status": "started",
        "message": "AWS scan started in background. Resources will be imported automatically."
    }


@router.get("/supported-resources")
async def get_supported_resources():
    """
    Get list of AWS resource types that can be scanned
    """
    return {
        "supported_resources": [
            {
                "type": "ec2",
                "name": "EC2 Instances",
                "description": "Virtual servers in the cloud"
            },
            {
                "type": "rds",
                "name": "RDS Databases",
                "description": "Managed relational databases"
            },
            {
                "type": "lambda",
                "name": "Lambda Functions",
                "description": "Serverless compute functions"
            },
            {
                "type": "s3",
                "name": "S3 Buckets",
                "description": "Object storage buckets"
            },
            {
                "type": "elb",
                "name": "Load Balancers",
                "description": "Application and Network Load Balancers"
            },
            {
                "type": "vpc",
                "name": "VPCs",
                "description": "Virtual Private Clouds"
            },
            {
                "type": "ecs",
                "name": "ECS Clusters",
                "description": "Elastic Container Service clusters"
            },
            {
                "type": "eks",
                "name": "EKS Clusters",
                "description": "Elastic Kubernetes Service clusters"
            },
            {
                "type": "dynamodb",
                "name": "DynamoDB Tables",
                "description": "NoSQL database tables"
            },
            {
                "type": "sns",
                "name": "SNS Topics",
                "description": "Simple Notification Service topics"
            },
            {
                "type": "sqs",
                "name": "SQS Queues",
                "description": "Simple Queue Service queues"
            },
            {
                "type": "apigateway",
                "name": "API Gateway",
                "description": "REST API endpoints"
            },
            {
                "type": "codepipeline",
                "name": "CodePipeline",
                "description": "CI/CD pipelines"
            }
        ]
    }
