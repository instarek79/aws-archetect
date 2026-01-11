import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

// Resource configuration schemas
const RESOURCE_CONFIGS = {
  ec2: {
    name: 'EC2 Instance',
    fields: [
      { name: 'name', label: 'Instance Name', type: 'text', required: true, placeholder: 'my-web-server' },
      { name: 'instance_type', label: 'Instance Type', type: 'select', required: true, options: ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium', 'm5.large', 'm5.xlarge'] },
      { name: 'ami_id', label: 'AMI ID', type: 'text', placeholder: 'ami-0c55b159cbfafe1f0' },
      { name: 'key_pair', label: 'Key Pair', type: 'text', placeholder: 'my-keypair' },
      { name: 'subnet_id', label: 'Subnet', type: 'text', placeholder: 'subnet-xxxxx' },
      { name: 'security_groups', label: 'Security Groups', type: 'tags', placeholder: 'sg-xxxxx' },
      { name: 'monitoring', label: 'Detailed Monitoring', type: 'checkbox' },
      { name: 'ebs_optimized', label: 'EBS Optimized', type: 'checkbox' },
    ]
  },
  lambda: {
    name: 'Lambda Function',
    fields: [
      { name: 'name', label: 'Function Name', type: 'text', required: true, placeholder: 'my-function' },
      { name: 'runtime', label: 'Runtime', type: 'select', required: true, options: ['python3.11', 'python3.10', 'nodejs20.x', 'nodejs18.x', 'java17', 'dotnet8', 'go1.x'] },
      { name: 'memory', label: 'Memory (MB)', type: 'select', options: ['128', '256', '512', '1024', '2048', '3008'] },
      { name: 'timeout', label: 'Timeout (seconds)', type: 'number', placeholder: '30', min: 1, max: 900 },
      { name: 'handler', label: 'Handler', type: 'text', placeholder: 'index.handler' },
      { name: 'environment', label: 'Environment Variables', type: 'keyvalue' },
    ]
  },
  rds: {
    name: 'RDS Database',
    fields: [
      { name: 'name', label: 'DB Instance Name', type: 'text', required: true, placeholder: 'mydb' },
      { name: 'engine', label: 'Database Engine', type: 'select', required: true, options: ['mysql', 'postgres', 'mariadb', 'oracle-ee', 'sqlserver-ex', 'aurora-mysql', 'aurora-postgresql'] },
      { name: 'instance_class', label: 'Instance Class', type: 'select', options: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.m5.large', 'db.m5.xlarge'] },
      { name: 'allocated_storage', label: 'Storage (GB)', type: 'number', placeholder: '20', min: 20, max: 65536 },
      { name: 'multi_az', label: 'Multi-AZ Deployment', type: 'checkbox' },
      { name: 'backup_retention', label: 'Backup Retention (days)', type: 'number', placeholder: '7', min: 0, max: 35 },
      { name: 'subnet_group', label: 'Subnet Group', type: 'text', placeholder: 'default' },
    ]
  },
  s3: {
    name: 'S3 Bucket',
    fields: [
      { name: 'name', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-unique-bucket-name' },
      { name: 'versioning', label: 'Enable Versioning', type: 'checkbox' },
      { name: 'encryption', label: 'Enable Encryption', type: 'checkbox', default: true },
      { name: 'public_access', label: 'Block Public Access', type: 'checkbox', default: true },
      { name: 'lifecycle_rules', label: 'Lifecycle Rules', type: 'checkbox' },
    ]
  },
  dynamodb: {
    name: 'DynamoDB Table',
    fields: [
      { name: 'name', label: 'Table Name', type: 'text', required: true, placeholder: 'my-table' },
      { name: 'partition_key', label: 'Partition Key', type: 'text', required: true, placeholder: 'id' },
      { name: 'sort_key', label: 'Sort Key', type: 'text', placeholder: 'timestamp' },
      { name: 'billing_mode', label: 'Billing Mode', type: 'select', options: ['PAY_PER_REQUEST', 'PROVISIONED'] },
      { name: 'read_capacity', label: 'Read Capacity Units', type: 'number', placeholder: '5' },
      { name: 'write_capacity', label: 'Write Capacity Units', type: 'number', placeholder: '5' },
    ]
  },
  alb: {
    name: 'Application Load Balancer',
    fields: [
      { name: 'name', label: 'Load Balancer Name', type: 'text', required: true, placeholder: 'my-alb' },
      { name: 'scheme', label: 'Scheme', type: 'select', options: ['internet-facing', 'internal'] },
      { name: 'subnets', label: 'Subnets', type: 'tags', placeholder: 'subnet-xxxxx' },
      { name: 'security_groups', label: 'Security Groups', type: 'tags', placeholder: 'sg-xxxxx' },
    ]
  },
  vpc: {
    name: 'VPC',
    fields: [
      { name: 'name', label: 'VPC Name', type: 'text', required: true, placeholder: 'my-vpc' },
      { name: 'cidr_block', label: 'CIDR Block', type: 'text', required: true, placeholder: '10.0.0.0/16' },
      { name: 'enable_dns', label: 'Enable DNS Hostnames', type: 'checkbox', default: true },
      { name: 'enable_dns_support', label: 'Enable DNS Support', type: 'checkbox', default: true },
    ]
  },
  apigateway: {
    name: 'API Gateway',
    fields: [
      { name: 'name', label: 'API Name', type: 'text', required: true, placeholder: 'my-api' },
      { name: 'protocol_type', label: 'Protocol', type: 'select', options: ['REST', 'HTTP', 'WEBSOCKET'] },
      { name: 'endpoint_type', label: 'Endpoint Type', type: 'select', options: ['REGIONAL', 'EDGE', 'PRIVATE'] },
    ]
  },
};

function ResourceConfigPanel({ resource, onSave, onCancel }) {
  const config = RESOURCE_CONFIGS[resource.type] || { name: resource.type, fields: [] };
  const [formData, setFormData] = useState({
    name: resource.name || '',
    type: resource.type,
    account_id: resource.account_id || '',
    region: resource.region || 'us-east-1',
    vpc_id: resource.vpc_id || '',
    subnet_id: resource.subnet_id || '',
    environment: resource.environment || 'development',
    tags: resource.tags || {},
    type_specific_properties: resource.type_specific_properties || {},
    ...resource,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleTypeSpecificChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      type_specific_properties: {
        ...prev.type_specific_properties,
        [fieldName]: value,
      },
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    // Validate required fields
    config.fields.forEach(field => {
      if (field.required) {
        const value = field.name === 'name' ? formData.name : formData.type_specific_properties[field.name];
        if (!value || value === '') {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const renderField = (field) => {
    const value = field.name === 'name' ? formData.name : formData.type_specific_properties[field.name] || '';
    const hasError = errors[field.name];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => field.name === 'name' ? handleChange('name', e.target.value) : handleTypeSpecificChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleTypeSpecificChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => field.name === 'name' ? handleChange('name', e.target.value) : handleTypeSpecificChange(field.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select {field.label}</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || field.default || false}
              onChange={(e) => handleTypeSpecificChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        );
      
      case 'tags':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleTypeSpecificChange(field.name, e.target.value.split(',').map(s => s.trim()))}
            placeholder={field.placeholder + ' (comma-separated)'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
      
      case 'keyvalue':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleTypeSpecificChange(field.name, parsed);
              } catch {
                handleTypeSpecificChange(field.name, e.target.value);
              }
            }}
            placeholder='{"KEY": "value"}'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Configure {config.name}</h3>
            <p className="text-sm text-blue-100 mt-1">Set up resource properties and configuration</p>
          </div>
          <button
            onClick={onCancel}
            className="hover:bg-white/20 rounded p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Common Fields */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">General Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => handleChange('environment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                  <option value="testing">Testing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resource-Specific Fields */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 mb-4">{config.name} Configuration</h4>
            {config.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {renderField(field)}
                {errors[field.name] && (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors[field.name]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (JSON)</label>
            <textarea
              value={JSON.stringify(formData.tags, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange('tags', parsed);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              rows={3}
              placeholder='{"Name": "MyResource", "Environment": "Production"}'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Resource
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResourceConfigPanel;
