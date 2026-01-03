from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine, Base
from app.routers import auth, resources, ai, import_router, relationships, ai_layout, relationship_discovery
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables with error handling
try:
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created successfully")
except Exception as e:
    logger.error(f"❌ Database initialization error: {e}")
    raise

app = FastAPI(
    title="JWT Authentication API",
    description="FastAPI backend with JWT authentication, AWS Resource Management, AI Analysis, and Data Import",
    version="1.0.0"
)

# Configure CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",  # Allow all origins (localhost, IPs, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ai_layout.router, prefix="/api")
app.include_router(import_router.router, prefix="/api")
app.include_router(relationships.router, prefix="/api")
app.include_router(relationship_discovery.router, prefix="/api")


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
