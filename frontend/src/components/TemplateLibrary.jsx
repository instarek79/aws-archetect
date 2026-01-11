import React, { useState } from 'react';
import { X, Layers, Zap, Database, Globe, Code, Server } from 'lucide-react';

// Pre-built architecture templates
const ARCHITECTURE_TEMPLATES = [
  {
    id: '3tier-web',
    name: '3-Tier Web Application',
    description: 'Classic web architecture with load balancer, application servers, and database',
    icon: Globe,
    category: 'Web Applications',
    resources: [
      { type: 'alb', name: 'Web-ALB', position: { x: 100, y: 100 } },
      { type: 'ec2', name: 'Web-Server-1', position: { x: 100, y: 250 } },
      { type: 'ec2', name: 'Web-Server-2', position: { x: 300, y: 250 } },
      { type: 'rds', name: 'App-Database', position: { x: 200, y: 400 } },
    ],
    relationships: [
      { source: 0, target: 1, type: 'routes_to' },
      { source: 0, target: 2, type: 'routes_to' },
      { source: 1, target: 3, type: 'uses' },
      { source: 2, target: 3, type: 'uses' },
    ]
  },
  {
    id: 'serverless-api',
    name: 'Serverless REST API',
    description: 'API Gateway with Lambda functions and DynamoDB backend',
    icon: Zap,
    category: 'Serverless',
    resources: [
      { type: 'apigateway', name: 'REST-API', position: { x: 100, y: 100 } },
      { type: 'lambda', name: 'Get-Handler', position: { x: 100, y: 250 } },
      { type: 'lambda', name: 'Post-Handler', position: { x: 300, y: 250 } },
      { type: 'dynamodb', name: 'Data-Table', position: { x: 200, y: 400 } },
    ],
    relationships: [
      { source: 0, target: 1, type: 'invokes' },
      { source: 0, target: 2, type: 'invokes' },
      { source: 1, target: 3, type: 'uses' },
      { source: 2, target: 3, type: 'uses' },
    ]
  },
  {
    id: 'cicd-pipeline',
    name: 'CI/CD Pipeline',
    description: 'Complete deployment pipeline with CodePipeline, CodeBuild, and S3',
    icon: Code,
    category: 'DevOps',
    resources: [
      { type: 'codecommit', name: 'Source-Repo', position: { x: 100, y: 100 } },
      { type: 'codepipeline', name: 'Deploy-Pipeline', position: { x: 300, y: 100 } },
      { type: 'codebuild', name: 'Build-Project', position: { x: 500, y: 100 } },
      { type: 's3', name: 'Artifact-Bucket', position: { x: 700, y: 100 } },
      { type: 'codedeploy', name: 'Deploy-App', position: { x: 500, y: 250 } },
    ],
    relationships: [
      { source: 0, target: 1, type: 'triggers' },
      { source: 1, target: 2, type: 'executes' },
      { source: 2, target: 3, type: 'uploads_to' },
      { source: 1, target: 4, type: 'deploys_with' },
    ]
  },
  {
    id: 'microservices',
    name: 'Microservices on ECS',
    description: 'Container-based microservices with ECS, ALB, and service discovery',
    icon: Server,
    category: 'Containers',
    resources: [
      { type: 'alb', name: 'API-Gateway', position: { x: 100, y: 100 } },
      { type: 'ecs', name: 'User-Service', position: { x: 100, y: 250 } },
      { type: 'ecs', name: 'Order-Service', position: { x: 300, y: 250 } },
      { type: 'ecs', name: 'Payment-Service', position: { x: 500, y: 250 } },
      { type: 'rds', name: 'User-DB', position: { x: 100, y: 400 } },
      { type: 'rds', name: 'Order-DB', position: { x: 300, y: 400 } },
      { type: 'dynamodb', name: 'Payment-Table', position: { x: 500, y: 400 } },
    ],
    relationships: [
      { source: 0, target: 1, type: 'routes_to' },
      { source: 0, target: 2, type: 'routes_to' },
      { source: 0, target: 3, type: 'routes_to' },
      { source: 1, target: 4, type: 'uses' },
      { source: 2, target: 5, type: 'uses' },
      { source: 3, target: 6, type: 'uses' },
    ]
  },
  {
    id: 'data-lake',
    name: 'Data Lake Architecture',
    description: 'S3-based data lake with Glue, Athena, and QuickSight',
    icon: Database,
    category: 'Analytics',
    resources: [
      { type: 's3', name: 'Raw-Data-Lake', position: { x: 100, y: 100 } },
      { type: 's3', name: 'Processed-Data', position: { x: 300, y: 100 } },
      { type: 'lambda', name: 'ETL-Function', position: { x: 200, y: 250 } },
      { type: 'kinesis', name: 'Data-Stream', position: { x: 100, y: 400 } },
    ],
    relationships: [
      { source: 3, target: 0, type: 'streams_to' },
      { source: 0, target: 2, type: 'triggers' },
      { source: 2, target: 1, type: 'writes_to' },
    ]
  },
  {
    id: 'event-driven',
    name: 'Event-Driven Architecture',
    description: 'EventBridge with Lambda, SQS, and SNS for async processing',
    icon: Zap,
    category: 'Serverless',
    resources: [
      { type: 'eventbridge', name: 'Event-Bus', position: { x: 200, y: 100 } },
      { type: 'lambda', name: 'Processor-1', position: { x: 100, y: 250 } },
      { type: 'lambda', name: 'Processor-2', position: { x: 300, y: 250 } },
      { type: 'sqs', name: 'Task-Queue', position: { x: 200, y: 400 } },
      { type: 'sns', name: 'Notification-Topic', position: { x: 400, y: 400 } },
    ],
    relationships: [
      { source: 0, target: 1, type: 'triggers' },
      { source: 0, target: 2, type: 'triggers' },
      { source: 1, target: 3, type: 'sends_to' },
      { source: 2, target: 4, type: 'publishes_to' },
    ]
  },
];

function TemplateLibrary({ isOpen, onClose, onSelectTemplate }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const categories = ['all', ...new Set(ARCHITECTURE_TEMPLATES.map(t => t.category))];
  
  const filteredTemplates = selectedCategory === 'all' 
    ? ARCHITECTURE_TEMPLATES 
    : ARCHITECTURE_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="w-7 h-7" />
              Architecture Templates
            </h3>
            <p className="text-purple-100 mt-1">Start with pre-built architecture patterns</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category === 'all' ? 'All Templates' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const Icon = template.icon;
              const isSelected = selectedTemplate?.id === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`text-left p-5 rounded-lg border-2 transition-all hover:shadow-lg ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-purple-600' : 'bg-purple-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? 'text-white' : 'text-purple-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{template.name}</h4>
                      <span className="text-xs text-purple-600 font-medium">{template.category}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{template.resources.length} resources</span>
                    <span>{template.relationships.length} connections</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedTemplate ? (
              <span className="font-medium text-purple-600">
                Selected: {selectedTemplate.name}
              </span>
            ) : (
              <span>Select a template to get started</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedTemplate
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateLibrary;
