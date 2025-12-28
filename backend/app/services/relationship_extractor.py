"""
Service to extract relationships between AWS resources from CSV data.
Analyzes ARNs, CloudFormation stacks, security groups, and other implicit connections.
"""
from typing import List, Dict, Tuple, Set
from sqlalchemy.orm import Session
from app.models import Resource, ResourceRelationship
import re


class RelationshipExtractor:
    """Extract implicit relationships from resource data"""
    
    @staticmethod
    def extract_from_cloudformation_stacks(db: Session) -> List[Tuple[int, int, str]]:
        """
        Resources in the same CloudFormation stack are related.
        Returns: List of (source_id, target_id, relationship_type)
        """
        relationships = []
        
        # Get all resources with CloudFormation stack info in tags
        resources = db.query(Resource).filter(
            Resource.tags.isnot(None)
        ).all()
        
        # Group by stack ID
        stacks = {}
        for resource in resources:
            if not resource.tags:
                continue
            
            stack_id = resource.tags.get('aws:cloudformation:stack-id')
            if stack_id:
                if stack_id not in stacks:
                    stacks[stack_id] = []
                stacks[stack_id].append(resource)
        
        # Create relationships between resources in same stack
        for stack_id, stack_resources in stacks.items():
            for i, res1 in enumerate(stack_resources):
                for res2 in stack_resources[i+1:]:
                    # Determine relationship direction based on resource types
                    rel_type = RelationshipExtractor._determine_stack_relationship(res1, res2)
                    if rel_type:
                        relationships.append((res1.id, res2.id, rel_type))
        
        return relationships
    
    @staticmethod
    def _determine_stack_relationship(res1: Resource, res2: Resource) -> str:
        """Determine relationship type between two resources in same stack"""
        type1 = res1.type.lower() if res1.type else ''
        type2 = res2.type.lower() if res2.type else ''
        
        # Lambda -> DynamoDB/SQS/SNS
        if 'lambda' in type1 and any(x in type2 for x in ['dynamodb', 'sqs', 'sns']):
            return 'uses'
        if 'lambda' in type2 and any(x in type1 for x in ['dynamodb', 'sqs', 'sns']):
            return 'uses'
        
        # EC2 -> RDS
        if any(x in type1 for x in ['ec2', 'instance']) and any(x in type2 for x in ['rds', 'aurora']):
            return 'uses'
        if any(x in type2 for x in ['ec2', 'instance']) and any(x in type1 for x in ['rds', 'aurora']):
            return 'uses'
        
        # ELB -> EC2
        if 'elb' in type1 or 'loadbalancing' in type1:
            if any(x in type2 for x in ['ec2', 'instance']):
                return 'routes_to'
        if 'elb' in type2 or 'loadbalancing' in type2:
            if any(x in type1 for x in ['ec2', 'instance']):
                return 'routes_to'
        
        # CodePipeline -> CodeBuild
        if 'codepipeline' in type1 and 'codebuild' in type2:
            return 'uses'
        if 'codepipeline' in type2 and 'codebuild' in type1:
            return 'uses'
        
        # Default: depends_on
        return 'depends_on'
    
    @staticmethod
    def extract_from_vpc_subnet(db: Session) -> List[Tuple[int, int, str]]:
        """
        Resources in same VPC/subnet are connected.
        Returns: List of (source_id, target_id, relationship_type)
        """
        relationships = []
        
        # Group resources by VPC
        vpcs = {}
        resources = db.query(Resource).filter(
            Resource.vpc_id.isnot(None)
        ).all()
        
        for resource in resources:
            vpc_id = resource.vpc_id
            if vpc_id not in vpcs:
                vpcs[vpc_id] = []
            vpcs[vpc_id].append(resource)
        
        # Create relationships within each VPC
        for vpc_id, vpc_resources in vpcs.items():
            # ELB to EC2 instances
            elbs = [r for r in vpc_resources if 'elb' in (r.type or '').lower() or 'loadbalancing' in (r.type or '').lower()]
            instances = [r for r in vpc_resources if r.type and any(x in r.type.lower() for x in ['ec2', 'instance'])]
            
            for elb in elbs:
                for instance in instances[:3]:  # Limit to 3 connections per ELB
                    relationships.append((elb.id, instance.id, 'routes_to'))
            
            # EC2 to RDS
            rds_resources = [r for r in vpc_resources if r.type and any(x in r.type.lower() for x in ['rds', 'aurora'])]
            for instance in instances:
                for rds in rds_resources[:1]:  # One RDS per instance
                    relationships.append((instance.id, rds.id, 'uses'))
            
            # Lambda to DynamoDB (if in same VPC)
            lambdas = [r for r in vpc_resources if 'lambda' in (r.type or '').lower()]
            dynamodbs = [r for r in vpc_resources if 'dynamodb' in (r.type or '').lower()]
            
            for lambda_fn in lambdas:
                for dynamo in dynamodbs[:1]:
                    relationships.append((lambda_fn.id, dynamo.id, 'uses'))
        
        return relationships
    
    @staticmethod
    def extract_from_security_groups(db: Session) -> List[Tuple[int, int, str]]:
        """
        Security group rules reference other security groups.
        Returns: List of (source_id, target_id, relationship_type)
        """
        relationships = []
        
        # Get all security groups and their rules
        sg_resources = db.query(Resource).filter(
            Resource.type.in_(['security_group', 'ec2:security-group'])
        ).all()
        
        sg_rule_resources = db.query(Resource).filter(
            Resource.type.in_(['security_group_rule', 'ec2:security-group-rule'])
        ).all()
        
        # Security groups apply to EC2 instances
        for sg in sg_resources:
            # Find EC2 instances that might use this security group
            instances = db.query(Resource).filter(
                Resource.type.in_(['ec2', 'instance']),
                Resource.vpc_id == sg.vpc_id
            ).limit(2).all()
            
            for instance in instances:
                relationships.append((sg.id, instance.id, 'applies_to'))
        
        return relationships
    
    @staticmethod
    def extract_from_arn_references(db: Session) -> List[Tuple[int, int, str]]:
        """
        Extract relationships from ARN references in resource properties.
        Returns: List of (source_id, target_id, relationship_type)
        """
        relationships = []
        
        # Lambda event source mappings
        event_mappings = db.query(Resource).filter(
            Resource.type == 'lambda:event-source-mapping'
        ).all()
        
        for mapping in event_mappings:
            # Extract Lambda ARN and source ARN from properties
            if mapping.type_specific_properties:
                lambda_arn = mapping.type_specific_properties.get('FunctionArn')
                source_arn = mapping.type_specific_properties.get('EventSourceArn')
                
                if lambda_arn and source_arn:
                    # Find resources by ARN
                    lambda_res = db.query(Resource).filter(Resource.arn == lambda_arn).first()
                    source_res = db.query(Resource).filter(Resource.arn == source_arn).first()
                    
                    if lambda_res and source_res:
                        relationships.append((source_res.id, lambda_res.id, 'triggers'))
        
        return relationships
    
    @staticmethod
    def get_relationship_metadata(rel_type: str, source_type: str, target_type: str) -> dict:
        """
        Get metadata for a relationship based on type and resource types.
        Returns: dict with port, protocol, direction, label
        """
        metadata = {
            'port': None,
            'protocol': None,
            'direction': 'outbound',
            'label': None,
            'status': 'active'
        }
        
        # Define common ports and protocols
        if rel_type == 'uses':
            if 'rds' in target_type or 'aurora' in target_type:
                metadata['port'] = 3306  # MySQL/Aurora default
                metadata['protocol'] = 'TCP'
                metadata['label'] = 'DB Connection'
            elif 'dynamodb' in target_type:
                metadata['port'] = 443
                metadata['protocol'] = 'HTTPS'
                metadata['label'] = 'API Call'
            elif 's3' in target_type:
                metadata['port'] = 443
                metadata['protocol'] = 'HTTPS'
                metadata['label'] = 'S3 Access'
        
        elif rel_type == 'routes_to':
            if 'elb' in source_type or 'alb' in source_type:
                metadata['port'] = 80
                metadata['protocol'] = 'HTTP'
                metadata['label'] = 'Load Balancer'
                metadata['direction'] = 'bidirectional'
        
        elif rel_type == 'applies_to':
            metadata['label'] = 'Security Rule'
            metadata['direction'] = 'inbound'
        
        elif rel_type == 'triggers':
            metadata['label'] = 'Event Trigger'
        
        elif rel_type == 'depends_on':
            metadata['label'] = 'Dependency'
        
        return metadata
    
    @staticmethod
    def extract_all_relationships(db: Session) -> int:
        """
        Extract all relationships and save to database.
        Returns: Number of relationships created
        """
        all_relationships = []
        
        # Extract from different sources
        all_relationships.extend(RelationshipExtractor.extract_from_cloudformation_stacks(db))
        all_relationships.extend(RelationshipExtractor.extract_from_vpc_subnet(db))
        all_relationships.extend(RelationshipExtractor.extract_from_security_groups(db))
        all_relationships.extend(RelationshipExtractor.extract_from_arn_references(db))
        
        # Remove duplicates
        unique_relationships = list(set(all_relationships))
        
        # Check existing relationships to avoid duplicates
        existing = db.query(ResourceRelationship).all()
        existing_set = {(r.source_resource_id, r.target_resource_id) for r in existing}
        
        # Create new relationships with metadata
        created_count = 0
        for source_id, target_id, rel_type in unique_relationships:
            if (source_id, target_id) not in existing_set:
                # Get source and target resources to determine metadata
                source_res = db.query(Resource).filter(Resource.id == source_id).first()
                target_res = db.query(Resource).filter(Resource.id == target_id).first()
                
                if source_res and target_res:
                    # Get relationship metadata
                    metadata = RelationshipExtractor.get_relationship_metadata(
                        rel_type,
                        source_res.type.lower() if source_res.type else '',
                        target_res.type.lower() if target_res.type else ''
                    )
                    
                    relationship = ResourceRelationship(
                        source_resource_id=source_id,
                        target_resource_id=target_id,
                        relationship_type=rel_type,
                        port=metadata.get('port'),
                        protocol=metadata.get('protocol'),
                        direction=metadata.get('direction'),
                        label=metadata.get('label'),
                        status=metadata.get('status', 'active'),
                        auto_detected='yes',
                        confidence='high'
                    )
                    db.add(relationship)
                    created_count += 1
        
        db.commit()
        return created_count
