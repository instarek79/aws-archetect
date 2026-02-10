"""Add sample AWS resources to database"""
import os
import sys

# Set environment
os.environ['POSTGRES_HOST'] = '127.0.0.1'
os.environ['POSTGRES_PORT'] = '5433'
os.environ['POSTGRES_USER'] = 'postgres'
os.environ['POSTGRES_PASSWORD'] = 'postgres'
os.environ['POSTGRES_DB'] = 'auth_db'

import sys
sys.path.insert(0, 'backend')

from app.database import SessionLocal
from app.models import Resource

print("=" * 70)
print("ADDING SAMPLE AWS RESOURCES")
print("=" * 70)

# Sample resources
sample_resources = [
    {
        "name": "prod-web-server-01",
        "type": "EC2",
        "region": "us-east-1",
        "account_id": "123456789012",
        "vpc_id": "vpc-0abc123",
        "subnet_id": "subnet-0def456",
        "availability_zone": "us-east-1a",
        "status": "running",
        "environment": "production",
        "instance_type": "t3.medium",
        "public_ip": "54.123.45.67",
        "private_ip": "10.0.1.10",
        "description": "Production web server"
    },
    {
        "name": "prod-database-rds",
        "type": "RDS",
        "region": "us-east-1",
        "account_id": "123456789012",
        "vpc_id": "vpc-0abc123",
        "subnet_id": "subnet-0ghi789",
        "availability_zone": "us-east-1b",
        "status": "available",
        "environment": "production",
        "instance_type": "db.t3.large",
        "description": "Production PostgreSQL database"
    },
    {
        "name": "prod-app-lb",
        "type": "LoadBalancer",
        "region": "us-east-1",
        "account_id": "123456789012",
        "vpc_id": "vpc-0abc123",
        "status": "active",
        "environment": "production",
        "description": "Application Load Balancer"
    },
    {
        "name": "prod-s3-assets",
        "type": "S3",
        "region": "us-east-1",
        "account_id": "123456789012",
        "status": "active",
        "environment": "production",
        "description": "Static assets bucket"
    },
    {
        "name": "dev-web-server-01",
        "type": "EC2",
        "region": "us-west-2",
        "account_id": "123456789012",
        "vpc_id": "vpc-0xyz789",
        "subnet_id": "subnet-0abc123",
        "availability_zone": "us-west-2a",
        "status": "running",
        "environment": "development",
        "instance_type": "t3.small",
        "private_ip": "10.1.1.10",
        "description": "Development web server"
    }
]

db = SessionLocal()
try:
    print(f"\nAdding {len(sample_resources)} sample resources...\n")
    
    for idx, res_data in enumerate(sample_resources, 1):
        resource = Resource(**res_data)
        db.add(resource)
        print(f"  [{idx}] {res_data['name']} ({res_data['type']}) - {res_data['region']}")
    
    db.commit()
    
    print("\n" + "=" * 70)
    print("SUCCESS: Sample resources added!")
    print("=" * 70)
    print("\nRefresh your browser to see the resources!")
    
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()
