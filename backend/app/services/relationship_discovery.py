"""
Automatic Relationship Discovery Service
Analyzes existing resources to find implicit relationships based on:
- CloudFormation stack IDs (resources in same stack)
- VPC/Subnet associations (network relationships)
- ARN references in properties
- Service-specific patterns (Lambda event sources, CodePipeline stages, etc.)
"""

from typing import List, Dict, Set, Tuple
from sqlalchemy.orm import Session
from app.models import Resource, ResourceRelationship
import re
import json


class RelationshipDiscovery:
    
    def __init__(self, db: Session):
        self.db = db
        self.discovered_relationships = []
        
    def discover_all(self) -> List[Dict]:
        """Run all discovery methods and return found relationships"""
        resources = self.db.query(Resource).all()
        
        print(f"🔍 Starting relationship discovery for {len(resources)} resources...")
        
        # Discovery methods
        self.discover_cloudformation_relationships(resources)
        self.discover_vpc_relationships(resources)
        self.discover_subnet_relationships(resources)
        self.discover_lambda_relationships(resources)
        self.discover_codepipeline_relationships(resources)
        self.discover_arn_references(resources)
        
        print(f"✅ Discovered {len(self.discovered_relationships)} relationships")
        return self.discovered_relationships
    
    def discover_cloudformation_relationships(self, resources: List[Resource]):
        """Resources in the same CloudFormation stack are related"""
        stack_groups = {}
        
        for resource in resources:
            if resource.tags:
                try:
                    tags = json.loads(resource.tags) if isinstance(resource.tags, str) else resource.tags
                    stack_id = tags.get('aws:cloudformation:stack-id')
                    
                    if stack_id and stack_id != '(not tagged)':
                        if stack_id not in stack_groups:
                            stack_groups[stack_id] = []
                        stack_groups[stack_id].append(resource)
                except:
                    pass
        
        # Create relationships between resources in same stack
        for stack_id, stack_resources in stack_groups.items():
            if len(stack_resources) > 1:
                # Connect resources in same stack with "deployed_with" relationship
                for i, resource in enumerate(stack_resources):
                    for other in stack_resources[i+1:]:
                        self.add_relationship(
                            resource.id,
                            other.id,
                            'deployed_with',
                            f'CloudFormation Stack',
                            'bidirectional'
                        )
        
        print(f"📦 CloudFormation: Found {len(stack_groups)} stacks")
    
    def discover_vpc_relationships(self, resources: List[Resource]):
        """Resources in the same VPC are connected"""
        vpc_groups = {}
        
        for resource in resources:
            if resource.vpc_id and resource.vpc_id != 'no-vpc':
                if resource.vpc_id not in vpc_groups:
                    vpc_groups[resource.vpc_id] = []
                vpc_groups[resource.vpc_id].append(resource)
        
        # Create network relationships
        for vpc_id, vpc_resources in vpc_groups.items():
            if len(vpc_resources) > 1:
                # Connect resources in same VPC
                for i, resource in enumerate(vpc_resources):
                    # Only connect first few to avoid too many edges
                    if i < 5:
                        for other in vpc_resources[i+1:i+3]:
                            self.add_relationship(
                                resource.id,
                                other.id,
                                'connects_to',
                                f'Same VPC: {vpc_id}',
                                'bidirectional'
                            )
        
        print(f"🌐 VPC: Found {len(vpc_groups)} VPCs")
    
    def discover_subnet_relationships(self, resources: List[Resource]):
        """Resources in the same subnet are closely connected"""
        subnet_groups = {}
        
        for resource in resources:
            if resource.subnet_id:
                if resource.subnet_id not in subnet_groups:
                    subnet_groups[resource.subnet_id] = []
                subnet_groups[resource.subnet_id].append(resource)
        
        # Create subnet relationships
        for subnet_id, subnet_resources in subnet_groups.items():
            if len(subnet_resources) > 1:
                for i, resource in enumerate(subnet_resources):
                    if i < 3:
                        for other in subnet_resources[i+1:i+2]:
                            self.add_relationship(
                                resource.id,
                                other.id,
                                'connects_to',
                                f'Same Subnet',
                                'bidirectional'
                            )
        
        print(f"📡 Subnet: Found {len(subnet_groups)} subnets")
    
    def discover_lambda_relationships(self, resources: List[Resource]):
        """Lambda event source mappings connect Lambda to DynamoDB/SQS"""
        lambdas = [r for r in resources if r.type and 'lambda' in r.type.lower()]
        event_sources = [r for r in resources if r.type and 'event-source-mapping' in r.type.lower()]
        dynamodb = [r for r in resources if r.type and 'dynamodb' in r.type.lower()]
        
        # Connect Lambda functions to their event sources
        for event_source in event_sources:
            # Event source connects to Lambda and DynamoDB
            for lambda_func in lambdas[:5]:  # Limit connections
                self.add_relationship(
                    event_source.id,
                    lambda_func.id,
                    'triggers',
                    'Event Source Mapping',
                    'unidirectional'
                )
            
            for dynamo in dynamodb[:3]:
                self.add_relationship(
                    dynamo.id,
                    event_source.id,
                    'streams_to',
                    'DynamoDB Stream',
                    'unidirectional'
                )
        
        print(f"⚡ Lambda: Found {len(lambdas)} functions, {len(event_sources)} event sources")
    
    def discover_codepipeline_relationships(self, resources: List[Resource]):
        """CodePipeline → CodeBuild → Deployment targets"""
        pipelines = [r for r in resources if r.type and 'codepipeline' in r.type.lower()]
        builds = [r for r in resources if r.type and 'codebuild' in r.type.lower()]
        
        # Connect pipelines to build projects
        for pipeline in pipelines:
            for build in builds:
                # Check if names are related
                pipeline_name = pipeline.name.lower() if pipeline.name else ''
                build_name = build.name.lower() if build.name else ''
                
                # Simple heuristic: if they share keywords
                keywords = ['stp', 'wes', 'api', 'identity', 'integration', 'acf']
                shared_keywords = [k for k in keywords if k in pipeline_name and k in build_name]
                
                if shared_keywords:
                    self.add_relationship(
                        pipeline.id,
                        build.id,
                        'triggers',
                        'CI/CD Pipeline',
                        'unidirectional'
                    )
        
        print(f"🔄 CI/CD: Found {len(pipelines)} pipelines, {len(builds)} build projects")
    
    def discover_arn_references(self, resources: List[Resource]):
        """Find ARN references in resource properties"""
        # Build ARN to resource ID mapping
        arn_map = {}
        for resource in resources:
            if resource.resource_id:
                arn_map[resource.resource_id] = resource.id
        
        # Look for ARN references in descriptions and properties
        for resource in resources:
            if resource.description:
                # Find ARN patterns in description
                arns = re.findall(r'arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d+:[a-z0-9-/]+', resource.description)
                for arn in arns[:3]:  # Limit to 3 references
                    if arn in arn_map:
                        target_id = arn_map[arn]
                        if target_id != resource.id:
                            self.add_relationship(
                                resource.id,
                                target_id,
                                'references',
                                'ARN Reference',
                                'unidirectional'
                            )
        
        print(f"🔗 ARN: Checked {len(resources)} resources for references")
    
    def add_relationship(self, source_id: int, target_id: int, rel_type: str, label: str, direction: str):
        """Add a relationship to the discovered list (avoid duplicates)"""
        # Check if already exists
        for rel in self.discovered_relationships:
            if (rel['source_resource_id'] == source_id and rel['target_resource_id'] == target_id) or \
               (rel['source_resource_id'] == target_id and rel['target_resource_id'] == source_id and direction == 'bidirectional'):
                return
        
        self.discovered_relationships.append({
            'source_resource_id': source_id,
            'target_resource_id': target_id,
            'relationship_type': rel_type,
            'label': label,
            'direction': direction,
            'status': 'active',
            'auto_detected': 'yes'
        })
    
    def import_relationships(self, user_id: int) -> int:
        """Import discovered relationships into database"""
        imported_count = 0
        
        for rel_data in self.discovered_relationships:
            try:
                # Check if relationship already exists
                existing = self.db.query(ResourceRelationship).filter(
                    ResourceRelationship.source_resource_id == rel_data['source_resource_id'],
                    ResourceRelationship.target_resource_id == rel_data['target_resource_id']
                ).first()
                
                if not existing:
                    relationship = ResourceRelationship(
                        source_resource_id=rel_data['source_resource_id'],
                        target_resource_id=rel_data['target_resource_id'],
                        relationship_type=rel_data['relationship_type'],
                        label=rel_data['label'],
                        direction=rel_data['direction'],
                        status=rel_data['status'],
                        auto_detected=rel_data['auto_detected']
                    )
                    self.db.add(relationship)
                    imported_count += 1
            except Exception as e:
                print(f"❌ Failed to import relationship: {e}")
                continue
        
        self.db.commit()
        print(f"✅ Imported {imported_count} new relationships")
        return imported_count


def discover_and_import_relationships(db: Session, user_id: int) -> Dict:
    """Main function to discover and import relationships"""
    discovery = RelationshipDiscovery(db)
    
    # Discover relationships
    relationships = discovery.discover_all()
    
    # Import to database
    imported_count = discovery.import_relationships(user_id)
    
    return {
        'discovered': len(relationships),
        'imported': imported_count,
        'message': f'Successfully discovered {len(relationships)} relationships and imported {imported_count} new ones'
    }
