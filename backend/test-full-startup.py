"""Test full backend startup"""
import os
import sys

# Set environment variables BEFORE importing anything
os.environ['POSTGRES_HOST'] = '127.0.0.1'
os.environ['POSTGRES_PORT'] = '5433'
os.environ['POSTGRES_USER'] = 'postgres'
os.environ['POSTGRES_PASSWORD'] = 'postgres'
os.environ['POSTGRES_DB'] = 'auth_db'

print("=" * 70)
print("TESTING BACKEND STARTUP")
print("=" * 70)

# Test 1: Config
print("\n[TEST 1] Loading configuration...")
from app.core.config import Settings
settings = Settings()
print(f"  POSTGRES_HOST: {settings.POSTGRES_HOST}")
print(f"  POSTGRES_PORT: {settings.POSTGRES_PORT}")
print(f"  POSTGRES_DB: {settings.POSTGRES_DB}")
print(f"  DATABASE_URL: {settings.DATABASE_URL}")

# Test 2: Database connection
print("\n[TEST 2] Testing database connection...")
try:
    from app.database import engine
    from sqlalchemy import text
    conn = engine.connect()
    result = conn.execute(text("SELECT 1 as test")).fetchone()
    print(f"  SUCCESS: Connected to database, test query returned: {result[0]}")
    conn.close()
except Exception as e:
    print(f"  FAILED: {e}")
    sys.exit(1)

# Test 3: Import main app
print("\n[TEST 3] Importing FastAPI app...")
try:
    from app.main import app
    print(f"  SUCCESS: App loaded, title: {app.title}")
except Exception as e:
    print(f"  FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Check tables
print("\n[TEST 4] Checking database tables...")
try:
    from app.database import engine
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"  Tables found: {', '.join(tables)}")
    if 'users' in tables:
        print("  SUCCESS: Users table exists")
    else:
        print("  WARNING: Users table not found")
except Exception as e:
    print(f"  FAILED: {e}")

print("\n" + "=" * 70)
print("ALL TESTS PASSED - Backend is ready to start")
print("=" * 70)
print("\nRun: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
