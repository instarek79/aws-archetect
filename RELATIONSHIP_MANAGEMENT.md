# Enhanced Relationship Management System

## Overview
The relationship management system has been enhanced with additional fields to clearly identify and manage relationships between AWS resources. This provides better visibility into how resources connect and interact.

## New Database Fields

### ResourceRelationship Model Enhancements

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `port` | Integer | Port number for network connections | 80, 443, 3306, 5432 |
| `protocol` | String | Communication protocol | TCP, UDP, HTTP, HTTPS, MySQL |
| `direction` | String | Connection direction | inbound, outbound, bidirectional |
| `status` | String | Relationship status | active, inactive, deprecated |
| `label` | String | Short label for diagram display | "DB Connection", "Load Balancer", "API Call" |
| `flow_order` | Integer | Order in data flow sequence | 1, 2, 3, 4... |

### Existing Fields (Enhanced)
- `relationship_type`: uses, consumes, applies_to, attached_to, depends_on, connects_to, routes_to, triggers
- `description`: Human-readable description
- `auto_detected`: yes/no (automatically detected vs manually created)
- `confidence`: high/medium/low (confidence in auto-detection)
- `properties`: JSON field for additional metadata

## Automatic Relationship Detection

The system automatically populates relationship metadata based on resource types:

### Database Connections (uses)
- **RDS/Aurora**: Port 3306, Protocol TCP, Label "DB Connection"
- **DynamoDB**: Port 443, Protocol HTTPS, Label "API Call"
- **S3**: Port 443, Protocol HTTPS, Label "S3 Access"

### Load Balancing (routes_to)
- **ALB/ELB → EC2**: Port 80, Protocol HTTP, Label "Load Balancer", Direction bidirectional

### Security (applies_to)
- **Security Group → EC2**: Label "Security Rule", Direction inbound

### Event-Driven (triggers)
- **DynamoDB → Lambda**: Label "Event Trigger"

### Dependencies (depends_on)
- **CloudFormation Stack Resources**: Label "Dependency"

## How to Use

### 1. Database Migration
The migration has been applied automatically. New columns added:
```bash
python backend/migrations/add_relationship_fields.py
```

### 2. Import Resources
When you import resources from CSV, relationships are automatically extracted with metadata:
```
POST /api/import/upload
```

### 3. Extract Relationships
Manually trigger relationship extraction:
```
POST /api/relationships/extract
```
Returns: `{ "message": "Successfully extracted X relationships", "count": X }`

### 4. View Relationships
Get all relationships with metadata:
```
GET /api/relationships
GET /api/relationships?source_id=123
GET /api/relationships?relationship_type=uses
```

Response includes:
```json
{
  "id": 1,
  "source_resource_id": 10,
  "target_resource_id": 20,
  "relationship_type": "uses",
  "port": 3306,
  "protocol": "TCP",
  "direction": "outbound",
  "status": "active",
  "label": "DB Connection",
  "flow_order": 1,
  "description": "EC2 instance connects to RDS database",
  "auto_detected": "yes",
  "confidence": "high"
}
```

### 5. Create/Update Relationships
Create a new relationship:
```
POST /api/relationships
{
  "source_resource_id": 10,
  "target_resource_id": 20,
  "relationship_type": "uses",
  "port": 3306,
  "protocol": "TCP",
  "direction": "outbound",
  "label": "DB Connection",
  "description": "Application server to database"
}
```

Update existing relationship:
```
PUT /api/relationships/{id}
{
  "port": 5432,
  "protocol": "PostgreSQL",
  "label": "PostgreSQL Connection"
}
```

### 6. Architecture Diagram Display
The diagram now shows:
- **Connection labels** from the `label` field
- **Port/Protocol info** in tooltips
- **Numbered flows** using `flow_order`
- **Direction indicators** (arrows, bidirectional lines)
- **Status colors** (active=blue, inactive=gray)

## Frontend Integration

### Viewing Relationship Details
Click on a connection line in the Architecture Diagram to see:
- Source and target resources
- Relationship type
- Port and protocol
- Direction
- Status
- Description
- Auto-detected vs manual

### Editing Relationships
1. Click on a connection to select it
2. Edit panel shows relationship details
3. Modify port, protocol, label, or description
4. Changes save to database automatically

### Creating Relationships
1. Right-click on source resource → "Add Connection"
2. Click on target resource
3. Select relationship type
4. Fill in port, protocol, direction
5. Add description and label
6. Save

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/relationships` | List all relationships |
| GET | `/api/relationships/{id}` | Get specific relationship |
| POST | `/api/relationships` | Create new relationship |
| PUT | `/api/relationships/{id}` | Update relationship |
| DELETE | `/api/relationships/{id}` | Delete relationship |
| POST | `/api/relationships/extract` | Auto-extract relationships |
| GET | `/api/relationships/with-resources` | Get relationships with full resource details |

## Common Use Cases

### 1. Document Database Connections
```json
{
  "relationship_type": "uses",
  "port": 3306,
  "protocol": "MySQL",
  "direction": "outbound",
  "label": "Primary DB",
  "description": "Application connects to primary MySQL database"
}
```

### 2. Load Balancer Configuration
```json
{
  "relationship_type": "routes_to",
  "port": 80,
  "protocol": "HTTP",
  "direction": "bidirectional",
  "label": "Web Traffic",
  "description": "ALB distributes traffic to web servers"
}
```

### 3. Security Group Rules
```json
{
  "relationship_type": "applies_to",
  "port": 22,
  "protocol": "SSH",
  "direction": "inbound",
  "label": "SSH Access",
  "description": "Allows SSH from bastion host"
}
```

### 4. Event-Driven Architecture
```json
{
  "relationship_type": "triggers",
  "protocol": "DynamoDB Streams",
  "label": "Stream Trigger",
  "flow_order": 1,
  "description": "DynamoDB change triggers Lambda function"
}
```

## Benefits

1. **Clear Documentation**: Port and protocol information makes connections explicit
2. **Better Diagrams**: Labels and flow order create professional architecture diagrams
3. **Troubleshooting**: Direction and status help identify connection issues
4. **Compliance**: Document security rules and access patterns
5. **Migration Planning**: Understand dependencies with flow order
6. **Cost Optimization**: Identify unused or deprecated connections

## Next Steps

1. Import your resources
2. Extract relationships automatically
3. Review and enhance relationship metadata
4. Use the Architecture Diagram to visualize connections
5. Export diagrams with clear labels and flow indicators
