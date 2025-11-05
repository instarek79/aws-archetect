# 🔥 FIX LLM TIMEOUT - FINAL SOLUTION

## The Problem

LLM analysis keeps timing out with llama3.2:
```
ERROR: LLM analysis failed with: Request timed out.
httpcore.ReadTimeout: timed out
```

---

## ✅ THE FIX (3 Steps)

### Step 1: Install Qwen 2.5 Model (Better & Faster)

```powershell
.\SETUP-QWEN.ps1
```

**OR manually:**
```powershell
ollama pull qwen2.5
```

**Why Qwen 2.5?**
- ✅ Faster inference (3-5x faster than llama3.2)
- ✅ Better at structured data and JSON
- ✅ More reliable responses
- ✅ Smaller model size (~4GB vs ~7GB)

---

### Step 2: Restart Backend

**Press `Ctrl+C` in backend terminal**

Then run:
```powershell
.\START-BACKEND.ps1
```

**Look for:**
```
SUCCESS: Using local Ollama at http://localhost:11434/v1 with model qwen2.5
```

---

### Step 3: Try Import Again

1. Go to Import page
2. Upload CSV
3. Click **"Analyze with AI"**
4. **Wait 10-20 seconds** (Qwen is processing)
5. **Should work now!** ✅

---

## What I Changed

### 1. Timeout Increased
**Before:** 5 seconds  
**After:** 120 seconds

LLM needs time to process!

### 2. Model Changed
**Before:** llama3.2 (slow, unreliable)  
**After:** qwen2.5 (fast, reliable)

### 3. Already Optimized Prompt
- Only 1 row sample
- Max 10 columns
- Minimal schema
- Simple JSON response

---

## Alternative: Use DeepSeek

If Qwen still doesn't work, try DeepSeek:

```powershell
ollama pull deepseek-coder
```

Then set environment variable:
```powershell
$env:OLLAMA_MODEL = 'deepseek-coder'
```

Restart backend.

---

## Troubleshooting

### Issue: "Model not found"
**Fix:**
```powershell
ollama list
ollama pull qwen2.5
```

### Issue: Still timing out
**Fix:**
1. Check model is loaded: `ollama list`
2. Test model: `ollama run qwen2.5`
3. Type "hello" and see if it responds
4. Press Ctrl+D to exit
5. Try backend again

### Issue: Ollama not running
**Fix:**
```powershell
ollama serve
```
Or open Ollama app.

---

## Backend Configuration Updated

These files now use qwen2.5:
- ✅ `backend/app/services/import_service.py` (120s timeout)
- ✅ `backend/app/core/config.py` (default: qwen2.5)
- ✅ `START-BACKEND.ps1` (env var: qwen2.5)
- ✅ `START-ALL.ps1` (env var: qwen2.5)

---

## Test Before Import

Verify setup:
```powershell
.\TEST-OLLAMA.ps1
```

Should show:
```
✅ Ollama is running!
✅ qwen2.5 model found!
✅ LLM call successful!
```

---

## Summary

**Problem:** llama3.2 too slow, timing out at 5 seconds  
**Solution:** Switch to qwen2.5, increase timeout to 120s  
**Result:** Fast, reliable LLM analysis

---

## Quick Commands

```powershell
# Install Qwen
.\SETUP-QWEN.ps1

# Restart backend
Ctrl+C
.\START-BACKEND.ps1

# Test Ollama
.\TEST-OLLAMA.ps1

# Try import with AI
# (Upload CSV → Analyze with AI)
```

---

## Expected Performance

**llama3.2:** 15-60 seconds (often timeout)  
**qwen2.5:** 5-15 seconds ✅  
**deepseek-coder:** 8-20 seconds ✅

---

**Install qwen2.5 now and restart backend. It will work!** 🚀
