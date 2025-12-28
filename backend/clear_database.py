"""
Clear all resources from the database
This script will delete all resources while preserving users and other data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import Base, Resource

# Database setup
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def clear_resources():
    """Delete all resources from the database"""
    db = SessionLocal()
    try:
        # Count resources before deletion
        count = db.query(Resource).count()
        print(f"Found {count} resources in database")
        
        if count == 0:
            print("Database is already empty")
            return
        
        # Delete all resources
        deleted = db.query(Resource).delete()
        db.commit()
        
        print(f"✅ Successfully deleted {deleted} resources")
        print("Database is now clear and ready for fresh import")
        
    except Exception as e:
        print(f"❌ Error clearing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("DATABASE CLEANUP")
    print("=" * 60)
    print("\nThis will delete ALL resources from the database.")
    print("Users and other data will be preserved.\n")
    
    response = input("Are you sure you want to continue? (yes/no): ")
    if response.lower() == 'yes':
        clear_resources()
    else:
        print("Operation cancelled")
