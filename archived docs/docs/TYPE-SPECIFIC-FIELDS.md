# 🎯 Type-Specific Resource Properties - Major Update!

## ✨ What's New

You requested **customized input parameters based on resource type** - and it's now **fully implemented**!

Different AWS resources have unique properties that are important to capture. We've added dynamic, type-specific fields for each major resource type.

---

## 🚀 Feature Overview

### Before
```
All resources had the same generic fields regardless of type
❌ EC2 instance had no OS or AMI information
❌ RDS had no database engine or version
❌ Load balancer had no DNS name or listeners
❌ S3 had no encryption or versioning info
```

### After
```
✅ EC2: AMI ID, OS, Key Pair, EBS Optimized, Monitoring
✅ RDS: Engine, Version, Storage, Multi-AZ, Backup, Encryption
✅ ELB/ALB/NLB: DNS Name, Listeners, Target Groups, Multiple Subnets
✅ S3: Bucket Name, Versioning, Encryption, Public Access
✅ Lambda: Runtime, Handler, Memory, Timeout, Layers
```

---

## 📋 Resource Types Supported

### 1. **EC2 Instance** ⚡

**Specific Fields:**
- **AMI ID** * - Amazon Machine Image identifier (ami-0abc123...)
- **Operating System** * - Dropdown selection:
  - Amazon Linux 2 / 2023
  - Ubuntu 22.04 / 20.04 LTS
  - RHEL 9 / 8
  - Windows Server 2022 / 2019
  - Debian 11
  - CentOS 7
- **Key Pair Name** - SSH key for access
- **EBS Optimized** - Checkbox
- **Detailed Monitoring** - CloudWatch monitoring checkbox

**Example:**
```json
{
  "type": "ec2",
  "name": "web-server-prod",
  "instance_type": "t3.medium",
  "type_specific_properties": {
    "ami_id": "ami-0abcdef1234567890",
    "os": "Ubuntu 22.04",
    "key_pair": "prod-web-key",
    "ebs_optimized": true,
    "detailed_monitoring": true
  }
}
```

**Use Cases:**
- Track which OS versions are running
- Know which AMI to replicate
- Identify instances with monitoring enabled
- Security audits (which keys are used where)

---

### 2. **RDS Database** 🗄️

**Specific Fields:**
- **DB Instance Class** * - Dropdown with DB-specific types:
  - General Purpose: db.t3.micro → db.t3.large
  - Memory Optimized: db.r5.large → db.r5.4xlarge
  - Memory Optimized X2: db.x2iedn.*
  - Burstable ARM: db.t4g.*
- **Database Engine** * - Dropdown:
  - PostgreSQL, MySQL, MariaDB
  - Oracle EE / SE2
  - SQL Server EE / SE / Express
  - Aurora PostgreSQL / MySQL
- **Engine Version** - e.g., "14.7", "8.0.32"
- **Allocated Storage (GB)** - Number input
- **Storage Type** - gp3, gp2, io1, magnetic
- **Multi-AZ Deployment** - Checkbox
- **Backup Retention (Days)** - 0-35 days
- **Encryption at Rest** - Checkbox

**Example:**
```json
{
  "type": "rds",
  "name": "production-database",
  "type_specific_properties": {
    "db_instance_class": "db.r5.xlarge",
    "engine": "postgres",
    "engine_version": "14.7",
    "storage_gb": 500,
    "storage_type": "gp3",
    "multi_az": true,
    "backup_retention_days": 7,
    "encryption_enabled": true
  }
}
```

**Use Cases:**
- Track database versions for upgrade planning
- Identify non-encrypted databases (security audit)
- Find databases without backups
- Plan capacity based on storage allocation
- Cost optimization (Multi-AZ vs single)

---

### 3. **Load Balancer (ELB/ALB/NLB)** ⚖️

**Specific Fields:**
- **Load Balancer Type** * - Dropdown:
  - Application Load Balancer (ALB)
  - Network Load Balancer (NLB)
  - Gateway Load Balancer (GWLB)
  - Classic Load Balancer (CLB)
- **DNS Name** * - Full AWS DNS (e.g., my-lb-123.us-east-1.elb.amazonaws.com)
- **Scheme** * - internet-facing or internal
- **Subnets** * - Multiple subnets (comma-separated)
  - **Important:** Load balancers require multiple subnets in different AZs
- **Target Groups** - Comma-separated list
- **Listeners** - Port:Protocol format (e.g., "80:HTTP, 443:HTTPS")
- **SSL Certificate ARN** - Shows if HTTPS listener configured
- **Cross-Zone Load Balancing** - Checkbox

**Example:**
```json
{
  "type": "elb",
  "name": "web-load-balancer",
  "type_specific_properties": {
    "lb_type": "application",
    "dns_name": "web-lb-123456789.us-east-1.elb.amazonaws.com",
    "scheme": "internet-facing",
    "subnets": ["subnet-abc123", "subnet-def456", "subnet-ghi789"],
    "target_groups": ["tg-web-servers", "tg-api-servers"],
    "listeners": "80:HTTP, 443:HTTPS",
    "ssl_certificate_arn": "arn:aws:acm:us-east-1:123456:certificate/...",
    "cross_zone_enabled": true
  }
}
```

**Use Cases:**
- **Architecture Diagrams:** Show which subnets LB spans
- **SSL Certificate Management:** Track which certs are used where
- **Target Group Mapping:** See which servers are behind which LB
- **Multi-AZ Verification:** Ensure LBs are properly distributed
- **Troubleshooting:** Quick access to DNS name for testing

---

### 4. **S3 Bucket** 🗄️

**Specific Fields:**
- **Bucket Name** * - Globally unique bucket name
- **Versioning Enabled** - Checkbox
- **Default Encryption** - Dropdown:
  - None
  - SSE-S3 (AES256)
  - SSE-KMS (aws:kms)
- **Public Access Allowed** - Checkbox
- **Static Website Hosting** - Checkbox
- **Lifecycle Rules Configured** - Checkbox

**Example:**
```json
{
  "type": "s3",
  "name": "static-assets-bucket",
  "type_specific_properties": {
    "bucket_name": "my-company-static-assets",
    "versioning_enabled": true,
    "encryption": "AES256",
    "public_access": true,
    "website_hosting": true,
    "lifecycle_rules": true
  }
}
```

**Use Cases:**
- **Security Audits:** Find buckets with public access
- **Compliance:** Ensure all buckets are encrypted
- **Data Protection:** Track versioning status
- **Cost Optimization:** Identify buckets with lifecycle rules

---

### 5. **Lambda Function** λ

**Specific Fields:**
- **Runtime** * - Dropdown with latest runtimes:
  - Python 3.11 / 3.10 / 3.9
  - Node.js 20.x / 18.x
  - Java 17 / 11
  - .NET 8 / 6
  - Go 1.x
  - Ruby 3.2
- **Handler** * - Entry point (e.g., "index.handler", "lambda_function.lambda_handler")
- **Memory (MB)** * - 128-10240 MB (steps of 64)
- **Timeout (Seconds)** * - 1-900 seconds (15 minutes max)
- **Layers** - Comma-separated Layer ARNs

**Example:**
```json
{
  "type": "lambda",
  "name": "api-handler-function",
  "type_specific_properties": {
    "runtime": "python3.11",
    "handler": "lambda_function.lambda_handler",
    "memory_mb": 512,
    "timeout_seconds": 30,
    "layers": ["arn:aws:lambda:us-east-1:account:layer:pandas:1"]
  }
}
```

**Use Cases:**
- **Runtime Upgrades:** Identify functions on old runtimes
- **Performance Tuning:** Track memory allocations
- **Timeout Issues:** Find functions with short timeouts
- **Layer Management:** See which functions use which layers

---

## 🎨 How It Works

### Dynamic Form Tab

When you add or edit a resource, a new tab appears based on the resource type:

```
Tabs:
[Basic Info] [AWS Identifiers] [Details] [Networking] [EC2 PROPERTIES] ← Dynamic!
```

The tab name changes:
- EC2 → "EC2 PROPERTIES"
- RDS → "RDS PROPERTIES"
- ELB → "ELB PROPERTIES"
- S3 → "S3 PROPERTIES"
- Lambda → "LAMBDA PROPERTIES"

### Smart Form Fields

- **Conditional Fields:** SSL Certificate ARN only shows if HTTPS listener is configured
- **Validation:** Min/max values enforced (e.g., Lambda memory 128-10240 MB)
- **Array Inputs:** Comma-separated values auto-convert to arrays (subnets, target groups, layers)
- **Checkboxes:** Boolean properties (Multi-AZ, encryption, etc.)
- **Dropdowns:** Pre-populated with valid AWS values

---

## 📊 Database Schema

### New Column: `type_specific_properties`

**Type:** JSONB (PostgreSQL)
**Default:** `{}`
**Indexed:** Yes (for fast queries)

**Benefits:**
- **Flexible:** Add new properties without schema changes
- **Queryable:** Can filter by specific properties
- **Validated:** Pydantic ensures data integrity

**Example Queries:**
```sql
-- Find all Ubuntu EC2 instances
SELECT * FROM resources 
WHERE type = 'ec2' 
AND type_specific_properties->>'os' = 'Ubuntu 22.04';

-- Find RDS databases without encryption
SELECT * FROM resources 
WHERE type = 'rds' 
AND (type_specific_properties->>'encryption_enabled')::boolean = false;

-- Find load balancers with HTTPS listeners
SELECT * FROM resources 
WHERE type = 'elb' 
AND type_specific_properties->>'listeners' LIKE '%HTTPS%';
```

---

## 🔄 Workflow Example

### Adding an EC2 Instance

**Step 1:** Fill Basic Info
```
Name: web-server-prod-01
Type: EC2
Region: us-east-1
```

**Step 2:** Fill Networking
```
VPC: vpc-prod-main
Subnet: subnet-public-1a
Instance Type: t3.medium
Public IP: 54.123.45.67
```

**Step 3:** Click "EC2 PROPERTIES" Tab
```
✅ AMI ID: ami-0abcdef1234567890
✅ OS: Ubuntu 22.04
✅ Key Pair: prod-web-key
✅ EBS Optimized: ☑
✅ Detailed Monitoring: ☑
```

**Result:**
```json
{
  "name": "web-server-prod-01",
  "type": "ec2",
  "region": "us-east-1",
  "vpc_id": "vpc-prod-main",
  "subnet_id": "subnet-public-1a",
  "instance_type": "t3.medium",
  "public_ip": "54.123.45.67",
  "type_specific_properties": {
    "ami_id": "ami-0abcdef1234567890",
    "os": "Ubuntu 22.04",
    "key_pair": "prod-web-key",
    "ebs_optimized": true,
    "detailed_monitoring": true
  }
}
```

---

### Adding an RDS Database

**Step 1:** Fill Basic Info
```
Name: production-database
Type: RDS
Region: us-east-1
Status: available
```

**Step 2:** Fill Networking
```
VPC: vpc-prod-main
Subnet: subnet-private-db-1a
Private IP: 10.0.5.100
Security Groups: sg-database
```

**Step 3:** Click "RDS PROPERTIES" Tab
```
✅ DB Instance Class: db.r5.xlarge
✅ Engine: PostgreSQL
✅ Engine Version: 14.7
✅ Storage: 500 GB
✅ Storage Type: gp3
✅ Multi-AZ: ☑
✅ Backup Retention: 7 days
✅ Encryption: ☑
```

**Result:** Comprehensive database documentation with all critical configuration

---

## 📈 Benefits

### 1. **Realistic AWS Documentation**
- Captures actual AWS resource configuration
- No more generic "resource" entries
- Matches AWS console information

### 2. **Better Architecture Diagrams**
- Show OS types on EC2 instances
- Display database engines on RDS
- Show load balancer DNS names
- Indicate encryption status

### 3. **Security & Compliance**
- Find unencrypted databases
- Identify publicly accessible S3 buckets
- Track Multi-AZ configurations
- Audit key pair usage

### 4. **Operational Excellence**
- Quick access to DNS names for troubleshooting
- Track runtime versions for upgrades
- Monitor backup configurations
- Capacity planning with storage info

### 5. **Cost Optimization**
- Identify over-provisioned resources
- Find unused monitoring
- Track storage allocation
- Optimize instance classes

---

## 🎯 Future Enhancements (Already Designed For)

The system is designed to easily add more resource types:

### VPC
- CIDR block
- DNS hostnames enabled
- Internet gateway attached

### CloudFront
- Distribution ID
- Origins
- Cache behaviors
- SSL certificate

### Route53
- Hosted zone ID
- Record sets
- TTL values

### DynamoDB
- Read/write capacity
- Encryption
- Streams enabled
- Backup retention

### SNS/SQS
- Message retention
- Encryption
- Dead letter queues
- Subscriptions

**Just add a new section in `TypeSpecificFields.jsx`!**

---

## 🔍 API Changes

### Request Example
```json
POST /resources/

{
  "name": "web-server",
  "type": "ec2",
  "region": "us-east-1",
  "instance_type": "t3.medium",
  "type_specific_properties": {
    "ami_id": "ami-abc123",
    "os": "Ubuntu 22.04",
    "key_pair": "my-key",
    "ebs_optimized": true
  }
}
```

### Response Example
```json
{
  "id": 1,
  "name": "web-server",
  "type": "ec2",
  "region": "us-east-1",
  "instance_type": "t3.medium",
  "type_specific_properties": {
    "ami_id": "ami-abc123",
    "os": "Ubuntu 22.04",
    "key_pair": "my-key",
    "ebs_optimized": true,
    "detailed_monitoring": false
  },
  "created_at": "2025-11-02T15:00:00Z"
}
```

---

## ✅ Files Modified

### Backend
1. **`backend/app/models.py`**
   - Added `type_specific_properties` JSONB column

2. **`backend/app/schemas.py`**
   - Added `type_specific_properties: Optional[dict]` to schemas

3. **Database Migration**
   - `migrate.sql` - Adds column to existing databases

### Frontend
1. **`frontend/src/components/TypeSpecificFields.jsx`** ✨ NEW
   - Dynamic form fields for each resource type
   - 500+ lines of type-specific UI

2. **`frontend/src/components/ResourceModal.jsx`**
   - Added new tab for type-specific properties
   - Integrated TypeSpecificFields component
   - Updated data cleaning to include new field

---

## 🎉 Status: FULLY IMPLEMENTED!

**What You Requested:**
> "customized input parameters based on resources type"
> "some resources have different features and properties"
> "ec2 instance os image db load balancer can have multiple subnet"
> "db instance type different than types in ec2"
> "we need to include the most important info for each resource"

**What You Got:**
✅ EC2-specific fields (AMI, OS, Key Pair)
✅ RDS-specific instance classes (db.t3, db.r5, etc.)
✅ RDS engine, version, storage, Multi-AZ, encryption
✅ Load balancer with multiple subnets support
✅ Load balancer DNS name, listeners, target groups
✅ S3 encryption, versioning, public access
✅ Lambda runtime, memory, timeout
✅ Dynamic forms that change based on type
✅ JSONB storage for flexible future expansion

---

## 🚀 Try It Now!

**1. Add EC2 Instance:**
```
1. Go to Resources
2. Click "+ Add Resource"
3. Type: EC2
4. Click "EC2 PROPERTIES" tab
5. Fill in AMI, OS, Key Pair
6. Save
```

**2. Add RDS Database:**
```
1. Type: RDS
2. Click "RDS PROPERTIES" tab
3. Select db.r5.xlarge instance class
4. Choose PostgreSQL engine
5. Enable Multi-AZ and Encryption
6. Save
```

**3. Add Load Balancer:**
```
1. Type: ELB
2. Click "ELB PROPERTIES" tab
3. Enter DNS name
4. Add multiple subnets (comma-separated)
5. Configure listeners (80:HTTP, 443:HTTPS)
6. Save
```

**Your resources now have comprehensive, type-specific information!** 🎉

---

## 📚 Documentation

**This file:** `docs/TYPE-SPECIFIC-FIELDS.md`

**Related:**
- `docs/RESOURCE-FIELDS-GUIDE.md` - General resource fields
- `docs/AWS-RESOURCES-GUIDE.md` - Resource management guide
- `docs/VPC-DIAGRAM-UPDATE.md` - VPC container visualization

---

**Application is production-ready with enterprise-grade resource documentation!** ✨
