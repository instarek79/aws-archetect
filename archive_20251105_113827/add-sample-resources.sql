-- Add sample AWS resources
INSERT INTO resources (name, type, region, account_id, vpc_id, subnet_id, availability_zone, status, environment, instance_type, public_ip, private_ip, description)
VALUES 
('prod-web-server-01', 'EC2', 'us-east-1', '123456789012', 'vpc-0abc123', 'subnet-0def456', 'us-east-1a', 'running', 'production', 't3.medium', '54.123.45.67', '10.0.1.10', 'Production web server'),
('prod-database-rds', 'RDS', 'us-east-1', '123456789012', 'vpc-0abc123', 'subnet-0ghi789', 'us-east-1b', 'available', 'production', 'db.t3.large', NULL, NULL, 'Production PostgreSQL database'),
('prod-app-lb', 'LoadBalancer', 'us-east-1', '123456789012', 'vpc-0abc123', NULL, NULL, 'active', 'production', NULL, NULL, NULL, 'Application Load Balancer'),
('prod-s3-assets', 'S3', 'us-east-1', '123456789012', NULL, NULL, NULL, 'active', 'production', NULL, NULL, NULL, 'Static assets bucket'),
('dev-web-server-01', 'EC2', 'us-west-2', '123456789012', 'vpc-0xyz789', 'subnet-0abc123', 'us-west-2a', 'running', 'development', 't3.small', NULL, '10.1.1.10', 'Development web server');

SELECT COUNT(*) as total_resources FROM resources;
