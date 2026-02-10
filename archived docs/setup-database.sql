-- Setup database for AWS Architect
-- Run this as PostgreSQL administrator

-- Set password for postgres user
ALTER USER postgres WITH PASSWORD 'postgres';

-- Create database
DROP DATABASE IF EXISTS auth_db;
CREATE DATABASE auth_db;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;

-- Connect to the database
\c auth_db

-- Verify connection
SELECT 'Database setup complete!' as status;
