#!/usr/bin/env python3
"""
Migration script to add type_specific_properties column to resources table
Run this once to update the database schema
"""

from sqlalchemy import create_engine, text
import os

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/authdb")

def migrate():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='resources' AND column_name='type_specific_properties'
        """))
        
        if result.fetchone():
            print("✅ Column 'type_specific_properties' already exists")
            return
        
        # Add the new column
        print("Adding 'type_specific_properties' column...")
        conn.execute(text("""
            ALTER TABLE resources 
            ADD COLUMN type_specific_properties JSONB DEFAULT '{}'::jsonb
        """))
        conn.commit()
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
