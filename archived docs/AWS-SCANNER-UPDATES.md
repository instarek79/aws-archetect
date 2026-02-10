# AWS Scanner Updates - New Resource Types Added

## Summary of Changes

### ✅ Added 6 New AWS Resource Types

The AWS scanner now supports **12 resource types** (previously 6):

#### New Resource Types:
1. **ECS Clusters** 📦 - Elastic Container Service clusters with task/service counts
2. **EKS Clusters** ☸️ - Elastic Kubernetes Service clusters with version info
3. **DynamoDB Tables** 💾 - NoSQL tables with item counts and billing mode
4. **SNS Topics** 📢 - Simple Notification Service topics with subscription counts
5. **SQS Queues** 📬 - Simple Queue Service queues with message counts
6. **API Gateway** 🚪 - REST API endpoints with configuration details

#### Existing Resource Types:
- EC2 Instances 🖥️
- RDS Databases 🗄️
- Lambda Functions ⚡
- S3 Buckets 🪣
- Load Balancers ⚖️
- VPCs 🌐

---

## Files Modified

### Backend Changes

1. **`backend/app/services/aws_scanner.py`**
   - Added `scan_ecs_clusters()` - Lines 275-309
   - Added `scan_eks_clusters()` - Lines 311-345
   - Added `scan_dynamodb_tables()` - Lines 347-382
   - Added `scan_sns_topics()` - Lines 384-424
   - Added `scan_sqs_queues()` - Lines 426-468
   - Added `scan_api_gateways()` - Lines 470-501
   - Updated `scan_all_resources()` to include new types - Lines 503-525
   - Enhanced `import_resources_to_db()` with detailed logging - Lines 527-579

2. **`backend/app/routers/aws_connect.py`**
   - Updated scan endpoint to handle new resource types - Lines 120-131
   - Updated `/supported-resources` endpoint - Lines 230-259

### Frontend Changes

3. **`frontend/src/components/AWSConnectModal.jsx`**
   - Added 6 new resource types to selection - Lines 19-42
   - Updated grid layout to 3 columns for 12 types - Line 215
   - Updated scan logic for 12 types - Line 79

---

## Enhanced Error Logging

The database import process now includes:

- **Per-resource logging**: Each resource creation/update is logged
- **Error details**: Full error messages and resource data on failure
- **Type-level progress**: Shows progress for each resource type
- **Commit error handling**: Catches and logs database commit failures
- **Rollback on error**: Prevents partial imports

Example log output:
```
INFO: Processing 5 ec2 resources...
INFO: Created resource: web-server-1 (ec2)
INFO: Updated resource: db-server-1 (rds)
ERROR: Error importing resource api-prod: invalid field 'xyz'
ERROR: Resource data: {'name': 'api-prod', ...}
INFO: Import complete: 10 created, 3 updated, 1 errors
```

---

## What Data is Captured

### ECS Clusters
- Cluster name and ARN
- Active services count
- Running/pending tasks count
- Registered container instances
- Tags

### EKS Clusters
- Cluster name and version
- Kubernetes endpoint
- VPC configuration
- IAM role ARN
- Platform version
- Creation date
- Tags

### DynamoDB Tables
- Table name and status
- Item count and table size
- Billing mode (on-demand/provisioned)
- Read/write capacity units
- Creation date
- Tags

### SNS Topics
- Topic name and ARN
- Confirmed subscriptions count
- Pending subscriptions count
- Display name
- Tags

### SQS Queues
- Queue name and URL
- Approximate message count
- Message retention period
- Visibility timeout
- FIFO queue flag
- Tags

### API Gateway
- API name and ID
- Description
- Endpoint configuration types
- Creation date
- Tags

---

## IAM Permissions Required

Add these permissions to your AWS user/role for the new resource types:

```json
{
  "Effect": "Allow",
  "Action": [
    "ecs:ListClusters",
    "ecs:DescribeClusters",
    "ecs:ListTagsForResource",
    "eks:ListClusters",
    "eks:DescribeCluster",
    "dynamodb:ListTables",
    "dynamodb:DescribeTable",
    "dynamodb:ListTagsOfResource",
    "sns:ListTopics",
    "sns:GetTopicAttributes",
    "sns:ListTagsForResource",
    "sqs:ListQueues",
    "sqs:GetQueueAttributes",
    "sqs:ListQueueTags",
    "apigateway:GET"
  ],
  "Resource": "*"
}
```

---

## Testing Instructions

### 1. Restart Backend

The backend needs to be restarted to load the new scanner methods:

```powershell
# If backend is running, stop it (Ctrl+C)
# Then restart:
.\START-ALL.ps1
```

### 2. Test Connection

1. Navigate to **Resources** page
2. Click **"Connect to AWS"** button
3. Enter your AWS credentials
4. You should now see **12 resource types** instead of 6

### 3. Select Resource Types

The new resource types will be **selected by default**:
- 📦 ECS Clusters
- ☸️ EKS Clusters
- 💾 DynamoDB Tables
- 📢 SNS Topics
- 📬 SQS Queues
- 🚪 API Gateway

### 4. Run Scan

1. Click **"Connect & Scan"**
2. Watch the progress
3. Check the results summary

### 5. Verify Database Import

After scan completes:
- Go to **Resources** page
- Refresh the table
- Filter by resource type to see new resources
- Check that resources appear in the table

### 6. Check Backend Logs

Monitor the backend terminal for detailed logs:

```
INFO: Processing 3 ecs resources...
INFO: Created resource: production-cluster (ecs)
INFO: Created resource: staging-cluster (ecs)
INFO: Processing 5 dynamodb resources...
INFO: Created resource: users-table (dynamodb)
...
INFO: Import complete: 25 created, 0 updated, 0 errors
```

---

## Troubleshooting

### Resources Not Appearing in Database

**Check backend logs for errors:**
```
ERROR: Error importing resource xyz: [error message]
ERROR: Resource data: {...}
```

**Common issues:**
1. **Missing required fields**: Check that all required Resource model fields are provided
2. **Invalid field values**: Ensure data types match model expectations
3. **Database constraints**: Check for unique constraint violations
4. **Permission errors**: Verify AWS IAM permissions for new resource types

**Solution:**
- Review error logs in backend terminal
- Check that resource data structure matches Resource model
- Verify database schema supports all fields

### No Resources Found

**Possible causes:**
- No resources of that type exist in the selected region
- IAM permissions don't allow listing resources
- Resources are in a different AWS account

**Solution:**
- Try a different region (e.g., us-east-1)
- Check AWS Console to verify resources exist
- Review IAM policy permissions

### Scan Timeout

**For accounts with many resources:**
- Scan fewer resource types at once
- Use different regions separately
- Consider using async scan endpoint (future enhancement)

---

## API Endpoint Examples

### Scan Specific Resource Types

```bash
curl -X POST http://localhost:8000/api/aws/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
      "aws_secret_access_key": "wJalrXUtnFEMI/...",
      "region": "us-east-1"
    },
    "resource_types": ["ecs", "eks", "dynamodb"]
  }'
```

### Scan All Resource Types

```bash
curl -X POST http://localhost:8000/api/aws/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
      "aws_secret_access_key": "wJalrXUtnFEMI/...",
      "region": "us-east-1"
    }
  }'
```

### Get Supported Resources

```bash
curl http://localhost:8000/api/aws/supported-resources
```

**Response:**
```json
{
  "supported_resources": [
    {"type": "ec2", "name": "EC2 Instances", "description": "..."},
    {"type": "ecs", "name": "ECS Clusters", "description": "..."},
    {"type": "eks", "name": "EKS Clusters", "description": "..."},
    ...
  ]
}
```

---

## Next Steps

1. **Restart backend** to load new scanner methods
2. **Test scanning** with your AWS credentials
3. **Verify resources** appear in database
4. **Check logs** for any errors
5. **Report issues** if resources aren't being saved

---

## Summary

✅ **6 new AWS resource types added**  
✅ **Enhanced error logging for debugging**  
✅ **Frontend UI updated with 12 resource types**  
✅ **Backend scanner methods implemented**  
✅ **API endpoints updated**  

**Total Resource Types: 12**  
**Ready to scan and import AWS infrastructure!**
