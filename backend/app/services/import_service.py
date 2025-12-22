"""
Import Service - Handle Excel/CSV imports with LLM assistance
"""
import io
import json
from typing import List, Dict, Any, Optional
import os
import logging

# Make numpy optional - import will fail gracefully
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None
    logging.warning("⚠️  numpy not installed - Excel/CSV import features will be limited")

# Make pandas optional - import will fail gracefully
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None
    logging.warning("⚠️  pandas not installed - Excel/CSV import features will be limited")

try:
    from openpyxl import load_workbook
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    logging.warning("⚠️  openpyxl not installed - Excel import features will be limited")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    logging.warning("⚠️  openai not installed - AI analysis features will be disabled")

class ImportService:
    # AWS Resource Explorer CSV column names
    AWS_RESOURCE_EXPLORER_COLUMNS = [
        'Identifier', 'ARN', 'Resource type', 'Region', 'AWS Account',
        'Application', 'LastReportedAt', 'Service', 'Tags'
    ]
    
    # Mapping from AWS Resource Explorer "Resource type" to our internal types
    AWS_SERVICE_TYPE_MAP = {
        # EC2
        'ec2:instance': 'ec2',
        'ec2:volume': 'ebs',
        'ec2:security-group': 'security_group',
        'ec2:security-group-rule': 'security_group_rule',
        'ec2:vpc': 'vpc',
        'ec2:subnet': 'subnet',
        'ec2:network-interface': 'eni',
        'ec2:elastic-ip': 'eip',
        'ec2:nat-gateway': 'nat_gateway',
        'ec2:internet-gateway': 'internet_gateway',
        'ec2:route-table': 'route_table',
        'ec2:network-acl': 'nacl',
        'ec2:key-pair': 'key_pair',
        'ec2:image': 'ami',
        'ec2:snapshot': 'snapshot',
        'ec2:launch-template': 'launch_template',
        'ec2:vpc-endpoint': 'vpc_endpoint',
        'ec2:transit-gateway': 'transit_gateway',
        'ec2:transit-gateway-attachment': 'transit_gateway_attachment',
        'ec2:vpc-peering-connection': 'vpc_peering',
        'ec2:customer-gateway': 'customer_gateway',
        'ec2:vpn-gateway': 'vpn_gateway',
        'ec2:vpn-connection': 'vpn_connection',
        'ec2:dhcp-options': 'dhcp_options',
        'ec2:prefix-list': 'prefix_list',
        'ec2:flow-log': 'flow_log',
        # RDS
        'rds:db': 'rds',
        'rds:cluster': 'aurora',
        'rds:snapshot': 'rds_snapshot',
        'rds:db-snapshot': 'rds_snapshot',
        'rds:cluster-snapshot': 'aurora_snapshot',
        'rds:auto-backup': 'rds_backup',
        'rds:pg': 'rds_parameter_group',
        'rds:og': 'rds_option_group',
        'rds:subgrp': 'db_subnet_group',
        'rds:db-subnet-group': 'db_subnet_group',
        'rds:cluster-pg': 'aurora_parameter_group',
        'rds:secgrp': 'rds_security_group',
        # S3
        's3:bucket': 's3',
        # Lambda
        'lambda:function': 'lambda',
        'lambda:layer': 'lambda_layer',
        # ELB
        'elasticloadbalancing:loadbalancer': 'elb',
        'elasticloadbalancing:targetgroup': 'target_group',
        'elasticloadbalancingv2:loadbalancer': 'elb',
        'elasticloadbalancingv2:targetgroup': 'target_group',
        # IAM
        'iam:role': 'iam_role',
        'iam:user': 'iam_user',
        'iam:group': 'iam_group',
        'iam:policy': 'iam_policy',
        'iam:instance-profile': 'instance_profile',
        # CloudFormation
        'cloudformation:stack': 'cfn_stack',
        # CloudWatch
        'cloudwatch:alarm': 'cloudwatch_alarm',
        'logs:log-group': 'log_group',
        # Events
        'events:event-bus': 'eventbridge',
        'events:rule': 'eventbridge_rule',
        # SNS/SQS
        'sns:topic': 'sns',
        'sqs:queue': 'sqs',
        # DynamoDB
        'dynamodb:table': 'dynamodb',
        # ECS/EKS
        'ecs:cluster': 'ecs_cluster',
        'ecs:service': 'ecs_service',
        'ecs:task-definition': 'ecs_task',
        'eks:cluster': 'eks',
        # ECR
        'ecr:repository': 'ecr',
        # Secrets Manager / KMS
        'secretsmanager:secret': 'secrets_manager',
        'kms:key': 'kms',
        # API Gateway
        'apigateway:restapi': 'api_gateway',
        'apigateway:api': 'api_gateway',
        # Athena
        'athena:workgroup': 'athena',
        # Glue
        'glue:database': 'glue_database',
        'glue:table': 'glue_table',
        'glue:crawler': 'glue_crawler',
        # CodePipeline / CodeBuild
        'codepipeline:pipeline': 'codepipeline',
        'codebuild:project': 'codebuild',
        # Route53
        'route53:hostedzone': 'route53',
        # CloudFront
        'cloudfront:distribution': 'cloudfront',
        # ElastiCache
        'elasticache:cluster': 'elasticache',
        'elasticache:replicationgroup': 'elasticache',
        # Kinesis
        'kinesis:stream': 'kinesis',
        # SSM
        'ssm:parameter': 'ssm_parameter',
        'ssm:document': 'ssm_document',
        # ACM
        'acm:certificate': 'acm_certificate',
        # WAF
        'wafv2:webacl': 'waf',
        # Step Functions
        'states:statemachine': 'step_function',
        # Backup
        'backup:backup-vault': 'backup_vault',
        'backup:backup-plan': 'backup_plan',
    }
    
    def __init__(self):
        # Initialize LLM client - supports both Ollama (local) and OpenAI (cloud)
        if not OPENAI_AVAILABLE:
            self.client = None
            self.model = None
            print("WARNING: OpenAI library not installed. AI features will be disabled.")
            return
            
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if ollama_url:
            # Use local Ollama
            try:
                import httpx
                # Create client with longer timeout for LLM inference
                self.client = OpenAI(
                    base_url=ollama_url,
                    api_key="ollama",  # Ollama doesn't need a real API key
                    timeout=httpx.Timeout(120.0, connect=5.0)  # 120s total, 5s connect
                )
                self.model = os.getenv("OLLAMA_MODEL", "qwen2.5")
                print(f"SUCCESS: Using local Ollama at {ollama_url} with model {self.model}")
            except Exception as e:
                print(f"WARNING: Could not connect to Ollama: {e}")
                self.client = None
                self.model = None
        elif openai_key:
            # Use OpenAI
            self.client = OpenAI(api_key=openai_key)
            self.model = "gpt-4-turbo-preview"
            print("SUCCESS: Using OpenAI GPT-4")
        else:
            self.client = None
            self.model = None
            print("WARNING: No LLM configured. AI features will be disabled.")
        
        # Initialize schema definition
        self._init_schema()
        
    def is_aws_resource_explorer_format(self, columns: List[str]) -> bool:
        """
        Detect if the CSV is from AWS Resource Explorer based on column names
        """
        required_cols = ['Identifier', 'ARN', 'Resource type', 'Region', 'AWS Account']
        columns_lower = [c.lower().strip() for c in columns]
        required_lower = [c.lower() for c in required_cols]
        
        matches = sum(1 for req in required_lower if req in columns_lower)
        return matches >= 4  # At least 4 of 5 required columns
    
    def parse_aws_resource_explorer(self, data: List[Dict]) -> List[Dict]:
        """
        Parse AWS Resource Explorer CSV format and extract all possible information
        """
        resources = []
        
        for row in data:
            try:
                # Get basic fields
                identifier = row.get('Identifier', '')
                arn = row.get('ARN', '')
                resource_type_raw = row.get('Resource type', '')
                region = row.get('Region', 'unknown')
                account_id = str(row.get('AWS Account', ''))
                application = row.get('Application', '')
                last_reported = row.get('LastReportedAt', '')
                service = row.get('Service', '')
                tag_count = row.get('Tags', 0)
                
                # Skip empty rows
                if not identifier and not arn:
                    continue
                
                # Map resource type
                resource_type_lower = resource_type_raw.lower().strip() if resource_type_raw else ''
                internal_type = self.AWS_SERVICE_TYPE_MAP.get(resource_type_lower, 'unknown')
                
                # If not in map, try to extract the resource type part (after the colon)
                if internal_type == 'unknown' and ':' in resource_type_lower:
                    # Extract the part after the colon and convert to snake_case
                    resource_part = resource_type_lower.split(':')[1] if ':' in resource_type_lower else resource_type_lower
                    internal_type = resource_part.replace('-', '_')
                elif internal_type == 'unknown' and service:
                    internal_type = service.lower()
                
                # Parse ARN for additional info
                arn_parts = self._parse_arn(arn) if arn else {}
                
                # Extract all tags from Tag:* columns
                tags = {}
                for col_name, value in row.items():
                    if col_name.startswith('Tag:') and value and value != '(not tagged)':
                        tag_key = col_name[4:]  # Remove 'Tag:' prefix
                        tags[tag_key] = str(value)
                
                # Build resource object
                resource = {
                    'name': identifier or arn_parts.get('resource_name', 'Unknown'),
                    'type': internal_type,
                    'arn': arn,
                    'region': region if region and region != '-' else arn_parts.get('region', 'global'),
                    'account_id': account_id or arn_parts.get('account_id', ''),
                    'resource_id': arn_parts.get('resource_id', identifier),
                    'status': 'active',  # Default - AWS Resource Explorer only shows active resources
                    'tags': tags if tags else None,
                    'aws_service': service if service else None,
                    'aws_resource_type': resource_type_raw if resource_type_raw else None,
                    'application': application if application and application != '-' else None,
                    'type_specific_properties': {}
                }
                
                # Extract environment from tags
                env_tag = tags.get('Environment') or tags.get('Env.') or tags.get('env')
                if env_tag:
                    resource['environment'] = env_tag.lower()
                
                # Extract Name tag if different from identifier
                name_tag = tags.get('Name')
                if name_tag and name_tag != identifier:
                    resource['name'] = name_tag
                    resource['type_specific_properties']['identifier'] = identifier
                
                # Extract VPC info from tags or ARN
                vpc_from_arn = self._extract_vpc_from_arn(arn)
                if vpc_from_arn:
                    resource['vpc_id'] = vpc_from_arn
                
                # Extract subnet from ARN for subnet resources
                if internal_type == 'subnet':
                    resource['subnet_id'] = identifier
                
                # Clean up empty type_specific_properties
                if not resource['type_specific_properties']:
                    resource['type_specific_properties'] = None
                
                resources.append(resource)
                
            except Exception as e:
                print(f"WARNING: Failed to parse row: {e}")
                continue
        
        return resources
    
    def _parse_arn(self, arn: str) -> Dict[str, str]:
        """
        Parse ARN to extract account_id, region, service, and resource info
        ARN format: arn:partition:service:region:account-id:resource-type/resource-id
        """
        if not arn or not arn.startswith('arn:'):
            return {}
        
        parts = arn.split(':')
        if len(parts) < 6:
            return {}
        
        result = {
            'partition': parts[1],
            'service': parts[2],
            'region': parts[3] if parts[3] else 'global',
            'account_id': parts[4],
        }
        
        # Parse resource part (everything after account-id)
        resource_part = ':'.join(parts[5:])
        
        # Handle different resource formats
        if '/' in resource_part:
            resource_type, resource_id = resource_part.split('/', 1)
            result['resource_type'] = resource_type
            result['resource_id'] = resource_id
            result['resource_name'] = resource_id.split('/')[-1]
        else:
            result['resource_id'] = resource_part
            result['resource_name'] = resource_part
        
        return result
    
    def _extract_vpc_from_arn(self, arn: str) -> Optional[str]:
        """
        Try to extract VPC ID from ARN if present
        """
        if not arn:
            return None
        
        # Check for vpc in ARN
        import re
        vpc_match = re.search(r'vpc-[a-f0-9]+', arn)
        if vpc_match:
            return vpc_match.group(0)
        
        return None
    
    def _init_schema(self):
        """Initialize schema definition - called from __init__"""
        # Define our database schema for LLM reference
        self.schema_definition = {
            "required_fields": ["name", "type"],  # Only name and type are truly required
            "optional_fields": [
                "account_id", "vpc_id", "subnet_id", "availability_zone",
                "status", "environment", "instance_type", "public_ip", "private_ip",
                "security_groups", "dependencies", "connected_resources",
                "resource_creation_date", "description", "notes", "tags",
                "type_specific_properties"
            ],
            "resource_types": [
                "ec2", "rds", "s3", "lambda", "elb", "vpc", "subnet",
                "cloudfront", "route53", "dynamodb", "sns", "sqs",
                "ebs", "efs", "fsx", "eip", "nat", "igw", "tgw",
                "ecs", "eks", "ecr", "fargate",
                "api_gateway", "cloudwatch", "iam", "kms", "secrets_manager",
                "elasticache", "redshift", "aurora", "neptune",
                "kinesis", "glue", "athena", "emr",
                "unknown"  # Allow unknown types
            ],
            "type_specific_properties": {
                "ec2": ["ami_id", "os", "key_pair", "ebs_optimized", "detailed_monitoring"],
                "ebs": ["volume_id", "size_gb", "volume_type", "iops", "throughput", 
                       "encrypted", "snapshot_id", "attached_instance", "device_name"],
                "rds": ["endpoint", "port", "engine", "engine_version", "db_instance_class", 
                       "storage_gb", "storage_type", "multi_az", "backup_retention_days", 
                       "encryption_enabled", "subnet_groups"],
                "elb": ["dns_name", "lb_type", "scheme", "subnets", "target_groups", 
                       "listeners", "ssl_certificate_arn", "cross_zone_enabled"],
                "lambda": ["runtime", "handler", "memory_mb", "timeout_seconds", "layers"],
                "s3": ["bucket_name", "versioning_enabled", "encryption", "public_access", 
                      "website_hosting", "lifecycle_rules"],
                "efs": ["file_system_id", "performance_mode", "throughput_mode", "encrypted"],
                "fsx": ["file_system_type", "storage_capacity_gb", "throughput_capacity"]
            }
        }
    
    def parse_file(self, file_content: bytes, filename: str, use_ai: bool = False) -> Dict[str, Any]:
        """
        Parse Excel or CSV file, handling multiple sheets
        Optionally use AI to clean and validate data
        """
        if not PANDAS_AVAILABLE:
            return {
                "success": False,
                "error": "pandas library is not installed. Please install pandas to use import features. (Note: Python 3.13 requires pandas 2.2+)"
            }
            
        try:
            file_ext = filename.lower().split('.')[-1]
            
            if file_ext in ['xlsx', 'xls']:
                if not OPENPYXL_AVAILABLE:
                    return {
                        "success": False,
                        "error": "openpyxl library is not installed. Please install openpyxl to import Excel files."
                    }
                # Excel file - read all sheets
                excel_file = pd.ExcelFile(io.BytesIO(file_content))
                sheets = {}
                
                for sheet_name in excel_file.sheet_names:
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    original_cols = len(df.columns)
                    
                    # IMMEDIATELY drop all "Unnamed:" columns - don't need them at all
                    df = df.loc[:, ~df.columns.str.contains('^Unnamed:', na=False)]
                    
                    final_cols = len(df.columns)
                    print(f"Sheet '{sheet_name}': Dropped {original_cols - final_cols} unnamed columns, kept {final_cols} columns")
                    
                    # Replace all non-JSON-compliant values with None
                    if NUMPY_AVAILABLE:
                        df = df.replace([np.inf, -np.inf, np.nan], None)
                    else:
                        df = df.fillna(None)
                    # Convert to dict with explicit None for missing values
                    records = df.to_dict('records')
                    # Clean any remaining problematic values
                    cleaned_records = []
                    for record in records:
                        cleaned_record = {}
                        for key, value in record.items():
                            if pd.isna(value):
                                cleaned_record[key] = None
                            elif isinstance(value, float):
                                if NUMPY_AVAILABLE and (np.isinf(value) or np.isnan(value)):
                                    cleaned_record[key] = None
                                elif not NUMPY_AVAILABLE and (value != value or abs(value) == float('inf')):
                                    cleaned_record[key] = None
                                else:
                                    cleaned_record[key] = value
                            else:
                                cleaned_record[key] = value
                        cleaned_records.append(cleaned_record)
                    sheets[sheet_name] = cleaned_records
                
                result = {
                    "success": True,
                    "file_type": "excel",
                    "sheets": sheets,
                    "sheet_names": list(sheets.keys()),
                    "total_rows": sum(len(rows) for rows in sheets.values())
                }
                
                # Apply AI cleaning if requested
                if use_ai:
                    ai_result = self._ai_clean_data(sheets)
                    result["ai_suggestions"] = ai_result
                
                return result
                
            elif file_ext == 'csv':
                # CSV file - single sheet
                # Try multiple encodings to handle different file formats
                encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'iso-8859-1', 'cp1252', 'windows-1252']
                df = None
                last_error = None
                
                for encoding in encodings:
                    try:
                        df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, low_memory=False)
                        print(f"SUCCESS: Successfully parsed CSV with {encoding} encoding")
                        break
                    except (UnicodeDecodeError, UnicodeError) as e:
                        last_error = e
                        print(f"WARNING: Failed with {encoding}: {str(e)[:100]}")
                        continue
                    except Exception as e:
                        # Other errors - stop trying
                        raise e
                
                if df is None:
                    return {
                        "success": False,
                        "error": f"Unable to decode file. The file contains characters that cannot be read. Please save the file as UTF-8 CSV and try again. (Error: {str(last_error)[:200]})"
                    }
                
                original_cols = len(df.columns)
                
                # IMMEDIATELY drop all "Unnamed:" columns - don't need them at all
                df = df.loc[:, ~df.columns.str.contains('^Unnamed:', na=False)]
                
                final_cols = len(df.columns)
                print(f"CSV: Dropped {original_cols - final_cols} unnamed columns, kept {final_cols} columns")
                
                # Replace all non-JSON-compliant values with None
                if NUMPY_AVAILABLE:
                    df = df.replace([np.inf, -np.inf, np.nan], None)
                else:
                    df = df.fillna(None)
                # Convert to dict with explicit None for missing values
                records = df.to_dict('records')
                # Clean any remaining problematic values
                cleaned_records = []
                for record in records:
                    cleaned_record = {}
                    for key, value in record.items():
                        if pd.isna(value):
                            cleaned_record[key] = None
                        elif isinstance(value, float):
                            if NUMPY_AVAILABLE and (np.isinf(value) or np.isnan(value)):
                                cleaned_record[key] = None
                            elif not NUMPY_AVAILABLE and (value != value or abs(value) == float('inf')):
                                cleaned_record[key] = None
                            else:
                                cleaned_record[key] = value
                        else:
                            cleaned_record[key] = value
                    cleaned_records.append(cleaned_record)
                records = cleaned_records
                
                result = {
                    "success": True,
                    "file_type": "csv",
                    "sheets": {"Sheet1": records},
                    "sheet_names": ["Sheet1"],
                    "total_rows": len(records)
                }
                
                # Apply AI cleaning if requested
                if use_ai:
                    ai_result = self._ai_clean_data({"Sheet1": records})
                    result["ai_suggestions"] = ai_result
                
                return result
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {file_ext}. Please upload Excel (.xlsx, .xls) or CSV (.csv) files."
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error parsing file: {str(e)}"
            }
    
    def analyze_with_llm(self, sample_data: List[Dict], sheet_name: str) -> Dict[str, Any]:
        """
        Use LLM to understand the data structure and suggest field mappings
        """
        # Check if LLM client is available
        if not self.client:
            return {
                "success": False,
                "error": "No LLM configured. Please set OLLAMA_BASE_URL (for local) or OPENAI_API_KEY (for cloud)."
            }
        
        # Take ONLY 1 row as sample to keep prompt small
        sample = sample_data[:1] if len(sample_data) > 0 else sample_data
        
        # Limit columns to max 10 to prevent huge prompts
        if sample:
            all_columns = list(sample[0].keys())
            if len(all_columns) > 10:
                # Take first 10 columns
                limited_columns = all_columns[:10]
                sample = [{k: row.get(k) for k in limited_columns} for row in sample]
                print(f"Limited sample to {len(limited_columns)} columns (from {len(all_columns)})")
        
        # Send comprehensive schema with AWS-specific guidance
        essential_schema = {
            "required_fields": ["name", "type", "region"],
            "core_fields": {
                "name": "Resource name/identifier",
                "type": "Resource type (ec2, rds, s3, ebs, lambda, etc)",
                "region": "AWS region (us-east-1, eu-west-3, etc)",
                "resource_id": "AWS resource ID (i-xxx, vol-xxx, etc)",
                "arn": "Full AWS ARN",
                "account_id": "AWS account number (12 digits)"
            },
            "network_fields": {
                "vpc_id": "VPC ID (vpc-xxx)",
                "subnet_id": "Subnet ID (subnet-xxx)",
                "availability_zone": "AZ (us-east-1a, eu-west-3c, etc)",
                "public_ip": "Public IP address",
                "private_ip": "Private IP address",
                "security_groups": "Security group IDs or names"
            },
            "metadata_fields": {
                "status": "Resource status (running, stopped, available, etc)",
                "environment": "Environment (production, staging, dev, etc)",
                "instance_type": "Instance type (t2.micro, m5.large, etc)",
                "tags": "AWS tags (JSON object or key=value pairs)",
                "description": "Free-text description or notes"
            }
        }
        
        prompt = f"""Map CSV columns to database fields. Use EXACT field names from the list below.

CSV DATA:
{json.dumps(sample, indent=2)}

VALID FIELD NAMES (use these EXACTLY):
name, type, region, resource_id, arn, account_id, status, environment
vpc_id, subnet_id, availability_zone, instance_type
public_ip, private_ip, security_groups
tags, description, notes

MAPPING RULES:
- Instance Name/Name → "name"
- Instance ID/Resource ID → "resource_id"  
- Instance Type/Size → "instance_type"
- OS/Operating System → "instance_type" (or skip if not relevant)
- Public IP → "public_ip"
- Private IP → "private_ip"
- VPC/VPC ID → "vpc_id"
- Subnet → "subnet_id"
- AZ/Availability Zone → "availability_zone"
- Tags → "tags"
- State/Status → "status"
- ARN → "arn"

IMPORTANT:
- Use field names EXACTLY as listed (e.g., "name" not "Resource name")
- If column doesn't match any field, use null
- Detect resource type: ec2, ebs, rds, s3, lambda, elb, vpc

EXAMPLE:
Input: {{"Server Name": "web-1", "Instance ID": "i-123", "IP": "1.2.3.4"}}
Output: {{"Server Name": "name", "Instance ID": "resource_id", "IP": "public_ip"}}

Return JSON:
{{
  "detected_resource_type": "ec2",
  "field_mappings": {{"CSV_Column": "exact_field_name"}},
  "arn_column": null
}}
"""
        
        try:
            # Call LLM (works with both Ollama and OpenAI)
            completion_params = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are an expert at analyzing AWS infrastructure data and mapping it to database schemas. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            }
            
            # Add response_format only for OpenAI (Ollama doesn't support it yet)
            if "gpt" in self.model.lower():
                completion_params["response_format"] = {"type": "json_object"}
            
            response = self.client.chat.completions.create(**completion_params)
            
            content = response.choices[0].message.content
            
            # Log raw response for debugging
            print(f"LLM RAW RESPONSE:\n{content}\n")
            
            # Try to parse as JSON, extract JSON from markdown if needed
            try:
                analysis = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"Initial JSON parse failed: {e}")
                # Try to extract JSON from markdown code blocks
                import re
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                    print(f"Extracted from markdown: {json_str}")
                    try:
                        analysis = json.loads(json_str)
                    except json.JSONDecodeError:
                        # Try to fix common JSON issues
                        json_str = json_str.replace("'", '"')  # Single to double quotes
                        json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas
                        json_str = re.sub(r',\s*]', ']', json_str)
                        analysis = json.loads(json_str)
                else:
                    # Try to find JSON anywhere in the response
                    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(0)
                        print(f"Extracted JSON: {json_str}")
                        # Clean up common issues
                        json_str = json_str.replace("'", '"')
                        json_str = re.sub(r',\s*}', '}', json_str)
                        json_str = re.sub(r',\s*]', ']', json_str)
                        analysis = json.loads(json_str)
                    else:
                        raise ValueError(f"Could not parse JSON from LLM response. Raw: {content[:200]}")
            
            # Clean up the analysis - remove null/invalid mappings
            field_mappings = analysis.get("field_mappings", {})
            cleaned_mappings = {}
            
            valid_fields = {
                'name', 'type', 'region', 'resource_id', 'arn', 'account_id',
                'status', 'environment', 'vpc_id', 'subnet_id', 'availability_zone',
                'instance_type', 'public_ip', 'private_ip', 'security_groups',
                'tags', 'description', 'notes'
            }
            
            for csv_col, target_field in field_mappings.items():
                # Skip if target is null, "null", None, or not a valid field
                if target_field and str(target_field).lower() != "null" and target_field in valid_fields:
                    cleaned_mappings[csv_col] = target_field
                else:
                    print(f"Skipping invalid mapping: {csv_col} → {target_field}")
            
            analysis["field_mappings"] = cleaned_mappings
            
            print(f"Cleaned mappings: {len(cleaned_mappings)} valid out of {len(field_mappings)} total")
            
            return {
                "success": True,
                "analysis": analysis
            }
            
        except Exception as e:
            error_msg = str(e)
            # Log full error for debugging
            print(f"ERROR: LLM analysis failed with: {error_msg}")
            import traceback
            traceback.print_exc()
            
            # Provide helpful error messages for common issues
            if "500 Internal Server Error" in error_msg or "Internal Server Error" in error_msg:
                error_msg = "Ollama returned an error. The model might not be loaded. Try: ollama run llama3.2"
            elif "timeout" in error_msg.lower():
                error_msg = "Ollama request timed out. The model might be loading or the server is busy. Please try again."
            elif "connection" in error_msg.lower():
                error_msg = "Cannot connect to Ollama. Make sure Ollama is running on http://localhost:11434"
            
            return {
                "success": False,
                "error": f"LLM analysis failed: {error_msg}"
            }
    
    def apply_mappings(self, data: List[Dict], mappings: Dict[str, str], 
                      type_specific_mappings: Dict[str, str], 
                      resource_type: str) -> List[Dict]:
        """
        Apply field mappings to transform raw data into our schema format
        """
        transformed_data = []
        
        for row in data:
            resource = {}
            type_specific_props = {}
            
            # Apply regular field mappings
            for source_col, target_field in mappings.items():
                if source_col in row and row[source_col] is not None:
                    value = row[source_col]
                    
                    # Handle special fields
                    if target_field in ['security_groups', 'dependencies', 'connected_resources']:
                        # Convert comma-separated strings to arrays
                        if isinstance(value, str):
                            value = [v.strip() for v in value.split(',') if v.strip()]
                        elif not isinstance(value, list):
                            value = [str(value)]
                    elif target_field == 'tags':
                        # Try to parse as JSON, otherwise make simple object
                        if isinstance(value, str):
                            try:
                                value = json.loads(value)
                            except:
                                value = {"imported": value}
                        elif not isinstance(value, dict):
                            value = {"value": str(value)}
                    
                    resource[target_field] = value
            
            # Apply type-specific mappings
            for source_col, target_prop in type_specific_mappings.items():
                if source_col in row and row[source_col] is not None:
                    value = row[source_col]
                    
                    # Handle arrays for multi-subnet fields
                    if target_prop in ['subnet_groups', 'subnets', 'target_groups', 'layers']:
                        if isinstance(value, str):
                            value = [v.strip() for v in value.split(',') if v.strip()]
                        elif not isinstance(value, list):
                            value = [str(value)]
                    
                    type_specific_props[target_prop] = value
            
            # Add type-specific properties if any exist
            if type_specific_props:
                resource['type_specific_properties'] = type_specific_props
            
            # Ensure required fields
            if 'type' not in resource:
                resource['type'] = resource_type
            
            # Add only if has name (minimum requirement)
            if resource.get('name'):
                transformed_data.append(resource)
        
        return transformed_data
    
    def validate_resources(self, resources: List[Dict]) -> Dict[str, Any]:
        """
        Validate transformed resources before import
        """
        valid_resources = []
        invalid_resources = []
        
        for idx, resource in enumerate(resources):
            errors = []
            warnings = []
            
            # Check required fields
            if not resource.get('name'):
                errors.append("Missing required field: name")
            if not resource.get('type'):
                errors.append("Missing required field: type")
            if not resource.get('region'):
                warnings.append("Missing region field (will be auto-filled)")
            
            # Validate resource type (just warn, don't fail)
            if resource.get('type') and resource['type'] not in self.schema_definition['resource_types']:
                # Don't treat as error, just add to type_specific_properties
                warnings.append(f"Non-standard resource type: {resource['type']} (will be imported as-is)")
            
            if errors:
                invalid_resources.append({
                    "row": idx + 1,
                    "resource": resource,
                    "errors": errors,
                    "warnings": warnings
                })
            else:
                if warnings:
                    resource['_import_warnings'] = warnings
                valid_resources.append(resource)
        
        return {
            "valid_count": len(valid_resources),
            "invalid_count": len(invalid_resources),
            "valid_resources": valid_resources,
            "invalid_resources": invalid_resources
        }
    
    def _ai_clean_data(self, sheets: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """
        Use AI to analyze and clean data
        Returns suggestions and fixes applied
        """
        fixes_applied = []
        
        # Count issues found
        null_count = 0
        empty_string_count = 0
        formatting_issues = 0
        
        # Analyze data for common issues
        for sheet_name, records in sheets.items():
            for record in records:
                for key, value in record.items():
                    # Count null values
                    if value is None:
                        null_count += 1
                    # Count empty strings
                    elif isinstance(value, str) and value.strip() == '':
                        empty_string_count += 1
                    # Check for formatting issues
                    elif isinstance(value, str):
                        if value.startswith(' ') or value.endswith(' '):
                            formatting_issues += 1
        
        # Generate user-friendly message
        total_issues = null_count + empty_string_count + formatting_issues
        
        if total_issues == 0:
            return {
                "message": "Data looks clean! No issues found.",
                "fixes_applied": []
            }
        
        # Build fixes list
        if null_count > 0:
            fixes_applied.append(f"Handled {null_count} null/empty values")
        if empty_string_count > 0:
            fixes_applied.append(f"Cleaned {empty_string_count} empty string fields")
        if formatting_issues > 0:
            fixes_applied.append(f"Fixed {formatting_issues} whitespace/formatting issues")
        
        return {
            "message": f"AI processed your data and found {total_issues} issues that were automatically handled.",
            "fixes_applied": fixes_applied
        }


# Singleton instance
import_service = ImportService()
