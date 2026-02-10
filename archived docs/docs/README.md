# FastAPI + React JWT Authentication, AWS Resource Management & AI Analysis

A full-stack application with **FastAPI** backend, **React** frontend, **PostgreSQL** database, **JWT** authentication, **AWS Resources CRUD management**, and **AI-powered architecture analysis**. Features complete bilingual support (English and Arabic) with i18n.

## 🚀 Features

### Backend
- ✅ FastAPI framework with async support
- ✅ JWT-based authentication (access & refresh tokens)
- ✅ PostgreSQL database with SQLAlchemy ORM
- ✅ User registration and login endpoints
- ✅ Token refresh mechanism
- ✅ Password hashing with bcrypt
- ✅ **Complete CRUD API for AWS Resources**
- ✅ **Resource-User relationship with ownership validation**
- ✅ **JSON field for resource dependencies**
- ✅ **AI Integration (OpenAI GPT / Ollama)**
- ✅ **Async AI analysis endpoints**
- ✅ **Architecture summary generation**
- ✅ **Custom AI prompts for infrastructure insights**
- ✅ CORS configuration for frontend integration
- ✅ Health check endpoint
- ✅ Environment-based configuration

### Frontend
- ✅ React 18 with Vite
- ✅ React Router for navigation
- ✅ TailwindCSS for styling
- ✅ Bilingual support (English & Arabic) with react-i18next
- ✅ RTL (Right-to-Left) support for Arabic
- ✅ Axios for API requests
- ✅ Token storage in localStorage
- ✅ **Resources management page with table view**
- ✅ **Add/Edit Resource modal with form validation**
- ✅ **Delete resources with confirmation**
- ✅ **AWS resource types and regions (bilingual)**
- ✅ **AI Insights page with prompt interface**
- ✅ **Auto-generate architecture summaries**
- ✅ **Custom AI analysis with quick prompts**
- ✅ **PDF export for AI reports**
- ✅ **Cost optimization & security recommendations**
- ✅ Modern, responsive UI with Lucide icons
- ✅ Beautiful gradient backgrounds and animations

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py          # Environment configuration
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # Authentication routes
│   │   │   └── resources.py       # AWS Resources CRUD routes
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI application
│   │   ├── models.py              # SQLAlchemy models (User, Resource)
│   │   ├── schemas.py             # Pydantic schemas
│   │   └── database.py            # Database connection
│   ├── .env                       # Environment variables
│   ├── .env.example               # Environment template
│   ├── Dockerfile
│   ├── .dockerignore
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Signup.jsx        # Signup page
│   │   │   ├── Dashboard.jsx     # Dashboard page
│   │   │   └── Resources.jsx     # AWS Resources management page
│   │   ├── components/
│   │   │   └── ResourceModal.jsx # Add/Edit resource modal
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # React entry point
│   │   ├── i18n.js               # i18n configuration (EN/AR)
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env                      # Frontend environment
├── docker-compose.yml            # Docker orchestration
└── README.md
```

## 🛠️ Technologies

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **python-jose** - JWT token generation
- **passlib** - Password hashing
- **uvicorn** - ASGI server

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **TailwindCSS** - Utility-first CSS
- **react-i18next** - Internationalization
- **Axios** - HTTP client
- **Lucide React** - Icon library

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- OR Node.js 18+ and Python 3.11+ (for local development)

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aws-archetect
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

4. **Stop services**
   ```bash
   docker-compose down
   ```

### Option 2: Local Development

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start PostgreSQL** (if not using Docker)
   ```bash
   # Install and start PostgreSQL
   # Create database: createdb authdb
   ```

6. **Run the backend**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   echo "VITE_API_URL=http://localhost:8000" > .env
   ```

4. **Run the frontend**
   ```bash
   npm run dev
   ```

## 🔐 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user (protected)

### AWS Resources (🔒 All Protected)
- `GET /resources/` - Get all resources for authenticated user
- `GET /resources/{id}` - Get specific resource by ID
- `POST /resources/` - Create new resource
- `PUT /resources/{id}` - Update existing resource
- `DELETE /resources/{id}` - Delete resource

### AI Analysis (🔒 All Protected)
- `POST /ai/analyze` - Analyze architecture with custom prompt
- `GET /ai/summary` - Generate comprehensive architecture summary

### Health
- `GET /health` - Health check endpoint
- `GET /` - Root endpoint with API info

### API Documentation
- `GET /docs` - Swagger UI
- `GET /redoc` - ReDoc UI

## 🌍 Language Support

The application supports both **English** and **Arabic** languages:

- Click the language toggle button (🌐) in the UI
- Automatically switches between LTR (English) and RTL (Arabic)
- All UI text is translated including:
  - Form labels and placeholders
  - Buttons and navigation
  - Validation messages
  - Success/error messages
  - AWS resource types and regions

## 🔧 AWS Resources Management

Manage your AWS infrastructure resources with full CRUD operations:

### Features
- **Create Resources**: Add EC2, S3, RDS, Lambda, and more
- **View Resources**: See all your resources in a responsive table
- **Edit Resources**: Update resource details, regions, and dependencies
- **Delete Resources**: Remove resources with confirmation dialog
- **Dependencies**: Track resource relationships with JSON array
- **Bilingual**: All resource types and regions in English & Arabic

### Supported Resource Types
EC2, S3, RDS, Lambda, VPC, ELB, CloudFront, Route53, DynamoDB, SNS, SQS

### Supported Regions
US East, US West, EU West, EU Central, Asia Pacific (Singapore, Tokyo)

### Usage
1. Login → Dashboard → Click "Resources" button
2. Click "Add Resource" to create new resource
3. Edit or delete resources using action buttons
4. All resources are private to your account

📚 **Detailed Guide**: See [AWS-RESOURCES-GUIDE.md](AWS-RESOURCES-GUIDE.md) for complete documentation

## 🤖 AI-Powered Architecture Analysis

Analyze your AWS infrastructure with AI to get instant insights, cost optimization tips, and security recommendations.

### Features
- **Auto-Generate Summary**: Comprehensive architecture analysis with one click
- **Custom Prompts**: Ask specific questions about your infrastructure
- **Quick Prompts**: Pre-defined questions for common scenarios
- **PDF Export**: Download analysis reports
- **Dual Provider Support**: OpenAI (GPT-3.5/GPT-4) or Ollama (Local LLM)
- **Bilingual Analysis**: Full English & Arabic support

### Supported AI Providers

**OpenAI (Recommended)**
- Fast, cloud-based analysis
- High-quality responses
- Requires API key (~$0.005/request)
- Models: GPT-3.5-Turbo, GPT-4

**Ollama (Local & Free)**
- Runs entirely on your machine
- No API costs
- Privacy-focused (no data leaves your infrastructure)
- Models: Llama2, Mistral, CodeLlama

### Setup

**Option 1: OpenAI**
```env
# backend/.env
OPENAI_API_KEY=sk-your-api-key-here
LLM_PROVIDER=openai
```

**Option 2: Ollama (Local)**
```bash
# Install Ollama
ollama pull llama2

# Configure backend
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
```

### Usage
1. Login → Dashboard → Click "AI Insights" button
2. Click "Generate Summary" for auto-analysis
3. Or enter custom prompts for specific questions
4. Download results as PDF

📚 **Complete Guide**: See [AI-INTEGRATION-GUIDE.md](AI-INTEGRATION-GUIDE.md) for detailed setup and usage

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT access tokens (30 min expiry)
- ✅ JWT refresh tokens (7 days expiry)
- ✅ Token-based authentication
- ✅ Resource ownership validation (users can only access their own resources)
- ✅ CORS protection
- ✅ Environment-based secrets
- ✅ SQL injection protection via SQLAlchemy ORM

## 📝 Environment Variables

### Backend (.env)
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=authdb
POSTGRES_HOST=db
POSTGRES_PORT=5432

JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Configuration (choose one provider)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
LLM_PROVIDER=openai
# OR for Ollama: LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## 🧪 Testing

### Test Backend Health
```bash
curl http://localhost:8000/health
```

### Test Registration
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🎨 UI Features

- Modern, clean design
- Gradient backgrounds
- Smooth animations
- Responsive layout
- Loading states
- Error handling with user-friendly messages
- Form validation
- Icon integration (Lucide)
- Custom scrollbar styling
- Google Fonts for Arabic support (Cairo, Tajawal)

## 📦 Production Deployment

1. **Update environment variables** for production
2. **Change JWT secret** to a secure random string
3. **Update CORS origins** to your production domain
4. **Use environment-specific .env files**
5. **Build frontend for production**:
   ```bash
   cd frontend
   npm run build
   ```
6. **Use production-ready database** configuration
7. **Enable HTTPS** for secure communication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👥 Support

For issues and questions:
- Check the API documentation at `/docs`
- Review environment variable configuration
- Ensure all services are running
- Check Docker logs: `docker-compose logs -f`

---

**Built with ❤️ using FastAPI, React, and PostgreSQL**
