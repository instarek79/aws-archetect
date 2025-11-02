# 🛠️ Development Guide

## Project Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React Frontend │─────▶│  FastAPI Backend│─────▶│   PostgreSQL    │
│   (Port 3000)   │      │   (Port 8000)   │      │   (Port 5432)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
   TailwindCSS              SQLAlchemy ORM
   React Router             JWT Auth
   i18next                  Pydantic
   Axios                    Python-Jose
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Define the schema** in `backend/app/schemas.py`:
```python
class NewFeatureRequest(BaseModel):
    field_name: str
    
class NewFeatureResponse(BaseModel):
    id: int
    field_name: str
```

2. **Create the route** in appropriate router (or create new):
```python
# backend/app/routers/feature.py
from fastapi import APIRouter, Depends
from app.schemas import NewFeatureRequest, NewFeatureResponse

router = APIRouter(prefix="/feature", tags=["feature"])

@router.post("/", response_model=NewFeatureResponse)
def create_feature(data: NewFeatureRequest, current_user = Depends(get_current_user)):
    # Your logic here
    return {"id": 1, "field_name": data.field_name}
```

3. **Register router** in `backend/app/main.py`:
```python
from app.routers import auth, feature

app.include_router(feature.router)
```

### Adding a New Database Model

1. **Create model** in `backend/app/models.py`:
```python
class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

2. **Restart backend** to auto-create tables:
```bash
docker-compose restart backend
```

### Adding a New Frontend Page

1. **Create page component** in `frontend/src/pages/NewPage.jsx`:
```jsx
import { useTranslation } from 'react-i18next';

function NewPage() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold">{t('newPageTitle')}</h1>
    </div>
  );
}

export default NewPage;
```

2. **Add route** in `frontend/src/App.jsx`:
```jsx
import NewPage from './pages/NewPage';

// In Routes:
<Route path="/new-page" element={<NewPage />} />
```

3. **Add translations** in `frontend/src/i18n.js`:
```javascript
en: {
  translation: {
    newPageTitle: 'New Page',
    // ...
  }
},
ar: {
  translation: {
    newPageTitle: 'صفحة جديدة',
    // ...
  }
}
```

### Adding New Translations

Edit `frontend/src/i18n.js`:

```javascript
const resources = {
  en: {
    translation: {
      // Add new keys here
      myNewKey: 'My New Translation',
    }
  },
  ar: {
    translation: {
      // Add Arabic translations
      myNewKey: 'ترجمتي الجديدة',
    }
  }
};
```

Use in components:
```jsx
const { t } = useTranslation();
<p>{t('myNewKey')}</p>
```

### Protected Routes (Frontend)

Create a protected route wrapper:

```jsx
// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
```

Use it:
```jsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### Database Migrations (Manual)

Since we're using SQLAlchemy's `create_all()`, tables are auto-created. For production:

1. **Install Alembic**:
```bash
cd backend
pip install alembic
alembic init alembic
```

2. **Configure** `alembic/env.py`:
```python
from app.database import Base
from app.models import *

target_metadata = Base.metadata
```

3. **Create migration**:
```bash
alembic revision --autogenerate -m "Add new table"
alembic upgrade head
```

### Environment Variables

**Backend** (`backend/.env`):
- `POSTGRES_*` - Database credentials
- `JWT_SECRET_KEY` - Secret for signing tokens (use strong random string)
- `JWT_ALGORITHM` - Algorithm for JWT (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token lifetime
- `BACKEND_CORS_ORIGINS` - Allowed origins

**Frontend** (`frontend/.env`):
- `VITE_API_URL` - Backend API URL

### Debugging

**Backend logs**:
```bash
docker-compose logs -f backend
```

**Frontend logs**:
```bash
docker-compose logs -f frontend
```

**Database queries**:
```bash
docker exec -it auth_postgres psql -U postgres -d authdb
\dt                    # List tables
SELECT * FROM users;   # Query users
\q                     # Exit
```

**Interactive backend shell**:
```bash
docker exec -it auth_backend bash
python
>>> from app.database import SessionLocal
>>> from app.models import User
>>> db = SessionLocal()
>>> users = db.query(User).all()
>>> print(users)
```

## Styling with TailwindCSS

Common patterns used in this project:

**Cards**:
```jsx
<div className="bg-white rounded-2xl shadow-xl p-8">
  {/* Content */}
</div>
```

**Buttons**:
```jsx
<button className="bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all">
  Click Me
</button>
```

**Input Fields**:
```jsx
<input
  type="text"
  className="w-full pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
/>
```

**RTL Support**:
```jsx
const isRTL = i18n.language === 'ar';
<div className={isRTL ? 'text-right' : 'text-left'}>
```

## Testing

### Manual Testing

1. **Backend API** - Use http://localhost:8000/docs
2. **Frontend** - Use browser DevTools
3. **API Script** - Run `test-api.ps1` or `test-api.sh`

### Unit Tests (Future Enhancement)

**Backend** (pytest):
```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/
```

**Frontend** (Vitest):
```bash
cd frontend
npm install -D vitest @testing-library/react
npm test
```

## Performance Optimization

**Backend**:
- Use async/await for database queries
- Add database indexes for frequently queried fields
- Implement caching (Redis)
- Use connection pooling

**Frontend**:
- Code splitting with React.lazy()
- Optimize images
- Use React.memo for expensive components
- Implement pagination for large lists

## Security Best Practices

✅ **Implemented**:
- Password hashing with bcrypt
- JWT token-based authentication
- CORS protection
- SQL injection prevention (SQLAlchemy)
- Environment-based secrets

🔲 **To Implement**:
- Rate limiting (slowapi)
- Email verification
- Password reset functionality
- 2FA (Two-Factor Authentication)
- Input sanitization
- HTTPS in production
- Helmet.js for frontend security headers

## Docker Commands Reference

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Rebuild containers
docker-compose up -d --build

# Stop services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v

# Execute command in container
docker exec -it [container_name] [command]

# Shell access
docker exec -it auth_backend bash
docker exec -it auth_frontend sh
docker exec -it auth_postgres bash
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature

# Create Pull Request on GitHub
```

## Production Deployment Checklist

- [ ] Change `JWT_SECRET_KEY` to cryptographically secure random string
- [ ] Set strong database password
- [ ] Update `BACKEND_CORS_ORIGINS` to production domain
- [ ] Enable HTTPS/SSL
- [ ] Use production database (not SQLite)
- [ ] Set `DEBUG=False` or remove `--reload` flag
- [ ] Configure logging
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Implement backups
- [ ] Add rate limiting
- [ ] Configure CDN for static files
- [ ] Set up CI/CD pipeline
- [ ] Run security audit

## Useful Resources

- **FastAPI**: https://fastapi.tiangolo.com
- **React**: https://react.dev
- **TailwindCSS**: https://tailwindcss.com
- **SQLAlchemy**: https://docs.sqlalchemy.org
- **react-i18next**: https://react.i18next.com
- **PostgreSQL**: https://www.postgresql.org/docs

---

Happy coding! 🚀
