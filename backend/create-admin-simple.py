"""Create admin user using backend's auth functions"""
import os
import sys

# Set environment FIRST
os.environ['POSTGRES_HOST'] = '127.0.0.1'
os.environ['POSTGRES_PORT'] = '5433'
os.environ['POSTGRES_USER'] = 'postgres'
os.environ['POSTGRES_PASSWORD'] = 'postgres'
os.environ['POSTGRES_DB'] = 'auth_db'

print("=" * 70)
print("CREATE ADMIN USER")
print("=" * 70)

# Import after env is set
from app.database import SessionLocal
from app.models import User
from app.routers.auth import get_password_hash

print("\n[1/2] Connecting to database...")
db = SessionLocal()

try:
    print("[2/2] Creating/checking admin user...")
    
    # Check if admin exists
    existing = db.query(User).filter(User.email == "admin@example.com").first()
    
    if existing:
        print(f"  Admin user already exists (ID: {existing.id})")
    else:
        # Create new admin
        hashed_password = get_password_hash("admin123")
        admin = User(
            email="admin@example.com",
            username="admin",
            hashed_password=hashed_password
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"  SUCCESS: Admin user created (ID: {admin.id})")
    
    print("\n" + "=" * 70)
    print("ADMIN CREDENTIALS:")
    print("=" * 70)
    print("  Email:    admin@example.com")
    print("  Password: admin123")
    print("\n  Login at: http://localhost:3000/login")
    print("=" * 70)
    
except Exception as e:
    print(f"  ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()
