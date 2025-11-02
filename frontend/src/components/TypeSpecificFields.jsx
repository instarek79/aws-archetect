import React from 'react';
import { useTranslation } from 'react-i18next';

// Type-specific field component
function TypeSpecificFields({ resourceType, properties = {}, onChange }) {
  const { t } = useTranslation();

  // Ensure properties is always an object
  const safeProperties = properties || {};

  const handleChange = (field, value) => {
    onChange({
      ...safeProperties,
      [field]: value
    });
  };

  const handleArrayChange = (field, value) => {
    // Convert comma-separated string to array
    const array = value.split(',').map(v => v.trim()).filter(v => v);
    onChange({
      ...safeProperties,
      [field]: array
    });
  };

  // EC2 Instance Fields
  if (resourceType === 'ec2') {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">EC2 Instance Properties</h4>
        
        {/* AMI ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            AMI ID *
          </label>
          <input
            type="text"
            value={safeProperties.ami_id || ''}
            onChange={(e) => handleChange('ami_id', e.target.value)}
            placeholder="ami-0abcdef1234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Operating System */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operating System *
          </label>
          <select
            value={safeProperties.os || ''}
            onChange={(e) => handleChange('os', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select OS --</option>
            <option value="Amazon Linux 2">Amazon Linux 2</option>
            <option value="Amazon Linux 2023">Amazon Linux 2023</option>
            <option value="Ubuntu 22.04">Ubuntu 22.04 LTS</option>
            <option value="Ubuntu 20.04">Ubuntu 20.04 LTS</option>
            <option value="Red Hat Enterprise Linux 9">RHEL 9</option>
            <option value="Red Hat Enterprise Linux 8">RHEL 8</option>
            <option value="Windows Server 2022">Windows Server 2022</option>
            <option value="Windows Server 2019">Windows Server 2019</option>
            <option value="Debian 11">Debian 11</option>
            <option value="CentOS 7">CentOS 7</option>
          </select>
        </div>

        {/* Key Pair */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key Pair Name
          </label>
          <input
            type="text"
            value={safeProperties.key_pair || ''}
            onChange={(e) => handleChange('key_pair', e.target.value)}
            placeholder="my-key-pair"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* EBS Optimized */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ebs_optimized"
            checked={safeProperties.ebs_optimized || false}
            onChange={(e) => handleChange('ebs_optimized', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="ebs_optimized" className="text-sm text-gray-700">
            EBS Optimized
          </label>
        </div>

        {/* Monitoring */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="detailed_monitoring"
            checked={safeProperties.detailed_monitoring || false}
            onChange={(e) => handleChange('detailed_monitoring', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="detailed_monitoring" className="text-sm text-gray-700">
            Detailed Monitoring (CloudWatch)
          </label>
        </div>
      </div>
    );
  }

  // RDS Database Fields
  if (resourceType === 'rds') {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">RDS Database Properties</h4>
        
        {/* DB Instance Type (Different from EC2) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DB Instance Class *
          </label>
          <select
            value={safeProperties.db_instance_class || ''}
            onChange={(e) => handleChange('db_instance_class', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Instance Class --</option>
            <optgroup label="General Purpose (T3)">
              <option value="db.t3.micro">db.t3.micro</option>
              <option value="db.t3.small">db.t3.small</option>
              <option value="db.t3.medium">db.t3.medium</option>
              <option value="db.t3.large">db.t3.large</option>
            </optgroup>
            <optgroup label="Memory Optimized (R5)">
              <option value="db.r5.large">db.r5.large</option>
              <option value="db.r5.xlarge">db.r5.xlarge</option>
              <option value="db.r5.2xlarge">db.r5.2xlarge</option>
              <option value="db.r5.4xlarge">db.r5.4xlarge</option>
            </optgroup>
            <optgroup label="Memory Optimized (X2)">
              <option value="db.x2iedn.xlarge">db.x2iedn.xlarge</option>
              <option value="db.x2iedn.2xlarge">db.x2iedn.2xlarge</option>
            </optgroup>
            <optgroup label="Burstable (T4g - ARM)">
              <option value="db.t4g.micro">db.t4g.micro</option>
              <option value="db.t4g.small">db.t4g.small</option>
              <option value="db.t4g.medium">db.t4g.medium</option>
            </optgroup>
          </select>
        </div>

        {/* Database Engine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Database Engine *
          </label>
          <select
            value={safeProperties.engine || ''}
            onChange={(e) => handleChange('engine', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Engine --</option>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
            <option value="oracle-ee">Oracle Enterprise Edition</option>
            <option value="oracle-se2">Oracle Standard Edition 2</option>
            <option value="sqlserver-ee">SQL Server Enterprise</option>
            <option value="sqlserver-se">SQL Server Standard</option>
            <option value="sqlserver-ex">SQL Server Express</option>
            <option value="aurora-postgresql">Aurora PostgreSQL</option>
            <option value="aurora-mysql">Aurora MySQL</option>
          </select>
        </div>

        {/* Engine Version */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engine Version
          </label>
          <input
            type="text"
            value={safeProperties.engine_version || ''}
            onChange={(e) => handleChange('engine_version', e.target.value)}
            placeholder="14.7, 8.0.32, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Storage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allocated Storage (GB)
          </label>
          <input
            type="number"
            value={safeProperties.storage_gb || ''}
            onChange={(e) => handleChange('storage_gb', parseInt(e.target.value))}
            placeholder="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Storage Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Type
          </label>
          <select
            value={safeProperties.storage_type || ''}
            onChange={(e) => handleChange('storage_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select --</option>
            <option value="gp3">General Purpose SSD (gp3)</option>
            <option value="gp2">General Purpose SSD (gp2)</option>
            <option value="io1">Provisioned IOPS SSD (io1)</option>
            <option value="magnetic">Magnetic</option>
          </select>
        </div>

        {/* Multi-AZ */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="multi_az"
            checked={safeProperties.multi_az || false}
            onChange={(e) => handleChange('multi_az', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="multi_az" className="text-sm text-gray-700">
            Multi-AZ Deployment
          </label>
        </div>

        {/* Backup Retention */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Backup Retention (Days)
          </label>
          <input
            type="number"
            value={safeProperties.backup_retention_days || ''}
            onChange={(e) => handleChange('backup_retention_days', parseInt(e.target.value))}
            placeholder="7"
            min="0"
            max="35"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Encryption */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="encryption_enabled"
            checked={safeProperties.encryption_enabled || false}
            onChange={(e) => handleChange('encryption_enabled', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="encryption_enabled" className="text-sm text-gray-700">
            Encryption at Rest
          </label>
        </div>

        {/* Endpoint (Critical for connections) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Endpoint * <span className="text-xs text-gray-500">(Connection string)</span>
          </label>
          <input
            type="text"
            value={safeProperties.endpoint || ''}
            onChange={(e) => handleChange('endpoint', e.target.value)}
            placeholder="mydb.abc123.us-east-1.rds.amazonaws.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            The DNS endpoint for database connections
          </p>
        </div>

        {/* Port */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Port * <span className="text-xs text-gray-500">(Database port)</span>
          </label>
          <input
            type="number"
            value={safeProperties.port || ''}
            onChange={(e) => handleChange('port', parseInt(e.target.value))}
            placeholder="5432 (PostgreSQL), 3306 (MySQL), 1433 (SQL Server)"
            min="1"
            max="65535"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Default ports: PostgreSQL (5432), MySQL (3306), SQL Server (1433), Oracle (1521)
          </p>
        </div>

        {/* Multiple Subnets for RDS (Multi-AZ) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subnet Groups (comma-separated)
          </label>
          <input
            type="text"
            value={safeProperties.subnet_groups ? safeProperties.subnet_groups.join(', ') : ''}
            onChange={(e) => handleArrayChange('subnet_groups', e.target.value)}
            placeholder="subnet-db-1a, subnet-db-1b, subnet-db-1c"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            RDS uses multiple subnets for high availability and failover
          </p>
        </div>
      </div>
    );
  }

  // ELB/ALB/NLB Fields
  if (resourceType === 'elb') {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">Load Balancer Properties</h4>
        
        {/* Load Balancer Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Load Balancer Type *
          </label>
          <select
            value={safeProperties.lb_type || ''}
            onChange={(e) => handleChange('lb_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Type --</option>
            <option value="application">Application Load Balancer (ALB)</option>
            <option value="network">Network Load Balancer (NLB)</option>
            <option value="gateway">Gateway Load Balancer (GWLB)</option>
            <option value="classic">Classic Load Balancer (CLB)</option>
          </select>
        </div>

        {/* DNS Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DNS Name *
          </label>
          <input
            type="text"
            value={safeProperties.dns_name || ''}
            onChange={(e) => handleChange('dns_name', e.target.value)}
            placeholder="my-lb-123456789.us-east-1.elb.amazonaws.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheme *
          </label>
          <select
            value={safeProperties.scheme || ''}
            onChange={(e) => handleChange('scheme', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select --</option>
            <option value="internet-facing">Internet-facing</option>
            <option value="internal">Internal</option>
          </select>
        </div>

        {/* Subnets (Multiple allowed for ELB) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subnets (comma-separated) *
          </label>
          <input
            type="text"
            value={safeProperties.subnets ? safeProperties.subnets.join(', ') : ''}
            onChange={(e) => handleArrayChange('subnets', e.target.value)}
            placeholder="subnet-abc, subnet-xyz, subnet-def"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Load balancers require multiple subnets in different AZs
          </p>
        </div>

        {/* Target Groups */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Groups (comma-separated)
          </label>
          <input
            type="text"
            value={safeProperties.target_groups ? safeProperties.target_groups.join(', ') : ''}
            onChange={(e) => handleArrayChange('target_groups', e.target.value)}
            placeholder="tg-web-servers, tg-api-servers"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Listeners */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Listeners (comma-separated, port:protocol)
          </label>
          <input
            type="text"
            value={safeProperties.listeners || ''}
            onChange={(e) => handleChange('listeners', e.target.value)}
            placeholder="80:HTTP, 443:HTTPS"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* SSL Certificate ARN */}
        {safeProperties.listeners && safeProperties.listeners.includes('HTTPS') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SSL Certificate ARN
            </label>
            <input
              type="text"
              value={safeProperties.ssl_certificate_arn || ''}
              onChange={(e) => handleChange('ssl_certificate_arn', e.target.value)}
              placeholder="arn:aws:acm:region:account:certificate/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Cross-Zone Load Balancing */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cross_zone_enabled"
            checked={safeProperties.cross_zone_enabled || false}
            onChange={(e) => handleChange('cross_zone_enabled', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="cross_zone_enabled" className="text-sm text-gray-700">
            Cross-Zone Load Balancing
          </label>
        </div>
      </div>
    );
  }

  // S3 Bucket Fields
  if (resourceType === 's3') {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">S3 Bucket Properties</h4>
        
        {/* Bucket Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bucket Name *
          </label>
          <input
            type="text"
            value={safeProperties.bucket_name || ''}
            onChange={(e) => handleChange('bucket_name', e.target.value)}
            placeholder="my-bucket-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Versioning */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="versioning_enabled"
            checked={safeProperties.versioning_enabled || false}
            onChange={(e) => handleChange('versioning_enabled', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="versioning_enabled" className="text-sm text-gray-700">
            Versioning Enabled
          </label>
        </div>

        {/* Encryption */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Encryption
          </label>
          <select
            value={safeProperties.encryption || ''}
            onChange={(e) => handleChange('encryption', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">None</option>
            <option value="AES256">SSE-S3 (AES256)</option>
            <option value="aws:kms">SSE-KMS</option>
          </select>
        </div>

        {/* Public Access */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="public_access"
            checked={safeProperties.public_access || false}
            onChange={(e) => handleChange('public_access', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="public_access" className="text-sm text-gray-700">
            Public Access Allowed
          </label>
        </div>

        {/* Static Website Hosting */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="website_hosting"
            checked={safeProperties.website_hosting || false}
            onChange={(e) => handleChange('website_hosting', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="website_hosting" className="text-sm text-gray-700">
            Static Website Hosting
          </label>
        </div>

        {/* Lifecycle Rules */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="lifecycle_rules"
            checked={safeProperties.lifecycle_rules || false}
            onChange={(e) => handleChange('lifecycle_rules', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="lifecycle_rules" className="text-sm text-gray-700">
            Lifecycle Rules Configured
          </label>
        </div>
      </div>
    );
  }

  // Lambda Function Fields
  if (resourceType === 'lambda') {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">Lambda Function Properties</h4>
        
        {/* Runtime */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Runtime *
          </label>
          <select
            value={safeProperties.runtime || ''}
            onChange={(e) => handleChange('runtime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Runtime --</option>
            <option value="python3.11">Python 3.11</option>
            <option value="python3.10">Python 3.10</option>
            <option value="python3.9">Python 3.9</option>
            <option value="nodejs20.x">Node.js 20.x</option>
            <option value="nodejs18.x">Node.js 18.x</option>
            <option value="java17">Java 17</option>
            <option value="java11">Java 11</option>
            <option value="dotnet8">NET 8</option>
            <option value="dotnet6">.NET 6</option>
            <option value="go1.x">Go 1.x</option>
            <option value="ruby3.2">Ruby 3.2</option>
          </select>
        </div>

        {/* Handler */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Handler *
          </label>
          <input
            type="text"
            value={safeProperties.handler || ''}
            onChange={(e) => handleChange('handler', e.target.value)}
            placeholder="index.handler, lambda_function.lambda_handler"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Memory */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Memory (MB) *
          </label>
          <input
            type="number"
            value={safeProperties.memory_mb || ''}
            onChange={(e) => handleChange('memory_mb', parseInt(e.target.value))}
            placeholder="256"
            min="128"
            max="10240"
            step="64"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timeout (Seconds) *
          </label>
          <input
            type="number"
            value={safeProperties.timeout_seconds || ''}
            onChange={(e) => handleChange('timeout_seconds', parseInt(e.target.value))}
            placeholder="30"
            min="1"
            max="900"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Layers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Layers (comma-separated ARNs)
          </label>
          <input
            type="text"
            value={safeProperties.layers ? safeProperties.layers.join(', ') : ''}
            onChange={(e) => handleArrayChange('layers', e.target.value)}
            placeholder="arn:aws:lambda:region:account:layer:..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    );
  }

  // Default: No type-specific fields
  return (
    <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600 text-sm">
      No additional type-specific properties for {resourceType.toUpperCase()}
    </div>
  );
}

export default TypeSpecificFields;
