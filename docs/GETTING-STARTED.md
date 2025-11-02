# 🚀 Getting Started with AWS Architect

## Quick Start (5 Minutes)

### 1. Start the Application
```powershell
cd D:\aws-archetect
docker-compose up -d
```

Wait 20 seconds for services to start.

### 2. Open in Browser
```
http://localhost:3000
```

### 3. Create Account
- Click "Sign Up"
- Enter username, email, password
- Click "Register"

### 4. Login
- Email: your-email@example.com
- Password: your-password

---

## 🎯 Main Features

### 1. **Dashboard** (http://localhost:3000/dashboard)
**Real-time statistics and overview**

- Total resources count
- Resource types breakdown
- Regional distribution
- Active resources count
- Quick access cards

**What you see:**
```
Total Resources: 5    Types: 3    Regions: 2    Active: 4

Resources by Type:        Resources by Region:
- EC2: 3                  - us-east-1: 3
- S3:  1                  - eu-west-3: 2
- RDS: 1

[Manage Resources] [Architecture Diagram] [AI Insights]
```

---

### 2. **Resource Management** (http://localhost:3000/resources)
**Add, edit, and organize your AWS resources**

#### Add New Resource
1. Click "+ Add Resource"
2. Fill in the tabs:

**Basic Info Tab:**
- Name (e.g., "web-server-prod")
- Type (dropdown: EC2, S3, RDS, Lambda, etc.)
- Region (dropdown: 23 regions including Paris)
- Description

**AWS Identifiers Tab:**
- ARN (with Parse button for auto-fill)
- Account ID (12 digits)
- Resource ID

**Details Tab:**
- Status (dropdown: running, stopped, available, etc.)
- Environment (dropdown: prod, dev, staging, test)
- Cost Center
- Owner
- Tags (key-value pairs)
- Notes

**Networking Tab:**
- VPC ID
- Subnet ID
- Availability Zone
- **Instance Type** (dropdown: t2.micro, t3.medium, m5.large, etc.)
- **Public IP Address**
- **Private IP Address**
- **Resource Creation Date** (date picker)
- Security Groups (list)
- Dependencies (list)
- Connected Resources (list)

#### ARN Parser Feature
**Automatically extract info from ARN:**

1. Paste ARN:
   ```
   arn:aws:ec2:eu-west-3:123456789012:instance/i-0abcdef1234567890
   ```

2. Click "Parse ARN"

3. Auto-fills:
   - Region: eu-west-3
   - Account ID: 123456789012
   - Resource ID: i-0abcdef1234567890
   - Type: ec2

---

### 3. **Architecture Diagram** ✨ (http://localhost:3000/architecture)
**THE MAIN FEATURE - Visualize Your Infrastructure!**

#### What is it?
Interactive visual diagram of your AWS infrastructure showing:
- All resources grouped by region
- Dependencies between resources
- Connections and relationships
- Resource status and types

#### How to Use

**View Diagram:**
- Resources appear as colored cards grouped by region
- Each card shows:
  - Icon (🖥️ EC2, 🗄️ S3, 🗃️ RDS, etc.)
  - Resource name
  - Resource type
  - Environment badge
  - Status indicator (● green = running, ● red = stopped)

**Navigate:**
- **Pan**: Click and drag to move view
- **Zoom**: Mouse wheel (50% - 200%)
- **Reset**: Click "Reset View" button

**View Details:**
- **Click any resource** to see details panel
- Shows: Region, Status, Environment, IPs, VPC, Subnet, Dependencies

**Export:**
- Click "Download PNG" to save diagram as image

**Visual Legend:**
- **Red dashed line** -----> Dependencies
- **Green solid line** ——> Connections
- **● Green dot**: Running/Available
- **● Red dot**: Stopped/Terminated
- **● Gray dot**: Unknown

**Example Diagram:**
```
┌──────────────── us-east-1 ────────────────┐
│                                           │
│   🖥️ web-server                          │
│   EC2 | PROD | ● running                 │
│   t3.medium | 54.123.45.67               │
│              │                            │
│              ↓ (dependency)               │
│   🗃️ database                            │
│   RDS | PROD | ● available               │
│                                           │
└───────────────────────────────────────────┘

┌──────────────── eu-west-3 ────────────────┐
│                                           │
│   🖥️ paris-server                        │
│   EC2 | PROD | ● running                 │
│   t3.medium | 35.180.1.100               │
│                                           │
└───────────────────────────────────────────┘
```

---

### 4. **AI Insights** (http://localhost:3000/ai-insights)
**Optional AI-powered architecture analysis**

**Note:** Requires Ollama (local) or OpenAI API key

#### Without AI:
- App works perfectly
- Shows "AI service unavailable" message
- All other features work normally

#### With AI (Ollama - Free):
```powershell
# Install from https://ollama.ai
ollama run llama2

# App auto-detects at localhost:11434
```

#### With AI (OpenAI - Paid):
Add to `.env`:
```
OPENAI_API_KEY=sk-your-key-here
LLM_PROVIDER=openai
```

**What you get:**
- Architecture summary
- Cost optimization tips
- Security recommendations
- Best practices advice

---

## 💾 Database Backup

### Manual Backup
```powershell
.\backup-database.ps1
```

**Output:**
- Creates timestamped backup in `.\backups\`
- Example: `aws_architect_db_20251102_143000.sql`
- Keeps last 10 backups automatically
- Shows backup size and recent backups

### Backup to Custom Location
```powershell
.\backup-database.ps1 -BackupPath "D:\MyBackups"
```

### Schedule Automatic Backups
```powershell
.\backup-database.ps1 -AutoBackup
```

Shows instructions for Windows Task Scheduler.

### Restore Backup
```powershell
# 1. Stop and remove volumes
docker-compose down -v

# 2. Start fresh
docker-compose up -d

# 3. Wait 10 seconds

# 4. Restore
docker exec -i auth_postgres psql -U postgres authdb < .\backups\aws_architect_db_20251102_143000.sql
```

---

## 📝 Example Workflow

### Scenario: Document Your Production Infrastructure

**Step 1: Add EC2 Web Server**
```
Name: web-server-prod
Type: EC2
Region: us-east-1
ARN: arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123
Status: running
Environment: prod
Instance Type: t3.medium
Public IP: 54.123.45.67
Private IP: 10.0.1.50
VPC: vpc-main
Subnet: subnet-public-1a
Dependencies: [rds-primary]
```

**Step 2: Add RDS Database**
```
Name: rds-primary
Type: RDS
Region: us-east-1
Status: available
Environment: prod
Private IP: 10.0.2.100
VPC: vpc-main
Subnet: subnet-private-1a
Security Groups: [sg-database]
```

**Step 3: Add S3 Bucket**
```
Name: app-static-assets
Type: S3
Region: us-east-1
Status: available
Connected Resources: [cloudfront-dist]
```

**Step 4: View Architecture Diagram**
- Go to Architecture page
- See all resources grouped by region
- Click nodes to see details
- Export diagram as PNG for documentation

**Step 5: Backup**
```powershell
.\backup-database.ps1
```

Now you have:
- ✅ Complete resource inventory
- ✅ Visual architecture diagram
- ✅ Database backup

---

## 🌍 Multi-Language Support

### Switch Language
Click the language button in header:
- **English** → **العربية**
- **العربية** → **English**

Supported languages:
- English (EN)
- Arabic (AR) with RTL support

---

## 🎨 Resource Colors by Type

- **EC2**: Orange (#FF9900)
- **S3**: Green (#569A31)
- **RDS**: Blue (#527FFF)
- **Lambda**: Orange (#FF9900)
- **VPC**: Blue (#4B92D4)
- **ELB**: Purple (#8C4FFF)
- **CloudFront**: Purple (#8B5CF6)
- **Route53**: Emerald (#10B981)
- **DynamoDB**: Blue (#527FFF)
- **SNS**: Red (#FF6B6B)
- **SQS**: Orange (#FF9F1C)

---

## 🔧 Troubleshooting

### Issue: Containers won't start
```powershell
# Check logs
docker-compose logs

# Restart
docker-compose restart

# Full reset
docker-compose down -v
docker-compose up -d
```

### Issue: Can't access http://localhost:3000
- Wait 20-30 seconds after `docker-compose up`
- Check containers: `docker ps`
- Check logs: `docker-compose logs frontend`

### Issue: DateTime format errors
**Fixed!** The app now properly formats datetime values.

### Issue: AI endpoint error
**Expected** if Ollama/OpenAI not configured. App continues working.

### Issue: Database connection error
```powershell
# Check database health
docker exec auth_postgres pg_isready -U postgres

# Restart database
docker-compose restart db
```

---

## 📊 Supported AWS Services

Currently supports 11 AWS resource types:
1. **EC2** - Elastic Compute Cloud
2. **S3** - Simple Storage Service
3. **RDS** - Relational Database Service
4. **Lambda** - Serverless Functions
5. **VPC** - Virtual Private Cloud
6. **ELB** - Elastic Load Balancer
7. **CloudFront** - CDN
8. **Route53** - DNS Service
9. **DynamoDB** - NoSQL Database
10. **SNS** - Notification Service
11. **SQS** - Queue Service

---

## 🌏 Supported AWS Regions

**Total: 23 regions**

**United States:**
- us-east-1 (N. Virginia)
- us-east-2 (Ohio)
- us-west-1 (N. California)
- us-west-2 (Oregon)

**Europe:**
- eu-west-1 (Ireland)
- eu-west-2 (London)
- eu-west-3 (Paris) ✨
- eu-central-1 (Frankfurt)
- eu-central-2 (Zurich)
- eu-north-1 (Stockholm)
- eu-south-1 (Milan)
- eu-south-2 (Spain)

**Asia Pacific:**
- ap-south-1 (Mumbai)
- ap-southeast-1 (Singapore)
- ap-southeast-2 (Sydney)
- ap-southeast-3 (Jakarta)
- ap-northeast-1 (Tokyo)
- ap-northeast-2 (Seoul)
- ap-northeast-3 (Osaka)

**Other Regions:**
- ca-central-1 (Canada)
- sa-east-1 (São Paulo)
- me-south-1 (Bahrain)
- af-south-1 (Cape Town)

---

## 📦 Resource Fields (27 Total)

### Basic Information (4)
- Name
- Type
- Region
- Description

### AWS Identifiers (3)
- ARN
- Account ID
- Resource ID

### Operational Details (4)
- Status
- Environment
- Cost Center
- Owner

### Networking (8) ✨
- VPC ID
- Subnet ID
- Availability Zone
- Security Groups
- **Public IP** (NEW)
- **Private IP** (NEW)
- **Instance Type** (NEW)
- **Resource Creation Date** (NEW)

### Relationships (2)
- Dependencies
- Connected Resources

### Metadata (2)
- Tags
- Notes

### Audit (4 - automatic)
- Created By
- Created At
- Updated At
- ID

---

## 🎯 Tips & Best Practices

### 1. Naming Convention
Use descriptive names:
- ✅ `web-server-prod-us-east-1`
- ✅ `rds-primary-production`
- ❌ `server1`
- ❌ `db`

### 2. Use Environments
Tag resources consistently:
- `prod` - Production
- `staging` - Staging
- `dev` - Development
- `test` - Testing

### 3. Document Dependencies
Link resources that depend on each other:
- Web server → Database
- Load balancer → Web servers
- CloudFront → S3 bucket

### 4. Use ARN Parser
Paste full ARN and click "Parse" to auto-fill fields!

### 5. Regular Backups
```powershell
# Set up daily automatic backups
.\backup-database.ps1 -AutoBackup
```

### 6. Export Diagrams
Save architecture diagrams as PNG for:
- Documentation
- Presentations
- Change requests
- Disaster recovery plans

---

## 🚀 Next Steps

1. **Add your first resource**
   - Go to Resources page
   - Click "+ Add Resource"
   - Fill in details

2. **View the diagram**
   - Go to Architecture page
   - See your infrastructure visualized

3. **Set up backups**
   - Run `.\backup-database.ps1`
   - Schedule automatic backups

4. **Optional: Enable AI**
   - Install Ollama for free local AI
   - Or configure OpenAI API key

---

## 📞 Support

### Documentation Files
- `GETTING-STARTED.md` - This guide
- `CRITICAL-FIXES-COMPLETE.md` - Recent fixes & features
- `ENHANCEMENTS-UPDATE.md` - Field enhancements
- `IMPLEMENTATION-COMPLETE.md` - Technical details

### Check Logs
```powershell
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs db
```

### Reset Everything
```powershell
docker-compose down -v
docker-compose up -d
```

---

## ✨ Key Features Summary

- ✅ User authentication with JWT
- ✅ Comprehensive resource management (27 fields)
- ✅ **Interactive architecture diagram visualization**
- ✅ Real-time dashboard statistics
- ✅ 11 AWS resource types
- ✅ 23 AWS regions
- ✅ ARN parser auto-fill
- ✅ Public/Private IP tracking
- ✅ Instance type management
- ✅ Resource creation date tracking
- ✅ Dependencies & connections visualization
- ✅ Export diagrams as PNG
- ✅ Database backup & restore
- ✅ Bilingual interface (EN/AR)
- ✅ Optional AI insights

---

## 🎉 You're Ready!

**Start exploring:**
```
http://localhost:3000
```

**Create resources → View diagram → Backup database → Success!** 🚀
