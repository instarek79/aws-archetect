# How to Use Enhanced Relationship Management

## 🎯 Quick Start Guide

### Step 1: View Sample Relationships

We've created **sample relationships with full metadata** to demonstrate the new fields.

1. **Go to Resources page** (http://localhost:3000/resources)
2. **Click Edit** on any resource that has relationships
3. **Click the "🔗 Relationships" tab**
4. You'll see relationships with:
   - ✅ Port numbers (3306, 443, 8080)
   - ✅ Protocols (MySQL, HTTPS, HTTP)
   - ✅ Direction (Inbound/Outbound/Bidirectional)
   - ✅ Status (Active/Inactive)
   - ✅ Labels ("Primary DB Connection", "Web Traffic")
   - ✅ Flow order (numbered sequence)
   - ✅ Descriptions
   - ✅ Confidence levels

### Step 2: View in Architecture Diagram

1. **Go to Architecture Diagram** (http://localhost:3000/diagram)
2. **Connection lines now show:**
   - Labels from the database
   - Port/protocol info in parentheses
   - Example: "Primary DB Connection (MySQL:3306)"
   - Numbered badges for flow order

### Step 3: Create More Sample Data

Run the sample data script to create more relationships:

```bash
cd backend
.\venv\Scripts\python.exe scripts\populate_sample_relationships.py
```

This creates relationships like:
- EC2 → RDS (Port 3306, MySQL, "Primary DB Connection")
- ALB → EC2 (Port 80, HTTP, "Web Traffic", Bidirectional)
- EC2 → S3 (Port 443, HTTPS, "File Storage")
- Security Group → EC2 (Port 22, SSH, "SSH Access Rule")

## 📋 What Each Field Means

### Core Fields

| Field | Description | Example Values | When to Use |
|-------|-------------|----------------|-------------|
| **relationship_type** | Type of connection | uses, routes_to, applies_to, depends_on | Always required |
| **label** | Short display name | "DB Connection", "Load Balancer" | For diagram clarity |
| **description** | Detailed explanation | "Application server connects to primary MySQL database" | For documentation |

### Network Fields

| Field | Description | Example Values | When to Use |
|-------|-------------|----------------|-------------|
| **port** | Port number | 3306, 443, 80, 22 | Network connections |
| **protocol** | Communication protocol | TCP, HTTP, HTTPS, MySQL, SSH | Network connections |
| **direction** | Traffic flow | inbound, outbound, bidirectional | Security/firewall rules |

### Metadata Fields

| Field | Description | Example Values | When to Use |
|-------|-------------|----------------|-------------|
| **status** | Current state | active, inactive, deprecated | Track lifecycle |
| **flow_order** | Sequence number | 1, 2, 3, 4... | Data flow diagrams |
| **confidence** | Detection confidence | high, medium, low | Auto-detected relationships |
| **auto_detected** | Detection method | yes, no | Track origin |

## 🎨 Viewing Relationships in UI

### Resources Page - Relationships Tab

**Location:** Resources → Edit Resource → 🔗 Relationships Tab

**What You See:**
- 📊 **Statistics Dashboard**
  - Total relationships
  - Active relationships
  - Auto-detected count
  - Relationships with port info

- 🔗 **Relationship Cards** (for each connection)
  - **Badges:** Type, Label, Status
  - **Flow Number:** Numbered badge if flow_order is set
  - **Network Info:** Port, Protocol, Direction, Confidence
  - **Description:** Full explanation
  - **Metadata:** Auto-detected vs Manual, Creation date

**Example Display:**
```
┌─────────────────────────────────────────────────┐
│ [uses] [Primary DB Connection] [active]    [2] │
│ Target Resource ID: 20                          │
├─────────────────────────────────────────────────┤
│ Port: 3306  Protocol: MySQL  Direction: ⬆️ Out │
│ Confidence: 🟢 High                             │
├─────────────────────────────────────────────────┤
│ Description:                                    │
│ Application server connects to primary MySQL    │
│ database for data persistence                   │
├─────────────────────────────────────────────────┤
│ 🤖 Auto-detected  Created: Dec 28, 2025        │
└─────────────────────────────────────────────────┘
```

### Architecture Diagram

**Location:** Architecture Diagram page

**What You See:**
- **Connection lines** with labels
- **Port/protocol** in parentheses
- **Numbered badges** for flow order
- **Color-coded** by relationship type

**Example:**
```
[EC2 Instance] ──2──> [RDS Database]
                ↑
    "Primary DB Connection (MySQL:3306)"
```

## 🔧 API Usage Examples

### Get Relationships for a Resource

```bash
GET /api/relationships?source_id=10
```

**Response:**
```json
[
  {
    "id": 1,
    "source_resource_id": 10,
    "target_resource_id": 20,
    "relationship_type": "uses",
    "label": "Primary DB Connection",
    "port": 3306,
    "protocol": "MySQL",
    "direction": "outbound",
    "status": "active",
    "flow_order": 2,
    "description": "Application server connects to primary MySQL database",
    "auto_detected": "yes",
    "confidence": "high",
    "created_at": "2025-12-28T13:00:00Z"
  }
]
```

### Create a New Relationship

```bash
POST /api/relationships
Content-Type: application/json

{
  "source_resource_id": 10,
  "target_resource_id": 30,
  "relationship_type": "uses",
  "label": "Cache Access",
  "port": 6379,
  "protocol": "Redis",
  "direction": "outbound",
  "status": "active",
  "description": "Application uses Redis for session caching"
}
```

### Update Relationship Metadata

```bash
PUT /api/relationships/1
Content-Type: application/json

{
  "port": 3307,
  "label": "Secondary DB",
  "status": "inactive"
}
```

## 💡 Common Use Cases

### 1. Database Connections

**Scenario:** Document EC2 → RDS connection

**Fields to Fill:**
- `relationship_type`: "uses"
- `label`: "Primary Database"
- `port`: 3306 (MySQL) or 5432 (PostgreSQL)
- `protocol`: "MySQL" or "PostgreSQL"
- `direction`: "outbound"
- `description`: "Application connects to primary database for user data"

### 2. Load Balancer Traffic

**Scenario:** ALB distributes traffic to EC2 instances

**Fields to Fill:**
- `relationship_type`: "routes_to"
- `label`: "Web Traffic"
- `port`: 80 or 443
- `protocol`: "HTTP" or "HTTPS"
- `direction`: "bidirectional"
- `description`: "Load balancer distributes incoming web traffic"

### 3. Security Group Rules

**Scenario:** Security group allows SSH access

**Fields to Fill:**
- `relationship_type`: "applies_to"
- `label`: "SSH Access"
- `port`: 22
- `protocol`: "SSH"
- `direction`: "inbound"
- `description`: "Allows SSH from bastion host"

### 4. Data Flow Sequence

**Scenario:** Multi-step data processing pipeline

**Fields to Fill:**
- Set `flow_order`: 1, 2, 3, 4...
- Use labels: "Step 1: Ingest", "Step 2: Process", "Step 3: Store"
- This creates numbered flow in diagram

### 5. Microservices Communication

**Scenario:** Service A calls Service B API

**Fields to Fill:**
- `relationship_type`: "connects_to"
- `label`: "Internal API"
- `port`: 8080
- `protocol`: "HTTP"
- `direction`: "bidirectional"
- `description`: "Microservices communicate via REST API"

## 🎯 Best Practices

### 1. Always Include Port for Network Connections
✅ Good: `port: 3306, protocol: "MySQL"`
❌ Bad: No port specified for database connection

### 2. Use Meaningful Labels
✅ Good: `label: "Primary DB Connection"`
❌ Bad: `label: "uses"` (just repeating the type)

### 3. Set Flow Order for Sequences
✅ Good: `flow_order: 1, 2, 3` for data pipeline
❌ Bad: No flow order for multi-step process

### 4. Document with Descriptions
✅ Good: `description: "Application server connects to primary MySQL database for user authentication and data persistence"`
❌ Bad: Empty description

### 5. Mark Status Appropriately
✅ Good: `status: "deprecated"` for old connections
❌ Bad: Leaving old connections as "active"

## 🔍 Troubleshooting

### Relationships Not Showing in UI?

1. **Check if resource has relationships:**
   ```bash
   GET /api/relationships?source_id=YOUR_RESOURCE_ID
   ```

2. **Run relationship extraction:**
   - Go to Architecture Diagram
   - Click "Extract" button
   - Or run: `POST /api/relationships/extract`

3. **Check resource ID:**
   - Make sure you're viewing the correct resource
   - Resource ID is shown in the edit modal

### Fields Not Displaying?

1. **Verify database migration:**
   ```bash
   cd backend
   .\venv\Scripts\python.exe migrations\add_relationship_fields.py
   ```

2. **Check API response:**
   - Open browser DevTools
   - Check Network tab for `/api/relationships` calls
   - Verify fields are in response

### Sample Data Not Created?

1. **Ensure resources exist:**
   - Need at least 2 resources in database
   - Import resources first

2. **Run sample data script:**
   ```bash
   cd backend
   .\venv\Scripts\python.exe scripts\populate_sample_relationships.py
   ```

## 📊 Testing the Feature

### Test Checklist

- [ ] View sample relationships in Resources page
- [ ] See port/protocol/direction fields populated
- [ ] Check labels display correctly
- [ ] Verify flow_order shows numbered badges
- [ ] View relationships in Architecture Diagram
- [ ] See connection labels with port info
- [ ] Create new relationship via API
- [ ] Update existing relationship
- [ ] Check statistics dashboard

### Expected Results

✅ **Resources Page:**
- Relationships tab shows count
- Each relationship displays in card format
- All fields visible and formatted
- Statistics dashboard shows counts

✅ **Architecture Diagram:**
- Connection lines show labels
- Port/protocol in parentheses
- Numbered badges for flow_order
- Color-coded by type

✅ **API:**
- GET returns all fields
- POST creates with metadata
- PUT updates fields
- All fields persist to database

## 🚀 Next Steps

1. **Import your resources** if you haven't already
2. **Run sample data script** to see examples
3. **View in Resources page** to see the Relationships tab
4. **Check Architecture Diagram** to see visual representation
5. **Create your own relationships** via API or auto-extraction
6. **Refine labels and descriptions** for your use case

## 📞 Need Help?

- Check `RELATIONSHIP_MANAGEMENT.md` for technical details
- Review `RELATIONSHIP_ENHANCEMENTS_SUMMARY.md` for overview
- Check backend logs for relationship extraction details
- Verify database migration completed successfully

---

**Status:** ✅ Feature is live and ready to use!
**Sample Data:** ✅ Created with full metadata
**UI:** ✅ Relationships tab added to Resources page
**Diagram:** ✅ Shows labels and port/protocol info
