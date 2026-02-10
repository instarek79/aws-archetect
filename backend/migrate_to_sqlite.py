#!/usr/bin/env python3
"""
Migration script to transfer data from PostgreSQL to SQLite.
Run this script to migrate existing data before switching to SQLite.

Usage:
    python migrate_to_sqlite.py
"""

import os
import sys
import json
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# PostgreSQL connection (source)
POSTGRES_URL = os.environ.get(
    "POSTGRES_URL",
    "postgresql://postgres:postgres@127.0.0.1:5433/auth_db"
)

# SQLite connection (destination)
SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "aws_architect.db")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"


def serialize_value(value):
    """Convert Python objects to JSON-serializable format"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return value


def deserialize_json(value):
    """Parse JSON string back to Python object"""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except:
            return value
    return value


def migrate_data():
    """Migrate all data from PostgreSQL to SQLite"""
    
    print("=" * 60)
    print("PostgreSQL to SQLite Migration")
    print("=" * 60)
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
    
    # Check if SQLite database already exists
    if os.path.exists(SQLITE_PATH):
        print(f"\nSQLite database already exists at:\n{SQLITE_PATH}")
        print(f"File size: {os.path.getsize(SQLITE_PATH) / 1024:.1f} KB")
        try:
            response = input("\nOverwrite? (y/n): ").strip().lower()
        except EOFError:
            response = 'y'  # Auto-confirm if piped
        if response != 'y':
            print("Migration cancelled.")
            return
        try:
            os.remove(SQLITE_PATH)
            print("Existing database removed.")
        except PermissionError:
            print("Warning: Could not remove existing database (file in use).")
            print("The migration will add to the existing database.")
        except Exception as e:
            print(f"Warning: {e}")
    
    # Connect to PostgreSQL
    print(f"\nConnecting to PostgreSQL: {POSTGRES_URL}")
    try:
        pg_engine = create_engine(POSTGRES_URL)
        pg_conn = pg_engine.connect()
        print("✓ Connected to PostgreSQL")
    except Exception as e:
        print(f"✗ Failed to connect to PostgreSQL: {e}")
        print("\nMake sure Docker PostgreSQL is running:")
        print("  docker start aws-architect-postgres")
        return
    
    # Connect to SQLite
    print(f"\nCreating SQLite database: {SQLITE_PATH}")
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    sqlite_conn = sqlite_engine.connect()
    
    # Create tables in SQLite
    print("\nCreating SQLite tables...")
    
    # Users table
    sqlite_conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR NOT NULL UNIQUE,
            username VARCHAR NOT NULL UNIQUE,
            hashed_password VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    """))
    
    # Resources table
    sqlite_conn.execute(text("""
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR NOT NULL,
            type VARCHAR NOT NULL,
            region VARCHAR DEFAULT 'unknown',
            arn VARCHAR,
            account_id VARCHAR,
            resource_id VARCHAR,
            status VARCHAR DEFAULT 'unknown',
            environment VARCHAR,
            cost_center VARCHAR,
            owner VARCHAR,
            application VARCHAR,
            project VARCHAR,
            vpc_id VARCHAR,
            subnet_id VARCHAR,
            availability_zone VARCHAR,
            security_groups JSON DEFAULT '[]',
            public_ip VARCHAR,
            private_ip VARCHAR,
            dns_name VARCHAR,
            endpoint VARCHAR,
            instance_type VARCHAR,
            resource_creation_date TIMESTAMP,
            type_specific_properties JSON DEFAULT '{}',
            dependencies JSON DEFAULT '[]',
            connected_resources JSON DEFAULT '[]',
            attached_to VARCHAR,
            parent_resource VARCHAR,
            child_resources JSON DEFAULT '[]',
            target_resources JSON DEFAULT '[]',
            source_resources JSON DEFAULT '[]',
            encryption_enabled VARCHAR,
            public_access VARCHAR,
            compliance_status VARCHAR,
            monthly_cost_estimate VARCHAR,
            last_cost_update TIMESTAMP,
            tags JSON DEFAULT '{}',
            description TEXT,
            notes TEXT,
            aws_service VARCHAR,
            aws_resource_type VARCHAR,
            last_reported_at TIMESTAMP,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """))
    
    # Resource relationships table
    sqlite_conn.execute(text("""
        CREATE TABLE IF NOT EXISTS resource_relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_resource_id INTEGER NOT NULL,
            target_resource_id INTEGER NOT NULL,
            relationship_type VARCHAR NOT NULL DEFAULT 'uses',
            description TEXT,
            auto_detected VARCHAR DEFAULT 'yes',
            confidence VARCHAR,
            port INTEGER,
            protocol VARCHAR,
            direction VARCHAR,
            status VARCHAR DEFAULT 'active',
            label VARCHAR,
            flow_order INTEGER,
            properties JSON DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (source_resource_id) REFERENCES resources(id) ON DELETE CASCADE,
            FOREIGN KEY (target_resource_id) REFERENCES resources(id) ON DELETE CASCADE
        )
    """))
    
    # Create indexes
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resources_name ON resources(name)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resources_type ON resources(type)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resources_arn ON resources(arn)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resources_account_id ON resources(account_id)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resources_vpc_id ON resources(vpc_id)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resource_relationships_source ON resource_relationships(source_resource_id)"))
    sqlite_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resource_relationships_target ON resource_relationships(target_resource_id)"))
    sqlite_conn.commit()
    
    print("✓ Tables created")
    
    # Migrate users
    print("\nMigrating users...")
    try:
        result = pg_conn.execute(text("SELECT * FROM users"))
        users = result.fetchall()
        columns = result.keys()
        
        for user in users:
            user_dict = dict(zip(columns, user))
            sqlite_conn.execute(text("""
                INSERT INTO users (id, email, username, hashed_password, created_at, updated_at)
                VALUES (:id, :email, :username, :hashed_password, :created_at, :updated_at)
            """), user_dict)
        sqlite_conn.commit()
        print(f"✓ Migrated {len(users)} users")
    except Exception as e:
        print(f"✗ Error migrating users: {e}")
    
    # Migrate resources
    print("\nMigrating resources...")
    try:
        result = pg_conn.execute(text("SELECT * FROM resources"))
        resources = result.fetchall()
        columns = result.keys()
        
        for resource in resources:
            resource_dict = dict(zip(columns, resource))
            # Convert JSON fields
            for json_field in ['security_groups', 'type_specific_properties', 'dependencies', 
                              'connected_resources', 'child_resources', 'target_resources', 
                              'source_resources', 'tags']:
                if resource_dict.get(json_field) is not None:
                    if isinstance(resource_dict[json_field], (dict, list)):
                        resource_dict[json_field] = json.dumps(resource_dict[json_field])
            
            sqlite_conn.execute(text("""
                INSERT INTO resources (
                    id, name, type, region, arn, account_id, resource_id, status, environment,
                    cost_center, owner, application, project, vpc_id, subnet_id, availability_zone,
                    security_groups, public_ip, private_ip, dns_name, endpoint, instance_type,
                    resource_creation_date, type_specific_properties, dependencies, connected_resources,
                    attached_to, parent_resource, child_resources, target_resources, source_resources,
                    encryption_enabled, public_access, compliance_status, monthly_cost_estimate,
                    last_cost_update, tags, description, notes, aws_service, aws_resource_type,
                    last_reported_at, created_by, created_at, updated_at
                ) VALUES (
                    :id, :name, :type, :region, :arn, :account_id, :resource_id, :status, :environment,
                    :cost_center, :owner, :application, :project, :vpc_id, :subnet_id, :availability_zone,
                    :security_groups, :public_ip, :private_ip, :dns_name, :endpoint, :instance_type,
                    :resource_creation_date, :type_specific_properties, :dependencies, :connected_resources,
                    :attached_to, :parent_resource, :child_resources, :target_resources, :source_resources,
                    :encryption_enabled, :public_access, :compliance_status, :monthly_cost_estimate,
                    :last_cost_update, :tags, :description, :notes, :aws_service, :aws_resource_type,
                    :last_reported_at, :created_by, :created_at, :updated_at
                )
            """), resource_dict)
        sqlite_conn.commit()
        print(f"✓ Migrated {len(resources)} resources")
    except Exception as e:
        print(f"✗ Error migrating resources: {e}")
        import traceback
        traceback.print_exc()
    
    # Migrate relationships
    print("\nMigrating relationships...")
    try:
        result = pg_conn.execute(text("SELECT * FROM resource_relationships"))
        relationships = result.fetchall()
        columns = result.keys()
        
        for rel in relationships:
            rel_dict = dict(zip(columns, rel))
            # Convert JSON fields
            if rel_dict.get('properties') is not None:
                if isinstance(rel_dict['properties'], (dict, list)):
                    rel_dict['properties'] = json.dumps(rel_dict['properties'])
            
            sqlite_conn.execute(text("""
                INSERT INTO resource_relationships (
                    id, source_resource_id, target_resource_id, relationship_type, description,
                    auto_detected, confidence, port, protocol, direction, status, label,
                    flow_order, properties, created_at, updated_at
                ) VALUES (
                    :id, :source_resource_id, :target_resource_id, :relationship_type, :description,
                    :auto_detected, :confidence, :port, :protocol, :direction, :status, :label,
                    :flow_order, :properties, :created_at, :updated_at
                )
            """), rel_dict)
        sqlite_conn.commit()
        print(f"✓ Migrated {len(relationships)} relationships")
    except Exception as e:
        print(f"✗ Error migrating relationships: {e}")
    
    # Update SQLite sequences
    print("\nUpdating auto-increment sequences...")
    try:
        # Get max IDs
        max_user_id = sqlite_conn.execute(text("SELECT MAX(id) FROM users")).scalar() or 0
        max_resource_id = sqlite_conn.execute(text("SELECT MAX(id) FROM resources")).scalar() or 0
        max_rel_id = sqlite_conn.execute(text("SELECT MAX(id) FROM resource_relationships")).scalar() or 0
        
        # SQLite auto-increments from the max ID automatically
        print(f"  Max user ID: {max_user_id}")
        print(f"  Max resource ID: {max_resource_id}")
        print(f"  Max relationship ID: {max_rel_id}")
    except Exception as e:
        print(f"Note: {e}")
    
    # Close connections
    pg_conn.close()
    sqlite_conn.close()
    
    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    print(f"\nSQLite database created at:\n{SQLITE_PATH}")
    print(f"\nFile size: {os.path.getsize(SQLITE_PATH) / 1024:.1f} KB")
    print("\nYou can now start the backend with SQLite:")
    print("  cd backend")
    print("  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")


if __name__ == "__main__":
    migrate_data()
