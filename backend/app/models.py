from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    resources = relationship("Resource", back_populates="user", cascade="all, delete-orphan")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, index=True)
    region = Column(String, nullable=False)
    
    # AWS Identifiers
    arn = Column(String, index=True)  # Amazon Resource Name
    account_id = Column(String, index=True)  # AWS Account ID
    resource_id = Column(String, index=True)  # Actual AWS resource ID (e.g., i-1234567890abcdef0)
    
    # Resource Details
    status = Column(String, default="unknown")  # running, stopped, available, etc.
    environment = Column(String)  # dev, staging, prod, test
    cost_center = Column(String)  # For billing and cost tracking
    owner = Column(String)  # Resource owner/team name
    
    # Connectivity & Networking
    vpc_id = Column(String)  # VPC identifier
    subnet_id = Column(String)  # Subnet identifier
    availability_zone = Column(String)  # Specific AZ within region
    security_groups = Column(JSON, default=list)  # Security group IDs
    public_ip = Column(String)  # Public IP address
    private_ip = Column(String)  # Private IP address
    
    # Instance/Resource Configuration
    instance_type = Column(String)  # EC2 instance type (t2.micro, m5.large, etc.) or similar for other resources
    resource_creation_date = Column(DateTime(timezone=True))  # When the AWS resource was actually created
    
    # Type-Specific Properties (JSON column for flexible resource-specific data)
    type_specific_properties = Column(JSON, default=dict)  # Stores resource-type specific fields
    # Examples:
    # EC2: {"ami_id": "ami-123", "os": "Ubuntu 22.04", "key_pair": "my-key", "ebs_optimized": true}
    # RDS: {"engine": "postgres", "engine_version": "14.7", "storage_gb": 100, "multi_az": true}
    # ELB: {"dns_name": "elb-123.amazonaws.com", "scheme": "internet-facing", "target_groups": [...], "listeners": [...]}
    # S3: {"versioning": true, "encryption": "AES256", "public_access": false}
    # Lambda: {"runtime": "python3.9", "memory_mb": 256, "timeout_seconds": 30, "handler": "index.handler"}
    
    # Relationships & Dependencies
    dependencies = Column(JSON, default=list)  # Resource names/IDs this depends on
    connected_resources = Column(JSON, default=list)  # Resources connected to this
    
    # Metadata
    tags = Column(JSON, default=dict)  # AWS tags as key-value pairs
    description = Column(Text)
    notes = Column(Text)  # Additional operational notes
    
    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="resources")
