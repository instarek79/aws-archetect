# 🔧 Quick Fix: Ollama Timeout Issue

## Problem Identified ✅

**Error:** `httpx.ReadTimeout`  
**Cause:** llama2 is taking too long to respond (over 120 seconds)  
**Reason:** llama2 is a large model (4GB) and may be slow on your system

---

## ✅ Applied Fixes

### 1. Increased Timeout
Changed timeout from 120s → 300s (5 minutes)

### 2. Added Detailed Logging
Now you can see exactly what's happening:
- 🔄 Request sent
- 📝 Model being used
- 📏 Prompt size
- ✅ Response received
- ⏱️ Generation time

---

## 🚀 Immediate Solutions

### Solution 1: Use Faster Model (RECOMMENDED)

**llama3.2 is downloading now (13% complete):**
```powershell
# Check download progress
ollama list

# Once complete, update model
# Edit docker-compose.yml or restart backend
# It will auto-detect llama3.2
```

**Benefits of llama3.2:**
- ⚡ 3-5x faster than llama2
- 📦 Smaller (2GB vs 4GB)
- 🎯 More accurate
- ⏱️ Responds in 5-15 seconds

### Solution 2: Reduce Response Length

**Edit:** `backend/app/routers/ai.py` line 105
```python
# Change from:
"num_predict": 1500

# To:
"num_predict": 500  # Shorter, faster responses
```

Then restart:
```powershell
docker-compose restart backend
```

### Solution 3: Use Smaller Model (FASTEST)

```bash
# Pull tiny model (1GB, very fast)
ollama pull tinyllama

# Update docker-compose.yml:
OLLAMA_MODEL: tinyllama

# Restart
docker-compose restart backend
```

**tinyllama:**
- 🚀 Very fast (2-5 seconds)
- 📦 Small (1GB)
- ⚠️ Less accurate than llama2/llama3.2

---

## 📊 View Detailed Logs

### Option 1: Use Log Viewer Script (Color Coded)

```powershell
# View last 100 lines
.\view-logs.ps1

# View only errors
.\view-logs.ps1 -Errors

# Follow logs in real-time
.\view-logs.ps1 -Follow

# View last 50 lines
.\view-logs.ps1 -Lines 50
```

### Option 2: Direct Docker Logs

```powershell
# View all logs (no color)
docker-compose logs backend --tail 100 --no-log-prefix

# Follow live
docker-compose logs backend --follow

# Only errors (grep)
docker-compose logs backend --tail 200 | Select-String -Pattern "error|Error|ERROR|❌|Exception|Traceback|500"
```

### Option 3: Save Logs to File

```powershell
# Save to file
docker-compose logs backend --tail 500 --no-log-prefix > backend-logs.txt

# Open in notepad
notepad backend-logs.txt
```

---

## 🧪 Test After Fix

### Step 1: Restart Backend
```powershell
docker-compose restart backend
```

### Step 2: Watch Logs in Real-Time
```powershell
.\view-logs.ps1 -Follow
```

### Step 3: Try AI Insights
```
1. Go to: http://localhost:3000/ai-insights
2. Type: "test"
3. Click: Analyze
4. Watch logs to see:
   🔄 Sending request to Ollama...
   📝 Model: llama2
   📏 Prompt length: XXX chars
   ✅ Ollama responded successfully!
   ⏱️ Generation took: XX.XXs
```

---

## 📈 What You'll See in Logs Now

### Successful Request:
```
🔄 Sending request to Ollama at http://host.docker.internal:11434...
📝 Model: llama2
📏 Prompt length: 450 chars
✅ Ollama responded successfully!
📊 Response length: 850 chars
⏱️ Generation took: 45.32s
INFO: 172.18.0.1:12345 - "POST /ai/analyze HTTP/1.1" 200 OK
```

### Timeout Error:
```
🔄 Sending request to Ollama at http://host.docker.internal:11434...
📝 Model: llama2
📏 Prompt length: 450 chars
❌ Ollama error:
Traceback (most recent call last):
...
httpx.ReadTimeout
INFO: 172.18.0.1:12345 - "POST /ai/analyze HTTP/1.1" 500 Internal Server Error
```

### Connection Error:
```
🔄 Sending request to Ollama at http://host.docker.internal:11434...
❌ Ollama connection error: Cannot connect...
INFO: 172.18.0.1:12345 - "POST /ai/analyze HTTP/1.1" 503 Service Unavailable
```

---

## ⏱️ Expected Response Times

| Model | Size | First Request | Subsequent | Quality |
|-------|------|---------------|------------|---------|
| **tinyllama** | 1GB | 3-5s | 2-3s | Good |
| **llama3.2** | 2GB | 8-12s | 5-8s | Excellent |
| **llama2** | 4GB | 30-60s | 20-40s | Good |
| **llama3.1** | 5GB | 45-90s | 30-60s | Excellent |

**Recommendation:** Use llama3.2 (downloading now) - best speed/quality balance

---

## 🎯 When llama3.2 Download Completes

### Check Status:
```powershell
ollama list
# Should show: llama3.2:latest
```

### Update Configuration:

**Option A: Docker Compose (Recommended)**
```yaml
# Edit docker-compose.yml line 44:
OLLAMA_MODEL: ${OLLAMA_MODEL:-llama3.2}
```

**Option B: Create .env file**
```bash
# Create .env in project root:
echo "OLLAMA_MODEL=llama3.2" > .env
```

### Restart:
```powershell
docker-compose restart backend

# Watch logs
.\view-logs.ps1 -Follow

# Should see:
# ✅ Using local Ollama... with model llama3.2
```

### Test:
```
Go to: http://localhost:3000/ai-insights
Type: "analyze my architecture"
Click: Analyze

Expected: Response in 5-10 seconds!
```

---

## 🔍 Debugging Commands

### Check Ollama Models:
```powershell
ollama list
```

### Check Ollama is Running:
```powershell
curl http://localhost:11434/api/tags
```

### Test Ollama Speed:
```powershell
# Time a simple request
Measure-Command {
    ollama run llama2 "Say hello"
}
```

### Check Backend Health:
```powershell
curl http://localhost:8000/health
```

### Full System Status:
```powershell
# All containers
docker-compose ps

# Backend logs
.\view-logs.ps1 -Lines 50

# Ollama models
ollama list
```

---

## 📝 Summary

**Problem:** llama2 timeout (too slow)

**Fixes Applied:**
- ✅ Increased timeout 120s → 300s
- ✅ Added detailed logging
- ✅ Downloading llama3.2 (faster model)

**Immediate Actions:**
1. Wait for llama3.2 to finish downloading (~10 more minutes)
2. Or use `ollama pull tinyllama` for instant speed (1 minute download)
3. Use `.\view-logs.ps1 -Follow` to monitor in real-time
4. Once llama3.2 is ready, update model and restart

**View Logs:**
```powershell
# Simple
.\view-logs.ps1 -Errors

# Detailed
.\view-logs.ps1 -Follow
```

**llama3.2 will solve the timeout issue!** ⚡
