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
    region = Column(String, nullable=True, default="unknown")
    
    # AWS Identifiers
    arn = Column(String, index=True)  # Amazon Resource Name
    account_id = Column(String, index=True)  # AWS Account ID
    resource_id = Column(String, index=True)  # Actual AWS resource ID
    
    # Resource Details
    status = Column(String, default="unknown")  # running, stopped, available, etc.
    environment = Column(String)  # dev, staging, prod, test
    cost_center = Column(String)  # For billing and cost tracking
    owner = Column(String)  # Resource owner/team name
    application = Column(String)  # Application name this resource belongs to
    project = Column(String)  # Project name
    
    # Connectivity & Networking
    vpc_id = Column(String, index=True)  # VPC identifier
    subnet_id = Column(String, index=True)  # Subnet identifier
    availability_zone = Column(String)  # Specific AZ within region
    security_groups = Column(JSON, default=list)  # Security group IDs
    public_ip = Column(String)  # Public IP address
    private_ip = Column(String)  # Private IP address
    dns_name = Column(String)  # DNS name (for ELB, RDS, etc.)
    endpoint = Column(String)  # Service endpoint URL
    
    # Instance/Resource Configuration
    instance_type = Column(String)  # EC2 instance type or similar
    resource_creation_date = Column(DateTime(timezone=True))
    
    # Type-Specific Properties (JSON for flexible data)
    type_specific_properties = Column(JSON, default=dict)
    
    # Relationships & Dependencies (Enhanced)
    dependencies = Column(JSON, default=list)  # Resource IDs this depends on
    connected_resources = Column(JSON, default=list)  # Bi-directional connections
    attached_to = Column(String, index=True)  # Parent resource ID (EBS->EC2, ENI->EC2)
    parent_resource = Column(String, index=True)  # Hierarchical parent (Subnet->VPC)
    child_resources = Column(JSON, default=list)  # Child resource IDs
    target_resources = Column(JSON, default=list)  # For ELB: target instances
    source_resources = Column(JSON, default=list)  # Resources that connect TO this
    
    # Security & Compliance
    encryption_enabled = Column(String)  # yes/no/kms-key-id
    public_access = Column(String)  # yes/no/restricted
    compliance_status = Column(String)  # compliant/non-compliant/unknown
    
    # Cost & Billing
    monthly_cost_estimate = Column(String)  # Estimated monthly cost
    last_cost_update = Column(DateTime(timezone=True))
    
    # Metadata
    tags = Column(JSON, default=dict)  # AWS tags as key-value pairs
    description = Column(Text)
    notes = Column(Text)  # Additional operational notes
    aws_service = Column(String)  # Original AWS service name
    aws_resource_type = Column(String)  # Original AWS resource type (ec2:instance)
    last_reported_at = Column(DateTime(timezone=True))  # Last seen in AWS
    
    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="resources")
