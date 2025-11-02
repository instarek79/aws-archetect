"""
AWS ARN Parser Utility
Parses Amazon Resource Names (ARN) and extracts useful information
"""

import re
from typing import Optional, Dict


def parse_arn(arn: str) -> Optional[Dict[str, str]]:
    """
    Parse an AWS ARN and extract its components
    
    ARN Format:
    arn:partition:service:region:account-id:resource-type/resource-id
    arn:partition:service:region:account-id:resource-type:resource-id
    
    Examples:
    arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0
    arn:aws:s3:::my-bucket
    arn:aws:rds:us-west-2:123456789012:db:mydb
    arn:aws:lambda:eu-west-1:123456789012:function:my-function
    """
    
    if not arn or not arn.startswith("arn:"):
        return None
    
    try:
        # Split ARN into parts
        parts = arn.split(":")
        
        if len(parts) < 6:
            return None
        
        partition = parts[1]
        service = parts[2]
        region = parts[3] if parts[3] else None
        account_id = parts[4] if parts[4] else None
        
        # Resource part can be in different formats
        resource_part = ":".join(parts[5:])
        
        # Try to extract resource type and ID
        resource_type = None
        resource_id = None
        
        if "/" in resource_part:
            # Format: resource-type/resource-id
            resource_parts = resource_part.split("/", 1)
            resource_type = resource_parts[0]
            resource_id = resource_parts[1] if len(resource_parts) > 1 else None
        elif ":" in resource_part:
            # Format: resource-type:resource-id
            resource_parts = resource_part.split(":", 1)
            resource_type = resource_parts[0]
            resource_id = resource_parts[1] if len(resource_parts) > 1 else None
        else:
            # Just resource (like S3 bucket)
            resource_id = resource_part
        
        return {
            "arn": arn,
            "partition": partition,
            "service": service,
            "region": region,
            "account_id": account_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "full_resource": resource_part
        }
    
    except Exception as e:
        print(f"Error parsing ARN: {e}")
        return None


def get_resource_type_from_service(service: str, resource_type: Optional[str] = None) -> str:
    """
    Map AWS service name to our resource type
    """
    service_mapping = {
        "ec2": "ec2",
        "s3": "s3",
        "rds": "rds",
        "lambda": "lambda",
        "vpc": "vpc",
        "elasticloadbalancing": "elb",
        "elb": "elb",
        "elbv2": "elb",
        "cloudfront": "cloudfront",
        "route53": "route53",
        "dynamodb": "dynamodb",
        "sns": "sns",
        "sqs": "sqs",
        "iam": "iam",
        "kms": "kms",
        "cloudwatch": "cloudwatch",
        "ecs": "ecs",
        "eks": "eks",
        "elasticache": "elasticache",
        "redshift": "redshift"
    }
    
    # If resource_type is provided, be more specific
    if resource_type:
        if service == "ec2":
            if resource_type == "instance":
                return "ec2"
            elif resource_type == "volume":
                return "ebs"
            elif resource_type == "vpc":
                return "vpc"
            elif resource_type == "security-group":
                return "security-group"
            elif resource_type == "subnet":
                return "subnet"
    
    return service_mapping.get(service, service)


def extract_resource_info_from_arn(arn: str) -> Dict[str, any]:
    """
    Extract all useful information from ARN for creating a resource
    """
    parsed = parse_arn(arn)
    
    if not parsed:
        return {}
    
    info = {
        "arn": arn,
        "account_id": parsed["account_id"],
        "region": parsed["region"] if parsed["region"] else "global",
        "resource_id": parsed["resource_id"],
        "type": get_resource_type_from_service(parsed["service"], parsed["resource_type"])
    }
    
    # Generate a friendly name if resource_id exists
    if parsed["resource_id"]:
        # Extract just the ID part (remove prefixes like i-, vol-, etc.)
        name_part = parsed["resource_id"].split("/")[-1]
        info["suggested_name"] = f"{parsed['service']}-{name_part[:16]}"
    
    return info


def validate_arn(arn: str) -> bool:
    """
    Validate if a string is a valid ARN format
    """
    if not arn or not isinstance(arn, str):
        return False
    
    # Basic ARN pattern validation
    arn_pattern = r"^arn:(aws|aws-cn|aws-us-gov):[a-z0-9-]+:([\w-]*):(\d{12})?:(.+)$"
    
    return bool(re.match(arn_pattern, arn))


# Common ARN examples for reference
ARN_EXAMPLES = {
    "ec2": "arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0",
    "s3": "arn:aws:s3:::my-bucket",
    "rds": "arn:aws:rds:us-west-2:123456789012:db:mydb",
    "lambda": "arn:aws:lambda:eu-west-1:123456789012:function:my-function",
    "dynamodb": "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable",
    "vpc": "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-1234567890abcdef0",
    "elb": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-lb/50dc6c495c0c9188"
}
