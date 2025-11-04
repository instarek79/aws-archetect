"""Create admin user and test login"""
import os
import sys

# Set environment
os.environ['POSTGRES_HOST'] = '127.0.0.1'
os.environ['POSTGRES_PORT'] = '5433'
os.environ['POSTGRES_USER'] = 'postgres'
os.environ['POSTGRES_PASSWORD'] = 'postgres'
os.environ['POSTGRES_DB'] = 'auth_db'

print("=" * 70)
print("CREATE ADMIN USER AND TEST LOGIN")
print("=" * 70)

# Import after setting env
from app.database import SessionLocal
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create admin user in database
print("\n[1/3] Creating admin user in database...")
db = SessionLocal()
try:
    # Check if admin exists
    existing = db.query(User).filter(User.email == "admin@example.com").first()
    if existing:
        print("  Admin user already exists")
        admin_id = existing.id
    else:
        # Create new admin
        hashed_password = pwd_context.hash("admin123")
        admin = User(
            email="admin@example.com",
            username="admin",
            hashed_password=hashed_password
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        admin_id = admin.id
        print(f"  SUCCESS: Admin user created with ID: {admin_id}")
finally:
    db.close()

print("\n[2/3] Starting backend server...")
print("  You need to run the backend server in another terminal:")
print("  cd D:\\aws-archetect")
print("  .\\START-BACKEND-WORKING.ps1")
print("\n  Then run this script again to test login")
print("\n  OR test manually at: http://localhost:3000/login")
print("  Email: admin@example.com")
print("  Password: admin123")

print("\n" + "=" * 70)
print("ADMIN USER READY")
print("=" * 70)
