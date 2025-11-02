from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Resource Schemas
class ResourceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=100)
    region: str = Field(..., min_length=1, max_length=100)
    
    # AWS Identifiers
    arn: Optional[str] = None
    account_id: Optional[str] = Field(None, max_length=12)
    resource_id: Optional[str] = None
    
    # Resource Details
    status: Optional[str] = "unknown"
    environment: Optional[str] = None  # dev, staging, prod, test
    cost_center: Optional[str] = None
    owner: Optional[str] = None
    
    # Connectivity & Networking
    vpc_id: Optional[str] = None
    subnet_id: Optional[str] = None
    availability_zone: Optional[str] = None
    security_groups: Optional[List[str]] = []
    public_ip: Optional[str] = None
    private_ip: Optional[str] = None
    
    # Instance/Resource Configuration
    instance_type: Optional[str] = None
    resource_creation_date: Optional[datetime] = None
    
    # Relationships & Dependencies
    dependencies: Optional[List[Any]] = []
    connected_resources: Optional[List[str]] = []
    
    # Metadata
    tags: Optional[dict] = {}
    description: Optional[str] = None
    notes: Optional[str] = None


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[str] = Field(None, min_length=1, max_length=100)
    region: Optional[str] = Field(None, min_length=1, max_length=100)
    
    # AWS Identifiers
    arn: Optional[str] = None
    account_id: Optional[str] = None
    resource_id: Optional[str] = None
    
    # Resource Details
    status: Optional[str] = None
    environment: Optional[str] = None
    cost_center: Optional[str] = None
    owner: Optional[str] = None
    
    # Connectivity & Networking
    vpc_id: Optional[str] = None
    subnet_id: Optional[str] = None
    availability_zone: Optional[str] = None
    security_groups: Optional[List[str]] = None
    public_ip: Optional[str] = None
    private_ip: Optional[str] = None
    
    # Instance/Resource Configuration
    instance_type: Optional[str] = None
    resource_creation_date: Optional[datetime] = None
    
    # Relationships & Dependencies
    dependencies: Optional[List[Any]] = None
    connected_resources: Optional[List[str]] = None
    
    # Metadata
    tags: Optional[dict] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class ResourceResponse(ResourceBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ResourceWithUser(ResourceResponse):
    user: UserResponse
    
    class Config:
        from_attributes = True


# AI Analysis Schemas
class AIPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    include_resources: bool = True


class AIAnalysisResponse(BaseModel):
    analysis: str
    summary: Optional[str] = None
    recommendations: Optional[List[str]] = None


class ArchitectureSummary(BaseModel):
    total_resources: int
    resource_breakdown: dict
    regions_used: List[str]
    architecture_summary: str
    cost_optimization_tips: List[str]
    security_recommendations: List[str]
    best_practices: List[str]
