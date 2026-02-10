# 🚀 Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ Port 3000 (Frontend), 8000 (Backend), 5432 (PostgreSQL) available

## Option 1: Docker (Recommended - 2 minutes)

### Step 1: Start the Application

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Or manually:**
```bash
docker-compose up -d
```

### Step 2: Access the Application

Open your browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Step 3: Test the Application

1. **Sign Up**: Click "Sign up here" on the login page
   - Enter email, username, password
   - Automatically logs you in after registration

2. **Switch Language**: Click the 🌐 button to toggle English/Arabic

3. **Dashboard**: After login, view your profile information

4. **Logout**: Click the logout button

### Monitoring

**View logs:**
```bash
docker-compose logs -f

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

**Stop the application:**
```bash
docker-compose down

# Remove volumes (reset database)
docker-compose down -v
```

## Option 2: Local Development (Without Docker)

### Backend Setup

1. **Install PostgreSQL** (if not installed)
   - Download from https://www.postgresql.org/download/
   - Create database: `createdb authdb`

2. **Backend**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   
   pip install -r requirements.txt
   
   # Update backend/.env with your database credentials
   
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend** (new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Testing the API

### Using curl (Windows PowerShell)

**Register a user:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","username":"testuser","password":"password123"}'
```

**Login:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'
$token = $response.access_token
```

**Get user info:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token"}
```

### Using Swagger UI

1. Open http://localhost:8000/docs
2. Click on any endpoint
3. Click "Try it out"
4. Fill in the request body
5. Click "Execute"

## Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <process_id> /F
```

**Container won't start:**
```bash
docker-compose down
docker-compose up -d --build --force-recreate
```

**Database connection error:**
```bash
# Wait for PostgreSQL to initialize (first run takes ~10 seconds)
docker-compose logs -f db
```

### Frontend Issues

**Dependencies not installed:**
```bash
cd frontend
npm install
```

**Port 3000 in use:**
Edit `frontend/vite.config.js` and change the port

### Backend Issues

**Database tables not created:**
Tables are auto-created when the app starts via SQLAlchemy.

**JWT token errors:**
Ensure `JWT_SECRET_KEY` in `backend/.env` is set properly.

## Next Steps

1. ✅ Customize the UI colors in `frontend/tailwind.config.js`
2. ✅ Add more translations in `frontend/src/i18n.js`
3. ✅ Extend the User model in `backend/app/models.py`
4. ✅ Add more protected routes
5. ✅ Implement password reset functionality
6. ✅ Add email verification
7. ✅ Deploy to cloud (AWS, Azure, Heroku)

## Security Checklist for Production

- [ ] Change `JWT_SECRET_KEY` to a strong random string
- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS/SSL
- [ ] Set proper CORS origins
- [ ] Use strong PostgreSQL password
- [ ] Enable database backups
- [ ] Add rate limiting
- [ ] Implement logging and monitoring

---

**Need help?** Check the main `README.md` or visit http://localhost:8000/docs
