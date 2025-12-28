# AWS Architect - Resource Management System

Full-stack application for managing and visualizing AWS infrastructure resources with AI-powered analysis.

## 🚀 Quick Start

### Prerequisites
- **Docker** & **Docker Compose**
- **Node.js** (v18+)
- **Python** (3.11 or 3.12)
- **Ollama** (optional, for AI features)

### One-Command Start

```powershell
.\START-ALL.ps1
```

This will start:
- ✅ PostgreSQL Database (Docker container)
- ✅ Backend API (http://localhost:8000)
- ✅ Frontend (http://localhost:3000)

### Login
- **Email:** admin@example.com
- **Password:** admin123

---

## 📁 Project Structure

```
aws-archetect/
├── backend/          # FastAPI backend
│   ├── app/          # Application code
│   └── venv/         # Python virtual environment
├── frontend/         # React + Vite frontend
│   └── src/          # React components
└── START-ALL.ps1     # One-click startup script
```

---

## 🛠️ Manual Setup (First Time Only)

### 1. Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Frontend Setup

```powershell
cd frontend
npm install
```

### 3. Create Admin User

```powershell
cd backend
.\venv\Scripts\python.exe create-admin-simple.py
```

---

## ✨ Features

- 🔐 **Authentication** - JWT-based login/signup
- 📊 **Resource Management** - CRUD for AWS resources
- 📤 **Import/Export** - CSV/Excel import with AI analysis
- 🤖 **AI Analysis** - Ollama-powered insights
- 🌐 **Architecture Diagrams** - Visual resource mapping
- 🌍 **Multi-language** - English & Arabic support

---

## 🔧 Configuration

### Environment Variables

**Backend** (.env):
```
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=auth_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2
```

**Frontend** (.env):
```
VITE_API_URL=http://localhost:8000
```

---

## 📚 API Documentation

Interactive API docs available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 🐛 Troubleshooting

### Backend won't start?
- Check Docker is running: `docker ps`
- Check database container: `docker logs aws_architect_postgres`
- Check port 8000 is free: `netstat -ano | findstr :8000`

### Frontend won't start?
- Clear node_modules: `rm -r node_modules; npm install`
- Check port 3000 is free: `netstat -ano | findstr :3000`

### Can't login?
- Create admin user: `cd backend; .\venv\Scripts\python.exe create-admin-simple.py`
- Check backend logs for errors

---

## 📝 Tech Stack

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- PostgreSQL (Database)
- JWT (Authentication)
- Ollama (AI/LLM)

**Frontend:**
- React 18
- Vite (Build tool)
- TailwindCSS (Styling)
- Axios (API calls)
- React Router (Navigation)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Development

### Run Backend Only
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

### Run Frontend Only
```powershell
cd frontend
npm run dev
```

### Run Tests
```powershell
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

**Need help?** Check the `/docs` folder for detailed documentation.
