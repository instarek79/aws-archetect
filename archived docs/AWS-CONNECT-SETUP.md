# AWS Connect Feature - Setup Guide

## Overview

The AWS Connect feature allows you to directly connect to your AWS account using AWS CLI credentials and automatically scan and import resources into your PostgreSQL database.

## Features

✅ **Direct AWS Connection** - Connect using AWS Access Keys  
✅ **Multi-Resource Scanning** - Scan EC2, RDS, Lambda, S3, ELB, VPC  
✅ **Automatic Import** - Resources imported directly to database  
✅ **Real-time Progress** - Visual feedback during scanning  
✅ **Update Existing** - Updates existing resources or creates new ones  

---

## Prerequisites

### 1. AWS Credentials

You need AWS credentials with read permissions for the resources you want to scan:

- **AWS Access Key ID**
- **AWS Secret Access Key**
- **Optional:** Session Token (for temporary credentials)

### 2. IAM Permissions

Your AWS user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVpcs",
        "ec2:DescribeRegions",
        "rds:DescribeDBInstances",
        "rds:ListTagsForResource",
        "lambda:ListFunctions",
        "lambda:ListTags",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketTagging",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTags",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Installation

### 1. Install boto3 (AWS SDK for Python)

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install boto3
pip install boto3==1.34.0

# Or install all requirements
pip install -r requirements.txt
```

### 2. Restart Backend

```powershell
# Stop current backend (Ctrl+C)
# Then restart
.\START-BACKEND.ps1
```

The backend will now include the AWS Connect endpoints.

---

## Usage

### 1. Access the Feature

1. Navigate to **Resources** page
2. Click the **"Connect to AWS"** button (orange button with cloud icon)

### 2. Enter AWS Credentials

Fill in the connection form:

- **AWS Access Key ID**: Your AWS access key (e.g., `AKIAIOSFODNN7EXAMPLE`)
- **AWS Secret Access Key**: Your secret key
- **Region**: Select the AWS region to scan (default: `us-east-1`)
- **Session Token**: (Optional) For temporary credentials only

### 3. Select Resource Types

Choose which AWS resources to scan:

- 🖥️ **EC2 Instances** - Virtual servers
- 🗄️ **RDS Databases** - Managed databases
- ⚡ **Lambda Functions** - Serverless functions
- 🪣 **S3 Buckets** - Object storage
- ⚖️ **Load Balancers** - Application/Network LBs
- 🌐 **VPCs** - Virtual Private Clouds

### 4. Connect & Scan

1. Click **"Connect & Scan"**
2. System tests connection
3. Displays account ID and region
4. Starts scanning selected resources
5. Shows progress and results

### 5. View Results

After scanning completes, you'll see:

- **Resources Found**: Count by type
- **Import Summary**: Created, Updated, Errors
- Resources appear in the Resources table

---

## API Endpoints

### Test Connection

```http
POST /api/aws/test-connection
Content-Type: application/json
Authorization: Bearer <token>

{
  "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "aws_secret_access_key": "wJalrXUtnFEMI/...",
  "region": "us-east-1",
  "aws_session_token": null
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Successfully connected to AWS",
  "account_id": "123456789012",
  "current_region": "us-east-1",
  "available_regions": ["us-east-1", "us-west-2", ...]
}
```

### Scan Resources

```http
POST /api/aws/scan
Content-Type: application/json
Authorization: Bearer <token>

{
  "credentials": {
    "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_access_key": "wJalrXUtnFEMI/...",
    "region": "us-east-1"
  },
  "resource_types": ["ec2", "rds", "lambda"]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Scan complete. Found 25 resources.",
  "resources_found": {
    "ec2": 10,
    "rds": 5,
    "lambda": 10
  },
  "import_stats": {
    "created": 20,
    "updated": 5,
    "errors": 0
  }
}
```

### Get Supported Resources

```http
GET /api/aws/supported-resources
```

---

## Supported Resource Types

| Type | AWS Service | Properties Captured |
|------|-------------|---------------------|
| **ec2** | EC2 Instances | Instance type, AMI, IPs, security groups, tags |
| **rds** | RDS Databases | Engine, version, storage, endpoint, multi-AZ |
| **lambda** | Lambda Functions | Runtime, memory, timeout, environment vars |
| **s3** | S3 Buckets | Location, creation date, tags |
| **elb** | Load Balancers | Type, scheme, DNS name, AZs |
| **vpc** | VPCs | CIDR block, default status, DHCP options |

---

## Security Best Practices

### 1. Use IAM Roles (Recommended)

Instead of long-term access keys, use temporary credentials:

```bash
# Get temporary credentials using AWS STS
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/ReadOnlyRole --role-session-name scanner
```

Then use the temporary credentials in the Connect form.

### 2. Least Privilege

Create a dedicated IAM user/role with only read permissions:

```bash
# Create read-only policy
aws iam create-policy --policy-name ResourceScannerReadOnly --policy-document file://scanner-policy.json

# Attach to user
aws iam attach-user-policy --user-name resource-scanner --policy-arn arn:aws:iam::123456789012:policy/ResourceScannerReadOnly
```

### 3. Rotate Credentials

- Rotate access keys regularly
- Use AWS Secrets Manager for credential storage
- Never commit credentials to version control

### 4. Audit Access

- Enable CloudTrail to log API calls
- Monitor for unusual scanning activity
- Set up alerts for unauthorized access

---

## Troubleshooting

### Connection Failed

**Error:** `Failed to connect to AWS: UnrecognizedClientException`

**Solution:**
- Verify access key ID and secret key are correct
- Check if credentials are active in IAM console
- Ensure no typos or extra spaces

### Permission Denied

**Error:** `Failed to scan AWS resources: AccessDenied`

**Solution:**
- Check IAM permissions for the user/role
- Ensure all required actions are allowed
- Verify region is correct

### No Resources Found

**Possible Causes:**
- No resources exist in the selected region
- Resources are in a different region
- IAM permissions don't allow listing resources

**Solution:**
- Try a different region
- Check AWS Console to verify resources exist
- Review IAM policy permissions

### Timeout During Scan

**Error:** `Request timeout`

**Solution:**
- Scan fewer resource types at once
- Use async scan endpoint for large accounts
- Increase timeout in backend configuration

---

## Advanced Usage

### Scan Multiple Regions

To scan multiple regions, run the scan multiple times with different regions:

1. Scan `us-east-1`
2. Change region to `us-west-2`
3. Scan again
4. Repeat for all regions

### Async Scanning (Large Accounts)

For accounts with 1000+ resources, use the async endpoint:

```http
POST /api/aws/scan-async
```

This starts a background job and returns immediately.

### Scheduled Scanning

Set up a cron job or scheduled task to scan regularly:

```powershell
# PowerShell script for scheduled scanning
$credentials = @{
    aws_access_key_id = $env:AWS_ACCESS_KEY_ID
    aws_secret_access_key = $env:AWS_SECRET_ACCESS_KEY
    region = "us-east-1"
}

$body = @{
    credentials = $credentials
    resource_types = @("ec2", "rds", "lambda")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/aws/scan" `
    -Method POST `
    -Headers @{Authorization = "Bearer $token"} `
    -Body $body `
    -ContentType "application/json"
```

---

## Architecture

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │ HTTP POST /api/aws/scan
       ▼
┌─────────────┐
│  Backend    │
│  (FastAPI)  │
└──────┬──────┘
       │ boto3 SDK
       ▼
┌─────────────┐
│  AWS API    │
│  (us-east-1)│
└──────┬──────┘
       │ Resource Data
       ▼
┌─────────────┐
│ PostgreSQL  │
│  Database   │
└─────────────┘
```

---

## Files Created

### Backend
- `backend/app/services/aws_scanner.py` - AWS scanning service
- `backend/app/routers/aws_connect.py` - API endpoints
- `backend/app/main.py` - Router registration (updated)
- `backend/requirements.txt` - Added boto3 dependency

### Frontend
- `frontend/src/components/AWSConnectModal.jsx` - Connection UI
- `frontend/src/pages/Resources.jsx` - Added Connect button (updated)

---

## Next Steps

1. **Install boto3**: `pip install boto3`
2. **Restart backend**: `.\START-BACKEND.ps1`
3. **Test connection**: Click "Connect to AWS" in Resources page
4. **Scan resources**: Select resource types and scan
5. **View results**: Check Resources table for imported resources

---

## Support

For issues or questions:
- Check backend logs for detailed error messages
- Verify AWS credentials in IAM console
- Test credentials with AWS CLI: `aws sts get-caller-identity`
- Review CloudTrail logs for API call history

---

**✅ AWS Connect Feature Ready!**

You can now scan and import AWS resources directly into your database using AWS CLI credentials.
