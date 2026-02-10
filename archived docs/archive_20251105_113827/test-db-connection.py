"""Test database connection"""
import psycopg2

print("Testing database connection...")

try:
    # Test with 127.0.0.1:5433 (Docker container)
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5433,
        database="auth_db",
        user="postgres",
        password="postgres"
    )
    
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    
    print("SUCCESS! Connected to database")
    print(f"PostgreSQL version: {version[0]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"FAILED: {e}")
    exit(1)
