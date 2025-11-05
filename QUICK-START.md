# 🚀 Quick Start Guide

## Start Everything (2 Terminals)

### Terminal 1: Backend + Database
```powershell
.\START-BACKEND.ps1
```

Wait for:
```
✅ Database is ready! (Port 5433 - no conflict with local PostgreSQL)
✅ Backend running on http://localhost:8000
```

---

### Terminal 2: Frontend
```powershell
.\START-FRONTEND.ps1
```

Wait for:
```
✅ Frontend running on http://localhost:3000
```

---

## Access Application

**Open browser:** http://localhost:3000

**Login:**
- Email: `admin@example.com`
- Password: `admin123`

---

## Stop Everything

**Close both terminal windows** or press `Ctrl+C` in each

**Or run:**
```powershell
.\STOP-ALL.ps1
```

---

## Files Explained

| File | What it does |
|------|--------------|
| `START-BACKEND.ps1` | Starts Docker DB + Backend |
| `START-FRONTEND.ps1` | Starts Frontend (Vite) |
| `STOP-ALL.ps1` | Stops everything |
| `docker-compose.yml` | PostgreSQL config |

---

## Troubleshooting

### Backend won't start?
```powershell
# Check Docker is running
docker ps

# Check logs
docker logs aws_architect_postgres
```

### Frontend won't start?
```powershell
# Make sure backend is running first
curl http://localhost:8000/health
```

### Can't login?
```powershell
# Create admin user
cd backend
.\venv\Scripts\python.exe create-admin-simple.py
```

---

## That's It! 🎉

**Two commands, two terminals:**
1. `.\START-BACKEND.ps1`
2. `.\START-FRONTEND.ps1`

**Then open:** http://localhost:3000
