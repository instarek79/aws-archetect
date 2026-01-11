"""
AWS Resource Scanner Service
Scans AWS accounts using boto3 and imports resources into the database
"""
import boto3
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from sqlalchemy.orm import Session
from app.models import Resource
import logging

logger = logging.getLogger(__name__)


class AWSScanner:
    """Scans AWS resources using boto3 and imports them into the database"""
    
    def __init__(self, aws_access_key_id: str, aws_secret_access_key: str, region: str = 'us-east-1', session_token: Optional[str] = None):
        """Initialize AWS scanner with credentials"""
        self.session = boto3.Session(
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            aws_session_token=session_token,
            region_name=region
        )
        self.region = region
        self.account_id = None
        
    def get_account_id(self) -> str:
        """Get AWS account ID"""
        if not self.account_id:
            sts = self.session.client('sts')
            self.account_id = sts.get_caller_identity()['Account']
        return self.account_id
    
    def scan_ec2_instances(self) -> List[Dict[str, Any]]:
        """Scan EC2 instances"""
        ec2 = self.session.client('ec2')
        resources = []
        
        try:
            response = ec2.describe_instances()
            for reservation in response['Reservations']:
                for instance in reservation['Instances']:
                    tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
                    
                    resource = {
                        'name': tags.get('Name', instance['InstanceId']),
                        'resource_id': instance['InstanceId'],
                        'type': 'ec2',
                        'status': instance['State']['Name'],
                        'region': self.region,
                        'account_id': self.get_account_id(),
                        'vpc_id': instance.get('VpcId'),
                        'subnet_id': instance.get('SubnetId'),
                        'private_ip': instance.get('PrivateIpAddress'),
                        'public_ip': instance.get('PublicIpAddress'),
                        'tags': tags,
                        'type_specific_properties': {
                            'instance_type': instance['InstanceType'],
                            'ami_id': instance['ImageId'],
                            'key_name': instance.get('KeyName'),
                            'availability_zone': instance['Placement']['AvailabilityZone'],
                            'launch_time': instance['LaunchTime'].isoformat(),
                            'security_groups': [sg['GroupId'] for sg in instance.get('SecurityGroups', [])],
                            'monitoring': instance.get('Monitoring', {}).get('State'),
                            'platform': instance.get('Platform', 'linux')
                        }
                    }
                    resources.append(resource)
                    
            logger.info(f"Found {len(resources)} EC2 instances")
        except Exception as e:
            logger.error(f"Error scanning EC2 instances: {e}")
            
        return resources
    
    def scan_rds_instances(self) -> List[Dict[str, Any]]:
        """Scan RDS instances"""
        rds = self.session.client('rds')
        resources = []
        
        try:
            response = rds.describe_db_instances()
            for db in response['DBInstances']:
                tags_response = rds.list_tags_for_resource(ResourceName=db['DBInstanceArn'])
                tags = {tag['Key']: tag['Value'] for tag in tags_response.get('TagList', [])}
                
                resource = {
                    'name': db['DBInstanceIdentifier'],
                    'resource_id': db['DBInstanceIdentifier'],
                    'type': 'rds',
                    'status': db['DBInstanceStatus'],
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'vpc_id': db.get('DBSubnetGroup', {}).get('VpcId'),
                    'tags': tags,
                    'type_specific_properties': {
                        'engine': db['Engine'],
                        'engine_version': db['EngineVersion'],
                        'instance_class': db['DBInstanceClass'],
                        'allocated_storage': db['AllocatedStorage'],
                        'storage_type': db.get('StorageType'),
                        'multi_az': db.get('MultiAZ', False),
                        'endpoint': db.get('Endpoint', {}).get('Address'),
                        'port': db.get('Endpoint', {}).get('Port'),
                        'availability_zone': db.get('AvailabilityZone'),
                        'backup_retention_period': db.get('BackupRetentionPeriod'),
                        'publicly_accessible': db.get('PubliclyAccessible', False)
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} RDS instances")
        except Exception as e:
            logger.error(f"Error scanning RDS instances: {e}")
            
        return resources
    
    def scan_lambda_functions(self) -> List[Dict[str, Any]]:
        """Scan Lambda functions"""
        lambda_client = self.session.client('lambda')
        resources = []
        
        try:
            response = lambda_client.list_functions()
            for func in response['Functions']:
                tags = lambda_client.list_tags(Resource=func['FunctionArn']).get('Tags', {})
                
                resource = {
                    'name': func['FunctionName'],
                    'resource_id': func['FunctionName'],
                    'type': 'lambda',
                    'status': func['State'],
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'vpc_id': func.get('VpcConfig', {}).get('VpcId'),
                    'tags': tags,
                    'type_specific_properties': {
                        'runtime': func['Runtime'],
                        'handler': func['Handler'],
                        'memory_size': func['MemorySize'],
                        'timeout': func['Timeout'],
                        'code_size': func['CodeSize'],
                        'last_modified': func['LastModified'],
                        'role': func['Role'],
                        'environment': func.get('Environment', {}).get('Variables', {}),
                        'layers': [layer['Arn'] for layer in func.get('Layers', [])]
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} Lambda functions")
        except Exception as e:
            logger.error(f"Error scanning Lambda functions: {e}")
            
        return resources
    
    def scan_s3_buckets(self) -> List[Dict[str, Any]]:
        """Scan S3 buckets"""
        s3 = self.session.client('s3')
        resources = []
        
        try:
            response = s3.list_buckets()
            for bucket in response['Buckets']:
                bucket_name = bucket['Name']
                
                try:
                    location = s3.get_bucket_location(Bucket=bucket_name)
                    bucket_region = location['LocationConstraint'] or 'us-east-1'
                    
                    tags = {}
                    try:
                        tags_response = s3.get_bucket_tagging(Bucket=bucket_name)
                        tags = {tag['Key']: tag['Value'] for tag in tags_response.get('TagSet', [])}
                    except:
                        pass
                    
                    resource = {
                        'name': bucket_name,
                        'resource_id': bucket_name,
                        'type': 's3',
                        'status': 'active',
                        'region': bucket_region,
                        'account_id': self.get_account_id(),
                        'tags': tags,
                        'type_specific_properties': {
                            'creation_date': bucket['CreationDate'].isoformat()
                        }
                    }
                    resources.append(resource)
                except Exception as e:
                    logger.warning(f"Error getting details for bucket {bucket_name}: {e}")
                    
            logger.info(f"Found {len(resources)} S3 buckets")
        except Exception as e:
            logger.error(f"Error scanning S3 buckets: {e}")
            
        return resources
    
    def scan_load_balancers(self) -> List[Dict[str, Any]]:
        """Scan Application and Network Load Balancers"""
        elb = self.session.client('elbv2')
        resources = []
        
        try:
            response = elb.describe_load_balancers()
            for lb in response['LoadBalancers']:
                tags_response = elb.describe_tags(ResourceArns=[lb['LoadBalancerArn']])
                tags = {}
                if tags_response['TagDescriptions']:
                    tags = {tag['Key']: tag['Value'] for tag in tags_response['TagDescriptions'][0].get('Tags', [])}
                
                resource = {
                    'name': lb['LoadBalancerName'],
                    'resource_id': lb['LoadBalancerArn'].split('/')[-1],
                    'type': 'elb',
                    'status': lb['State']['Code'],
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'vpc_id': lb.get('VpcId'),
                    'tags': tags,
                    'type_specific_properties': {
                        'type': lb['Type'],
                        'scheme': lb['Scheme'],
                        'dns_name': lb['DNSName'],
                        'availability_zones': [az['ZoneName'] for az in lb.get('AvailabilityZones', [])],
                        'security_groups': lb.get('SecurityGroups', [])
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} Load Balancers")
        except Exception as e:
            logger.error(f"Error scanning Load Balancers: {e}")
            
        return resources
    
    def scan_vpcs(self) -> List[Dict[str, Any]]:
        """Scan VPCs"""
        ec2 = self.session.client('ec2')
        resources = []
        
        try:
            response = ec2.describe_vpcs()
            for vpc in response['Vpcs']:
                tags = {tag['Key']: tag['Value'] for tag in vpc.get('Tags', [])}
                
                resource = {
                    'name': tags.get('Name', vpc['VpcId']),
                    'resource_id': vpc['VpcId'],
                    'type': 'vpc',
                    'status': vpc['State'],
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'vpc_id': vpc['VpcId'],
                    'tags': tags,
                    'type_specific_properties': {
                        'cidr_block': vpc['CidrBlock'],
                        'is_default': vpc.get('IsDefault', False),
                        'dhcp_options_id': vpc.get('DhcpOptionsId'),
                        'instance_tenancy': vpc.get('InstanceTenancy')
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} VPCs")
        except Exception as e:
            logger.error(f"Error scanning VPCs: {e}")
            
        return resources
    
    def scan_ecs_clusters(self) -> List[Dict[str, Any]]:
        """Scan ECS Clusters"""
        ecs = self.session.client('ecs')
        resources = []
        
        try:
            cluster_arns = ecs.list_clusters()['clusterArns']
            if cluster_arns:
                clusters = ecs.describe_clusters(clusters=cluster_arns)['clusters']
                for cluster in clusters:
                    tags_response = ecs.list_tags_for_resource(resourceArn=cluster['clusterArn'])
                    tags = {tag['key']: tag['value'] for tag in tags_response.get('tags', [])}
                    
                    resource = {
                        'name': cluster['clusterName'],
                        'resource_id': cluster['clusterArn'].split('/')[-1],
                        'type': 'ecs',
                        'status': cluster['status'],
                        'region': self.region,
                        'account_id': self.get_account_id(),
                        'tags': tags,
                        'type_specific_properties': {
                            'active_services': cluster.get('activeServicesCount', 0),
                            'running_tasks': cluster.get('runningTasksCount', 0),
                            'pending_tasks': cluster.get('pendingTasksCount', 0),
                            'registered_container_instances': cluster.get('registeredContainerInstancesCount', 0)
                        }
                    }
                    resources.append(resource)
                    
            logger.info(f"Found {len(resources)} ECS clusters")
        except Exception as e:
            logger.error(f"Error scanning ECS clusters: {e}")
            
        return resources
    
    def scan_eks_clusters(self) -> List[Dict[str, Any]]:
        """Scan EKS Clusters"""
        eks = self.session.client('eks')
        resources = []
        
        try:
            cluster_names = eks.list_clusters()['clusters']
            for cluster_name in cluster_names:
                cluster = eks.describe_cluster(name=cluster_name)['cluster']
                tags = cluster.get('tags', {})
                
                resource = {
                    'name': cluster['name'],
                    'resource_id': cluster['name'],
                    'type': 'eks',
                    'status': cluster['status'],
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'vpc_id': cluster.get('resourcesVpcConfig', {}).get('vpcId'),
                    'tags': tags,
                    'type_specific_properties': {
                        'version': cluster.get('version'),
                        'endpoint': cluster.get('endpoint'),
                        'role_arn': cluster.get('roleArn'),
                        'platform_version': cluster.get('platformVersion'),
                        'created_at': cluster.get('createdAt').isoformat() if cluster.get('createdAt') else None
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} EKS clusters")
        except Exception as e:
            logger.error(f"Error scanning EKS clusters: {e}")
            
        return resources
    
    def scan_dynamodb_tables(self) -> List[Dict[str, Any]]:
        """Scan DynamoDB Tables"""
        dynamodb = self.session.client('dynamodb')
        resources = []
        
        try:
            table_names = dynamodb.list_tables()['TableNames']
            for table_name in table_names:
                table = dynamodb.describe_table(TableName=table_name)['Table']
                tags_response = dynamodb.list_tags_of_resource(ResourceArn=table['TableArn'])
                tags = {tag['Key']: tag['Value'] for tag in tags_response.get('Tags', [])}
                
                resource = {
                    'name': table['TableName'],
                    'resource_id': table['TableName'],
                    'type': 'dynamodb',
                    'status': table['TableStatus'],
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'tags': tags,
                    'type_specific_properties': {
                        'item_count': table.get('ItemCount', 0),
                        'table_size_bytes': table.get('TableSizeBytes', 0),
                        'billing_mode': table.get('BillingModeSummary', {}).get('BillingMode'),
                        'read_capacity': table.get('ProvisionedThroughput', {}).get('ReadCapacityUnits'),
                        'write_capacity': table.get('ProvisionedThroughput', {}).get('WriteCapacityUnits'),
                        'created_at': table.get('CreationDateTime').isoformat() if table.get('CreationDateTime') else None
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} DynamoDB tables")
        except Exception as e:
            logger.error(f"Error scanning DynamoDB tables: {e}")
            
        return resources
    
    def scan_sns_topics(self) -> List[Dict[str, Any]]:
        """Scan SNS Topics"""
        sns = self.session.client('sns')
        resources = []
        
        try:
            topics = sns.list_topics()['Topics']
            for topic in topics:
                topic_arn = topic['TopicArn']
                topic_name = topic_arn.split(':')[-1]
                
                try:
                    tags_response = sns.list_tags_for_resource(ResourceArn=topic_arn)
                    tags = {tag['Key']: tag['Value'] for tag in tags_response.get('Tags', [])}
                except:
                    tags = {}
                
                attrs = sns.get_topic_attributes(TopicArn=topic_arn)['Attributes']
                
                resource = {
                    'name': topic_name,
                    'resource_id': topic_name,
                    'type': 'sns',
                    'status': 'active',
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'tags': tags,
                    'type_specific_properties': {
                        'topic_arn': topic_arn,
                        'subscriptions_confirmed': attrs.get('SubscriptionsConfirmed', '0'),
                        'subscriptions_pending': attrs.get('SubscriptionsPending', '0'),
                        'display_name': attrs.get('DisplayName', '')
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} SNS topics")
        except Exception as e:
            logger.error(f"Error scanning SNS topics: {e}")
            
        return resources
    
    def scan_sqs_queues(self) -> List[Dict[str, Any]]:
        """Scan SQS Queues"""
        sqs = self.session.client('sqs')
        resources = []
        
        try:
            queue_urls = sqs.list_queues().get('QueueUrls', [])
            for queue_url in queue_urls:
                queue_name = queue_url.split('/')[-1]
                attrs = sqs.get_queue_attributes(
                    QueueUrl=queue_url,
                    AttributeNames=['All']
                )['Attributes']
                
                try:
                    tags_response = sqs.list_queue_tags(QueueUrl=queue_url)
                    tags = tags_response.get('Tags', {})
                except:
                    tags = {}
                
                resource = {
                    'name': queue_name,
                    'resource_id': queue_name,
                    'type': 'sqs',
                    'status': 'active',
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'tags': tags,
                    'type_specific_properties': {
                        'queue_url': queue_url,
                        'approximate_messages': attrs.get('ApproximateNumberOfMessages', '0'),
                        'message_retention': attrs.get('MessageRetentionPeriod', '0'),
                        'visibility_timeout': attrs.get('VisibilityTimeout', '0'),
                        'fifo_queue': attrs.get('FifoQueue', 'false')
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} SQS queues")
        except Exception as e:
            logger.error(f"Error scanning SQS queues: {e}")
            
        return resources
    
    def scan_api_gateways(self) -> List[Dict[str, Any]]:
        """Scan API Gateway REST APIs"""
        apigateway = self.session.client('apigateway')
        resources = []
        
        try:
            apis = apigateway.get_rest_apis()['items']
            for api in apis:
                tags = api.get('tags', {})
                
                resource = {
                    'name': api['name'],
                    'resource_id': api['id'],
                    'type': 'apigateway',
                    'status': 'active',
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'tags': tags,
                    'type_specific_properties': {
                        'api_id': api['id'],
                        'description': api.get('description', ''),
                        'created_date': api.get('createdDate').isoformat() if api.get('createdDate') else None,
                        'endpoint_configuration': api.get('endpointConfiguration', {}).get('types', [])
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} API Gateways")
        except Exception as e:
            logger.error(f"Error scanning API Gateways: {e}")
            
        return resources
    
    def scan_codepipeline(self) -> List[Dict[str, Any]]:
        """Scan CodePipeline pipelines"""
        codepipeline = self.session.client('codepipeline')
        resources = []
        
        try:
            pipelines = codepipeline.list_pipelines()['pipelines']
            for pipeline_summary in pipelines:
                pipeline_name = pipeline_summary['name']
                
                # Get detailed pipeline info
                pipeline = codepipeline.get_pipeline(name=pipeline_name)['pipeline']
                
                # Get pipeline tags
                try:
                    tags_response = codepipeline.list_tags_for_resource(
                        resourceArn=f"arn:aws:codepipeline:{self.region}:{self.get_account_id()}:pipeline:{pipeline_name}"
                    )
                    tags = {tag['key']: tag['value'] for tag in tags_response.get('tags', [])}
                except:
                    tags = {}
                
                # Get pipeline state
                try:
                    state = codepipeline.get_pipeline_state(name=pipeline_name)
                    last_execution_status = 'Unknown'
                    if state.get('stageStates'):
                        # Get status from latest stage
                        latest_stage = state['stageStates'][0]
                        if latest_stage.get('latestExecution'):
                            last_execution_status = latest_stage['latestExecution'].get('status', 'Unknown')
                except:
                    last_execution_status = 'Unknown'
                
                resource = {
                    'name': pipeline_name,
                    'resource_id': pipeline_name,
                    'type': 'codepipeline',
                    'status': last_execution_status.lower(),
                    'region': self.region,
                    'account_id': self.get_account_id(),
                    'tags': tags,
                    'type_specific_properties': {
                        'version': pipeline.get('version'),
                        'role_arn': pipeline.get('roleArn'),
                        'stages': [stage['name'] for stage in pipeline.get('stages', [])],
                        'stage_count': len(pipeline.get('stages', [])),
                        'created_at': pipeline_summary.get('created').isoformat() if pipeline_summary.get('created') else None,
                        'updated_at': pipeline_summary.get('updated').isoformat() if pipeline_summary.get('updated') else None
                    }
                }
                resources.append(resource)
                
            logger.info(f"Found {len(resources)} CodePipeline pipelines")
        except Exception as e:
            logger.error(f"Error scanning CodePipeline: {e}")
            
        return resources
    
    def scan_all_resources(self) -> Dict[str, List[Dict[str, Any]]]:
        """Scan all supported AWS resources"""
        logger.info(f"Starting AWS resource scan for region {self.region}")
        
        results = {
            'ec2': self.scan_ec2_instances(),
            'rds': self.scan_rds_instances(),
            'lambda': self.scan_lambda_functions(),
            's3': self.scan_s3_buckets(),
            'elb': self.scan_load_balancers(),
            'vpc': self.scan_vpcs(),
            'ecs': self.scan_ecs_clusters(),
            'eks': self.scan_eks_clusters(),
            'dynamodb': self.scan_dynamodb_tables(),
            'sns': self.scan_sns_topics(),
            'sqs': self.scan_sqs_queues(),
            'apigateway': self.scan_api_gateways(),
            'codepipeline': self.scan_codepipeline()
        }
        
        total = sum(len(resources) for resources in results.values())
        logger.info(f"Scan complete. Found {total} total resources")
        
        return results
    
    def import_resources_to_db(self, db: Session, user_id: int, resources: Dict[str, List[Dict[str, Any]]]) -> Dict[str, int]:
        """Import scanned resources into the database"""
        stats = {
            'created': 0,
            'updated': 0,
            'errors': 0
        }
        
        for resource_type, resource_list in resources.items():
            logger.info(f"Processing {len(resource_list)} {resource_type} resources...")
            for resource_data in resource_list:
                try:
                    # Check if resource already exists
                    existing = db.query(Resource).filter(
                        Resource.resource_id == resource_data['resource_id'],
                        Resource.created_by == user_id
                    ).first()
                    
                    if existing:
                        # Update existing resource
                        for key, value in resource_data.items():
                            if key == 'type_specific_properties':
                                existing.type_specific_properties = value
                            elif key == 'tags':
                                existing.tags = value
                            elif hasattr(existing, key):
                                setattr(existing, key, value)
                        stats['updated'] += 1
                        logger.info(f"Updated resource: {resource_data.get('name')} ({resource_data.get('type')})")
                    else:
                        # Create new resource - filter valid fields only
                        valid_fields = {
                            'name', 'type', 'region', 'arn', 'account_id', 'resource_id',
                            'status', 'environment', 'cost_center', 'owner', 'application', 'project',
                            'vpc_id', 'subnet_id', 'availability_zone', 'security_groups',
                            'public_ip', 'private_ip', 'dns_name', 'endpoint',
                            'instance_type', 'resource_creation_date',
                            'type_specific_properties', 'dependencies', 'connected_resources',
                            'attached_to', 'parent_resource', 'child_resources',
                            'target_resources', 'source_resources',
                            'encryption_enabled', 'public_access', 'compliance_status',
                            'monthly_cost_estimate', 'last_cost_update',
                            'tags', 'description', 'notes', 'aws_service', 'aws_resource_type',
                            'last_reported_at'
                        }
                        
                        filtered_data = {k: v for k, v in resource_data.items() if k in valid_fields}
                        
                        new_resource = Resource(
                            created_by=user_id,
                            **filtered_data
                        )
                        db.add(new_resource)
                        stats['created'] += 1
                        logger.info(f"Created resource: {resource_data.get('name')} ({resource_data.get('type')})")
                        
                except Exception as e:
                    logger.error(f"Error importing resource {resource_data.get('name')}: {e}")
                    logger.error(f"Resource data: {resource_data}")
                    stats['errors'] += 1
                    
        try:
            db.commit()
            logger.info(f"Import complete: {stats['created']} created, {stats['updated']} updated, {stats['errors']} errors")
        except Exception as e:
            logger.error(f"Database commit failed: {e}")
            db.rollback()
            raise
        
        return stats
