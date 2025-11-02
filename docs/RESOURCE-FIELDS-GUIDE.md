# Enhanced Resource Management - Field Guide

## Overview
The resource management system has been significantly enhanced with comprehensive fields for tracking AWS resources, their connectivity, and metadata.

## New Fields Added

### AWS Identifiers
1. **ARN** (Amazon Resource Name)
   - Full AWS resource ARN
   - Can be parsed automatically to extract other fields
   - Example: `arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0`

2. **Account ID**
   - 12-digit AWS account number
   - Auto-extracted from ARN
   - Example: `123456789012`

3. **Resource ID**
   - Actual AWS resource identifier
   - Example: `i-1234567890abcdef0` (EC2), `vol-1234567890abcdef0` (EBS)

### Resource Details
4. **Status**
   - Current resource state
   - Options: running, stopped, available, in-use, pending, terminated, unknown
   - Important for operational monitoring

5. **Environment**
   - Deployment environment
   - Options: dev, staging, prod, test
   - Critical for change management

6. **Cost Center**
   - Billing/cost allocation identifier
   - Example: `CC-1234`, `PROJ-WEBDEV`
   - Essential for FinOps

7. **Owner**
   - Team or person responsible
   - Example: `Platform Team`, `john.doe@company.com`
   - Important for accountability

### Connectivity & Networking
8. **VPC ID**
   - Virtual Private Cloud identifier
   - Example: `vpc-1234567890abcdef0`
   - Critical for network architecture

9. **Subnet ID**
   - Subnet where resource is deployed
   - Example: `subnet-1234567890abcdef0`
   - Important for IP planning

10. **Availability Zone**
    - Specific AZ within region
    - Example: `us-east-1a`, `us-east-1b`
    - Critical for high availability

11. **Security Groups**
    - List of security group IDs
    - Example: `["sg-1234567890abcdef0", "sg-0987654321fedcba0"]`
    - Essential for security auditing

### Relationships
12. **Dependencies**
    - Resources this resource depends on
    - Example: `["db-primary", "cache-redis"]`
    - Critical for deployment ordering

13. **Connected Resources**
    - Resources that connect to this resource
    - Example: `["web-server-1", "api-gateway"]`
    - Important for impact analysis

### Metadata
14. **Tags**
    - AWS tags as key-value pairs
    - Example: `{"Project": "WebApp", "Team": "Backend", "CostCenter": "CC-123"}`
    - Essential for organization and billing

15. **Notes**
    - Additional operational notes
    - Free-form text for special considerations
    - Example: "Requires manual backup before updates"

## ARN Parsing Feature

### How It Works
1. User pastes an AWS ARN into the ARN field
2. Click "Parse ARN" button
3. System automatically extracts:
   - Account ID
   - Region
   - Resource Type
   - Resource ID
   - Suggested resource name

### Supported ARN Formats
```
# EC2 Instance
arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0

# S3 Bucket
arn:aws:s3:::my-bucket-name

# RDS Database
arn:aws:rds:us-west-2:123456789012:db:mydatabase

# Lambda Function
arn:aws:lambda:eu-west-1:123456789012:function:my-function

# DynamoDB Table
arn:aws:dynamodb:us-east-1:123456789012:table/MyTable

# ELB Load Balancer
arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-lb/50dc6c495c0c9188
```

## Use Cases

### 1. Complete Infrastructure Documentation
- Track all resources with full AWS identifiers
- Document connectivity between resources
- Maintain ownership and responsibility

### 2. Cost Optimization
- Track cost centers for chargeback
- Identify resources by environment
- Analyze resource distribution

### 3. Security Auditing
- Document security group assignments
- Track VPC and subnet placements
- Identify resource relationships for blast radius

### 4. Disaster Recovery Planning
- Understand dependencies for failover
- Document AZ distribution
- Track connected resources for restoration order

### 5. Change Management
- Identify affected resources before changes
- Document resource status
- Track environment-specific resources

### 6. Compliance & Governance
- Maintain complete resource inventory
- Track ownership and accountability
- Document resource metadata with tags

## API Endpoints

### Parse ARN
```http
POST /resources/parse-arn
Authorization: Bearer <token>
Content-Type: application/json

{
  "arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0"
}

Response:
{
  "valid": true,
  "info": {
    "arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0",
    "account_id": "123456789012",
    "region": "us-east-1",
    "resource_id": "i-1234567890abcdef0",
    "type": "ec2",
    "suggested_name": "ec2-i-1234567890abcd"
  },
  "message": "ARN parsed successfully"
}
```

### Create Resource (Enhanced)
```http
POST /resources/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "web-server-1",
  "type": "ec2",
  "region": "us-east-1",
  "arn": "arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0",
  "account_id": "123456789012",
  "resource_id": "i-1234567890abcdef0",
  "status": "running",
  "environment": "prod",
  "cost_center": "CC-WEBDEV",
  "owner": "Platform Team",
  "vpc_id": "vpc-abc123",
  "subnet_id": "subnet-def456",
  "availability_zone": "us-east-1a",
  "security_groups": ["sg-web", "sg-common"],
  "dependencies": ["rds-primary", "redis-cache"],
  "connected_resources": ["load-balancer-1"],
  "tags": {
    "Project": "WebApp",
    "Environment": "Production",
    "CostCenter": "CC-WEBDEV"
  },
  "description": "Primary web application server",
  "notes": "Requires weekly security updates"
}
```

## Best Practices

### 1. Always Use ARN When Available
- Paste ARN first and let system auto-fill fields
- Ensures consistency with AWS
- Reduces manual data entry errors

### 2. Maintain Complete Metadata
- Fill in all applicable fields
- Add meaningful tags
- Document ownership and cost center

### 3. Document Dependencies
- List all upstream dependencies
- Track downstream connected resources
- Critical for change impact analysis

### 4. Keep Status Updated
- Update resource status when it changes
- Helps with inventory accuracy
- Important for monitoring

### 5. Use Consistent Naming
- Follow naming conventions
- Include environment in name if applicable
- Makes resources easier to identify

### 6. Tag Consistently
- Use standard tag keys across all resources
- Include: Project, Environment, Team, CostCenter
- Enables better reporting and filtering

## Required vs Optional Fields

### Required
- **Name**: Resource name (user-friendly identifier)
- **Type**: Resource type (EC2, S3, RDS, etc.)
- **Region**: AWS region

### Highly Recommended
- **ARN**: For AWS resource tracking
- **Account ID**: For multi-account environments
- **Environment**: For proper segregation
- **Owner**: For accountability
- **VPC ID**: For networking context

### Optional but Valuable
- Resource ID
- Status
- Cost Center
- Subnet ID, AZ, Security Groups
- Dependencies, Connected Resources
- Tags
- Notes

## Database Schema

```sql
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    
    -- AWS Identifiers
    arn VARCHAR,
    account_id VARCHAR(12),
    resource_id VARCHAR,
    
    -- Resource Details
    status VARCHAR DEFAULT 'unknown',
    environment VARCHAR,
    cost_center VARCHAR,
    owner VARCHAR,
    
    -- Connectivity
    vpc_id VARCHAR,
    subnet_id VARCHAR,
    availability_zone VARCHAR,
    security_groups JSON DEFAULT '[]',
    
    -- Relationships
    dependencies JSON DEFAULT '[]',
    connected_resources JSON DEFAULT '[]',
    
    -- Metadata
    tags JSON DEFAULT '{}',
    description TEXT,
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

## Migration from Old Schema

Existing resources will have:
- All new fields set to NULL or defaults
- No ARN, account_id, etc.
- Can be updated gradually

To update existing resources:
1. Edit each resource
2. Add ARN and parse it
3. Fill in additional fields
4. Save changes

## Future Enhancements

Planned features:
- Bulk import from AWS CLI output
- Automatic AWS API integration
- Resource relationship visualization
- Cost estimation integration
- Compliance policy enforcement
- Auto-tagging suggestions
- Resource lifecycle management

---

**For detailed implementation, see:**
- Backend: `backend/app/models.py`, `backend/app/schemas.py`
- ARN Parser: `backend/app/utils/arn_parser.py`
- API Router: `backend/app/routers/resources.py`
- Frontend: `frontend/src/components/ResourceModal.jsx`
