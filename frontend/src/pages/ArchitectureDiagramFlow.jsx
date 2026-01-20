import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Download, X, RefreshCw, Layers, Sparkles, FileImage, FileText, Film, Brain, Network, Eye, Map, Plus, Code, FileCode, DollarSign, AlertTriangle, BookTemplate, Settings, ChevronDown
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import dagre from 'dagre';
import ELK from 'elkjs/lib/elk.bundled.js';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import GIF from 'gif.js';
import ResourcePalette from '../components/ResourcePalette';
import ResourceConfigPanel from '../components/ResourceConfigPanel';
import TemplateLibrary from '../components/TemplateLibrary';
import ValidationPanel from '../components/ValidationPanel';
import { calculateTotalCost, formatCost } from '../utils/costEstimation';
import { generateCloudFormation, generateTerraform } from '../utils/iacExport';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ELK instance for advanced layout
const elk = new ELK();

// Relationship type colors for visual distinction
const RELATIONSHIP_COLORS = {
  deploy_to: '#10B981',      // Green - deployment
  deployed_with: '#10B981',  // Green - deployment
  depends_on: '#F59E0B',     // Orange - dependency
  uses: '#3B82F6',           // Blue - usage
  connects_to: '#8B5CF6',    // Purple - network
  triggers: '#EC4899',       // Pink - event
  streams_to: '#06B6D4',     // Cyan - data flow
  references: '#6B7280',     // Gray - reference
  default: '#94A3B8',        // Slate - fallback
};

const getRelationshipColor = (type) => {
  const normalizedType = type?.toLowerCase().replace(/[^a-z_]/g, '') || 'default';
  return RELATIONSHIP_COLORS[normalizedType] || RELATIONSHIP_COLORS.default;
};

// AWS Service Colors
const AWS_COLORS = {
  compute: '#FF9900',
  database: '#3B48CC',
  storage: '#3F8624',
  networking: '#8C4FFF',
  security: '#DD344C',
  integration: '#E7157B',
  management: '#759C3E',
  container: '#FF9900',
};

const getServiceColor = (type) => {
  const typeMap = {
    ec2: AWS_COLORS.compute,
    instance: AWS_COLORS.compute,
    lambda: AWS_COLORS.compute,
    rds: AWS_COLORS.database,
    aurora: AWS_COLORS.database,
    s3: AWS_COLORS.storage,
    ebs: AWS_COLORS.storage,
    vpc: AWS_COLORS.networking,
    subnet: AWS_COLORS.networking,
    elb: AWS_COLORS.networking,
    alb: AWS_COLORS.networking,
    nlb: AWS_COLORS.networking,
  };
  return typeMap[type?.toLowerCase()] || '#6B7280';
};

const getServiceEmoji = (type) => {
  const emojiMap = {
    ec2: '💻',
    instance: '💻',
    lambda: '⚡',
    rds: '🗄️',
    aurora: '🗄️',
    s3: '🪣',
    ebs: '💾',
    vpc: '🔒',
    subnet: '📦',
    elb: '⚖️',
    alb: '⚖️',
    nlb: '⚖️',
  };
  return emojiMap[type?.toLowerCase()] || '📦';
};

// AWS Service Icon URLs (official AWS architecture icons style)
const AWS_ICONS = {
  ec2: 'https://icon.icepanel.io/AWS/svg/Compute/EC2.svg',
  lambda: 'https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg',
  rds: 'https://icon.icepanel.io/AWS/svg/Database/RDS.svg',
  aurora: 'https://icon.icepanel.io/AWS/svg/Database/Aurora.svg',
  dynamodb: 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg',
  s3: 'https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg',
  ebs: 'https://icon.icepanel.io/AWS/svg/Storage/Elastic-Block-Store.svg',
  efs: 'https://icon.icepanel.io/AWS/svg/Storage/EFS.svg',
  vpc: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/VPC.svg',
  elb: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  alb: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  nlb: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg',
  cloudfront: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/CloudFront.svg',
  route53: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Route-53.svg',
  apigateway: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
  sqs: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg',
  sns: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Notification-Service.svg',
  stepfunctions: 'https://icon.icepanel.io/AWS/svg/App-Integration/Step-Functions.svg',
  eventbridge: 'https://icon.icepanel.io/AWS/svg/App-Integration/EventBridge.svg',
  cognito: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Cognito.svg',
  iam: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/IAM-Identity-Center.svg',
  kms: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Key-Management-Service.svg',
  secretsmanager: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Secrets-Manager.svg',
  waf: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/WAF.svg',
  cloudwatch: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
  cloudtrail: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudTrail.svg',
  cloudformation: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudFormation.svg',
  ecs: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Container-Service.svg',
  eks: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Kubernetes-Service.svg',
  ecr: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Container-Registry.svg',
  fargate: 'https://icon.icepanel.io/AWS/svg/Containers/Fargate.svg',
  codepipeline: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodePipeline.svg',
  codebuild: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodeBuild.svg',
  codecommit: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodeCommit.svg',
  codedeploy: 'https://icon.icepanel.io/AWS/svg/Developer-Tools/CodeDeploy.svg',
  kinesis: 'https://icon.icepanel.io/AWS/svg/Analytics/Kinesis.svg',
  athena: 'https://icon.icepanel.io/AWS/svg/Analytics/Athena.svg',
  redshift: 'https://icon.icepanel.io/AWS/svg/Analytics/Redshift.svg',
  elasticache: 'https://icon.icepanel.io/AWS/svg/Database/ElastiCache.svg',
  amazonmq: 'https://icon.icepanel.io/AWS/svg/App-Integration/MQ.svg',
  default: 'https://icon.icepanel.io/AWS/svg/Compute/EC2.svg',
};

const getAWSIcon = (type) => {
  const normalizedType = type?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'default';
  const externalUrl = AWS_ICONS[normalizedType] || AWS_ICONS.default;
  // Proxy through backend to avoid CORS issues during PNG/PDF export
  return `${API_URL}/api/icons/proxy?url=${encodeURIComponent(externalUrl)}`;
};

const getServiceDisplayName = (type) => {
  const nameMap = {
    ec2: 'Amazon EC2',
    lambda: 'AWS Lambda',
    rds: 'Amazon RDS',
    aurora: 'Amazon Aurora',
    dynamodb: 'Amazon DynamoDB',
    s3: 'Amazon S3',
    ebs: 'Amazon EBS',
    efs: 'Amazon EFS',
    vpc: 'Amazon VPC',
    elb: 'Elastic Load Balancer',
    alb: 'Application LB',
    nlb: 'Network LB',
    cloudfront: 'Amazon CloudFront',
    route53: 'Amazon Route 53',
    apigateway: 'API Gateway',
    sqs: 'Amazon SQS',
    sns: 'Amazon SNS',
    stepfunctions: 'Step Functions',
    eventbridge: 'EventBridge',
    cognito: 'Amazon Cognito',
    iam: 'AWS IAM',
    kms: 'AWS KMS',
    waf: 'AWS WAF',
    cloudwatch: 'CloudWatch',
    cloudtrail: 'CloudTrail',
    cloudformation: 'CloudFormation',
    ecs: 'Amazon ECS',
    eks: 'Amazon EKS',
    ecr: 'Amazon ECR',
    fargate: 'AWS Fargate',
    codepipeline: 'CodePipeline',
    codebuild: 'CodeBuild',
    codecommit: 'CodeCommit',
    codedeploy: 'CodeDeploy',
    kinesis: 'Amazon Kinesis',
    elasticache: 'ElastiCache',
  };
  return nameMap[type?.toLowerCase()] || type?.toUpperCase() || 'Resource';
};

// Custom Node Components - Professional AWS Architecture Style
function ResourceNode({ data, selected }) {
  const color = getServiceColor(data.resource.type);
  const iconUrl = getAWSIcon(data.resource.type);
  const serviceName = getServiceDisplayName(data.resource.type);
  
  return (
    <div className="group relative flex flex-col items-center">
      {/* Connection Handles - visible on hover */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* AWS Icon - Large and prominent */}
      <div 
        className={`w-16 h-16 rounded-lg bg-white shadow-lg border-2 flex items-center justify-center p-2 transition-all duration-200 hover:shadow-xl hover:scale-105 ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        style={{ borderColor: color }}
      >
        <img 
          src={iconUrl} 
          alt={serviceName}
          className="w-12 h-12 object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div 
          className="w-12 h-12 rounded items-center justify-center text-white text-2xl hidden"
          style={{ background: color }}
        >
          {getServiceEmoji(data.resource.type)}
        </div>
      </div>
      
      {/* Service Name Label */}
      <div className="mt-1 text-center max-w-[120px]">
        <div className="font-bold text-[11px] text-gray-800 truncate" title={serviceName}>
          {serviceName}
        </div>
        <div className="text-[9px] text-gray-500 truncate italic" title={data.resource.name}>
          {data.resource.name || data.resource.resource_id?.slice(-12)}
        </div>
      </div>
    </div>
  );
}

function VPCNode({ data }) {
  return (
    <div className="w-full h-full relative">
      {/* VPC Container - Dashed border like official diagrams */}
      <div className="absolute inset-0 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-50/30" />
      
      {/* VPC Header Label */}
      <div className="absolute -top-3 left-4 flex items-center gap-2 bg-white px-2 py-0.5">
        <img 
          src="https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/VPC.svg" 
          alt="VPC" 
          className="w-5 h-5"
        />
        <span className="text-xs font-bold text-emerald-700">VPC</span>
        <span className="text-[10px] text-emerald-600 font-mono">
          {data.name || data.label}
        </span>
      </div>
    </div>
  );
}

function AccountNode({ data }) {
  return (
    <div className="w-full h-full relative">
      {/* AWS Cloud Container - Solid border with cloud styling */}
      <div className="absolute inset-0 rounded-lg border-2 border-gray-400 bg-gray-50/50" />
      
      {/* AWS Cloud Header */}
      <div className="absolute -top-4 left-4 flex items-center gap-2 bg-white px-3 py-1 rounded border border-gray-300">
        <svg className="w-6 h-4" viewBox="0 0 80 50" fill="none">
          <path d="M65 38H20C12 38 5 32 5 24C5 16 12 10 20 10C20 5 26 0 35 0C44 0 52 6 54 14C56 12 60 11 64 12C72 14 78 22 76 30C78 32 80 35 80 38C80 42 77 46 72 46H65V38Z" fill="#252F3E"/>
          <path d="M35 42L25 32H45L35 42Z" fill="#FF9900"/>
        </svg>
        <div>
          <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">AWS Cloud</div>
          <div className="text-[9px] text-gray-500 font-mono">{data.name || data.label}</div>
        </div>
      </div>
    </div>
  );
}

// Region Node for hierarchical display
function RegionNode({ data }) {
  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 rounded border-2 border-dashed border-blue-400 bg-blue-50/20" />
      <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white px-2 py-0.5">
        <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">R</span>
        </div>
        <span className="text-xs font-bold text-blue-700">Region</span>
        <span className="text-[10px] text-blue-600">{data.label}</span>
      </div>
    </div>
  );
}

// Availability Zone Node
function AZNode({ data }) {
  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 rounded border border-dashed border-blue-300 bg-blue-50/10" />
      <div className="absolute -top-2 left-3 bg-white px-2">
        <span className="text-[10px] font-semibold text-blue-600">Availability Zone {data.label}</span>
      </div>
    </div>
  );
}

// Subnet Node - Public (green) or Private (blue)
function SubnetNode({ data }) {
  const isPublic = data.isPublic || data.label?.toLowerCase().includes('public');
  const borderColor = isPublic ? 'border-green-500' : 'border-blue-500';
  const bgColor = isPublic ? 'bg-green-50/40' : 'bg-blue-50/40';
  const textColor = isPublic ? 'text-green-700' : 'text-blue-700';
  const labelBg = isPublic ? 'bg-green-500' : 'bg-blue-500';
  
  return (
    <div className="w-full h-full relative">
      <div className={`absolute inset-0 rounded border-2 ${borderColor} ${bgColor}`} />
      <div className="absolute -top-2 left-3 flex items-center gap-1">
        <div className={`${labelBg} px-2 py-0.5 rounded-sm`}>
          <span className="text-[9px] font-bold text-white">
            {isPublic ? 'Public subnet' : 'Private subnet'}
          </span>
        </div>
        {data.label && (
          <span className={`text-[9px] ${textColor} bg-white px-1`}>{data.label}</span>
        )}
      </div>
    </div>
  );
}

function ArchitectureDiagramFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();
  
  const [resources, setResources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [showResourcePalette, setShowResourcePalette] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('cloudformation');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configResource, setConfigResource] = useState(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  // Dropdown menu states
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showEdgeEditModal, setShowEdgeEditModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuNode, setContextMenuNode] = useState(null);
  const [hiddenNodes, setHiddenNodes] = useState(new Set());

  const saveNodePositions = useCallback((nodes) => {
    try {
      const positions = {};
      nodes.forEach(node => {
        if (node.type === 'resource') {
          positions[node.id] = { x: node.position.x, y: node.position.y };
        }
      });
      localStorage.setItem('diagram_node_positions', JSON.stringify(positions));
      setSavedPositions(positions);
      console.log('Saved positions for', Object.keys(positions).length, 'nodes');
    } catch (error) {
      console.error('Failed to save positions:', error);
    }
  }, []);

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    
    const positionChange = changes.find(c => c.type === 'position' && c.dragging === false);
    if (positionChange) {
      setNodes(currentNodes => {
        saveNodePositions(currentNodes);
        return currentNodes;
      });
    }
  }, [onNodesChange, saveNodePositions, setNodes]);
  
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [newRelationshipData, setNewRelationshipData] = useState(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedPositions, setSavedPositions] = useState({});
  const [previousPositions, setPreviousPositions] = useState(null);
  
  // Filters - using Set for unchecked items (inverse logic - all checked by default)
  const [uncheckedAccounts, setUncheckedAccounts] = useState(new Set());
  const [uncheckedVPCs, setUncheckedVPCs] = useState(new Set());
  const [uncheckedTypes, setUncheckedTypes] = useState(new Set());
  const [uncheckedRelTypes, setUncheckedRelTypes] = useState(new Set());
  const [showAccountFilter, setShowAccountFilter] = useState(false);
  const [showVPCFilter, setShowVPCFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showRelTypeFilter, setShowRelTypeFilter] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);
  const [layoutProgress, setLayoutProgress] = useState('');
  const [useFlatLayout, setUseFlatLayout] = useState(() => {
    return localStorage.getItem('diagram_flat_layout') === 'true';
  });
  const [showLegend, setShowLegend] = useState(() => {
    return localStorage.getItem('diagram_show_legend') !== 'false';
  });
  const [showMinimap, setShowMinimap] = useState(() => {
    return localStorage.getItem('diagram_show_minimap') !== 'false';
  });
  
  // Get unique values for filters
  const accounts = useMemo(() => {
    const accountSet = new Set(resources.map(r => r.account_id).filter(Boolean));
    return Array.from(accountSet);
  }, [resources]);
  
  // VPCs filtered by selected accounts (cascading)
  const vpcs = useMemo(() => {
    const visibleAccounts = accounts.filter(acc => !uncheckedAccounts.has(acc));
    const vpcSet = new Set(
      resources
        .filter(r => visibleAccounts.includes(r.account_id))
        .map(r => r.vpc_id)
        .filter(Boolean)
    );
    return Array.from(vpcSet);
  }, [resources, accounts, uncheckedAccounts]);
  
  // Types filtered by selected accounts and VPCs (cascading)
  // Static list of all AWS resource types (always visible in filter)
  const types = useMemo(() => {
    return [
      'ec2', 'rds', 'aurora', 'lambda', 's3', 'dynamodb', 'elasticache',
      'elb', 'alb', 'nlb', 'vpc', 'subnet', 'internet-gateway', 'nat-gateway',
      'ecs', 'eks', 'ecr', 'fargate',
      'sns', 'sqs', 'apigateway', 'eventbridge', 'stepfunctions',
      'cloudfront', 'route53', 'waf',
      'cognito', 'iam', 'kms', 'secretsmanager',
      'cloudwatch', 'cloudtrail', 'cloudformation',
      'codepipeline', 'codebuild', 'codecommit', 'codedeploy',
      'kinesis', 'athena', 'redshift',
      'amazonmq', 'ebs', 'efs'
    ];
  }, []);
  
  // Filtered resources - show all except unchecked items
  const filteredResources = useMemo(() => {
    // Count resources by type
    const typeCounts = {};
    resources.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    
    // Count resources with/without VPC
    const withVpc = resources.filter(r => r.vpc_id).length;
    const withoutVpc = resources.filter(r => !r.vpc_id).length;
    
    const filtered = resources.filter(r => {
      if (uncheckedAccounts.has(r.account_id)) return false;
      // Only filter by VPC if resource HAS a VPC (don't filter global services like S3, CodePipeline, etc.)
      if (r.vpc_id && uncheckedVPCs.has(r.vpc_id)) return false;
      if (uncheckedTypes.has(r.type)) return false;
      return true;
    });
    
    console.log(`📊 Total resources in DB: ${resources.length}`);
    console.log(`   - With VPC: ${withVpc}, Without VPC: ${withoutVpc}`);
    console.log(`   - Resource types:`, typeCounts);
    console.log(`🔍 Filter results: ${filtered.length}/${resources.length} resources visible`);
    console.log(`   - Unchecked accounts: ${uncheckedAccounts.size}`, Array.from(uncheckedAccounts));
    console.log(`   - Unchecked VPCs: ${uncheckedVPCs.size}`, Array.from(uncheckedVPCs));
    console.log(`   - Unchecked types: ${uncheckedTypes.size}`, Array.from(uncheckedTypes));
    
    return filtered;
  }, [resources, uncheckedAccounts, uncheckedVPCs, uncheckedTypes]);

  // Get unique relationship types for filtering
  const relationshipTypes = useMemo(() => {
    const typeSet = new Set(relationships.map(r => r.relationship_type).filter(Boolean));
    return Array.from(typeSet);
  }, [relationships]);

  // Filtered relationships based on type filter
  const filteredRelationships = useMemo(() => {
    return relationships.filter(r => !uncheckedRelTypes.has(r.relationship_type));
  }, [relationships, uncheckedRelTypes]);

  useEffect(() => {
    // FORCE CLEAR ALL FILTERS ON MOUNT - Show all resources by default
    console.log('🔄 DIAGRAM VERSION 2.0 - ALL FILTERS CLEARED ON MOUNT');
    setUncheckedAccounts(new Set());
    setUncheckedVPCs(new Set());
    setUncheckedTypes(new Set());
    setUncheckedRelTypes(new Set());
    
    fetchResources();
    fetchRelationships();
    loadSavedPositions();
  }, []);

  const loadSavedPositions = () => {
    try {
      const saved = localStorage.getItem('diagram_node_positions');
      if (saved) {
        setSavedPositions(JSON.parse(saved));
        console.log('Loaded saved positions:', JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved positions:', error);
    }
  };

  const resetLayout = useCallback(() => {
    if (confirm('Reset to default hierarchical view? This will clear all saved positions.')) {
      localStorage.removeItem('diagram_node_positions');
      localStorage.removeItem('diagram_previous_positions');
      localStorage.removeItem('diagram_flat_layout');
      setSavedPositions({});
      window.location.reload();
    }
  }, []);

  const applyAISuggestedLayout = (resourceNodes, relationships, aiSuggestions) => {
    const newPositions = {};
    
    // Get list of connected resource IDs from AI suggestions
    const connectedIds = new Set(aiSuggestions.nodes?.map(n => n.id) || []);
    
    console.log(`📊 AI Layout: ${connectedIds.size} connected resources, ${resourceNodes.length - connectedIds.size} isolated`);
    
    // Only layout resources that have relationships
    const connectedNodes = resourceNodes.filter(n => connectedIds.has(n.id));
    
    if (connectedNodes.length === 0) {
      console.log('⚠️ No connected resources to layout');
      return newPositions;
    }
    
    // Group connected nodes by parent
    const parentGroups = {};
    connectedNodes.forEach(node => {
      const parentId = node.parentNode || 'root';
      if (!parentGroups[parentId]) {
        parentGroups[parentId] = [];
      }
      parentGroups[parentId].push(node);
    });

    // Apply AI groupings within each parent
    Object.entries(parentGroups).forEach(([parentId, groupNodes]) => {
      if (groupNodes.length === 0) return;

      const subGraph = new dagre.graphlib.Graph();
      subGraph.setDefaultEdgeLabel(() => ({}));
      
      // Use AI-suggested layout direction and spacing
      const layoutConfig = aiSuggestions.layout_config || {};
      subGraph.setGraph({ 
        rankdir: layoutConfig.direction || 'LR',
        nodesep: layoutConfig.node_spacing || 50,
        ranksep: layoutConfig.rank_spacing || 100,
        edgesep: 30,
        marginx: 20,
        marginy: 20
      });

      // Add nodes with AI-suggested ranks
      groupNodes.forEach(node => {
        const aiNode = aiSuggestions.nodes?.find(n => n.id === node.id);
        subGraph.setNode(node.id, { 
          width: 90, 
          height: 70,
          rank: aiNode?.rank || 0
        });
      });

      // Add edges with AI-suggested weights
      const groupNodeIds = new Set(groupNodes.map(n => n.id));
      relationships.forEach(rel => {
        const sourceId = rel.source_resource_id.toString();
        const targetId = rel.target_resource_id.toString();
        if (groupNodeIds.has(sourceId) && groupNodeIds.has(targetId)) {
          const aiEdge = aiSuggestions.edges?.find(e => 
            e.source === sourceId && e.target === targetId
          );
          subGraph.setEdge(sourceId, targetId, {
            weight: aiEdge?.weight || 1
          });
        }
      });

      dagre.layout(subGraph);

      // Apply positions for connected nodes only
      groupNodes.forEach(node => {
        const nodeWithPosition = subGraph.node(node.id);
        if (nodeWithPosition) {
          newPositions[node.id] = {
            x: nodeWithPosition.x - 45,
            y: nodeWithPosition.y - 35
          };
        }
      });
    });

    console.log(`✅ Positioned ${Object.keys(newPositions).length} connected resources`);
    return newPositions;
  };

  const applyAILayout = useCallback(async () => {
    if (nodes.length === 0 || relationships.length === 0) {
      alert('No relationships found. AI layout works best when resources have connections.');
      return;
    }

    setIsLayoutLoading(true);
    setLayoutProgress('🤖 Preparing data for AI analysis...');

    try {
      // Save current positions for undo
      setPreviousPositions({...savedPositions});

      const resourceNodes = nodes.filter(n => n.type === 'resource');
      
      setLayoutProgress(`🤖 Analyzing ${resourceNodes.length} resources with Ollama qwen2.5...`);
      
      // Prepare data for AI analysis
      const layoutData = {
        resources: resourceNodes.map(n => ({
          id: n.id,
          name: n.data.resource.name,
          type: n.data.resource.type,
          parent: n.parentNode
        })),
        relationships: relationships.map(r => ({
          source: r.source_resource_id.toString(),
          target: r.target_resource_id.toString(),
          type: r.relationship_type
        }))
      };

      setLayoutProgress('🤖 Waiting for AI response (may take 10-30 seconds)...');
      
      const response = await axios.post(`${API_URL}/api/ai/analyze-layout`, layoutData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        timeout: 300000 // 5 minute timeout for qwen2.5
      });

      setLayoutProgress('🤖 Processing AI suggestions...');
      
      const aiSuggestions = response.data;
      console.log('AI Layout Suggestions:', aiSuggestions);

      setLayoutProgress('📐 Applying AI-suggested layout...');
      
      // Apply AI-suggested groupings
      const newPositions = applyAISuggestedLayout(resourceNodes, relationships, aiSuggestions);
      
      // Save positions and enable flat layout mode
      localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
      localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
      localStorage.setItem('diagram_flat_layout', 'true');
      setSavedPositions(newPositions);
      
      setLayoutProgress('✅ Layout complete! Refreshing...');
      await new Promise(r => setTimeout(r, 500));
      
      window.location.reload();
    } catch (error) {
      console.error('AI layout failed:', error);
      const errorMsg = error.code === 'ECONNABORTED' 
        ? 'AI service timeout - Ollama may not be running or is overloaded.\n\nTry: AWS Layout button instead.'
        : 'AI layout failed: ' + (error.response?.data?.detail || error.message);
      alert(errorMsg);
    } finally {
      setIsLayoutLoading(false);
      setLayoutProgress('');
    }
  }, [nodes, relationships, savedPositions]);

  // ELK-based layout that minimizes edge crossings
  const applyELKLayout = useCallback(async () => {
    if (nodes.length === 0) {
      alert('No nodes to layout.');
      return;
    }

    setIsLayoutLoading(true);
    setLayoutProgress('🔄 Preparing ELK layout engine...');

    try {
      // Save current positions for undo
      setPreviousPositions({...savedPositions});

      const resourceNodes = nodes.filter(n => n.type === 'resource');
      
      setLayoutProgress(`🔄 Building graph with ${resourceNodes.length} nodes...`);
      await new Promise(r => setTimeout(r, 100));
      
      // Build ELK graph structure
      const elkGraph = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '100',
          'elk.layered.spacing.nodeNodeBetweenLayers': '150',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.layered.mergeEdges': 'true',
          'elk.layered.mergeHierarchyEdges': 'true',
        },
        children: resourceNodes.map(node => ({
          id: node.id,
          width: 140,
          height: 100,
        })),
        edges: relationships.map(rel => ({
          id: `elk-edge-${rel.id}`,
          sources: [rel.source_resource_id.toString()],
          targets: [rel.target_resource_id.toString()],
        })),
      };

      setLayoutProgress('🔄 Running ELK crossing minimization algorithm...');
      const layoutedGraph = await elk.layout(elkGraph);
      
      setLayoutProgress('📐 Applying optimized positions...');
      
      const newPositions = {};
      layoutedGraph.children?.forEach(node => {
        newPositions[node.id] = { x: node.x || 0, y: node.y || 0 };
      });

      console.log(`✅ ELK positioned ${Object.keys(newPositions).length} nodes`);
      
      // Save positions and enable flat layout mode
      localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
      localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
      localStorage.setItem('diagram_flat_layout', 'true');
      setSavedPositions(newPositions);
      
      setLayoutProgress('✅ Layout complete! Refreshing...');
      await new Promise(r => setTimeout(r, 300));
      
      window.location.reload();
    } catch (error) {
      console.error('ELK layout failed:', error);
      alert('ELK layout failed: ' + error.message);
    } finally {
      setIsLayoutLoading(false);
      setLayoutProgress('');
    }
  }, [nodes, relationships, savedPositions]);

  // Professional AWS Architecture Layout - Aggressively fills full screen
  const applyAutoLayout = useCallback(async () => {
    if (filteredResources.length === 0) {
      alert('No resources to layout.');
      return;
    }

    setIsLayoutLoading(true);
    setLayoutProgress('Analyzing resources...');

    try {
      // Save current positions for undo
      setPreviousPositions({...savedPositions});

      // Filter out container types
      const containerTypes = ['vpc', 'subnet', 'internet-gateway', 'nat-gateway', 'route-table', 'network-acl'];
      const actualResources = filteredResources.filter(r => 
        !containerTypes.includes(r.type?.toLowerCase())
      );

      const resourceCount = actualResources.length;
      if (resourceCount === 0) {
        alert('No resources to layout after filtering containers.');
        setIsLayoutLoading(false);
        return;
      }

      setLayoutProgress(`Optimizing layout for ${resourceCount} resources...`);
      await new Promise(r => setTimeout(r, 100));

      // ========== AGGRESSIVE FULL-SCREEN LAYOUT ==========
      // Calculate available viewport space
      const VIEWPORT_W = Math.max(2000, window.innerWidth * 1.5);
      const VIEWPORT_H = Math.max(1200, window.innerHeight * 1.2);
      const PADDING = 100;
      
      // Node dimensions
      const NODE_W = 160;
      const NODE_H = 120;
      
      // Calculate optimal grid dimensions
      // Goal: Fill the screen with evenly distributed resources
      const availableW = VIEWPORT_W - (PADDING * 2);
      const availableH = VIEWPORT_H - (PADDING * 2);
      
      // Calculate optimal columns and rows to fill screen
      const aspectRatio = availableW / availableH;
      let cols = Math.ceil(Math.sqrt(resourceCount * aspectRatio));
      let rows = Math.ceil(resourceCount / cols);
      
      // Ensure minimum spread
      cols = Math.max(cols, Math.min(resourceCount, 6));
      rows = Math.max(rows, Math.ceil(resourceCount / cols));
      
      // Calculate spacing to fill available space
      const cellW = availableW / cols;
      const cellH = availableH / rows;
      
      // Ensure minimum cell size
      const finalCellW = Math.max(cellW, NODE_W + 60);
      const finalCellH = Math.max(cellH, NODE_H + 80);

      setLayoutProgress('Classifying by service tier...');
      await new Promise(r => setTimeout(r, 100));

      // AWS Service Tier Classification for left-to-right flow
      const SERVICE_TIERS = {
        entry: ['cloudfront', 'apigateway', 'api-gateway', 'route53', 'waf', 'shield', 'acm', 'amplify', 'elb', 'alb', 'nlb'],
        compute: ['ec2', 'lambda', 'ecs', 'eks', 'fargate', 'batch', 'lightsail', 'beanstalk', 'apprunner'],
        application: ['sqs', 'sns', 'eventbridge', 'stepfunctions', 'step-functions', 'mq', 'kinesis', 'appsync', 'cognito'],
        data: ['rds', 'aurora', 'dynamodb', 'elasticache', 'redis', 'memcached', 'neptune', 'documentdb', 'timestream', 'keyspaces', 'redshift'],
        storage: ['s3', 'ebs', 'efs', 'fsx', 'glacier', 'backup', 'storagegateway'],
        operations: ['cloudwatch', 'cloudtrail', 'config', 'guardduty', 'inspector', 'securityhub', 'iam', 'kms', 'secrets', 'ssm', 'codepipeline', 'codebuild', 'codecommit', 'codedeploy', 'ecr'],
      };

      const TIER_ORDER = ['entry', 'compute', 'application', 'data', 'storage', 'operations'];

      const classifyResource = (resource) => {
        const type = (resource.type || '').toLowerCase();
        const name = (resource.name || '').toLowerCase();
        for (const [tier, keywords] of Object.entries(SERVICE_TIERS)) {
          if (keywords.some(kw => type.includes(kw) || name.includes(kw))) {
            return tier;
          }
        }
        return 'compute';
      };

      // Sort resources by tier for left-to-right data flow
      const sortedResources = [...actualResources].sort((a, b) => {
        const tierA = TIER_ORDER.indexOf(classifyResource(a));
        const tierB = TIER_ORDER.indexOf(classifyResource(b));
        return tierA - tierB;
      });

      setLayoutProgress('Distributing across viewport...');
      await new Promise(r => setTimeout(r, 100));

      const newPositions = {};

      // Position resources in a grid that fills the screen
      sortedResources.forEach((resource, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        
        // Center node within cell
        const x = PADDING + col * finalCellW + (finalCellW - NODE_W) / 2;
        const y = PADDING + row * finalCellH + (finalCellH - NODE_H) / 2;
        
        newPositions[resource.id.toString()] = { x, y };
      });

      setLayoutProgress('Applying layout...');
      await new Promise(r => setTimeout(r, 100));

      console.log(`✅ AWS Layout: ${resourceCount} resources in ${cols}x${rows} grid (cell: ${Math.round(finalCellW)}x${Math.round(finalCellH)}px)`);

      // Save positions and enable flat layout mode
      localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
      localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
      localStorage.setItem('diagram_flat_layout', 'true');
      setSavedPositions(newPositions);
      
      window.location.reload();
    } catch (error) {
      console.error('Layout failed:', error);
      alert('Layout failed: ' + error.message);
    } finally {
      setIsLayoutLoading(false);
      setLayoutProgress('');
    }
  }, [filteredResources, savedPositions]);

  const undoAutoLayout = useCallback(() => {
    const previous = localStorage.getItem('diagram_previous_positions');
    if (!previous) {
      alert('No previous layout to restore.');
      return;
    }

    if (confirm('Restore previous layout?')) {
      localStorage.setItem('diagram_node_positions', previous);
      localStorage.removeItem('diagram_previous_positions');
      localStorage.removeItem('diagram_flat_layout');
      window.location.reload();
    }
  }, []);

  const exportAsPNG = useCallback(() => {
    const diagramElement = document.querySelector('.react-flow');
    if (!diagramElement) {
      alert('Diagram not found');
      return;
    }

    toPng(diagramElement, {
      cacheBust: true,
      backgroundColor: '#f9fafb',
      width: diagramElement.offsetWidth,
      height: diagramElement.offsetHeight,
      skipFonts: true,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `architecture-diagram-${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export PNG:', err);
        alert('Failed to export diagram as PNG');
      });
  }, []);

  const exportAsPDF = useCallback(() => {
    const diagramElement = document.querySelector('.react-flow');
    if (!diagramElement) {
      alert('Diagram not found');
      return;
    }

    toPng(diagramElement, {
      cacheBust: true,
      backgroundColor: '#f9fafb',
      width: diagramElement.offsetWidth,
      height: diagramElement.offsetHeight,
      skipFonts: true,
    })
      .then((dataUrl) => {
        try {
          const imgWidth = diagramElement.offsetWidth;
          const imgHeight = diagramElement.offsetHeight;
          
          const pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [imgWidth, imgHeight]
          });
          
          pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`architecture-diagram-${new Date().toISOString().split('T')[0]}.pdf`);
          console.log('PDF exported successfully');
        } catch (error) {
          console.error('PDF generation error:', error);
          alert('Failed to generate PDF: ' + error.message);
        }
      })
      .catch((err) => {
        console.error('Failed to export PDF:', err);
        alert('Failed to export diagram as PDF: ' + err.message);
      });
  }, []);

  const exportAsGIF = useCallback(() => {
    const diagramElement = document.querySelector('.react-flow');
    if (!diagramElement) {
      alert('Diagram not found');
      return;
    }

    alert('Creating animated GIF... This may take a few seconds.');

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: diagramElement.offsetWidth,
      height: diagramElement.offsetHeight,
      workerScript: '/node_modules/gif.js/dist/gif.worker.js'
    });

    let frameCount = 0;
    const maxFrames = 30;
    const captureInterval = 100;

    const captureFrame = () => {
      toPng(diagramElement, {
        cacheBust: true,
        backgroundColor: '#f9fafb',
        width: diagramElement.offsetWidth,
        height: diagramElement.offsetHeight,
        skipFonts: true,
      })
        .then((dataUrl) => {
          const img = new Image();
          img.onload = () => {
            gif.addFrame(img, { delay: 200 });
            frameCount++;

            if (frameCount < maxFrames) {
              setTimeout(captureFrame, captureInterval);
            } else {
              gif.on('finished', (blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `architecture-diagram-${new Date().toISOString().split('T')[0]}.gif`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                alert('GIF exported successfully!');
              });
              gif.render();
            }
          };
          img.src = dataUrl;
        })
        .catch((err) => {
          console.error('Failed to capture frame:', err);
        });
    };

    captureFrame();
  }, []);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/api/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`📊 Fetched ${response.data.length} total resources from database`);
      setResources(response.data);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      alert(`Failed to fetch resources: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationships = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No auth token found, skipping relationships fetch');
        navigate('/login');
        return;
      }
      const response = await axios.get(`${API_URL}/api/relationships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRelationships(response.data || []);
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('access_token');
        navigate('/login');
        return;
      }
      setRelationships([]);
    }
  };

  // Convert resources to React Flow nodes - supports both hierarchical and flat layout modes
  useEffect(() => {
    if (filteredResources.length === 0) {
      setNodes([]);
      return;
    }

    const flowNodes = [];
    
    // Filter out container-type resources (VPC, subnet, etc.) - they are containers, not resources
    const containerTypes = ['vpc', 'subnet', 'internet-gateway', 'nat-gateway', 'route-table', 'network-acl'];
    const actualResources = filteredResources.filter(r => 
      !containerTypes.includes(r.type?.toLowerCase())
    );

    // FLAT LAYOUT MODE: Clean positioning with container backgrounds
    if (useFlatLayout && Object.keys(savedPositions).length > 0) {
      console.log('📐 Using flat layout mode with saved positions');
      
      // Group resources to calculate container boundaries
      const accountGroups = {};
      actualResources.forEach(resource => {
        const accountId = resource.account_id || 'unknown';
        const vpcId = resource.vpc_id || 'no-vpc';
        if (!accountGroups[accountId]) accountGroups[accountId] = {};
        if (!accountGroups[accountId][vpcId]) accountGroups[accountId][vpcId] = [];
        accountGroups[accountId][vpcId].push(resource);
      });

      // Calculate bounding boxes for containers based on resource positions
      Object.entries(accountGroups).forEach(([accountId, vpcs]) => {
        let accountMinX = Infinity, accountMinY = Infinity;
        let accountMaxX = 0, accountMaxY = 0;
        
        Object.entries(vpcs).forEach(([vpcId, vpcResources]) => {
          let vpcMinX = Infinity, vpcMinY = Infinity;
          let vpcMaxX = 0, vpcMaxY = 0;
          
          vpcResources.forEach(resource => {
            const pos = savedPositions[resource.id.toString()] || { x: 100, y: 100 };
            vpcMinX = Math.min(vpcMinX, pos.x);
            vpcMinY = Math.min(vpcMinY, pos.y);
            vpcMaxX = Math.max(vpcMaxX, pos.x + 160);
            vpcMaxY = Math.max(vpcMaxY, pos.y + 120);
          });
          
          // Add VPC container with padding
          if (vpcId !== 'no-vpc' && vpcResources.length > 0) {
            const vpcName = vpcResources[0]?.vpc_name || '';
            flowNodes.push({
              id: `vpc-${vpcId}`,
              type: 'vpc',
              position: { x: vpcMinX - 30, y: vpcMinY - 50 },
              data: { label: vpcId, name: vpcName },
              style: {
                width: Math.max(200, vpcMaxX - vpcMinX + 60),
                height: Math.max(150, vpcMaxY - vpcMinY + 80),
                zIndex: 1,
              },
              draggable: false,
            });
          }
          
          accountMinX = Math.min(accountMinX, vpcMinX - 30);
          accountMinY = Math.min(accountMinY, vpcMinY - 50);
          accountMaxX = Math.max(accountMaxX, vpcMaxX + 30);
          accountMaxY = Math.max(accountMaxY, vpcMaxY + 30);
        });
        
        // Add Account container with padding
        const accountName = Object.values(vpcs).flat()[0]?.account_name || '';
        flowNodes.push({
          id: `account-${accountId}`,
          type: 'account',
          position: { x: accountMinX - 40, y: accountMinY - 60 },
          data: { label: accountId, name: accountName },
          style: {
            width: Math.max(300, accountMaxX - accountMinX + 80),
            height: Math.max(200, accountMaxY - accountMinY + 100),
            zIndex: 0,
          },
          draggable: false,
        });
      });

      // Add resource nodes (on top of containers)
      actualResources.forEach((resource) => {
        const resourceId = resource.id.toString();
        const pos = savedPositions[resourceId] || { x: 100, y: 100 };
        
        flowNodes.push({
          id: resourceId,
          type: 'resource',
          position: pos,
          data: { resource },
          style: { zIndex: 10 },
        });
      });
      
      setNodes(flowNodes);
      return;
    }
    
    // HIERARCHICAL MODE: Nested containers (Account → VPC → Resources)
    const accountGroups = {};
    
    // Group resources by account and VPC
    actualResources.forEach(resource => {
      const accountId = resource.account_id || 'unknown';
      const vpcId = resource.vpc_id || 'no-vpc';
      
      if (!accountGroups[accountId]) {
        accountGroups[accountId] = {};
      }
      if (!accountGroups[accountId][vpcId]) {
        accountGroups[accountId][vpcId] = [];
      }
      accountGroups[accountId][vpcId].push(resource);
    });
    
    let accountX = 40;
    const accountY = 40;
    
    // CRITICAL: Add parent nodes FIRST, then children
    Object.entries(accountGroups).forEach(([accountId, vpcs]) => {
      let maxAccountWidth = 0;
      let vpcY = 120; // Relative to account
      
      // First pass: Add Account container
      const accountNodeId = `account-${accountId}`;
      
      // Second pass: Calculate dimensions and add VPC containers
      Object.entries(vpcs).forEach(([vpcId, vpcResources]) => {
        const resourcesPerRow = 5;
        const resourceWidth = 160;
        const resourceHeight = 140;
        const resourceGap = 20;
        
        // Calculate VPC dimensions
        const rows = Math.ceil(vpcResources.length / resourcesPerRow);
        const vpcWidth = Math.max(900, resourcesPerRow * resourceWidth + (resourcesPerRow + 1) * resourceGap);
        const vpcHeight = Math.max(400, rows * resourceHeight + (rows + 1) * resourceGap + 80);
        
        // Add VPC container node (child of account)
        if (vpcId !== 'no-vpc') {
          const vpcNodeId = `vpc-${vpcId}`;
          // Try to find VPC name from resources
          const vpcName = vpcResources[0]?.vpc_name || '';
          flowNodes.push({
            id: vpcNodeId,
            type: 'vpc',
            position: { x: 60, y: vpcY }, // Relative to account
            data: { label: vpcId, name: vpcName },
            style: {
              width: vpcWidth,
              height: vpcHeight,
              zIndex: 1,
            },
            parentNode: accountNodeId,
            extent: 'parent',
            draggable: false,
          });
          
          // Add resource nodes inside VPC (children of VPC)
          vpcResources.forEach((resource, idx) => {
            const col = idx % resourcesPerRow;
            const row = Math.floor(idx / resourcesPerRow);
            
            const resourceId = resource.id.toString();
            const defaultPosition = {
              x: resourceGap + col * (resourceWidth + resourceGap),
              y: 70 + row * (resourceHeight + resourceGap), // Relative to VPC
            };
            
            flowNodes.push({
              id: resourceId,
              type: 'resource',
              position: defaultPosition,
              data: { resource },
              parentNode: vpcNodeId,
              extent: 'parent',
              style: {
                zIndex: 10,
              },
            });
          });
        } else {
          // Resources without VPC (direct children of account)
          vpcResources.forEach((resource, idx) => {
            const col = idx % resourcesPerRow;
            const row = Math.floor(idx / resourcesPerRow);
            
            const resourceId = resource.id.toString();
            const defaultPosition = {
              x: 80 + resourceGap + col * (resourceWidth + resourceGap),
              y: vpcY + row * (resourceHeight + resourceGap),
            };
            
            flowNodes.push({
              id: resourceId,
              type: 'resource',
              position: defaultPosition,
              data: { resource },
              parentNode: accountNodeId,
              extent: 'parent',
              style: {
                zIndex: 10,
              },
            });
          });
        }
        
        vpcY += vpcHeight + 40;
        maxAccountWidth = Math.max(maxAccountWidth, vpcWidth);
      });
      
      // Add Account container node FIRST (before children are added)
      // Try to find account name from resources
      const accountName = Object.values(vpcs).flat()[0]?.account_name || '';
      flowNodes.unshift({
        id: accountNodeId,
        type: 'account',
        position: { x: accountX, y: accountY },
        data: { label: accountId, name: accountName },
        style: {
          width: maxAccountWidth + 120,
          height: vpcY + 30,
          zIndex: 0,
        },
        draggable: false,
      });
      
      accountX += maxAccountWidth + 160; // Move to the right for next account
    });

    setNodes(flowNodes);
  }, [filteredResources, setNodes, savedPositions, useFlatLayout]);

  // Filter out hidden nodes
  const visibleNodes = useMemo(() => {
    return nodes.filter(node => !hiddenNodes.has(node.id));
  }, [nodes, hiddenNodes]);
  
  // Convert relationships to React Flow edges with enhanced styling
  useEffect(() => {
    if (filteredRelationships.length === 0) {
      console.log('⚠️ No relationships to create edges');
      setEdges([]);
      return;
    }

    console.log(`🔗 Creating edges for ${filteredRelationships.length} relationships`);
    
    // Get all current node IDs for validation
    const nodeIds = new Set(nodes.map(n => n.id));
    console.log(`📦 Available node IDs:`, Array.from(nodeIds).slice(0, 10), '...');

    // Get connected node IDs for highlighting
    const connectedToHighlighted = new Set();
    if (highlightedNode) {
      filteredRelationships.forEach(rel => {
        const src = rel.source_resource_id.toString();
        const tgt = rel.target_resource_id.toString();
        if (src === highlightedNode || tgt === highlightedNode) {
          connectedToHighlighted.add(src);
          connectedToHighlighted.add(tgt);
        }
      });
    }

    // Filter to only relationships where both nodes exist
    const validRelationships = filteredRelationships.filter(rel => {
      const sourceId = rel.source_resource_id.toString();
      const targetId = rel.target_resource_id.toString();
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    const flowEdges = validRelationships.map((rel, index) => {
      const sourceId = rel.source_resource_id.toString();
      const targetId = rel.target_resource_id.toString();
      const relType = rel.relationship_type || 'default';
      const edgeColor = getRelationshipColor(relType);
      const flowNumber = index + 1;

      // Highlight edges connected to highlighted node
      const isHighlighted = highlightedNode && (sourceId === highlightedNode || targetId === highlightedNode);
      const isDimmed = highlightedNode && !isHighlighted;

      return {
        id: `edge-${rel.id}`,
        source: sourceId,
        target: targetId,
        // Show flow number in circle like AWS diagrams
        label: `${flowNumber}`,
        type: 'smoothstep',
        animated: true,
        selectable: true,
        focusable: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted ? '#000000' : (isDimmed ? '#E5E7EB' : '#374151'),
          width: 12,
          height: 12,
        },
        style: {
          stroke: isHighlighted ? '#000000' : (isDimmed ? '#E5E7EB' : '#374151'),
          strokeWidth: isHighlighted ? 3 : 2,
          opacity: isDimmed ? 0.15 : 1,
        },
        interactionWidth: 20,
        labelStyle: {
          fill: '#FFFFFF',
          fontWeight: 700,
          fontSize: 10,
        },
        labelBgStyle: {
          fill: isHighlighted ? '#FF9900' : (isDimmed ? '#D1D5DB' : '#FF9900'),
          fillOpacity: 1,
        },
        labelBgPadding: [6, 6],
        labelBgBorderRadius: 50,
        data: {
          relationshipId: rel.id,
          relationship_type: rel.relationship_type,
          direction: rel.direction,
          label: rel.label,
        },
      };
    });

    console.log(`✅ Created ${flowEdges.length} edges`);
    console.log('Sample edges:', flowEdges.slice(0, 3));
    setEdges(flowEdges);
  }, [filteredRelationships, nodes, highlightedNode]);

  // Calculate cost estimation
  useEffect(() => {
    const cost = calculateTotalCost(filteredResources);
    setEstimatedCost(cost);
  }, [filteredResources]);

  // Handle saving configured resource
  const handleSaveResource = async (resourceData) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/resources`,
        resourceData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add to diagram
      const newNode = {
        id: response.data.id.toString(),
        type: 'resource',
        position: configResource.position,
        data: { resource: response.data },
      };
      
      setNodes((nds) => nds.concat(newNode));
      setShowConfigPanel(false);
      setConfigResource(null);
      
      // Refresh resources
      fetchResources();
    } catch (error) {
      console.error('Failed to save resource:', error);
      alert('Failed to save resource: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Handle applying template
  const handleApplyTemplate = async (template) => {
    try {
      const token = localStorage.getItem('access_token');
      const createdResources = [];
      
      // Create all resources
      for (const templateResource of template.resources) {
        const resourceData = {
          name: templateResource.name,
          type: templateResource.type,
          environment: 'development',
          region: 'us-east-1',
          tags: { Template: template.name },
        };
        
        const response = await axios.post(
          `${API_URL}/api/resources`,
          resourceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        createdResources.push({
          ...response.data,
          position: templateResource.position,
        });
      }
      
      // Create relationships
      for (const rel of template.relationships) {
        const sourceId = createdResources[rel.source].id;
        const targetId = createdResources[rel.target].id;
        
        await axios.post(
          `${API_URL}/api/relationships`,
          {
            source_resource_id: sourceId,
            target_resource_id: targetId,
            relationship_type: rel.type,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Refresh diagram
      await fetchResources();
      await fetchRelationships();
      
      alert(`✅ Template "${template.name}" applied successfully!\n\nCreated ${createdResources.length} resources and ${template.relationships.length} relationships.`);
    } catch (error) {
      console.error('Failed to apply template:', error);
      alert('Failed to apply template: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // Layout alignment helpers
  const alignNodes = useCallback((direction) => {
    const selectedNodes = nodes.filter(n => n.selected && n.type === 'resource');
    if (selectedNodes.length < 2) {
      alert('Please select at least 2 nodes to align');
      return;
    }
    
    const updatedNodes = nodes.map(node => {
      if (!node.selected || node.type !== 'resource') return node;
      
      if (direction === 'left') {
        const minX = Math.min(...selectedNodes.map(n => n.position.x));
        return { ...node, position: { ...node.position, x: minX } };
      } else if (direction === 'right') {
        const maxX = Math.max(...selectedNodes.map(n => n.position.x));
        return { ...node, position: { ...node.position, x: maxX } };
      } else if (direction === 'top') {
        const minY = Math.min(...selectedNodes.map(n => n.position.y));
        return { ...node, position: { ...node.position, y: minY } };
      } else if (direction === 'bottom') {
        const maxY = Math.max(...selectedNodes.map(n => n.position.y));
        return { ...node, position: { ...node.position, y: maxY } };
      } else if (direction === 'horizontal') {
        const avgY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;
        return { ...node, position: { ...node.position, y: avgY } };
      } else if (direction === 'vertical') {
        const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
        return { ...node, position: { ...node.position, x: avgX } };
      }
      return node;
    });
    
    setNodes(updatedNodes);
    saveNodePositions(updatedNodes);
  }, [nodes, setNodes, saveNodePositions]);
  
  const distributeNodes = useCallback((direction) => {
    const selectedNodes = nodes.filter(n => n.selected && n.type === 'resource');
    if (selectedNodes.length < 3) {
      alert('Please select at least 3 nodes to distribute');
      return;
    }
    
    const sorted = [...selectedNodes].sort((a, b) => 
      direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
    );
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = direction === 'horizontal' 
      ? last.position.x - first.position.x
      : last.position.y - first.position.y;
    const spacing = totalSpace / (sorted.length - 1);
    
    const updatedNodes = nodes.map(node => {
      const index = sorted.findIndex(n => n.id === node.id);
      if (index === -1) return node;
      
      if (direction === 'horizontal') {
        return { ...node, position: { ...node.position, x: first.position.x + (spacing * index) } };
      } else {
        return { ...node, position: { ...node.position, y: first.position.y + (spacing * index) } };
      }
    });
    
    setNodes(updatedNodes);
    saveNodePositions(updatedNodes);
  }, [nodes, setNodes, saveNodePositions]);
  
  // Toggle node visibility
  const toggleNodeVisibility = useCallback((nodeId) => {
    setHiddenNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);
  
  const showAllNodes = useCallback(() => {
    setHiddenNodes(new Set());
  }, []);
  
  // Handle right-click context menu
  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
    });
    setContextMenuNode(node);
  }, []);
  
  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
    });
    setSelectedEdge(edge);
  }, []);
  
  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'pane',
    });
  }, []);
  
  // Handle Delete key to remove selected nodes and edges
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Get selected nodes and edges
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);
        
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault();
          
          const confirmMessage = [];
          if (selectedNodes.length > 0) {
            confirmMessage.push(`${selectedNodes.length} node(s)`);
          }
          if (selectedEdges.length > 0) {
            confirmMessage.push(`${selectedEdges.length} relationship(s)`);
          }
          
          if (window.confirm(`Delete ${confirmMessage.join(' and ')}?`)) {
            // Delete selected edges (relationships)
            if (selectedEdges.length > 0) {
              deleteSelectedEdges(selectedEdges);
            }
            
            // Delete selected nodes (resources)
            if (selectedNodes.length > 0) {
              deleteSelectedNodes(selectedNodes);
            }
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges]);
  
  // Delete selected edges (relationships)
  const deleteSelectedEdges = async (selectedEdges) => {
    try {
      const token = localStorage.getItem('access_token');
      
      for (const edge of selectedEdges) {
        // Extract relationship ID from edge data
        const relationshipId = edge.data?.relationshipId;
        if (relationshipId) {
          await axios.delete(
            `${API_URL}/api/relationships/${relationshipId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      
      // Remove edges from UI
      setEdges(edges.filter(e => !selectedEdges.find(se => se.id === e.id)));
      
      // Refresh relationships from backend
      await fetchRelationships();
      
      console.log(`Deleted ${selectedEdges.length} relationship(s)`);
    } catch (error) {
      console.error('Failed to delete relationships:', error);
      alert('Failed to delete some relationships. Please try again.');
    }
  };
  
  // Delete selected nodes (resources)
  const deleteSelectedNodes = async (selectedNodes) => {
    try {
      const token = localStorage.getItem('access_token');
      
      for (const node of selectedNodes) {
        if (node.type === 'resource') {
          const resourceId = node.data?.resource?.id;
          if (resourceId) {
            await axios.delete(
              `${API_URL}/api/resources/${resourceId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
      }
      
      // Remove nodes from UI
      setNodes(nodes.filter(n => !selectedNodes.find(sn => sn.id === n.id)));
      
      // Refresh resources from backend
      await fetchResources();
      
      console.log(`Deleted ${selectedNodes.length} resource(s)`);
    } catch (error) {
      console.error('Failed to delete resources:', error);
      alert('Failed to delete some resources. Please try again.');
    }
  };
  
  const onConnect = useCallback(
    (params) => {
      const sourceResource = resources.find((r) => r.id.toString() === params.source);
      const targetResource = resources.find((r) => r.id.toString() === params.target);

      if (sourceResource && targetResource) {
        setNewRelationshipData({
          source_resource_id: sourceResource.id,
          target_resource_id: targetResource.id,
          source_name: sourceResource.name,
          target_name: targetResource.name,
        });
        setShowRelationshipModal(true);
      }
    },
    [resources]
  );

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'resource') {
      setSelectedResource(node.data.resource);
      setShowSidebar(true);
    }
  }, []);

  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'resource') {
      navigate(`/resources?edit=${node.data.resource.id}`);
    }
  }, [navigate]);

  const handleCreateRelationship = async (data) => {
    try {
      const token = localStorage.getItem('access_token');
      
      const payload = {
        source_resource_id: data.source_resource_id,
        target_resource_id: data.target_resource_id,
        relationship_type: data.relationship_type,
        direction: data.direction,
        port: data.port ? parseInt(data.port) : null,
        protocol: data.protocol || null,
        label: data.label || null,
        description: data.description || null,
        status: data.status || 'active',
        auto_detected: "no",
      };
      
      console.log('Creating relationship with payload:', payload);
      
      await axios.post(
        `${API_URL}/api/relationships`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('✅ Relationship created successfully!');
      setShowRelationshipModal(false);
      setNewRelationshipData(null);

      await fetchRelationships();
    } catch (error) {
      console.error('Failed to create relationship:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to create relationship: ';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage += error.response.data.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
        } else {
          errorMessage += error.response.data.detail;
        }
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Architecture Diagram</h1>
          <div className="flex items-center gap-2">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFileMenu(!showFileMenu);
                  setShowEditMenu(false);
                  setShowViewMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 shadow-md hover:shadow-lg transition-all"
              >
                <FileImage className="w-4 h-4" />
                File
                <ChevronDown className="w-3 h-3" />
              </button>
              {showFileMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={() => { exportAsPNG(); setShowFileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <FileImage className="w-4 h-4 text-green-600" />
                    <span>Export as PNG</span>
                  </button>
                  <button
                    onClick={() => { exportAsPDF(); setShowFileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Export as PDF</span>
                  </button>
                  <button
                    onClick={() => { exportAsGIF(); setShowFileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Film className="w-4 h-4 text-blue-600" />
                    <span>Export as GIF</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => { setShowExportModal(true); setShowFileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <FileCode className="w-4 h-4 text-purple-600" />
                    <span>Export IaC (CloudFormation/Terraform)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowEditMenu(!showEditMenu);
                  setShowFileMenu(false);
                  setShowViewMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 shadow-md hover:shadow-lg transition-all"
              >
                <Settings className="w-4 h-4" />
                Edit
                <ChevronDown className="w-3 h-3" />
              </button>
              {showEditMenu && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={() => { setShowResourcePalette(!showResourcePalette); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                    <span>Add Resources</span>
                  </button>
                  <button
                    onClick={() => { setShowTemplateLibrary(true); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <BookTemplate className="w-4 h-4 text-purple-600" />
                    <span>Apply Template</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={async () => {
                      setShowEditMenu(false);
                      if (confirm('Discover relationships from existing resources?\n\nThis will analyze:\n- CloudFormation stacks\n- VPC/Subnet associations\n- Lambda event sources\n- CodePipeline connections\n- ARN references')) {
                        try {
                          const token = localStorage.getItem('access_token');
                          const response = await axios.post(
                            `${API_URL}/api/relationships/discover`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          alert(`✅ Success!\n\nDiscovered: ${response.data.discovered} relationships\nImported: ${response.data.imported} new relationships\n\nRefreshing diagram...`);
                          await fetchRelationships();
                          setTimeout(() => applyAILayout(), 500);
                        } catch (error) {
                          console.error('Discovery failed:', error);
                          alert('Failed to discover relationships: ' + (error.response?.data?.detail || error.message));
                        }
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Network className="w-4 h-4 text-green-600" />
                    <span>Discover Relationships</span>
                  </button>
                  <button
                    onClick={() => { setShowValidation(!showValidation); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span>Validate Architecture</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => { applyAILayout(); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Brain className="w-4 h-4 text-cyan-600" />
                    <span>AI Layout (Ollama)</span>
                  </button>
                  <button
                    onClick={() => { applyELKLayout(); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Layers className="w-4 h-4 text-violet-600" />
                    <span>ELK Layout</span>
                  </button>
                  <button
                    onClick={() => { applyAutoLayout(); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span>AWS Layout</span>
                  </button>
                  <button
                    onClick={() => { undoAutoLayout(); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-600 transform scale-x-[-1]" />
                    <span>Undo Layout</span>
                  </button>
                  <button
                    onClick={() => { resetLayout(); setShowEditMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                    <span>Reset Layout</span>
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowViewMenu(!showViewMenu);
                  setShowFileMenu(false);
                  setShowEditMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 shadow-md hover:shadow-lg transition-all"
              >
                <Eye className="w-4 h-4" />
                View
                <ChevronDown className="w-3 h-3" />
              </button>
              {showViewMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      const newState = !showLegend;
                      setShowLegend(newState);
                      localStorage.setItem('diagram_show_legend', newState.toString());
                      setShowViewMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Eye className={`w-4 h-4 ${showLegend ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span>{showLegend ? '✓ ' : ''}Legend Panels</span>
                  </button>
                  <button
                    onClick={() => {
                      const newState = !showMinimap;
                      setShowMinimap(newState);
                      localStorage.setItem('diagram_show_minimap', newState.toString());
                      setShowViewMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition-colors"
                  >
                    <Map className={`w-4 h-4 ${showMinimap ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span>{showMinimap ? '✓ ' : ''}Minimap</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cost Display */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium shadow-md" title="Estimated monthly AWS cost">
              <DollarSign className="w-4 h-4" />
              <span className="font-bold">{formatCost(estimatedCost)}/mo</span>
            </div>

            {/* Back Button */}
            <button
              onClick={() => navigate('/resources')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-md hover:shadow-lg transition-all"
            >
              Back to Resources
            </button>
          </div>
        </div>

        {/* Filters with Checkboxes */}
        <div className="flex items-center gap-6 flex-wrap px-4 py-2">
          {/* Show All Resources Button */}
          <button
            onClick={() => {
              setUncheckedAccounts(new Set());
              setUncheckedVPCs(new Set());
              setUncheckedTypes(new Set());
              setUncheckedRelTypes(new Set());
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
          >
            <Eye className="w-4 h-4" />
            Show All Resources
          </button>
          
          {/* Account Filter */}
          <div className="relative">
            <button
              onClick={() => setShowAccountFilter(!showAccountFilter)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">Account</span>
              {uncheckedAccounts.size > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {uncheckedAccounts.size}
                </span>
              )}
            </button>
            {showAccountFilter && (
              <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {accounts.map((acc) => (
                  <label key={acc} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!uncheckedAccounts.has(acc)}
                      onChange={(e) => {
                        const newSet = new Set(uncheckedAccounts);
                        if (e.target.checked) {
                          newSet.delete(acc);
                        } else {
                          newSet.add(acc);
                        }
                        setUncheckedAccounts(newSet);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{acc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* VPC Filter */}
          <div className="relative">
            <button
              onClick={() => setShowVPCFilter(!showVPCFilter)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">VPC</span>
              {uncheckedVPCs.size > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {uncheckedVPCs.size}
                </span>
              )}
            </button>
            {showVPCFilter && (
              <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {vpcs.map((vpc) => (
                  <label key={vpc} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!uncheckedVPCs.has(vpc)}
                      onChange={(e) => {
                        const newSet = new Set(uncheckedVPCs);
                        if (e.target.checked) {
                          newSet.delete(vpc);
                        } else {
                          newSet.add(vpc);
                        }
                        setUncheckedVPCs(newSet);
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{vpc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeFilter(!showTypeFilter)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">Type</span>
              {uncheckedTypes.size > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {uncheckedTypes.size}
                </span>
              )}
            </button>
            {showTypeFilter && (
              <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                <div className="flex gap-2 mb-2 pb-2 border-b border-gray-200">
                  <button
                    onClick={() => setUncheckedTypes(new Set())}
                    className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setUncheckedTypes(new Set(types))}
                    className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                {types.map((type) => (
                  <label key={type} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!uncheckedTypes.has(type)}
                      onChange={(e) => {
                        const newSet = new Set(uncheckedTypes);
                        if (e.target.checked) {
                          newSet.delete(type);
                        } else {
                          newSet.add(type);
                        }
                        setUncheckedTypes(newSet);
                      }}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{type.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Relationship Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowRelTypeFilter(!showRelTypeFilter)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">Edges</span>
              {uncheckedRelTypes.size > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {uncheckedRelTypes.size}
                </span>
              )}
            </button>
            {showRelTypeFilter && (
              <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[220px] max-h-[300px] overflow-y-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Relationship Types</div>
                {relationshipTypes.map((relType) => (
                  <label key={relType} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!uncheckedRelTypes.has(relType)}
                      onChange={(e) => {
                        const newSet = new Set(uncheckedRelTypes);
                        if (e.target.checked) {
                          newSet.delete(relType);
                        } else {
                          newSet.add(relType);
                        }
                        setUncheckedRelTypes(newSet);
                      }}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: getRelationshipColor(relType) }}
                    />
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getRelationshipColor(relType) }}
                    />
                    <span className="text-sm text-gray-700">{relType}</span>
                  </label>
                ))}
                {relationshipTypes.length === 0 && (
                  <div className="text-sm text-gray-400 italic">No relationships</div>
                )}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredResources.length} resources • {filteredRelationships.length} edges
          </div>

          {/* Clear highlight button */}
          {highlightedNode && (
            <button
              onClick={() => setHighlightedNode(null)}
              className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200"
            >
              <X className="w-3 h-3" />
              Clear Focus
            </button>
          )}
        </div>
      </div>

      {/* Loading Overlay for Layout Progress */}
      {isLayoutLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center border border-gray-200">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimizing Layout</h3>
            <p className="text-sm text-gray-600 mb-4">{layoutProgress}</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Palette */}
      <ResourcePalette 
        isOpen={showResourcePalette}
        onToggle={() => setShowResourcePalette(!showResourcePalette)}
        onAddResource={(serviceType, serviceName) => {
          console.log('Add resource:', serviceType, serviceName);
        }}
      />

      {/* React Flow Canvas */}
      <div 
        className="flex-1 relative"
        ref={reactFlowWrapper}
        onDrop={(event) => {
          event.preventDefault();
          const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
          const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));
          
          if (data.type === 'resource') {
            const position = project({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top,
            });
            
            // Show configuration panel for new resource
            setConfigResource({
              id: `new-${Date.now()}`,
              name: `New ${data.serviceName}`,
              type: data.serviceType,
              position,
              environment: 'development',
              region: 'us-east-1',
              tags: {},
              type_specific_properties: {},
            });
            setShowConfigPanel(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
      >
        <ReactFlow
          nodes={visibleNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeMouseEnter={(event, node) => {
            if (node.type === 'resource') {
              setHighlightedNode(node.id);
            }
          }}
          onNodeMouseLeave={() => {
            setHighlightedNode(null);
          }}
          onEdgeClick={(event, edge) => {
            setSelectedEdge(edge);
          }}
          onEdgeDoubleClick={(event, edge) => {
            event.preventDefault();
            setSelectedEdge(edge);
            setShowEdgeEditModal(true);
          }}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.05}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 3 },
          }}
          connectionLineStyle={{
            strokeWidth: 3,
            stroke: '#3B82F6',
            strokeDasharray: '5,5',
          }}
          connectionLineType="smoothstep"
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionKeyCode="Shift"
          panOnScroll={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          selectNodesOnDrag={false}
          elevateEdgesOnSelect={true}
          edgesSelectable={true}
          nodesConnectable={true}
          nodesDraggable={true}
          elementsSelectable={true}
        >
          <Background 
            color="#F3F4F6" 
            gap={30} 
            size={1}
            variant="lines"
            style={{ backgroundColor: '#FAFBFC' }}
          />
          <Controls 
            showInteractive={false}
            className="bg-white shadow-lg rounded-lg border border-gray-200"
          />
          {showMinimap && (
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'account') return '#3B82F6';
                if (node.type === 'vpc') return '#8B5CF6';
                return node.data?.resource?.type ? getServiceColor(node.data.resource.type) : '#6B7280';
              }}
              nodeStrokeWidth={3}
              maskColor="rgba(0, 0, 0, 0.1)"
              className="bg-white shadow-lg rounded-lg border border-gray-200"
              zoomable
              pannable
            />
          )}

          {/* Keyboard Shortcuts Help Panel */}
          <Panel position="bottom-right" className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 m-2">
            <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">⌨️ Keyboard Shortcuts</div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Delete</span>
                <span>Delete selected items</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Ctrl+Click</span>
                <span>Multi-select</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Shift+Drag</span>
                <span>Box select</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Double-Click</span>
                <span>Edit edge/node</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Drag</span>
                <span>Create relationship</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Scroll</span>
                <span>Pan diagram</span>
              </div>
            </div>
          </Panel>

          {/* AWS Architecture Tier Legend */}
          {showLegend && (
            <Panel position="top-left" className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 m-2">
            <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">AWS Data Flow →</div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-600">Entry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-600">Network</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-600">Compute</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                <span className="text-xs text-gray-600">App</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-xs text-gray-600">Data</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-600">Storage</span>
              </div>
            </div>
            </Panel>
          )}

          {/* Relationship Legend */}
          {showLegend && (
            <Panel position="bottom-left" className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 m-2">
              <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Relationships</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-green-500" />
                  <span className="text-xs text-gray-600">Deploy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-orange-500" />
                  <span className="text-xs text-gray-600">Depends</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-blue-500" />
                  <span className="text-xs text-gray-600">Uses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-purple-500" />
                  <span className="text-xs text-gray-600">Connects</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-pink-500" />
                  <span className="text-xs text-gray-600">Triggers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-cyan-500" />
                  <span className="text-xs text-gray-600">Streams</span>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Export IaC Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Export Infrastructure as Code</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Export your architecture diagram as CloudFormation or Terraform code.
              </p>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setExportFormat('cloudformation')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'cloudformation'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Code className="w-6 h-6 text-orange-500" />
                    <div className="text-left">
                      <div className="font-bold text-gray-900">CloudFormation</div>
                      <div className="text-xs text-gray-500">AWS native IaC (YAML)</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setExportFormat('terraform')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'terraform'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode className="w-6 h-6 text-purple-500" />
                    <div className="text-left">
                      <div className="font-bold text-gray-900">Terraform</div>
                      <div className="text-xs text-gray-500">Multi-cloud IaC (HCL)</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Preview:</h4>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-xs text-gray-600 max-h-60 overflow-y-auto">
                  <pre>{exportFormat === 'cloudformation' 
                    ? generateCloudFormation(filteredResources, filteredRelationships).substring(0, 500) + '...'
                    : generateTerraform(filteredResources, filteredRelationships).substring(0, 500) + '...'
                  }</pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {filteredResources.length} resources • {filteredRelationships.length} relationships
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const code = exportFormat === 'cloudformation'
                    ? generateCloudFormation(filteredResources, filteredRelationships)
                    : generateTerraform(filteredResources, filteredRelationships);
                  
                  const filename = exportFormat === 'cloudformation' ? 'template.json' : 'main.tf';
                  const blob = new Blob([code], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                  
                  setShowExportModal(false);
                  alert(`✅ Exported ${filteredResources.length} resources as ${exportFormat === 'cloudformation' ? 'CloudFormation' : 'Terraform'}!\n\nFile: ${filename}`);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 font-medium"
              >
                <FileCode className="w-4 h-4 inline mr-2" />
                Download {exportFormat === 'cloudformation' ? 'CloudFormation' : 'Terraform'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Creation Modal */}
      {showRelationshipModal && newRelationshipData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create Relationship</h3>
              <button
                onClick={() => {
                  setShowRelationshipModal(false);
                  setNewRelationshipData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm">
                <div className="font-semibold text-blue-900 mb-1">From: {newRelationshipData.source_name}</div>
                <div className="text-blue-700">→</div>
                <div className="font-semibold text-blue-900 mt-1">To: {newRelationshipData.target_name}</div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleCreateRelationship({
                  source_resource_id: newRelationshipData.source_resource_id,
                  target_resource_id: newRelationshipData.target_resource_id,
                  relationship_type: formData.get('relationship_type'),
                  direction: formData.get('direction'),
                  port: formData.get('port'),
                  protocol: formData.get('protocol'),
                  label: formData.get('label'),
                  description: formData.get('description'),
                  status: 'active',
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type *</label>
                <select
                  name="relationship_type"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="uses">Uses</option>
                  <option value="depends_on">Depends On</option>
                  <option value="connects_to">Connects To</option>
                  <option value="routes_to">Routes To</option>
                  <option value="attached_to">Attached To</option>
                  <option value="deploy_to">Deploy To</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select
                  name="direction"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="outbound">⬆️ Outbound</option>
                  <option value="inbound">⬇️ Inbound</option>
                  <option value="bidirectional">↔️ Bidirectional</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="text"
                    name="port"
                    placeholder="e.g., 443"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                  <input
                    type="text"
                    name="protocol"
                    placeholder="e.g., HTTPS"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label (Optional)</label>
                <input
                  type="text"
                  name="label"
                  placeholder="e.g., API Gateway"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRelationshipModal(false);
                    setNewRelationshipData(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Details Sidebar */}
      {showSidebar && selectedResource && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Resource Details</h2>
            <button
              onClick={() => {
                setShowSidebar(false);
                setSelectedResource(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Resource Header */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl shadow-md"
                  style={{ background: `linear-gradient(135deg, ${getServiceColor(selectedResource.type)}, ${getServiceColor(selectedResource.type)}cc)` }}
                >
                  {getServiceEmoji(selectedResource.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">{selectedResource.name || 'Unnamed Resource'}</h3>
                  <p className="text-xs text-gray-600 font-medium">{selectedResource.type?.toUpperCase()}</p>
                </div>
              </div>
              {selectedResource.status && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  selectedResource.status === 'active' || selectedResource.status === 'running'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    selectedResource.status === 'active' || selectedResource.status === 'running'
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-gray-400'
                  }`} />
                  {selectedResource.status}
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">Basic Information</h4>
              
              {selectedResource.resource_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Resource ID</label>
                  <p className="text-sm text-gray-900 font-mono mt-1">{selectedResource.resource_id}</p>
                </div>
              )}

              {selectedResource.account_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Account ID</label>
                  <p className="text-sm text-gray-900 font-mono mt-1">{selectedResource.account_id}</p>
                </div>
              )}

              {selectedResource.region && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Region</label>
                  <p className="text-sm text-gray-900 mt-1">📍 {selectedResource.region}</p>
                </div>
              )}

              {selectedResource.vpc_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">VPC</label>
                  <p className="text-sm text-gray-900 font-mono mt-1">{selectedResource.vpc_id}</p>
                </div>
              )}

              {selectedResource.subnet_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Subnet</label>
                  <p className="text-sm text-gray-900 font-mono mt-1">{selectedResource.subnet_id}</p>
                </div>
              )}

              {selectedResource.environment && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Environment</label>
                  <p className="text-sm text-gray-900 mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      selectedResource.environment === 'production' ? 'bg-red-100 text-red-700' :
                      selectedResource.environment === 'staging' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedResource.environment}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Network Information */}
            {(selectedResource.public_ip || selectedResource.private_ip) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">Network</h4>
                
                {selectedResource.public_ip && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Public IP</label>
                    <p className="text-sm text-gray-900 font-mono mt-1">{selectedResource.public_ip}</p>
                  </div>
                )}

                {selectedResource.private_ip && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Private IP</label>
                    <p className="text-sm text-gray-900 font-mono mt-1">{selectedResource.private_ip}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {selectedResource.tags && Object.keys(selectedResource.tags).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">Tags</h4>
                <div className="space-y-2">
                  {Object.entries(selectedResource.tags).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[80px]">{key}:</span>
                      <span className="text-xs text-gray-900 flex-1">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedResource.description && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">Description</h4>
                <p className="text-sm text-gray-700">{selectedResource.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t">
              <button
                onClick={() => navigate(`/resources?edit=${selectedResource.id}`)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                Edit Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Configuration Panel */}
      {showConfigPanel && configResource && (
        <ResourceConfigPanel
          resource={configResource}
          onSave={handleSaveResource}
          onCancel={() => {
            setShowConfigPanel(false);
            setConfigResource(null);
          }}
        />
      )}

      {/* Template Library */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleApplyTemplate}
      />

      {/* Validation Panel */}
      <ValidationPanel
        resources={filteredResources}
        relationships={filteredRelationships}
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
      />

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'node' && contextMenuNode && (
            <>
              <button
                onClick={() => {
                  if (contextMenuNode.type === 'resource') {
                    setConfigResource(contextMenuNode.data.resource);
                    setShowConfigPanel(true);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Resource
              </button>
              <button
                onClick={() => {
                  toggleNodeVisibility(contextMenuNode.id);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {hiddenNodes.has(contextMenuNode.id) ? 'Show' : 'Hide'} Node
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Align</div>
              <button
                onClick={() => {
                  alignNodes('left');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">⬅</span>
                Align Left
              </button>
              <button
                onClick={() => {
                  alignNodes('right');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">➡</span>
                Align Right
              </button>
              <button
                onClick={() => {
                  alignNodes('top');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">⬆</span>
                Align Top
              </button>
              <button
                onClick={() => {
                  alignNodes('bottom');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">⬇</span>
                Align Bottom
              </button>
              <button
                onClick={() => {
                  alignNodes('horizontal');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">↔</span>
                Align Horizontal Center
              </button>
              <button
                onClick={() => {
                  alignNodes('vertical');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">↕</span>
                Align Vertical Center
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Distribute</div>
              <button
                onClick={() => {
                  distributeNodes('horizontal');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">⬌</span>
                Distribute Horizontally
              </button>
              <button
                onClick={() => {
                  distributeNodes('vertical');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">⬍</span>
                Distribute Vertically
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={async () => {
                  if (window.confirm('Delete this resource?')) {
                    await deleteSelectedNodes([contextMenuNode]);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Delete Resource
              </button>
            </>
          )}
          
          {contextMenu.type === 'edge' && selectedEdge && (
            <>
              <button
                onClick={() => {
                  setShowEdgeEditModal(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Relationship
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Delete this relationship?')) {
                    await deleteSelectedEdges([selectedEdge]);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Delete Relationship
              </button>
            </>
          )}
          
          {contextMenu.type === 'pane' && (
            <>
              <button
                onClick={() => {
                  setShowResourcePalette(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Layout</div>
              <button
                onClick={() => {
                  applyAILayout();
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                AI Layout
              </button>
              <button
                onClick={() => {
                  applyELKLayout();
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                ELK Layout
              </button>
              <button
                onClick={() => {
                  applyAWSLayout();
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                AWS Layout
              </button>
              <button
                onClick={() => {
                  undoLayout();
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Undo Layout
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">View</div>
              {hiddenNodes.size > 0 && (
                <button
                  onClick={() => {
                    showAllNodes();
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Show All Hidden Nodes ({hiddenNodes.size})
                </button>
              )}
              <button
                onClick={() => {
                  setShowLegend(!showLegend);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Map className="w-4 h-4" />
                Toggle Legend
              </button>
              <button
                onClick={() => {
                  setShowMinimap(!showMinimap);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Map className="w-4 h-4" />
                Toggle Minimap
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  setShowValidation(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Validate Diagram
              </button>
              <button
                onClick={() => {
                  setShowTemplateLibrary(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <BookTemplate className="w-4 h-4" />
                Template Library
              </button>
            </>
          )}
        </div>
      )}

      {/* Edge Edit Modal - Double-click on edge to edit/delete relationship */}
      {showEdgeEditModal && selectedEdge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Relationship</h3>
              <button
                onClick={() => {
                  setShowEdgeEditModal(false);
                  setSelectedEdge(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Relationship Type</label>
                <p className="text-sm text-gray-900 mt-1 font-mono bg-gray-50 px-3 py-2 rounded">
                  {selectedEdge.data?.relationship_type || 'Unknown'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Label</label>
                <p className="text-sm text-gray-900 mt-1 bg-gray-50 px-3 py-2 rounded">
                  {selectedEdge.label || 'No label'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Direction</label>
                <p className="text-sm text-gray-900 mt-1 bg-gray-50 px-3 py-2 rounded">
                  {selectedEdge.data?.direction || 'unidirectional'}
                </p>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button
                  onClick={async () => {
                    if (window.confirm('Delete this relationship?')) {
                      await deleteSelectedEdges([selectedEdge]);
                      setShowEdgeEditModal(false);
                      setSelectedEdge(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                >
                  Delete Relationship
                </button>
                <button
                  onClick={() => {
                    setShowEdgeEditModal(false);
                    setSelectedEdge(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Define nodeTypes outside component to avoid React Flow warning
const nodeTypes = {
  resource: ResourceNode,
  vpc: VPCNode,
  account: AccountNode,
  region: RegionNode,
  az: AZNode,
  subnet: SubnetNode,
};

// Wrap with ReactFlowProvider for drag-and-drop support
function ArchitectureDiagramFlowWrapper() {
  return (
    <ReactFlowProvider>
      <ArchitectureDiagramFlow />
    </ReactFlowProvider>
  );
}

export default ArchitectureDiagramFlowWrapper;
