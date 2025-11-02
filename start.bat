@echo off
REM Start the application with Docker Compose

echo.
echo 🚀 Starting FastAPI + React Authentication App...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo 📦 Building and starting containers...
docker-compose up -d

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak >nul

echo.
echo ✅ Application is starting!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔌 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo ❤️  Health Check: http://localhost:8000/health
echo.
echo 📋 To view logs: docker-compose logs -f
echo 🛑 To stop: docker-compose down
echo.
pause
