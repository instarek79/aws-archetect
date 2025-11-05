from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "auth_db"
    POSTGRES_HOST: str = "127.0.0.1"  # Use 127.0.0.1 instead of localhost to force IPv4
    POSTGRES_PORT: int = 5433  # Docker PostgreSQL on port 5433 (avoid conflict with local PostgreSQL on 5432)
    
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
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # Ignore extra environment variables
        extra = "ignore"
        arbitrary_types_allowed = True


settings = Settings()
