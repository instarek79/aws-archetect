# 🚀 Quick Wins - Ready to Implement

## Priority 1: Import Templates Library

### What to Build

```
frontend/src/pages/ImportTemplates.jsx
├── Template Selector Grid
├── Download Sample CSV
├── Column Guide Modal
└── Direct Import from Template
```

### Template Definitions

```javascript
const IMPORT_TEMPLATES = {
  ec2: {
    name: "EC2 Instances",
    icon: "🖥️",
    description: "Virtual servers in AWS",
    columns: [
      { name: "Name", field: "name", required: true, example: "web-server-01" },
      { name: "Instance ID", field: "resource_id", required: true, example: "i-0abc123def456" },
      { name: "Instance Type", field: "instance_type", required: false, example: "t3.medium" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Availability Zone", field: "availability_zone", required: false, example: "us-east-1a" },
      { name: "Public IP", field: "public_ip", required: false, example: "54.123.45.67" },
      { name: "Private IP", field: "private_ip", required: false, example: "10.0.1.50" },
      { name: "VPC ID", field: "vpc_id", required: false, example: "vpc-0abc123" },
      { name: "Status", field: "status", required: false, example: "running" },
      { name: "ARN", field: "arn", required: false, example: "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123" },
      { name: "Tags", field: "tags", required: false, example: "env=prod,team=backend" }
    ],
    sampleData: [
      ["web-server-01", "i-0abc123def456", "t3.medium", "us-east-1", "us-east-1a", "54.123.45.67", "10.0.1.50", "vpc-0abc123", "running", "", "env=prod"],
      ["api-server-01", "i-0def456abc789", "t3.large", "us-east-1", "us-east-1b", "54.123.45.68", "10.0.1.51", "vpc-0abc123", "running", "", "env=prod"],
    ]
  },
  
  ebs: {
    name: "EBS Volumes",
    icon: "💾",
    description: "Block storage volumes",
    columns: [
      { name: "Name", field: "name", required: true, example: "data-volume-01" },
      { name: "Volume ID", field: "resource_id", required: true, example: "vol-0abc123def456" },
      { name: "Size (GB)", field: "size_gb", required: false, example: "100" },
      { name: "Volume Type", field: "volume_type", required: false, example: "gp3" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Availability Zone", field: "availability_zone", required: false, example: "us-east-1a" },
      { name: "Status", field: "status", required: false, example: "in-use" },
      { name: "Attached To", field: "attached_instance", required: false, example: "i-0abc123" },
      { name: "Encrypted", field: "encrypted", required: false, example: "true" }
    ]
  },
  
  rds: {
    name: "RDS Databases",
    icon: "🗃️",
    description: "Managed relational databases",
    columns: [
      { name: "Name", field: "name", required: true, example: "prod-mysql-01" },
      { name: "DB Instance ID", field: "resource_id", required: true, example: "prod-mysql-01" },
      { name: "Engine", field: "engine", required: false, example: "mysql" },
      { name: "Engine Version", field: "engine_version", required: false, example: "8.0.32" },
      { name: "Instance Class", field: "instance_type", required: false, example: "db.t3.medium" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Availability Zone", field: "availability_zone", required: false, example: "us-east-1a" },
      { name: "Status", field: "status", required: false, example: "available" },
      { name: "Endpoint", field: "endpoint", required: false, example: "prod-mysql-01.abc123.us-east-1.rds.amazonaws.com" },
      { name: "Port", field: "port", required: false, example: "3306" },
      { name: "Storage (GB)", field: "storage_gb", required: false, example: "100" },
      { name: "Multi-AZ", field: "multi_az", required: false, example: "true" },
      { name: "VPC ID", field: "vpc_id", required: false, example: "vpc-0abc123" }
    ]
  },
  
  s3: {
    name: "S3 Buckets",
    icon: "🪣",
    description: "Object storage buckets",
    columns: [
      { name: "Bucket Name", field: "name", required: true, example: "my-app-assets" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Creation Date", field: "resource_creation_date", required: false, example: "2024-01-15" },
      { name: "Versioning", field: "versioning", required: false, example: "Enabled" },
      { name: "Encryption", field: "encryption", required: false, example: "AES256" },
      { name: "Public Access", field: "public_access", required: false, example: "Blocked" },
      { name: "Tags", field: "tags", required: false, example: "env=prod,team=frontend" }
    ]
  },
  
  lambda: {
    name: "Lambda Functions",
    icon: "⚡",
    description: "Serverless functions",
    columns: [
      { name: "Function Name", field: "name", required: true, example: "process-orders" },
      { name: "ARN", field: "arn", required: false, example: "arn:aws:lambda:us-east-1:123456789012:function:process-orders" },
      { name: "Runtime", field: "runtime", required: false, example: "python3.9" },
      { name: "Memory (MB)", field: "memory_mb", required: false, example: "256" },
      { name: "Timeout (sec)", field: "timeout_seconds", required: false, example: "30" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Handler", field: "handler", required: false, example: "index.handler" },
      { name: "Last Modified", field: "resource_creation_date", required: false, example: "2024-06-15" }
    ]
  },
  
  elb: {
    name: "Load Balancers",
    icon: "⚖️",
    description: "Application & Network Load Balancers",
    columns: [
      { name: "Name", field: "name", required: true, example: "prod-alb-01" },
      { name: "ARN", field: "arn", required: false, example: "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/prod-alb-01/abc123" },
      { name: "Type", field: "lb_type", required: false, example: "application" },
      { name: "Scheme", field: "scheme", required: false, example: "internet-facing" },
      { name: "DNS Name", field: "dns_name", required: false, example: "prod-alb-01-123456.us-east-1.elb.amazonaws.com" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "VPC ID", field: "vpc_id", required: false, example: "vpc-0abc123" },
      { name: "Status", field: "status", required: false, example: "active" }
    ]
  }
};
```

---

## Priority 2: AWS CLI Paste Import

### Backend Endpoint

```python
# backend/app/routers/import_router.py

@router.post("/parse-cli")
async def parse_cli_output(
    request: CLIParseRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Parse AWS CLI JSON output directly
    Supports: aws ec2 describe-instances, aws rds describe-db-instances, etc.
    """
    try:
        data = json.loads(request.cli_output)
        
        # Detect CLI command type
        if "Reservations" in data:
            # EC2 describe-instances
            resources = parse_ec2_cli(data)
        elif "DBInstances" in data:
            # RDS describe-db-instances
            resources = parse_rds_cli(data)
        elif "Buckets" in data:
            # S3 list-buckets
            resources = parse_s3_cli(data)
        elif "Volumes" in data:
            # EBS describe-volumes
            resources = parse_ebs_cli(data)
        elif "Functions" in data:
            # Lambda list-functions
            resources = parse_lambda_cli(data)
        elif "LoadBalancers" in data:
            # ELB describe-load-balancers
            resources = parse_elb_cli(data)
        else:
            # Generic parsing
            resources = parse_generic_cli(data)
        
        return {
            "success": True,
            "detected_type": resources[0].get("type") if resources else "unknown",
            "resource_count": len(resources),
            "resources": resources
        }
        
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON. Make sure to use --output json with AWS CLI")
```

### CLI Parsers

```python
def parse_ec2_cli(data: dict) -> List[dict]:
    """Parse aws ec2 describe-instances output"""
    resources = []
    
    for reservation in data.get("Reservations", []):
        for instance in reservation.get("Instances", []):
            # Extract name from tags
            name = "Unnamed"
            tags = {}
            for tag in instance.get("Tags", []):
                if tag["Key"] == "Name":
                    name = tag["Value"]
                tags[tag["Key"]] = tag["Value"]
            
            resource = {
                "name": name,
                "type": "ec2",
                "resource_id": instance.get("InstanceId"),
                "instance_type": instance.get("InstanceType"),
                "region": instance.get("Placement", {}).get("AvailabilityZone", "")[:-1],
                "availability_zone": instance.get("Placement", {}).get("AvailabilityZone"),
                "status": instance.get("State", {}).get("Name"),
                "public_ip": instance.get("PublicIpAddress"),
                "private_ip": instance.get("PrivateIpAddress"),
                "vpc_id": instance.get("VpcId"),
                "subnet_id": instance.get("SubnetId"),
                "tags": tags,
                "type_specific_properties": {
                    "ami_id": instance.get("ImageId"),
                    "key_pair": instance.get("KeyName"),
                    "platform": instance.get("Platform", "linux"),
                    "architecture": instance.get("Architecture")
                }
            }
            resources.append(resource)
    
    return resources


def parse_rds_cli(data: dict) -> List[dict]:
    """Parse aws rds describe-db-instances output"""
    resources = []
    
    for db in data.get("DBInstances", []):
        resource = {
            "name": db.get("DBInstanceIdentifier"),
            "type": "rds",
            "resource_id": db.get("DBInstanceIdentifier"),
            "arn": db.get("DBInstanceArn"),
            "instance_type": db.get("DBInstanceClass"),
            "status": db.get("DBInstanceStatus"),
            "region": db.get("AvailabilityZone", "")[:-1] if db.get("AvailabilityZone") else "",
            "availability_zone": db.get("AvailabilityZone"),
            "vpc_id": db.get("DBSubnetGroup", {}).get("VpcId"),
            "type_specific_properties": {
                "engine": db.get("Engine"),
                "engine_version": db.get("EngineVersion"),
                "storage_gb": db.get("AllocatedStorage"),
                "storage_type": db.get("StorageType"),
                "multi_az": db.get("MultiAZ"),
                "endpoint": db.get("Endpoint", {}).get("Address"),
                "port": db.get("Endpoint", {}).get("Port"),
                "encrypted": db.get("StorageEncrypted")
            }
        }
        resources.append(resource)
    
    return resources


def parse_ebs_cli(data: dict) -> List[dict]:
    """Parse aws ec2 describe-volumes output"""
    resources = []
    
    for volume in data.get("Volumes", []):
        # Extract name from tags
        name = volume.get("VolumeId")
        tags = {}
        for tag in volume.get("Tags", []):
            if tag["Key"] == "Name":
                name = tag["Value"]
            tags[tag["Key"]] = tag["Value"]
        
        # Get attached instance
        attached_to = None
        if volume.get("Attachments"):
            attached_to = volume["Attachments"][0].get("InstanceId")
        
        resource = {
            "name": name,
            "type": "ebs",
            "resource_id": volume.get("VolumeId"),
            "status": volume.get("State"),
            "region": volume.get("AvailabilityZone", "")[:-1],
            "availability_zone": volume.get("AvailabilityZone"),
            "tags": tags,
            "type_specific_properties": {
                "size_gb": volume.get("Size"),
                "volume_type": volume.get("VolumeType"),
                "iops": volume.get("Iops"),
                "throughput": volume.get("Throughput"),
                "encrypted": volume.get("Encrypted"),
                "attached_instance": attached_to,
                "snapshot_id": volume.get("SnapshotId")
            }
        }
        resources.append(resource)
    
    return resources
```

---

## Priority 3: Basic Cost Estimation

### Cost Data

```python
# backend/app/services/cost_service.py

# AWS Pricing (simplified, us-east-1, on-demand)
EC2_PRICING = {
    # General Purpose
    "t3.nano": 0.0052,
    "t3.micro": 0.0104,
    "t3.small": 0.0208,
    "t3.medium": 0.0416,
    "t3.large": 0.0832,
    "t3.xlarge": 0.1664,
    "t3.2xlarge": 0.3328,
    
    # Compute Optimized
    "c5.large": 0.085,
    "c5.xlarge": 0.17,
    "c5.2xlarge": 0.34,
    "c5.4xlarge": 0.68,
    
    # Memory Optimized
    "r5.large": 0.126,
    "r5.xlarge": 0.252,
    "r5.2xlarge": 0.504,
    
    # Storage Optimized
    "i3.large": 0.156,
    "i3.xlarge": 0.312,
    
    # GPU
    "p3.2xlarge": 3.06,
    "g4dn.xlarge": 0.526,
}

RDS_PRICING = {
    "db.t3.micro": 0.017,
    "db.t3.small": 0.034,
    "db.t3.medium": 0.068,
    "db.t3.large": 0.136,
    "db.r5.large": 0.24,
    "db.r5.xlarge": 0.48,
}

EBS_PRICING = {
    "gp2": 0.10,  # per GB-month
    "gp3": 0.08,
    "io1": 0.125,
    "io2": 0.125,
    "st1": 0.045,
    "sc1": 0.025,
}


def estimate_monthly_cost(resources: List[dict]) -> dict:
    """Estimate monthly cost for resources"""
    
    total = 0
    by_type = {}
    by_resource = []
    savings_opportunities = []
    
    for resource in resources:
        cost = 0
        resource_type = resource.get("type", "").lower()
        
        if resource_type == "ec2":
            instance_type = resource.get("instance_type", "")
            hourly = EC2_PRICING.get(instance_type, 0)
            cost = hourly * 730  # hours per month
            
            # Check for savings
            if resource.get("status") == "stopped":
                savings_opportunities.append({
                    "resource": resource.get("name"),
                    "issue": "Instance is stopped but still incurs EBS costs",
                    "recommendation": "Terminate if not needed",
                    "potential_savings": cost * 0.1  # EBS portion
                })
            
            # Check for oversizing
            if instance_type.startswith("m5.") or instance_type.startswith("r5."):
                savings_opportunities.append({
                    "resource": resource.get("name"),
                    "issue": f"Large instance type: {instance_type}",
                    "recommendation": "Consider rightsizing or using Graviton (m6g/r6g)",
                    "potential_savings": cost * 0.2
                })
        
        elif resource_type == "rds":
            instance_class = resource.get("instance_type", "")
            hourly = RDS_PRICING.get(instance_class, 0)
            cost = hourly * 730
            
            # Add storage cost
            storage_gb = resource.get("type_specific_properties", {}).get("storage_gb", 0)
            cost += storage_gb * 0.115  # gp2 storage
            
            # Check for Multi-AZ
            if resource.get("type_specific_properties", {}).get("multi_az"):
                cost *= 2  # Multi-AZ doubles cost
        
        elif resource_type == "ebs":
            size_gb = resource.get("type_specific_properties", {}).get("size_gb", 0)
            volume_type = resource.get("type_specific_properties", {}).get("volume_type", "gp2")
            cost = size_gb * EBS_PRICING.get(volume_type, 0.10)
            
            # Check for unattached volumes
            if not resource.get("type_specific_properties", {}).get("attached_instance"):
                savings_opportunities.append({
                    "resource": resource.get("name"),
                    "issue": "Unattached EBS volume",
                    "recommendation": "Delete if not needed",
                    "potential_savings": cost
                })
        
        elif resource_type == "s3":
            # Estimate based on typical usage (would need actual metrics)
            cost = 5  # Placeholder
        
        elif resource_type == "lambda":
            # Lambda is pay-per-use, estimate based on typical usage
            cost = 2  # Placeholder
        
        # Track costs
        total += cost
        by_type[resource_type] = by_type.get(resource_type, 0) + cost
        by_resource.append({
            "name": resource.get("name"),
            "type": resource_type,
            "monthly_cost": round(cost, 2)
        })
    
    return {
        "total_monthly": round(total, 2),
        "by_type": {k: round(v, 2) for k, v in by_type.items()},
        "by_resource": sorted(by_resource, key=lambda x: x["monthly_cost"], reverse=True)[:10],
        "savings_opportunities": savings_opportunities,
        "potential_savings": round(sum(s["potential_savings"] for s in savings_opportunities), 2)
    }
```

### Cost Dashboard Component

```jsx
// frontend/src/components/CostDashboard.jsx

function CostDashboard({ resources }) {
  const [costData, setCostData] = useState(null);
  
  useEffect(() => {
    // Calculate costs client-side or fetch from API
    calculateCosts();
  }, [resources]);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">💰 Cost Estimation</h2>
      
      {/* Total Cost */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-green-600">
          ${costData?.total_monthly?.toLocaleString()}
        </div>
        <div className="text-gray-500">Estimated Monthly Cost</div>
      </div>
      
      {/* By Type Chart */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Cost by Service</h3>
        {Object.entries(costData?.by_type || {}).map(([type, cost]) => (
          <div key={type} className="flex items-center mb-2">
            <span className="w-20 text-sm">{type.toUpperCase()}</span>
            <div className="flex-1 bg-gray-200 rounded h-4 mx-2">
              <div 
                className="bg-blue-500 h-4 rounded"
                style={{ width: `${(cost / costData.total_monthly) * 100}%` }}
              />
            </div>
            <span className="w-20 text-right text-sm">${cost}</span>
          </div>
        ))}
      </div>
      
      {/* Savings Opportunities */}
      {costData?.savings_opportunities?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            💡 Savings Opportunities (${costData.potential_savings}/mo)
          </h3>
          {costData.savings_opportunities.map((opp, i) => (
            <div key={i} className="text-sm mb-2">
              <div className="font-medium">{opp.resource}</div>
              <div className="text-gray-600">{opp.issue}</div>
              <div className="text-green-600">→ {opp.recommendation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Order

### Week 1: Import Templates
1. Create template definitions
2. Build template selector UI
3. Add CSV download functionality
4. Integrate with existing import flow

### Week 2: AWS CLI Import
1. Add CLI paste endpoint
2. Implement EC2, RDS, EBS parsers
3. Build CLI paste UI component
4. Add auto-detection of CLI type

### Week 3: Cost Estimation
1. Add pricing data
2. Implement cost calculation service
3. Build cost dashboard component
4. Add savings recommendations

### Week 4: Polish & Testing
1. Error handling improvements
2. Loading states and feedback
3. Documentation
4. User testing and fixes

---

## Files to Create/Modify

```
NEW FILES:
├── frontend/src/pages/ImportTemplates.jsx
├── frontend/src/components/CostDashboard.jsx
├── frontend/src/components/CLIPasteImport.jsx
├── backend/app/services/cost_service.py
├── backend/app/services/cli_parser.py
└── backend/app/data/pricing.json

MODIFY:
├── frontend/src/pages/Import.jsx (add template selection)
├── frontend/src/pages/Dashboard.jsx (add cost widget)
├── backend/app/routers/import_router.py (add CLI endpoint)
└── backend/app/main.py (register new routes)
```

---

**Ready to implement? Start with Import Templates - highest impact, lowest effort!**
