from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Database - SQLite (file-based, no Docker required)
    DATABASE_TYPE: str = "sqlite"  # sqlite or postgresql
    SQLITE_DB_PATH: str = "data/aws_architect.db"  # SQLite database file path
    
    # Legacy PostgreSQL settings (kept for migration purposes)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "auth_db"
    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5433
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OpenAI / LLM
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "qwen2.5"
    
    @property
    def LLM_PROVIDER(self) -> str:
        """Auto-detect LLM provider based on configuration"""
        if self.OLLAMA_BASE_URL:
            return "ollama"
        elif self.OPENAI_API_KEY:
            return "openai"
        return "none"
    
    # CORS - Allow all origins for development (includes localhost and IP addresses)
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_TYPE == "sqlite":
            # Get absolute path for SQLite database
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_path = os.path.join(base_dir, self.SQLITE_DB_PATH)
            # Ensure directory exists
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            return f"sqlite:///{db_path}"
        else:
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def POSTGRES_DATABASE_URL(self) -> str:
        """PostgreSQL URL for migration purposes"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # Ignore extra environment variables
        extra = "ignore"
        arbitrary_types_allowed = True


settings = Settings()
