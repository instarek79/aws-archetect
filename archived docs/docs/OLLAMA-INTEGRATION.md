# 🤖 Local Ollama Integration for Data Import

## Overview

The system now supports **local Ollama** as an LLM provider for intelligent Excel/CSV import! This means:

✅ **No API costs** - Completely free  
✅ **Privacy** - Data never leaves your machine  
✅ **No internet required** - Works offline  
✅ **Fast** - Local inference  

---

## Configuration

### Default Setup (Ollama)

The system is **pre-configured** to use your local Ollama:

```yaml
# docker-compose.yml (already configured)
environment:
  OLLAMA_BASE_URL: http://host.docker.internal:11434/v1
  OLLAMA_MODEL: llama3.2
```

**That's it!** No additional configuration needed.

---

## How It Works

### Automatic Detection

When the backend starts, it checks:

```python
1. Is OLLAMA_BASE_URL set? → Use Ollama (local)
2. Is OPENAI_API_KEY set? → Use OpenAI (cloud)
3. Neither set? → Import works without AI assistance
```

### Startup Message

You'll see this in the logs:

```
✅ Using local Ollama at http://host.docker.internal:11434/v1 with model llama3.2
```

---

## Supported Models

### Recommended Models

**For Data Analysis:**
- `llama3.2` (default) - Fast, good accuracy
- `llama3.1` - More accurate, slower
- `qwen2.5` - Excellent for structured data
- `mistral` - Fast alternative

### Pull a Model

```bash
# Pull llama3.2 (default)
ollama pull llama3.2

# Or try other models
ollama pull llama3.1
ollama pull qwen2.5:7b
ollama pull mistral
```

### Change Model

**Option 1: Environment Variable**
```bash
# In .env file
OLLAMA_MODEL=llama3.1
```

**Option 2: Docker Compose**
```yaml
environment:
  OLLAMA_MODEL: qwen2.5
```

---

## Testing Ollama Connection

### Check Ollama is Running

```bash
# From your host machine
curl http://localhost:11434/api/tags

# Should return list of models
```

### Test from Docker Container

```bash
# Enter backend container
docker exec -it auth_backend bash

# Test connection
curl http://host.docker.internal:11434/v1/models

# Should return JSON with models
```

---

## Import Feature with Ollama

### How AI Analysis Works

**Step 1: Upload Excel/CSV**
```
User uploads file → Backend parses it
```

**Step 2: Send Sample to Ollama**
```python
# Sample data (first 5 rows)
sample = [
  {"Name": "web-server-1", "Type": "EC2", "Region": "us-east-1"},
  {"Name": "db-server-1", "Type": "RDS", "Region": "us-west-2"},
  ...
]

# Send to local Ollama
response = ollama_client.chat.completions.create(
    model="llama3.2",
    messages=[
        {"role": "system", "content": "Analyze AWS resource data..."},
        {"role": "user", "content": prompt_with_sample}
    ]
)
```

**Step 3: Ollama Analyzes**
```
→ Detects resource type (EC2, RDS, S3, etc.)
→ Maps columns to database fields
→ Identifies type-specific properties
→ Suggests transformations
→ Returns JSON response
```

**Step 4: User Reviews & Imports**
```
→ AI suggestions displayed
→ User can edit mappings
→ Preview before import
→ Execute batch import
```

---

## Response Format

### What Ollama Returns

```json
{
  "detected_resource_type": "ec2",
  "confidence": "high",
  "field_mappings": {
    "Name": "name",
    "Type": "type",
    "Region": "region",
    "Instance Size": "instance_type",
    "IP Address": "private_ip"
  },
  "type_specific_mappings": {
    "AMI ID": "ami_id",
    "Key Pair": "key_pair"
  },
  "transformations_needed": [],
  "missing_required_fields": [],
  "warnings": ["Consider adding VPC information"],
  "suggestions": ["Add security groups if available"]
}
```

### JSON Parsing

The system handles **multiple response formats**:

```python
# 1. Pure JSON (ideal)
{"field_mappings": {...}}

# 2. Markdown wrapped (Ollama sometimes does this)
```json
{"field_mappings": {...}}
```

# 3. JSON in text
The analysis is: {"field_mappings": {...}}

# All formats are automatically parsed!
```

---

## Performance

### Speed Comparison

**Ollama (Local):**
- Initial load: ~2 seconds (model loading)
- Analysis: 1-3 seconds per sheet
- Total: ~5 seconds for typical file

**OpenAI (Cloud):**
- Network request: ~2-5 seconds
- Analysis: Varies by API load
- Total: ~5-10 seconds

### Memory Usage

**Model Requirements:**
- `llama3.2` - ~2GB RAM
- `llama3.1` - ~4GB RAM
- `qwen2.5` - ~4GB RAM

**Recommended:** At least 8GB RAM for smooth operation

---

## Troubleshooting

### Issue 1: "Connection Refused"

**Error:**
```
Error: Failed to connect to http://host.docker.internal:11434
```

**Solution:**
```bash
# Check Ollama is running
ollama serve

# Or restart Ollama
# Windows: Restart from system tray
# Mac: Restart Ollama app
# Linux: sudo systemctl restart ollama
```

### Issue 2: "Model Not Found"

**Error:**
```
Error: Model llama3.2 not found
```

**Solution:**
```bash
# Pull the model
ollama pull llama3.2

# Verify it's available
ollama list
```

### Issue 3: Slow Responses

**Symptoms:** Analysis takes >10 seconds

**Solutions:**
```bash
# 1. Use smaller model
OLLAMA_MODEL=llama3.2  # Instead of llama3.1

# 2. Check CPU usage
# Ollama uses CPU/GPU - ensure enough resources

# 3. Reduce sample size (already optimized to 5 rows)
```

### Issue 4: Invalid JSON Response

**Error:**
```
Could not parse JSON from LLM response
```

**This is handled automatically!** The system:
1. Tries pure JSON parse
2. Extracts from markdown code blocks
3. Searches for JSON patterns
4. Returns clear error if all fail

**Manual fix:** Try a different model
```bash
OLLAMA_MODEL=qwen2.5  # Better at structured output
```

---

## Switching to OpenAI (Optional)

If you prefer cloud-based OpenAI:

### Step 1: Get API Key
```
https://platform.openai.com/api-keys
```

### Step 2: Configure
```bash
# In .env file
OPENAI_API_KEY=sk-your-key-here

# Remove Ollama URL to use OpenAI instead
# OLLAMA_BASE_URL=  # Comment out
```

### Step 3: Restart
```bash
docker-compose restart backend
```

### Startup Message
```
✅ Using OpenAI GPT-4
```

---

## Best Practices

### For Best Results

**1. Clean Data:**
```csv
# Good
Name,Type,Region
web-server,ec2,us-east-1

# Avoid
NameOfServer,ResourceType,AWS Region
```

**2. Include Headers:**
Always have column headers in row 1

**3. Consistent Formatting:**
Use same column names across files

**4. Sample Size:**
First 5 rows should be representative

---

## Example Workflow

### Complete Import with Ollama

**1. Prepare Data:**
```csv
resource_name,resource_type,aws_region,instance_size,private_ip
web-1,ec2,us-east-1,t3.medium,10.0.1.10
web-2,ec2,us-east-1,t3.medium,10.0.1.11
db-1,rds,us-east-1,db.r5.large,10.0.2.50
```

**2. Upload to /import:**
```
Click "Select File" → Choose CSV
```

**3. Ollama Analyzes:**
```
Sending to llama3.2...
⏳ Analyzing (2 seconds)
✅ Analysis complete!

Detected: EC2 + RDS (mixed)
Confidence: High

Mappings:
  resource_name → name
  resource_type → type
  aws_region → region
  instance_size → instance_type
  private_ip → private_ip
```

**4. Review & Import:**
```
Valid: 3 resources
Invalid: 0
[Import 3 Resources] ✅
```

---

## Architecture

### System Components

```
┌─────────────┐
│  Frontend   │  (React)
│   /import   │
└──────┬──────┘
       │ Upload file
       ↓
┌─────────────┐
│   Backend   │  (FastAPI)
│ import_     │
│ service.py  │
└──────┬──────┘
       │ Sample data
       ↓
┌─────────────┐
│   Ollama    │  (Local LLM)
│ llama3.2    │  Running on host
└──────┬──────┘
       │ JSON analysis
       ↓
┌─────────────┐
│  Database   │  (PostgreSQL)
│  Resources  │
└─────────────┘
```

### Network Path

```
Docker Container → host.docker.internal:11434 → Host Ollama → Response
```

---

## Benefits Summary

### Why Ollama?

✅ **Free:** No API costs ever  
✅ **Private:** Data stays on your machine  
✅ **Fast:** Local inference  
✅ **Offline:** Works without internet  
✅ **Customizable:** Choose any model  
✅ **Accurate:** Comparable to GPT-3.5  

### When to Use OpenAI Instead?

- Need absolute best accuracy
- Don't want to manage local models
- Low-memory system
- Already have OpenAI credits

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434/v1` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Model to use for analysis |
| `OPENAI_API_KEY` | None | OpenAI API key (alternative) |

### Docker Compose

```yaml
backend:
  environment:
    # Use Ollama (local)
    OLLAMA_BASE_URL: http://host.docker.internal:11434/v1
    OLLAMA_MODEL: llama3.2
    
    # OR use OpenAI (cloud)
    # OPENAI_API_KEY: sk-...
```

---

## Status: FULLY CONFIGURED

✅ **Ollama integration complete**  
✅ **Pre-configured in docker-compose**  
✅ **Automatic model selection**  
✅ **Fallback to OpenAI if configured**  
✅ **Works with any Ollama model**  

**Just make sure Ollama is running and you're good to go!** 🚀

```bash
# Verify Ollama
ollama list

# Should show llama3.2 or other models
```

**Test the import feature:** `http://localhost:3000/import`
