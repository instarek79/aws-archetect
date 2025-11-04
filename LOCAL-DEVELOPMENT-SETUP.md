# 🚀 Local Development Setup Guide

## ✅ What's Done

- ✅ Database runs in Docker
- ✅ Backend runs locally (better debugging)
- ✅ Frontend runs locally (fast refresh)
- ✅ Comprehensive authentication logging added
- ✅ Informative error messages for login/register

---

## ⚠️ IMPORTANT: Python Version Issue

**Your Python 3.13 is too new for pandas 2.1.3!**

### Fix Option 1: Install Pandas 2.2+ (Beta)

```powershell
# In backend virtual environment
pip install pandas==2.2.0
```

### Fix Option 2: Downgrade to Python 3.11 or 3.12 (Recommended)

1. Download Python 3.11.x from: https://www.python.org/downloads/
2. Install it
3. Delete old venv:
   ```powershell
   cd backend
   Remove-Item -Recurse -Force venv
   ```
4. Create new venv with Python 3.11:
   ```powershell
   python3.11 -m venv venv
   ```
5. Run backend setup again

### Fix Option 3: Use pre-compiled pandas wheel

```powershell
# Download from: https://www.lfd.uci.edu/~gohlke/pythonlibs/#pandas
# Then install locally
pip install pandas-2.1.3-cp313-cp313-win_amd64.whl
```

---

## 📋 Quick Start

### 1. Start Database
```powershell
.\start-db.ps1
```

**Output:**
```
Database is ready!

Database Connection:
  Host: localhost
  Port: 5432
  User: postgres
  Password: postgres
  Database: auth_db
```

### 2. Start Backend (in new terminal)
```powershell
.\start-backend.ps1
```

**What it does:**
- Checks database is running ✅
- Creates Python virtual environment
- Installs dependencies from requirements.txt
- Sets environment variables
- Starts FastAPI on http://localhost:8000

**Output:**
```
Starting Backend Server...
Database is running
Python found: Python 3.11.x

Configuration:
  Database URL: postgresql://postgres:postgres@localhost:5432/auth_db
  API URL: http://localhost:8000

Starting FastAPI server...
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 3. Start Frontend (in new terminal)
```powershell
.\start-frontend.ps1
```

**What it does:**
- Checks Node.js is installed
- Installs npm dependencies
- Starts Vite dev server on http://localhost:3000

**Output:**
```
Starting Frontend Server...
Node.js found: v20.x.x

Configuration:
  Frontend URL: http://localhost:3000
  Backend API: http://localhost:8000

Starting Vite dev server...
  VITE v4.x.x  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
```

---

## 🔍 Authentication Logging

The backend now shows detailed logs for every auth operation:

### Register Attempt:
```
INFO: 🔐 REGISTER attempt for email: test@test.com, username: testuser
INFO: Creating new user account for test@test.com...
INFO: ✅ REGISTER SUCCESS: User test@test.com created with ID 1
```

### Register Failure (Email Exists):
```
INFO: 🔐 REGISTER attempt for email: test@test.com, username: testuser
WARNING: ❌ REGISTER FAILED: Email test@test.com already registered
```

### Login Attempt:
```
INFO: 🔐 LOGIN attempt for email: test@test.com
INFO: Verifying password for user test@test.com...
INFO: Generating tokens for user test@test.com...
INFO: ✅ LOGIN SUCCESS: User test@test.com (ID: 1) authenticated successfully
```

### Login Failure (Wrong Password):
```
INFO: 🔐 LOGIN attempt for email: test@test.com
INFO: Verifying password for user test@test.com...
WARNING: ❌ LOGIN FAILED: Invalid password for user test@test.com
```

### Login Failure (User Not Found):
```
INFO: 🔐 LOGIN attempt for email: nobody@test.com
WARNING: ❌ LOGIN FAILED: User with email nobody@test.com not found in database
```

---

## 🎯 Testing Authentication

### Test 1: Register New User
```
1. Go to: http://localhost:3000/signup
2. Email: yourname@test.com
3. Username: yourname
4. Password: test123456
5. Click "Sign Up"
6. Check backend logs - should see:
   ✅ REGISTER SUCCESS: User yourname@test.com created
```

### Test 2: Login
```
1. Go to: http://localhost:3000/login
2. Email: yourname@test.com
3. Password: test123456
4. Click "Log In"
5. Check backend logs - should see:
   ✅ LOGIN SUCCESS: User yourname@test.com authenticated
```

### Test 3: Wrong Password
```
1. Try to login with wrong password
2. Should see error: "Incorrect password. Please check your password and try again."
3. Backend logs show: ❌ LOGIN FAILED: Invalid password
```

### Test 4: Non-existent User
```
1. Try to login with fake email
2. Should see error: "No account found with email 'fake@test.com'"
3. Backend logs show: ❌ LOGIN FAILED: User not found
```

---

## 🛠️ Troubleshooting

### Issue: pandas import error

**Error:**
```
ModuleNotFoundError: No module named 'pandas'
```

**Solution:**
- Your Python 3.13 is too new
- Use Python 3.11 or 3.12 instead
- Or install pandas 2.2.0 beta: `pip install pandas==2.2.0`

---

### Issue: Backend won't start - database connection error

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
```powershell
# Make sure database is running
docker ps | Select-String "dev_postgres"

# If not running, start it
.\start-db.ps1
```

---

### Issue: Port already in use

**Error:**
```
[Errno 10048] Only one usage of each socket address
```

**Solution:**
```powershell
# Find what's using port 8000 (backend)
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <PID> /F

# Or use different port
uvicorn app.main:app --reload --port 8001
```

---

### Issue: Frontend can't connect to backend

**Error in browser console:**
```
Failed to fetch
Network error
```

**Solution:**
1. Make sure backend is running on http://localhost:8000
2. Check backend URL in frontend `.env` file
3. Test backend directly: http://localhost:8000/health
4. Should return: `{"status":"healthy","message":"API is running"}`

---

## 📂 File Structure

```
aws-archetect/
├── start-db.ps1           # Start database only
├── start-backend.ps1      # Start backend locally
├── start-frontend.ps1     # Start frontend locally
├── stop-all.ps1           # Stop database
├── docker-compose.dev.yml # Database-only config
│
├── backend/
│   ├── venv/              # Python virtual environment
│   ├── app/
│   │   ├── main.py        # FastAPI app
│   │   ├── routers/
│   │   │   └── auth.py    # Auth routes (WITH LOGGING)
│   │   ├── services/
│   │   │   └── import_service.py  # Import service (pandas optional)
│   │   └── core/
│   │       └── config.py  # Config (localhost settings)
│   └── requirements.txt
│
└── frontend/
    ├── node_modules/
    ├── src/
    │   └── pages/
    │       ├── Login.jsx
    │       └── Signup.jsx
    └── package.json
```

---

## 🔄 Stopping Everything

```powershell
# Stop database
.\stop-all.ps1

# Stop backend - press Ctrl+C in backend terminal

# Stop frontend - press Ctrl+C in frontend terminal
```

---

## ✅ What's New

### 1. Comprehensive Logging
- Every auth attempt is logged
- Success/failure clearly indicated
- User IDs tracked
- Password verification logged
- Token generation logged

### 2. Better Error Messages
- **Before:** "Incorrect email or password"
- **After:** "No account found with email 'x@y.com'. Please check your email or register for a new account."

- **Before:** "Email already registered"
- **After:** "Email 'x@y.com' is already registered. Please use a different email or login instead."

### 3. pandas Optional
- Backend starts even if pandas isn't installed
- Clear error message when trying to import without pandas
- Note about Python 3.13 compatibility

### 4. Database Connection Improvements
- Connection pooling with `pool_pre_ping=True`
- 10-second connection timeout
- Connection recycling every hour
- Better error handling

---

## 🎉 Benefits of Local Development

### Before (Docker):
- ❌ Slow startup
- ❌ Hard to debug
- ❌ Can't see logs clearly
- ❌ Restart needed for changes
- ❌ Network issues between containers

### After (Local):
- ✅ Fast startup (seconds)
- ✅ Easy debugging (breakpoints work)
- ✅ Clear console logs
- ✅ Auto-reload on code changes
- ✅ Direct localhost connections

---

## 📚 Next Steps

1. Fix Python version (use 3.11 or 3.12)
2. Run `.\start-db.ps1`
3. Run `.\start-backend.ps1` (in new terminal)
4. Run `.\start-frontend.ps1` (in new terminal)
5. Go to http://localhost:3000
6. Try to register and login
7. Watch the detailed logs in backend terminal

**You'll now see exactly what's happening during authentication!** 🎯
