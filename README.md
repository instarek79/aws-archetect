# AWS Architect - Cloud Infrastructure Management

**Interactive AWS resource management and architecture visualization tool.**

---

## 🚀 Quick Start

```powershell
# 1. Start the application
docker-compose up -d

# 2. Open browser
http://localhost:3000

# 3. Login (or create account)
Email: admin@example.com
Password: admin123
```

---

## 🎯 Main Features

### 1. **Architecture Diagram** ✨
**Interactive visualization of your AWS infrastructure**
- Visual diagram grouped by region
- Color-coded resource types
- Dependencies and connections
- Click nodes for details
- Export as PNG

**Access:** Click "Diagram" button or go to `/architecture`

### 2. **Resource Management**
- Add, edit, delete AWS resources
- 27 fields including IPs, instance types, creation dates
- ARN parser for auto-fill
- 23 AWS regions (including Paris)
- 11 resource types

### 3. **Dashboard**
- Real-time statistics
- Resource breakdown by type and region
- Quick action cards

### 4. **Database Backup**
```powershell
.\backup-database.ps1
```

---

## 📚 Documentation

**All documentation is in the [docs/](docs/) folder.**

### Start Here:
- **[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)** - Complete user guide
- **[docs/INDEX.md](docs/INDEX.md)** - Full documentation index

### Recent Updates:
- **[docs/CRITICAL-FIXES-COMPLETE.md](docs/CRITICAL-FIXES-COMPLETE.md)** - All fixes
- **[docs/FIXES-SUMMARY.md](docs/FIXES-SUMMARY.md)** - Quick summary

---

## 📦 What's Included

- ✅ User authentication (JWT)
- ✅ Resource management (CRUD)
- ✅ **Interactive architecture diagrams**
- ✅ Dashboard with statistics
- ✅ 27 resource fields
- ✅ 23 AWS regions
- ✅ ARN parser
- ✅ Database backup tool
- ✅ Bilingual (EN/AR)
- ✅ Optional AI insights

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy
- JWT authentication

**Frontend:**
- React + Vite
- React Router
- Axios
- Lucide Icons
- TailwindCSS
- HTML5 Canvas

**DevOps:**
- Docker & Docker Compose
- PostgreSQL backup scripts

---

## 🎨 Screenshots

### Architecture Diagram
```
┌─────── us-east-1 ───────┐  ┌──── eu-west-3 ────┐
│  🖥️ web-server          │  │  🖥️ paris-web    │
│  EC2 | ● running        │  │  EC2 | ● running  │
│     │                   │  │                   │
│     ↓ (dependency)      │  │                   │
│  🗃️ database           │  │  🗃️ paris-db     │
│  RDS | ● available      │  │  RDS | ● available│
└─────────────────────────┘  └───────────────────┘
```

### Dashboard
- Total Resources: 5
- Resource Types: 3
- Regions: 2
- Active: 4

---

## 🔧 Commands

```powershell
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Backup database
.\backup-database.ps1

# Reset everything
docker-compose down -v
docker-compose up -d
```

---

## 🌍 Supported

**AWS Regions (23):**
US East, US West, EU (Ireland, London, Paris, Frankfurt, Zurich, Stockholm, Milan, Spain), Asia Pacific (Mumbai, Singapore, Sydney, Jakarta, Tokyo, Seoul, Osaka), Canada, South America, Middle East, Africa

**AWS Services (11):**
EC2, S3, RDS, Lambda, VPC, ELB, CloudFront, Route53, DynamoDB, SNS, SQS

---

## 📞 Support

**Documentation:** See [docs/](docs/) folder

**Quick Links:**
- [Getting Started Guide](docs/GETTING-STARTED.md)
- [Resource Guide](docs/AWS-RESOURCES-GUIDE.md)
- [Latest Fixes](docs/CRITICAL-FIXES-COMPLETE.md)
- [Documentation Index](docs/INDEX.md)

---

## ✅ Status

**Production Ready** - All critical features implemented and tested.

- ✅ Resource management working
- ✅ Architecture diagram functional
- ✅ Dashboard statistics accurate
- ✅ Database backup solution ready
- ✅ All bugs fixed

---

## 🎉 Get Started!

```
http://localhost:3000
```

**Read the guide:** [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)

---

*AWS Architect - Built with ❤️ for cloud infrastructure management*
