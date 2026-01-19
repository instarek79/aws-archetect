import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

// AWS Service Categories with icons
const AWS_SERVICE_CATEGORIES = {
  compute: {
    name: 'Compute',
    color: '#FF9900',
    services: [
      { type: 'ec2', name: 'EC2', icon: 'https://icon.icepanel.io/AWS/svg/Compute/EC2.svg' },
      { type: 'lambda', name: 'Lambda', icon: 'https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg' },
      { type: 'ecs', name: 'ECS', icon: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Container-Service.svg' },
      { type: 'eks', name: 'EKS', icon: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Kubernetes-Service.svg' },
      { type: 'fargate', name: 'Fargate', icon: 'https://icon.icepanel.io/AWS/svg/Containers/Fargate.svg' },
    ]
  },
  database: {
    name: 'Database',
    color: '#3B48CC',
    services: [
      { type: 'rds', name: 'RDS', icon: 'https://icon.icepanel.io/AWS/svg/Database/RDS.svg' },
      { type: 'aurora', name: 'Aurora', icon: 'https://icon.icepanel.io/AWS/svg/Database/Aurora.svg' },
      { type: 'dynamodb', name: 'DynamoDB', icon: 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg' },
      { type: 'elasticache', name: 'ElastiCache', icon: 'https://icon.icepanel.io/AWS/svg/Database/ElastiCache.svg' },
      { type: 'redshift', name: 'Redshift', icon: 'https://icon.icepanel.io/AWS/svg/Analytics/Redshift.svg' },
    ]
  },
  storage: {
    name: 'Storage',
    color: '#3F8624',
    services: [
      { type: 's3', name: 'S3', icon: 'https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg' },
      { type: 'ebs', name: 'EBS', icon: 'https://icon.icepanel.io/AWS/svg/Storage/Elastic-Block-Store.svg' },
      { type: 'efs', name: 'EFS', icon: 'https://icon.icepanel.io/AWS/svg/Storage/EFS.svg' },
    ]
  },
  networking: {
    name: 'Networking',
    color: '#8C4FFF',
    services: [
      { type: 'vpc', name: 'VPC', icon: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/VPC.svg' },
      { type: 'alb', name: 'ALB', icon: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg' },
      { type: 'nlb', name: 'NLB', icon: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg' },
      { type: 'cloudfront', name: 'CloudFront', icon: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/CloudFront.svg' },
      { type: 'route53', name: 'Route 53', icon: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Route-53.svg' },
      { type: 'apigateway', name: 'API Gateway', icon: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg' },
    ]
  },
  integration: {
    name: 'Integration',
    color: '#E7157B',
    services: [
      { type: 'sqs', name: 'SQS', icon: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg' },
      { type: 'sns', name: 'SNS', icon: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Notification-Service.svg' },
      { type: 'stepfunctions', name: 'Step Functions', icon: 'https://icon.icepanel.io/AWS/svg/App-Integration/Step-Functions.svg' },
      { type: 'eventbridge', name: 'EventBridge', icon: 'https://icon.icepanel.io/AWS/svg/App-Integration/EventBridge.svg' },
      { type: 'kinesis', name: 'Kinesis', icon: 'https://icon.icepanel.io/AWS/svg/Analytics/Kinesis.svg' },
    ]
  },
  security: {
    name: 'Security',
    color: '#DD344C',
    services: [
      { type: 'iam', name: 'IAM', icon: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/IAM-Identity-Center.svg' },
      { type: 'cognito', name: 'Cognito', icon: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Cognito.svg' },
      { type: 'kms', name: 'KMS', icon: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Key-Management-Service.svg' },
      { type: 'secretsmanager', name: 'Secrets Manager', icon: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Secrets-Manager.svg' },
      { type: 'waf', name: 'WAF', icon: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/WAF.svg' },
    ]
  },
  devops: {
    name: 'DevOps',
    color: '#759C3E',
    services: [
      { type: 'codepipeline', name: 'CodePipeline', icon: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodePipeline.svg' },
      { type: 'codebuild', name: 'CodeBuild', icon: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodeBuild.svg' },
      { type: 'codecommit', name: 'CodeCommit', icon: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodeCommit.svg' },
      { type: 'codedeploy', name: 'CodeDeploy', icon: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodeDeploy.svg' },
      { type: 'ecr', name: 'ECR', icon: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Container-Registry.svg' },
    ]
  },
  monitoring: {
    name: 'Monitoring',
    color: '#759C3E',
    services: [
      { type: 'cloudwatch', name: 'CloudWatch', icon: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg' },
      { type: 'cloudtrail', name: 'CloudTrail', icon: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudTrail.svg' },
      { type: 'cloudformation', name: 'CloudFormation', icon: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudFormation.svg' },
    ]
  }
};

function ResourcePalette({ onAddResource, isOpen, onToggle }) {
  const [expandedCategories, setExpandedCategories] = useState({
    compute: true,
    database: false,
    storage: false,
    networking: false,
    integration: false,
    security: false,
    devops: false,
    monitoring: false,
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDragStart = (event, service) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'resource',
      serviceType: service.type,
      serviceName: service.name,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  if (!isOpen) {
    return (
      <div className="fixed left-0 top-20 z-40">
        <button
          onClick={onToggle}
          className="bg-white shadow-lg rounded-r-lg px-2 py-4 hover:bg-gray-50 transition-colors border-r border-t border-b border-gray-200"
          title="Open Resource Palette"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-20 bottom-0 w-64 bg-white shadow-xl z-40 overflow-y-auto border-r border-gray-200">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <h3 className="font-bold text-sm">AWS Resources</h3>
        </div>
        <button
          onClick={onToggle}
          className="hover:bg-white/20 rounded p-1 transition-colors"
          title="Close Palette"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-3 bg-blue-50 border-b border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>Drag & Drop</strong> services onto the canvas to add resources
        </p>
      </div>

      {/* Service Categories */}
      <div className="p-2">
        {Object.entries(AWS_SERVICE_CATEGORIES).map(([categoryKey, category]) => (
          <div key={categoryKey} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-semibold text-sm text-gray-800">
                  {category.name}
                </span>
                <span className="text-xs text-gray-500">
                  ({category.services.length})
                </span>
              </div>
              {expandedCategories[categoryKey] ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* Services List */}
            {expandedCategories[categoryKey] && (
              <div className="mt-1 ml-2 space-y-1">
                {category.services.map((service) => (
                  <div
                    key={service.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, service)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 rounded-lg cursor-move transition-colors border border-transparent hover:border-orange-200"
                    title={`Drag to add ${service.name}`}
                  >
                    <img 
                      src={service.icon} 
                      alt={service.name}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {service.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourcePalette;
