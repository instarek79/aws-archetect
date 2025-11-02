from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine, Base
from app.routers import auth, resources, ai

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JWT Authentication API",
    description="FastAPI backend with JWT authentication, AWS Resource Management, and AI Analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(ai.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "API is running"
    }


@app.get("/")
def root():
    return {
        "message": "Welcome to JWT Authentication API",
        "docs": "/docs",
        "health": "/health"
    }
