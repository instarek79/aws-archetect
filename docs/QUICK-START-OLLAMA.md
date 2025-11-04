# 🚀 Quick Start: Using Import with Ollama

## ✅ System Status

**Backend:** ✅ Running (port 8000)  
**Frontend:** ✅ Running (port 3000)  
**LLM:** ✅ Ollama configured (llama3.2)  
**Database:** ✅ PostgreSQL ready  

---

## 3-Step Setup

### 1. Ensure Ollama is Running

```bash
# Check if Ollama is running
ollama list

# Should show your models, e.g.:
# NAME          ID              SIZE
# llama3.2      abc123def       2.0 GB
```

**If not installed:**
```bash
# Download from: https://ollama.ai
# Then pull the model:
ollama pull llama3.2
```

### 2. Verify Backend Connection

Backend logs should show:
```
✅ Using local Ollama at http://host.docker.internal:11434/v1 with model llama3.2
```

### 3. Test Import Feature

Go to: `http://localhost:3000/import`

---

## Example: Import Your First Resources

### Create Test CSV

**File: `test-resources.csv`**
```csv
name,type,region,instance_type,private_ip
web-server-1,ec2,us-east-1,t3.medium,10.0.1.10
web-server-2,ec2,us-east-1,t3.medium,10.0.1.11
api-server-1,ec2,us-east-1,t3.large,10.0.2.10
```

### Import Process

**Step 1:** Go to `/import`

**Step 2:** Upload `test-resources.csv`

**Step 3:** Click "Analyze with AI"
- Ollama analyzes the data (~2-3 seconds)
- Detects resource type: EC2
- Maps columns automatically

**Step 4:** Review mappings
```
name → name ✅
type → type ✅
region → region ✅
instance_type → instance_type ✅
private_ip → private_ip ✅
```

**Step 5:** Click "Preview Import"
```
✅ Valid: 3 resources
❌ Invalid: 0
```

**Step 6:** Click "Import 3 Resources"
```
✅ Import successful!
```

**Step 7:** View resources
- Go to `/resources`
- See your 3 EC2 instances
- Go to `/architecture`
- See them in the diagram!

---

## What If Ollama Isn't Working?

### Fallback: Manual Mapping

Even without Ollama, you can still import:

1. Upload file
2. Skip AI analysis (or it will show error)
3. Manually map fields
4. Import works normally

### Use OpenAI Instead

If you have OpenAI API key:

```bash
# In .env
OPENAI_API_KEY=sk-your-key-here
# Remove OLLAMA_BASE_URL
```

Restart backend:
```bash
docker-compose restart backend
```

---

## Models Comparison

| Model | Speed | Accuracy | Memory | Best For |
|-------|-------|----------|--------|----------|
| llama3.2 | Fast | Good | 2GB | General use (default) |
| llama3.1 | Medium | Excellent | 4GB | Complex data |
| qwen2.5 | Fast | Excellent | 4GB | Structured data |
| mistral | Very Fast | Good | 4GB | Quick analysis |

### Change Model

```bash
# Pull new model
ollama pull qwen2.5

# Update .env
OLLAMA_MODEL=qwen2.5

# Restart
docker-compose restart backend
```

---

## Troubleshooting

### Issue: "Failed to connect to Ollama"

**Check 1:** Is Ollama running?
```bash
ollama serve
```

**Check 2:** Is port 11434 accessible?
```bash
curl http://localhost:11434/api/tags
```

**Check 3:** Restart Docker
```bash
docker-compose restart backend
```

### Issue: "Model not found"

```bash
# Pull the model
ollama pull llama3.2

# Verify
ollama list
```

### Issue: Backend not starting

```bash
# Check logs
docker-compose logs backend

# Rebuild if needed
docker-compose build backend
docker-compose up -d backend
```

---

## Advanced: Excel with Multiple Sheets

### Example Excel File

**Sheet 1: EC2 Instances**
```
name,type,region,instance_type
web-1,ec2,us-east-1,t3.medium
```

**Sheet 2: RDS Databases**
```
db_name,type,region,endpoint,port
prod-db,rds,us-east-1,prod.rds.aws...,5432
```

**Sheet 3: Load Balancers**
```
lb_name,type,dns_name,subnets
web-lb,elb,web-lb.elb.aws...,sub1,sub2,sub3
```

### Import Process

1. Upload Excel file
2. **Select Sheet 1** → Analyze → Import EC2
3. **Select Sheet 2** → Analyze → Import RDS
4. **Select Sheet 3** → Analyze → Import ELB

**Result:** All resources from all sheets imported! 🎉

---

## What's Next?

### After Importing

**1. View in Diagram**
```
/architecture → See your infrastructure visualized
```

**2. Multi-Subnet Resources**
```
RDS with multiple subnets → Shown in orange "Multi-Subnet" section
Load balancers → Shown in orange section with subnet count badge
```

**3. Resource Details**
```
Click any resource in diagram → See full details
- Endpoints
- Ports
- DNS names
- Target groups
- All type-specific properties
```

### Build Your Infrastructure Database

**Sources:**
- AWS Console exports
- CMDB exports
- Infrastructure-as-Code outputs (Terraform state)
- Manual Excel inventories
- Third-party tools exports

**Process:**
1. Export to Excel/CSV
2. Upload to import page
3. Let Ollama map fields
4. Preview and import
5. Visualize in diagram

---

## Summary

✅ **Ollama configured** - Free local LLM  
✅ **Import feature ready** - AI-assisted mapping  
✅ **Multi-subnet support** - Advanced visualization  
✅ **All features working** - End-to-end flow  

**Test URL:** `http://localhost:3000/import`

**Documentation:**
- `/docs/OLLAMA-INTEGRATION.md` - Full Ollama guide
- `/docs/MULTI-SUBNET-FIX-AND-IMPORT-FEATURE.md` - Feature overview

🎊 **Your AWS architecture management system is production-ready!** 🎊
