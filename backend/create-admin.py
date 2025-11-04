import sys
sys.path.append('/app')

from app.database import SessionLocal
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

# Check if admin exists
existing = db.query(User).filter(User.email == "admin@example.com").first()
if existing:
    print("❌ Admin user already exists!")
else:
    # Create admin user
    hashed_password = pwd_context.hash("admin123")
    admin = User(
        email="admin@example.com",
        username="admin",
        hashed_password=hashed_password
    )
    db.add(admin)
    db.commit()
    print("✅ Admin user created successfully!")
    print("Email: admin@example.com")
    print("Password: admin123")

db.close()
