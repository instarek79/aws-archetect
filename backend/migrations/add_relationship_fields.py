"""
Database migration to add enhanced relationship fields
Run this to add new columns to resource_relationships table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings

def upgrade():
    """Add new columns to resource_relationships table"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Add new columns with default values
        migrations = [
            # Connection details
            "ALTER TABLE resource_relationships ADD COLUMN IF NOT EXISTS port INTEGER",
            "ALTER TABLE resource_relationships ADD COLUMN IF NOT EXISTS protocol VARCHAR",
            "ALTER TABLE resource_relationships ADD COLUMN IF NOT EXISTS direction VARCHAR",
            
            # Relationship status and metadata
            "ALTER TABLE resource_relationships ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'",
            "ALTER TABLE resource_relationships ADD COLUMN IF NOT EXISTS label VARCHAR",
            "ALTER TABLE resource_relationships ADD COLUMN IF NOT EXISTS flow_order INTEGER",
        ]
        
        for migration in migrations:
            try:
                conn.execute(text(migration))
                conn.commit()
                print(f"✅ Executed: {migration}")
            except Exception as e:
                print(f"⚠️  Skipped (may already exist): {migration}")
                print(f"   Error: {str(e)}")
        
        print("\n✅ Migration completed successfully!")

def downgrade():
    """Remove the added columns (rollback)"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        rollbacks = [
            "ALTER TABLE resource_relationships DROP COLUMN IF EXISTS port",
            "ALTER TABLE resource_relationships DROP COLUMN IF EXISTS protocol",
            "ALTER TABLE resource_relationships DROP COLUMN IF EXISTS direction",
            "ALTER TABLE resource_relationships DROP COLUMN IF EXISTS status",
            "ALTER TABLE resource_relationships DROP COLUMN IF EXISTS label",
            "ALTER TABLE resource_relationships DROP COLUMN IF EXISTS flow_order",
        ]
        
        for rollback in rollbacks:
            try:
                conn.execute(text(rollback))
                conn.commit()
                print(f"✅ Rolled back: {rollback}")
            except Exception as e:
                print(f"⚠️  Error rolling back: {str(e)}")
        
        print("\n✅ Rollback completed!")

if __name__ == "__main__":
    print("Running database migration...")
    upgrade()
