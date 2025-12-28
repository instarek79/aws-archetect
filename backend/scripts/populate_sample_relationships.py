"""
Populate sample relationships with metadata to demonstrate the new fields
Run this after importing resources to create example relationships
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Resource, ResourceRelationship

def create_sample_relationships():
    """Create sample relationships with full metadata"""
    db: Session = SessionLocal()
    
    try:
        # Get some resources to create relationships between
        resources = db.query(Resource).limit(20).all()
        
        if len(resources) < 2:
            print("❌ Not enough resources found. Please import resources first.")
            return
        
        print(f"Found {len(resources)} resources")
        
        # Find specific resource types for meaningful relationships
        ec2_instances = [r for r in resources if r.type and 'ec2' in r.type.lower() or 'instance' in r.type.lower()]
        rds_databases = [r for r in resources if r.type and 'rds' in r.type.lower() or 'aurora' in r.type.lower()]
        load_balancers = [r for r in resources if r.type and ('elb' in r.type.lower() or 'alb' in r.type.lower())]
        s3_buckets = [r for r in resources if r.type and 's3' in r.type.lower()]
        security_groups = [r for r in resources if r.type and 'security' in r.type.lower()]
        
        sample_relationships = []
        
        # 1. EC2 → RDS Database Connection
        if ec2_instances and rds_databases:
            sample_relationships.append({
                'source': ec2_instances[0],
                'target': rds_databases[0],
                'relationship_type': 'uses',
                'port': 3306,
                'protocol': 'MySQL',
                'direction': 'outbound',
                'status': 'active',
                'label': 'Primary DB Connection',
                'flow_order': 2,
                'description': 'Application server connects to primary MySQL database for data persistence',
                'auto_detected': 'no',
                'confidence': 'high'
            })
        
        # 2. Load Balancer → EC2 (HTTP Traffic)
        if load_balancers and ec2_instances:
            sample_relationships.append({
                'source': load_balancers[0],
                'target': ec2_instances[0],
                'relationship_type': 'routes_to',
                'port': 80,
                'protocol': 'HTTP',
                'direction': 'bidirectional',
                'status': 'active',
                'label': 'Web Traffic',
                'flow_order': 1,
                'description': 'Application Load Balancer distributes HTTP traffic to web servers',
                'auto_detected': 'no',
                'confidence': 'high'
            })
        
        # 3. EC2 → S3 (Data Storage)
        if ec2_instances and s3_buckets:
            sample_relationships.append({
                'source': ec2_instances[0],
                'target': s3_buckets[0],
                'relationship_type': 'uses',
                'port': 443,
                'protocol': 'HTTPS',
                'direction': 'outbound',
                'status': 'active',
                'label': 'File Storage',
                'flow_order': 3,
                'description': 'Application uploads files and backups to S3 bucket',
                'auto_detected': 'no',
                'confidence': 'high'
            })
        
        # 4. Security Group → EC2 (Security Rules)
        if security_groups and ec2_instances:
            sample_relationships.append({
                'source': security_groups[0],
                'target': ec2_instances[0],
                'relationship_type': 'applies_to',
                'port': 22,
                'protocol': 'SSH',
                'direction': 'inbound',
                'status': 'active',
                'label': 'SSH Access Rule',
                'flow_order': None,
                'description': 'Security group allows SSH access from specific IP ranges',
                'auto_detected': 'no',
                'confidence': 'high'
            })
        
        # 5. EC2 → EC2 (Internal Communication)
        if len(ec2_instances) >= 2:
            sample_relationships.append({
                'source': ec2_instances[0],
                'target': ec2_instances[1],
                'relationship_type': 'connects_to',
                'port': 8080,
                'protocol': 'HTTP',
                'direction': 'bidirectional',
                'status': 'active',
                'label': 'Internal API',
                'flow_order': None,
                'description': 'Microservices communicate via internal REST API',
                'auto_detected': 'no',
                'confidence': 'medium'
            })
        
        # 6. RDS → S3 (Backup)
        if rds_databases and s3_buckets:
            sample_relationships.append({
                'source': rds_databases[0],
                'target': s3_buckets[0],
                'relationship_type': 'backs_up',
                'port': 443,
                'protocol': 'HTTPS',
                'direction': 'outbound',
                'status': 'active',
                'label': 'Automated Backup',
                'flow_order': None,
                'description': 'RDS automated backups are stored in S3',
                'auto_detected': 'no',
                'confidence': 'high'
            })
        
        # Create relationships in database
        created_count = 0
        for rel_data in sample_relationships:
            # Check if relationship already exists
            existing = db.query(ResourceRelationship).filter(
                ResourceRelationship.source_resource_id == rel_data['source'].id,
                ResourceRelationship.target_resource_id == rel_data['target'].id
            ).first()
            
            if not existing:
                relationship = ResourceRelationship(
                    source_resource_id=rel_data['source'].id,
                    target_resource_id=rel_data['target'].id,
                    relationship_type=rel_data['relationship_type'],
                    port=rel_data['port'],
                    protocol=rel_data['protocol'],
                    direction=rel_data['direction'],
                    status=rel_data['status'],
                    label=rel_data['label'],
                    flow_order=rel_data['flow_order'],
                    description=rel_data['description'],
                    auto_detected=rel_data['auto_detected'],
                    confidence=rel_data['confidence']
                )
                db.add(relationship)
                created_count += 1
                
                print(f"✅ Created: {rel_data['source'].name} → {rel_data['target'].name}")
                print(f"   Type: {rel_data['relationship_type']}, Label: {rel_data['label']}")
                print(f"   Port: {rel_data['port']}, Protocol: {rel_data['protocol']}, Direction: {rel_data['direction']}")
                print()
            else:
                print(f"⚠️  Skipped (exists): {rel_data['source'].name} → {rel_data['target'].name}")
        
        db.commit()
        print(f"\n✅ Successfully created {created_count} sample relationships!")
        print(f"📊 Total relationships in database: {db.query(ResourceRelationship).count()}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating sample relationships with metadata...\n")
    create_sample_relationships()
