import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

// Architecture validation rules
function validateArchitecture(resources, relationships) {
  const warnings = [];
  const errors = [];
  const info = [];
  const successes = [];

  // Check for resources without relationships
  const connectedResourceIds = new Set();
  relationships.forEach(rel => {
    connectedResourceIds.add(rel.source_resource_id?.toString());
    connectedResourceIds.add(rel.target_resource_id?.toString());
  });

  resources.forEach(resource => {
    if (!connectedResourceIds.has(resource.id?.toString()) && resource.type !== 'vpc' && resource.type !== 'subnet') {
      warnings.push({
        type: 'warning',
        resource: resource.name,
        message: `${resource.name} has no connections to other resources`,
        suggestion: 'Consider adding relationships to integrate this resource',
      });
    }
  });

  // Check EC2 instances
  const ec2Instances = resources.filter(r => r.type === 'ec2');
  ec2Instances.forEach(ec2 => {
    // Check if EC2 is in a VPC
    if (!ec2.vpc_id) {
      errors.push({
        type: 'error',
        resource: ec2.name,
        message: `EC2 instance ${ec2.name} is not in a VPC`,
        suggestion: 'All EC2 instances should be in a VPC for security',
      });
    }

    // Check if EC2 has monitoring
    if (!ec2.type_specific_properties?.monitoring) {
      info.push({
        type: 'info',
        resource: ec2.name,
        message: `EC2 instance ${ec2.name} does not have detailed monitoring enabled`,
        suggestion: 'Enable CloudWatch detailed monitoring for better observability',
      });
    }
  });

  // Check RDS databases
  const rdsDatabases = resources.filter(r => r.type === 'rds' || r.type === 'aurora');
  rdsDatabases.forEach(rds => {
    // Check Multi-AZ
    if (!rds.type_specific_properties?.multi_az && rds.environment === 'production') {
      warnings.push({
        type: 'warning',
        resource: rds.name,
        message: `Production database ${rds.name} is not Multi-AZ`,
        suggestion: 'Enable Multi-AZ for high availability in production',
      });
    }

    // Check backup retention
    const retention = parseInt(rds.type_specific_properties?.backup_retention) || 0;
    if (retention < 7 && rds.environment === 'production') {
      warnings.push({
        type: 'warning',
        resource: rds.name,
        message: `Database ${rds.name} has backup retention < 7 days`,
        suggestion: 'Set backup retention to at least 7 days for production databases',
      });
    }

    // Check if in private subnet
    if (rds.subnet_id && rds.subnet_id.includes('public')) {
      errors.push({
        type: 'error',
        resource: rds.name,
        message: `Database ${rds.name} appears to be in a public subnet`,
        suggestion: 'Move databases to private subnets for security',
      });
    }
  });

  // Check S3 buckets
  const s3Buckets = resources.filter(r => r.type === 's3');
  s3Buckets.forEach(bucket => {
    // Check encryption
    if (!bucket.type_specific_properties?.encryption) {
      warnings.push({
        type: 'warning',
        resource: bucket.name,
        message: `S3 bucket ${bucket.name} does not have encryption enabled`,
        suggestion: 'Enable server-side encryption for data at rest',
      });
    }

    // Check public access
    if (!bucket.type_specific_properties?.public_access) {
      errors.push({
        type: 'error',
        resource: bucket.name,
        message: `S3 bucket ${bucket.name} may allow public access`,
        suggestion: 'Enable "Block all public access" unless specifically needed',
      });
    }

    // Check versioning
    if (!bucket.type_specific_properties?.versioning) {
      info.push({
        type: 'info',
        resource: bucket.name,
        message: `S3 bucket ${bucket.name} does not have versioning enabled`,
        suggestion: 'Enable versioning for data protection and recovery',
      });
    }
  });

  // Check Lambda functions
  const lambdaFunctions = resources.filter(r => r.type === 'lambda');
  lambdaFunctions.forEach(lambda => {
    // Check timeout
    const timeout = parseInt(lambda.type_specific_properties?.timeout) || 3;
    if (timeout > 300) {
      warnings.push({
        type: 'warning',
        resource: lambda.name,
        message: `Lambda ${lambda.name} has timeout > 5 minutes`,
        suggestion: 'Consider using Step Functions for long-running workflows',
      });
    }

    // Check memory
    const memory = parseInt(lambda.type_specific_properties?.memory) || 128;
    if (memory < 256) {
      info.push({
        type: 'info',
        resource: lambda.name,
        message: `Lambda ${lambda.name} has low memory allocation (${memory}MB)`,
        suggestion: 'Consider increasing memory for better performance',
      });
    }
  });

  // Check for load balancers without targets
  const loadBalancers = resources.filter(r => r.type === 'alb' || r.type === 'nlb');
  loadBalancers.forEach(lb => {
    const hasTargets = relationships.some(rel => 
      rel.source_resource_id?.toString() === lb.id?.toString() && 
      rel.relationship_type === 'routes_to'
    );
    
    if (!hasTargets) {
      warnings.push({
        type: 'warning',
        resource: lb.name,
        message: `Load balancer ${lb.name} has no target resources`,
        suggestion: 'Add EC2 instances or ECS services as targets',
      });
    }
  });

  // Check for best practices
  const hasVpc = resources.some(r => r.type === 'vpc');
  if (!hasVpc && resources.length > 0) {
    warnings.push({
      type: 'warning',
      resource: 'Architecture',
      message: 'No VPC defined in architecture',
      suggestion: 'Create a VPC for network isolation and security',
    });
  }

  // Check for monitoring
  const hasCloudWatch = resources.some(r => r.type === 'cloudwatch');
  if (!hasCloudWatch && resources.length > 5) {
    info.push({
      type: 'info',
      resource: 'Architecture',
      message: 'No CloudWatch monitoring configured',
      suggestion: 'Add CloudWatch for logging and monitoring',
    });
  }

  // Success checks
  if (rdsDatabases.some(r => r.type_specific_properties?.multi_az)) {
    successes.push({
      type: 'success',
      message: 'Multi-AZ database deployment detected',
    });
  }

  if (s3Buckets.some(r => r.type_specific_properties?.encryption)) {
    successes.push({
      type: 'success',
      message: 'S3 encryption enabled on some buckets',
    });
  }

  if (resources.some(r => r.type === 'alb' || r.type === 'nlb')) {
    successes.push({
      type: 'success',
      message: 'Load balancing configured for high availability',
    });
  }

  return { errors, warnings, info, successes };
}

function ValidationPanel({ resources, relationships, isOpen, onClose }) {
  if (!isOpen) return null;

  const validation = validateArchitecture(resources, relationships);
  const totalIssues = validation.errors.length + validation.warnings.length;

  return (
    <div className="fixed right-0 top-20 bottom-0 w-96 bg-white shadow-2xl z-40 overflow-y-auto border-l border-gray-200">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Architecture Validation</h3>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded p-1 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-indigo-100">
          {totalIssues === 0 ? 'No issues found' : `${totalIssues} issue${totalIssues > 1 ? 's' : ''} detected`}
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Errors */}
        {validation.errors.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Errors ({validation.errors.length})
            </h4>
            <div className="space-y-2">
              {validation.errors.map((error, idx) => (
                <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <div className="font-medium text-red-900 text-sm mb-1">
                    {error.resource}
                  </div>
                  <div className="text-red-700 text-xs mb-2">{error.message}</div>
                  <div className="text-red-600 text-xs italic">
                    💡 {error.suggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warnings ({validation.warnings.length})
            </h4>
            <div className="space-y-2">
              {validation.warnings.map((warning, idx) => (
                <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                  <div className="font-medium text-yellow-900 text-sm mb-1">
                    {warning.resource}
                  </div>
                  <div className="text-yellow-700 text-xs mb-2">{warning.message}</div>
                  <div className="text-yellow-600 text-xs italic">
                    💡 {warning.suggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        {validation.info.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Suggestions ({validation.info.length})
            </h4>
            <div className="space-y-2">
              {validation.info.map((item, idx) => (
                <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <div className="font-medium text-blue-900 text-sm mb-1">
                    {item.resource}
                  </div>
                  <div className="text-blue-700 text-xs mb-2">{item.message}</div>
                  <div className="text-blue-600 text-xs italic">
                    💡 {item.suggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Successes */}
        {validation.successes.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Best Practices ({validation.successes.length})
            </h4>
            <div className="space-y-2">
              {validation.successes.map((success, idx) => (
                <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                  <div className="text-green-700 text-xs">✓ {success.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No issues */}
        {totalIssues === 0 && validation.successes.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No validation issues found</p>
            <p className="text-sm text-gray-500 mt-2">Your architecture looks good!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ValidationPanel;
