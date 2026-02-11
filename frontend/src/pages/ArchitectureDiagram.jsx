import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Globe, Network, Server, Database, HardDrive, Shield, 
  Layers, ChevronRight, Home, ArrowLeft, RefreshCw, Download, 
  LayoutDashboard, LogOut, Cloud, Box, GitBranch, Activity, Wifi,
  ZoomIn, ZoomOut, Move, X, Eye, EyeOff
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { AWS_ICONS, getServiceColor as getAWSServiceColor } from '../components/AWSIcons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8800';

// Linked/metadata resources - not shown in architecture diagram
const LINKED_RESOURCE_TYPES = new Set([
  'config', 'security_group_rule', 'rds_snapshot', 'rds_backup', 'aurora_snapshot',
  'snapshot', 'rds_parameter_group', 'rds_option_group', 'aurora_parameter_group',
  'db_subnet_group', 'dhcp_options', 'resource-explorer-2', 'flow_log', 'ipam',
  'ipam_scope', 'ipam_discovery', 'ipam_discovery_assoc', 'network_insights',
  'guardduty', 'cloudtrail', 'cloudwatch', 'cloudwatch_alarm', 'log_group',
  'eventbridge', 'eventbridge_rule', 'backup_plan', 'backup_vault', 'ssm',
  'ssm_parameter', 'ssm_document', 'waf', 'wafv2', 'access-analyzer',
  'resource-groups', 'servicecatalog', 'codestar-connections', 'codeconnections',
]);

// AWS Service Colors (official AWS color scheme)
const AWS_COLORS = {
  compute: '#FF9900',      // EC2, Lambda, ECS - Orange
  database: '#3B48CC',     // RDS, DynamoDB, Aurora - Blue
  storage: '#3F8624',      // S3, EBS, EFS - Green
  networking: '#8C4FFF',   // VPC, CloudFront, Route53 - Purple
  security: '#DD344C',     // IAM, Cognito, Shield - Red
  integration: '#E7157B',  // API Gateway, SQS, SNS - Pink
  management: '#759C3E',   // CloudFormation, CloudWatch - Green
  container: '#FF9900',    // ECS, EKS, Fargate - Orange
};

// AWS Service icon paths (simplified SVG paths for common services)
const getServiceColor = (type) => {
  const typeMap = {
    ec2: AWS_COLORS.compute,
    instance: AWS_COLORS.compute,
    lambda: AWS_COLORS.compute,
    ecs: AWS_COLORS.container,
    eks: AWS_COLORS.container,
    fargate: AWS_COLORS.container,
    rds: AWS_COLORS.database,
    aurora: AWS_COLORS.database,
    dynamodb: AWS_COLORS.database,
    s3: AWS_COLORS.storage,
    ebs: AWS_COLORS.storage,
    efs: AWS_COLORS.storage,
    vpc: AWS_COLORS.networking,
    subnet: AWS_COLORS.networking,
    elb: AWS_COLORS.networking,
    elasticloadbalancing: AWS_COLORS.networking,
    alb: AWS_COLORS.networking,
    nlb: AWS_COLORS.networking,
    cloudfront: AWS_COLORS.networking,
    route53: AWS_COLORS.networking,
    apigateway: AWS_COLORS.integration,
    sqs: AWS_COLORS.integration,
    sns: AWS_COLORS.integration,
    iam: AWS_COLORS.security,
    iam_role: AWS_COLORS.security,
    iam_policy: AWS_COLORS.security,
    cognito: AWS_COLORS.security,
    security_group: AWS_COLORS.security,
    kms: AWS_COLORS.security,
    acm: AWS_COLORS.security,
    acm_certificate: AWS_COLORS.security,
    nat_gateway: AWS_COLORS.networking,
    igw: AWS_COLORS.networking,
    cfn_stack: AWS_COLORS.management,
    cloudformation: AWS_COLORS.management,
  };
  return typeMap[type?.toLowerCase()] || '#6B7280';
};

// Helper function to adjust color brightness
const adjustColorBrightness = (color, amount) => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Get service label
const getServiceLabel = (type) => {
  const labels = {
    ec2: 'Amazon EC2',
    instance: 'EC2 Instance',
    lambda: 'AWS Lambda',
    rds: 'Amazon RDS',
    aurora: 'Amazon Aurora',
    dynamodb: 'DynamoDB',
    s3: 'Amazon S3',
    ebs: 'Amazon EBS',
    vpc: 'Amazon VPC',
    subnet: 'Subnet',
    elb: 'Elastic Load Balancer',
    elasticloadbalancing: 'Load Balancer',
    alb: 'Application LB',
    nlb: 'Network LB',
    cloudfront: 'CloudFront',
    route53: 'Route 53',
    apigateway: 'API Gateway',
    sqs: 'Amazon SQS',
    sns: 'Amazon SNS',
    iam_role: 'IAM Role',
    iam_policy: 'IAM Policy',
    security_group: 'Security Group',
    nat_gateway: 'NAT Gateway',
    igw: 'Internet Gateway',
    eni: 'Network Interface',
    eip: 'Elastic IP',
    target_group: 'Target Group',
    ecr: 'Amazon ECR',
    ecs: 'Amazon ECS',
    eks: 'Amazon EKS',
    kms: 'AWS KMS',
    secrets_manager: 'Secrets Manager',
    acm_certificate: 'ACM Certificate',
  };
  return labels[type?.toLowerCase()] || type?.toUpperCase() || 'Resource';
};

function ArchitectureDiagram() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const canvasRef = useRef(null);
  
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  
  // View state
  const [selectedAccount, setSelectedAccount] = useState(searchParams.get('account') || null);
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || null);
  const [selectedVpc, setSelectedVpc] = useState(searchParams.get('vpc') || null);
  
  // Canvas state
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showConnections, setShowConnections] = useState(true);
  
  // Drag-and-drop state for nodes
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Manual position overrides
  const [manualPositions, setManualPositions] = useState({});
  
  // Connection mode for easier relationship creation (React Flow style)
  const [connectionMode, setConnectionMode] = useState(false);
  const [isDrawingRelationship, setIsDrawingRelationship] = useState(false);
  const [relationshipSource, setRelationshipSource] = useState(null);
  const [relationshipDragPos, setRelationshipDragPos] = useState({ x: 0, y: 0 });
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [newRelationshipData, setNewRelationshipData] = useState(null);
  
  // Relationships from database
  const [relationships, setRelationships] = useState([]);
  
  // Resource type filters - default to main components only
  const [visibleTypes, setVisibleTypes] = useState(new Set([
    'ec2', 'instance', 's3', 'vpc', 'subnet', 'rds', 'aurora',
    'codepipeline', 'rabbitmq', 'mq'
  ]));
  
  // Node positions (computed)
  const [nodePositions, setNodePositions] = useState({});

  useEffect(() => {
    fetchResources();
    fetchRelationships();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccount) params.set('account', selectedAccount);
    if (selectedRegion) params.set('region', selectedRegion);
    if (selectedVpc) params.set('vpc', selectedVpc);
    setSearchParams(params);
  }, [selectedAccount, selectedRegion, selectedVpc]);

  useEffect(() => {
    if (resources.length > 0) {
      computeNodePositions();
    }
  }, [resources, selectedAccount, selectedRegion, selectedVpc, visibleTypes]);

  useEffect(() => {
    drawDiagram();
  }, [nodePositions, zoom, pan, selectedNode, hoveredNode, showConnections, visibleTypes]);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('Fetching resources from:', `${API_URL}/api/resources`);
      console.log('Token present:', !!token);
      
      const response = await axios.get(`${API_URL}/api/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Resources fetched:', response.data.length, 'resources');
      console.log('Sample resource:', response.data[0]);
      
      setResources(response.data);
      
      // Calculate stats
      const accounts = new Set(response.data.map(r => r.account_id).filter(Boolean));
      const regions = new Set(response.data.map(r => r.region).filter(Boolean));
      const vpcs = new Set(response.data.map(r => r.vpc_id).filter(Boolean));
      
      setStats({
        total: response.data.length,
        accounts: accounts.size,
        regions: regions.size,
        vpcs: vpcs.size
      });
      
      console.log('Stats:', { total: response.data.length, accounts: accounts.size, regions: regions.size, vpcs: vpcs.size });
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to fetch resources: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRelationships = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/api/relationships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRelationships(response.data);
      console.log('Relationships loaded:', response.data.length);
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
    }
  };
  
  const extractRelationships = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_URL}/api/relationships/extract`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Successfully extracted ${response.data.count} relationships!`);
      // Reload relationships and redraw diagram
      await fetchRelationships();
      drawDiagram();
    } catch (error) {
      console.error('Failed to extract relationships:', error);
      alert(`Failed to extract relationships: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Filter resources based on selection and visible types
  const filteredResources = useMemo(() => {
    let filtered = resources;
    if (selectedAccount) {
      filtered = filtered.filter(r => r.account_id === selectedAccount);
    }
    if (selectedRegion) {
      filtered = filtered.filter(r => r.region === selectedRegion);
    }
    if (selectedVpc) {
      if (selectedVpc === 'no-vpc') {
        filtered = filtered.filter(r => !r.vpc_id);
      } else {
        filtered = filtered.filter(r => r.vpc_id === selectedVpc);
      }
    }
    // Filter by visible resource types - BUT always show VPC and Subnet as they are containers
    filtered = filtered.filter(r => {
      const type = r.type?.toLowerCase();
      // Always include VPC and Subnet (they're infrastructure, not resources)
      if (type === 'vpc' || type === 'subnet') return true;
      // Filter other resources by visibility
      return visibleTypes.has(type);
    });
    return filtered;
  }, [resources, selectedAccount, selectedRegion, selectedVpc, visibleTypes]);

  // Get unique values for filters
  const accounts = useMemo(() => [...new Set(resources.map(r => r.account_id).filter(Boolean))], [resources]);
  const regions = useMemo(() => {
    const filtered = selectedAccount ? resources.filter(r => r.account_id === selectedAccount) : resources;
    return [...new Set(filtered.map(r => r.region).filter(Boolean))];
  }, [resources, selectedAccount]);
  const vpcs = useMemo(() => {
    let filtered = resources;
    if (selectedAccount) filtered = filtered.filter(r => r.account_id === selectedAccount);
    if (selectedRegion) filtered = filtered.filter(r => r.region === selectedRegion);
    const vpcIds = [...new Set(filtered.map(r => r.vpc_id).filter(Boolean))];
    if (filtered.some(r => !r.vpc_id)) vpcIds.push('no-vpc');
    return vpcIds;
  }, [resources, selectedAccount, selectedRegion]);

  // Get unique resource types available
  const availableTypes = useMemo(() => {
    const types = [...new Set(resources.map(r => r.type?.toLowerCase()).filter(Boolean))];
    return types.sort();
  }, [resources]);

  // Toggle resource type visibility
  const toggleType = (type) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Toggle all types
  const toggleAllTypes = () => {
    if (visibleTypes.size === availableTypes.length) {
      // If all selected, select only main types
      setVisibleTypes(new Set(['ec2', 'instance', 's3', 'vpc', 'subnet', 'rds', 'aurora', 'codepipeline', 'rabbitmq', 'mq']));
    } else {
      // Select all
      setVisibleTypes(new Set(availableTypes));
    }
  };

  // Compute node positions for the diagram
  const computeNodePositions = useCallback(() => {
    const positions = {};
    
    // Separate VPCs, subnets, and actual resources
    const vpcs = filteredResources.filter(r => r.type?.toLowerCase() === 'vpc');
    const subnets = filteredResources.filter(r => r.type?.toLowerCase() === 'subnet');
    const actualResources = filteredResources.filter(r => {
      const type = r.type?.toLowerCase();
      return type !== 'vpc' && type !== 'subnet';
    });
    
    // Group actual resources by VPC and subnet
    const grouped = {};
    actualResources.forEach(r => {
      const vpcId = r.vpc_id || 'no-vpc';
      const subnetId = r.subnet_id || 'no-subnet';
      if (!grouped[vpcId]) grouped[vpcId] = {};
      if (!grouped[vpcId][subnetId]) grouped[vpcId][subnetId] = [];
      grouped[vpcId][subnetId].push(r);
    });

    let vpcY = 100;
    const vpcPadding = 40;
    const subnetPadding = 20;
    const nodeWidth = 140;
    const nodeHeight = 120;
    const nodeSpacingX = 180;
    const nodeSpacingY = 150;
    const maxNodesPerRow = 4;

    // Process each VPC
    Object.entries(grouped).forEach(([vpcId, subnetGroups]) => {
      let vpcStartY = vpcY;
      let vpcMaxWidth = 400;
      let currentSubnetY = vpcY + 70;
      
      // Process each subnet within VPC
      Object.entries(subnetGroups).forEach(([subnetId, subnetResources]) => {
        let currentX = vpcPadding + subnetPadding + 20;
        let currentY = currentSubnetY + 50;
        let nodeCount = 0;
        let subnetWidth = 300;
        let subnetHeight = 120;
        
        // Position resources within subnet
        subnetResources.forEach((resource) => {
          if (nodeCount > 0 && nodeCount % maxNodesPerRow === 0) {
            currentX = vpcPadding + subnetPadding + 20;
            currentY += nodeSpacingY;
          }

          positions[resource.id] = {
            x: currentX,
            y: currentY,
            width: nodeWidth,
            height: nodeHeight,
            resource,
            vpcId,
            subnetId
          };

          currentX += nodeSpacingX;
          subnetWidth = Math.max(subnetWidth, currentX - (vpcPadding + subnetPadding) + nodeWidth);
          nodeCount++;
        });
        
        if (nodeCount > 0) {
          subnetHeight = currentY - currentSubnetY + nodeHeight + 30;
        }
        
        // Store subnet bounds (only if it has resources or if subnet resource exists)
        const subnetResource = subnets.find(s => s.resource_id === subnetId || s.id === subnetId);
        if (nodeCount > 0 || subnetResource) {
          positions[`subnet-${subnetId}`] = {
            x: vpcPadding + subnetPadding,
            y: currentSubnetY,
            width: subnetWidth,
            height: subnetHeight,
            isSubnet: true,
            subnetId,
            vpcId,
            label: subnetId === 'no-subnet' ? 'No Subnet' : `Subnet: ${subnetResource?.name || subnetId.slice(-12)}`
          };
          
          currentSubnetY += subnetHeight + 20;
          vpcMaxWidth = Math.max(vpcMaxWidth, subnetWidth + subnetPadding * 2);
        }
      });
      
      const vpcHeight = currentSubnetY - vpcStartY + 30;
      
      // Store VPC bounds
      const vpcResource = vpcs.find(v => v.resource_id === vpcId || v.id === vpcId);
      positions[`vpc-${vpcId}`] = {
        x: vpcPadding,
        y: vpcStartY,
        width: vpcMaxWidth,
        height: vpcHeight,
        isVpc: true,
        vpcId,
        label: vpcId === 'no-vpc' ? '🌐 Global Resources (No VPC)' : `🔒 VPC: ${vpcResource?.name || vpcId.slice(-12)}`
      };

      vpcY = vpcStartY + vpcHeight + 40;
    });

    setNodePositions(positions);
  }, [filteredResources]);

  // Draw the diagram on canvas
  const drawDiagram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw AWS Cloud container with enhanced styling
    const cloudBounds = getCloudBounds();
    if (cloudBounds) {
      const padding = 30;
      const headerHeight = 50;
      const cloudX = cloudBounds.x - padding;
      const cloudY = cloudBounds.y - headerHeight - padding;
      const cloudWidth = cloudBounds.width + padding * 2;
      const cloudHeight = cloudBounds.height + headerHeight + padding * 2;
      
      // Outer shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
      
      // Cloud background with gradient
      const cloudGradient = ctx.createLinearGradient(cloudX, cloudY, cloudX, cloudY + cloudHeight);
      cloudGradient.addColorStop(0, '#FFFFFF');
      cloudGradient.addColorStop(1, '#F8FAFC');
      ctx.fillStyle = cloudGradient;
      ctx.strokeStyle = '#232F3E';
      ctx.lineWidth = 3;
      roundRect(ctx, cloudX, cloudY, cloudWidth, cloudHeight, 16);
      ctx.fill();
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // AWS header bar
      ctx.fillStyle = '#232F3E';
      roundRect(ctx, cloudX, cloudY, cloudWidth, headerHeight, 16);
      ctx.fill();
      ctx.fillRect(cloudX, cloudY + headerHeight - 10, cloudWidth, 10);

      // AWS logo area
      ctx.fillStyle = '#FF9900';
      const logoSize = 32;
      const logoX = cloudX + 16;
      const logoY = cloudY + (headerHeight - logoSize) / 2;
      roundRect(ctx, logoX, logoY, logoSize, logoSize, 4);
      ctx.fill();
      
      // AWS text in logo
      ctx.fillStyle = '#232F3E';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AWS', logoX + logoSize / 2, logoY + logoSize / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // AWS Cloud label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillText('AWS Cloud', logoX + logoSize + 16, cloudY + headerHeight / 2 + 6);

      // Account label if selected
      if (selectedAccount) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.fillText(`Account: ${selectedAccount}`, cloudX + 16, cloudY + cloudHeight - 16);
      }
    }

    // Draw VPC containers
    Object.values(nodePositions).filter(n => n.isVpc).forEach(vpc => {
      drawVpcContainer(ctx, vpc);
    });

    // Draw subnet containers
    Object.values(nodePositions).filter(n => n.isSubnet).forEach(subnet => {
      drawSubnetContainer(ctx, subnet);
    });

    // Draw connections first (behind nodes)
    if (showConnections) {
      drawConnections(ctx);
    }

    // Draw resource nodes
    Object.values(nodePositions).filter(n => !n.isVpc && !n.isSubnet && n.resource).forEach(node => {
      drawResourceNode(ctx, node);
    });

    ctx.restore();

    // Draw legend
    drawLegend(ctx, rect);
  }, [nodePositions, zoom, pan, selectedNode, hoveredNode, showConnections, selectedAccount]);

  const getCloudBounds = () => {
    const vpcNodes = Object.values(nodePositions).filter(n => n.isVpc);
    if (vpcNodes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    vpcNodes.forEach(vpc => {
      minX = Math.min(minX, vpc.x);
      minY = Math.min(minY, vpc.y);
      maxX = Math.max(maxX, vpc.x + vpc.width);
      maxY = Math.max(maxY, vpc.y + vpc.height);
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const drawVpcContainer = (ctx, vpc) => {
    // VPC background with subtle gradient effect
    const gradient = ctx.createLinearGradient(vpc.x, vpc.y, vpc.x, vpc.y + vpc.height);
    if (vpc.vpcId === 'no-vpc') {
      gradient.addColorStop(0, '#FFFBEB');
      gradient.addColorStop(1, '#FEF3C7');
    } else {
      gradient.addColorStop(0, '#F0F9FF');
      gradient.addColorStop(1, '#E0F2FE');
    }
    ctx.fillStyle = gradient;
    
    // Shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    ctx.strokeStyle = vpc.vpcId === 'no-vpc' ? '#F59E0B' : '#0EA5E9';
    ctx.lineWidth = 3;
    roundRect(ctx, vpc.x, vpc.y, vpc.width, vpc.height, 12);
    ctx.fill();
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // VPC header bar
    ctx.fillStyle = vpc.vpcId === 'no-vpc' ? '#FCD34D' : '#38BDF8';
    roundRect(ctx, vpc.x, vpc.y, vpc.width, 45, 12);
    ctx.fill();
    ctx.fillRect(vpc.x, vpc.y + 35, vpc.width, 10);

    // VPC icon and label
    ctx.fillStyle = vpc.vpcId === 'no-vpc' ? '#78350F' : '#0C4A6E';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(vpc.vpcId === 'no-vpc' ? '🌐' : '🔒', vpc.x + 16, vpc.y + 28);
    ctx.fillText(vpc.label.replace('🔒 ', '').replace('🌐 ', ''), vpc.x + 45, vpc.y + 28);

    // Region label if available
    if (selectedRegion) {
      ctx.fillStyle = vpc.vpcId === 'no-vpc' ? '#92400E' : '#075985';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText(`Region: ${selectedRegion}`, vpc.x + 16, vpc.y + vpc.height - 15);
    }
  };

  const drawSubnetContainer = (ctx, subnet) => {
    // Subnet background with gradient
    const gradient = ctx.createLinearGradient(subnet.x, subnet.y, subnet.x, subnet.y + subnet.height);
    gradient.addColorStop(0, '#F5F3FF');
    gradient.addColorStop(1, '#EDE9FE');
    ctx.fillStyle = gradient;
    
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    roundRect(ctx, subnet.x, subnet.y, subnet.width, subnet.height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Subnet header
    ctx.fillStyle = '#DDD6FE';
    roundRect(ctx, subnet.x, subnet.y, subnet.width, 35, 8);
    ctx.fill();
    ctx.fillRect(subnet.x, subnet.y + 28, subnet.width, 7);

    // Subnet label
    ctx.fillStyle = '#5B21B6';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.fillText('📦 ' + subnet.label.replace('Subnet: ', ''), subnet.x + 12, subnet.y + 22);
  };

  const drawResourceNode = (ctx, node) => {
    const { x, y, width, height, resource } = node;
    const isSelected = selectedNode?.id === resource.id;
    const isHovered = hoveredNode?.id === resource.id;
    const color = getServiceColor(resource.type);

    // Enhanced shadow for depth
    ctx.shadowColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = isSelected ? 16 : 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = isSelected ? 6 : 3;

    // Node background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(1, '#F9FAFB');
    ctx.fillStyle = gradient;
    
    ctx.strokeStyle = isSelected ? '#3B82F6' : (isHovered ? color : '#D1D5DB');
    ctx.lineWidth = isSelected ? 3 : 2;
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Service icon area - larger and more prominent
    const iconSize = 56;
    const iconX = x + (width - iconSize) / 2;
    const iconY = y + 12;
    
    // Icon background with gradient
    const iconGradient = ctx.createLinearGradient(iconX, iconY, iconX, iconY + iconSize);
    iconGradient.addColorStop(0, color);
    iconGradient.addColorStop(1, adjustColorBrightness(color, -20));
    ctx.fillStyle = iconGradient;
    roundRect(ctx, iconX, iconY, iconSize, iconSize, 6);
    ctx.fill();

    // White icon symbol
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const emoji = getServiceEmoji(resource.type);
    ctx.fillText(emoji, x + width / 2, iconY + iconSize / 2);

    // Service type label (above name)
    ctx.fillStyle = '#6B7280';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const typeLabel = getServiceLabel(resource.type);
    ctx.fillText(truncateText(ctx, typeLabel, width - 12), x + width / 2, y + height - 28);

    // Service name (bottom)
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    const label = truncateText(ctx, resource.name || resource.resource_id?.slice(-12) || 'Resource', width - 12);
    ctx.fillText(label, x + width / 2, y + height - 12);
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Status indicator - top right corner
    const statusColor = resource.status === 'active' || resource.status === 'running' ? '#10B981' : '#9CA3AF';
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(x + width - 12, y + 12, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Status ring
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Store click area
    node.clickArea = { x, y, width, height };
  };

  const getServiceEmoji = (type) => {
    const emojis = {
      ec2: '🖥️', instance: '🖥️',
      lambda: 'λ',
      rds: '🗄️', aurora: '🗄️',
      dynamodb: '📊',
      s3: '🪣',
      ebs: '💾',
      vpc: '🔒',
      subnet: '🔲',
      elb: '⚖️', elasticloadbalancing: '⚖️', alb: '⚖️', nlb: '⚖️',
      cloudfront: '🌐',
      route53: '🌍',
      apigateway: '🚪',
      sqs: '📬', sns: '📨',
      iam_role: '👤', iam_policy: '📜',
      security_group: '🛡️',
      nat_gateway: '🔀',
      igw: '🌐',
      eni: '🔌',
      eip: '📍',
      ecr: '📦', ecs: '🐳', eks: '☸️',
      kms: '🔑',
      secrets_manager: '🔐',
      acm_certificate: '📜',
      target_group: '🎯',
    };
    return emojis[type?.toLowerCase()] || '📦';
  };

  const drawConnections = (ctx) => {
    const resourceNodes = Object.values(nodePositions).filter(n => !n.isVpc && !n.isSubnet && n.resource);
    
    let connectionCounter = 1;
    const drawnConnections = new Set();

    // Helper to draw numbered connection
    const drawNumberedConnection = (fromX, fromY, toX, toY, number, color = '#3B82F6', label = '') => {
      // Draw arrow line with better styling
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      
      // Draw arrowhead
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowSize = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - arrowSize * Math.cos(angle - Math.PI / 6),
        toY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toX - arrowSize * Math.cos(angle + Math.PI / 6),
        toY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Draw numbered badge at midpoint
      if (number) {
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        
        // Badge shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Badge circle
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.arc(midX, midY, 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // White ring
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 16, 0, Math.PI * 2);
        ctx.stroke();
        
        // Number text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), midX, midY);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        // Draw relationship label if provided
        if (label) {
          ctx.fillStyle = '#1F2937';
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, midX, midY + 30);
          ctx.textAlign = 'left';
        }
      }
    };

    // Draw connections from database relationships
    relationships.forEach(rel => {
      const sourceNode = resourceNodes.find(n => n.resource.id === rel.source_resource_id);
      const targetNode = resourceNodes.find(n => n.resource.id === rel.target_resource_id);
      
      if (!sourceNode || !targetNode) return;
      
      const connectionKey = `${rel.source_resource_id}-${rel.target_resource_id}`;
      if (drawnConnections.has(connectionKey)) return;
      drawnConnections.add(connectionKey);
      
      // Choose color based on relationship type
      const colorMap = {
        'uses': '#3B82F6',
        'consumes': '#10B981',
        'applies_to': '#F59E0B',
        'attached_to': '#8B5CF6',
        'depends_on': '#EF4444',
        'connects_to': '#06B6D4',
        'routes_to': '#8B5CF6',
        'manages': '#F97316',
        'monitors': '#14B8A6',
        'backs_up': '#6366F1'
      };
      
      const color = colorMap[rel.relationship_type] || '#6B7280';
      
      drawNumberedConnection(
        sourceNode.x + sourceNode.width / 2,
        sourceNode.y + sourceNode.height,
        targetNode.x + targetNode.width / 2,
        targetNode.y,
        connectionCounter++,
        color,
        rel.relationship_type
      );
    });
    
    // Fallback: Draw heuristic connections if no relationships exist
    if (relationships.length === 0) {
      resourceNodes.forEach(node => {
        if (node.resource.type === 'elb' || node.resource.type === 'elasticloadbalancing') {
          const targets = resourceNodes.filter(n => 
            n.vpcId === node.vpcId && 
            (n.resource.type === 'ec2' || n.resource.type === 'instance')
          );
          targets.slice(0, 2).forEach(target => {
            drawNumberedConnection(
              node.x + node.width / 2, node.y + node.height,
              target.x + target.width / 2, target.y,
              connectionCounter++,
              '#8B5CF6',
              'routes_to'
            );
          });
        }

        if (node.resource.type === 'ec2' || node.resource.type === 'instance') {
          const rdsNodes = resourceNodes.filter(n => 
            n.vpcId === node.vpcId && 
            (n.resource.type === 'rds' || n.resource.type === 'aurora')
          );
          rdsNodes.slice(0, 1).forEach(rds => {
            drawNumberedConnection(
              node.x + node.width, node.y + node.height / 2,
              rds.x, rds.y + rds.height / 2,
              connectionCounter++,
              '#3B82F6',
              'uses'
            );
          });
        }

        if (node.resource.type === 'lambda') {
          const dynamoNodes = resourceNodes.filter(n => n.resource.type === 'dynamodb');
          dynamoNodes.slice(0, 1).forEach(dynamo => {
            drawNumberedConnection(
              node.x + node.width, node.y + node.height / 2,
              dynamo.x, dynamo.y + dynamo.height / 2,
              connectionCounter++,
              '#FF9900',
              'uses'
            );
          });
        }

        // S3 connections
        if (node.resource.type === 's3') {
          const ec2Nodes = resourceNodes.filter(n => 
            (n.resource.type === 'ec2' || n.resource.type === 'instance')
          );
          ec2Nodes.slice(0, 1).forEach(ec2 => {
            drawNumberedConnection(
              ec2.x + ec2.width / 2, ec2.y + ec2.height,
              node.x + node.width / 2, node.y,
              connectionCounter++,
              '#3F8624',
              'uses'
            );
          });
        }
      });
    }
  };

  const drawArrow = (ctx, x1, y1, x2, y2, color, width) => {
    const headLength = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const drawLegend = (ctx, rect) => {
    const legendX = rect.width - 180;
    const legendY = 20;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    roundRect(ctx, legendX, legendY, 160, 140, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText('Legend', legendX + 10, legendY + 20);

    const items = [
      { color: AWS_COLORS.compute, label: 'Compute' },
      { color: AWS_COLORS.database, label: 'Database' },
      { color: AWS_COLORS.storage, label: 'Storage' },
      { color: AWS_COLORS.networking, label: 'Networking' },
      { color: AWS_COLORS.security, label: 'Security' },
    ];

    items.forEach((item, idx) => {
      const y = legendY + 40 + idx * 20;
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 10, y - 8, 12, 12);
      ctx.fillStyle = '#4B5563';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(item.label, legendX + 28, y);
    });
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const truncateText = (ctx, text, maxWidth) => {
    if (!text) return '';
    let truncated = text;
    while (ctx.measureText(truncated).width > maxWidth && truncated.length > 3) {
      truncated = truncated.slice(0, -4) + '...';
    }
    return truncated;
  };

  // Event handlers
  const handleCanvasClick = (e) => {
    if (isDraggingNode) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const clicked = Object.values(nodePositions).find(node => {
      if (node.isVpc || node.isSubnet || !node.clickArea) return false;
      const { x: nx, y: ny, width, height } = node.clickArea;
      return x >= nx && x <= nx + width && y >= ny && y <= ny + height;
    });

    // Connection mode: two-click workflow
    if (connectionMode && clicked?.resource) {
      if (!relationshipSource) {
        // First click - select source
        setRelationshipSource(clicked.resource);
        setIsDrawingRelationship(true);
        return;
      } else if (clicked.resource.id !== relationshipSource.id) {
        // Second click - select target and show modal
        setNewRelationshipData({
          source: relationshipSource,
          target: clicked.resource
        });
        setShowRelationshipModal(true);
        setIsDrawingRelationship(false);
        setRelationshipSource(null);
        return;
      } else {
        // Clicked same node - cancel
        setRelationshipSource(null);
        setIsDrawingRelationship(false);
        return;
      }
    }

    setSelectedNode(clicked?.resource || null);
  };

  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const clicked = Object.values(nodePositions).find(node => {
      if (node.isVpc || node.isSubnet || !node.clickArea) return false;
      const { x: nx, y: ny, width, height } = node.clickArea;
      return x >= nx && x <= nx + width && y >= ny && y <= ny + height;
    });

    if (clicked?.resource) {
      navigate(`/resources?edit=${clicked.resource.id}`);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Handle node dragging
    if (isDraggingNode && draggedNode) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      
      setManualPositions(prev => ({
        ...prev,
        [draggedNode.resource.id]: { x: newX, y: newY }
      }));
      
      // Update node position immediately
      setNodePositions(prev => ({
        ...prev,
        [draggedNode.resource.id]: {
          ...prev[draggedNode.resource.id],
          x: newX,
          y: newY
        }
      }));
      return;
    }

    // Handle canvas panning
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    // Handle hover
    const hovered = Object.values(nodePositions).find(node => {
      if (node.isVpc || node.isSubnet || !node.clickArea) return false;
      const { x: nx, y: ny, width, height } = node.clickArea;
      return x >= nx && x <= nx + width && y >= ny && y <= ny + height;
    });

    setHoveredNode(hovered?.resource || null);
    
    // Update cursor based on mode
    if (connectionMode) {
      canvasRef.current.style.cursor = hovered ? 'crosshair' : 'crosshair';
    } else if (hovered) {
      canvasRef.current.style.cursor = 'move';
    } else if (isDragging) {
      canvasRef.current.style.cursor = 'grabbing';
    } else {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseDown = (e) => {
    // Don't allow dragging in connection mode
    if (connectionMode) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicking on a node
    const clickedNode = Object.values(nodePositions).find(node => {
      if (node.isVpc || node.isSubnet || !node.clickArea) return false;
      const { x: nx, y: ny, width, height } = node.clickArea;
      return x >= nx && x <= nx + width && y >= ny && y <= ny + height;
    });

    if (clickedNode) {
      // Start dragging node
      setIsDraggingNode(true);
      setDraggedNode(clickedNode);
      setDragOffset({
        x: x - clickedNode.x,
        y: y - clickedNode.y
      });
    } else {
      // Start panning canvas
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingNode(false);
    setDraggedNode(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setZoom(0.8);
    setPan({ x: 50, y: 50 });
    setSelectedNode(null);
    setManualPositions({});
  };
  
  const fitToScreen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const cloudBounds = getCloudBounds();
    
    if (!cloudBounds) return;
    
    const padding = 100;
    const contentWidth = cloudBounds.width + padding * 2;
    const contentHeight = cloudBounds.height + padding * 2;
    
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
    setPan({
      x: (rect.width - contentWidth * newZoom) / 2 + padding * newZoom,
      y: (rect.height - contentHeight * newZoom) / 2 + padding * newZoom
    });
  };
  
  const zoomIn = () => setZoom(prev => Math.min(3, prev * 1.2));
  const zoomOut = () => setZoom(prev => Math.max(0.3, prev / 1.2));

  const downloadDiagram = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'aws-architecture-diagram.png';
    link.href = url;
    link.click();
  };

  const handleCreateRelationship = async (data) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_URL}/api/relationships`, {
        source_resource_id: data.source.id,
        target_resource_id: data.target.id,
        relationship_type: data.relationship_type,
        direction: data.direction,
        port: data.port || null,
        protocol: data.protocol || null,
        label: data.label || null,
        description: data.description || null,
        status: data.status || 'active',
        auto_detected: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Relationship created successfully!');
      setShowRelationshipModal(false);
      setNewRelationshipData(null);
      
      // Refresh relationships
      await fetchRelationships();
      drawDiagram();
    } catch (error) {
      console.error('Failed to create relationship:', error);
      alert(`Failed to create relationship: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading architecture diagram...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Layers className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">AWS Architecture Diagram</h1>
            <span className="text-sm text-gray-500">
              {filteredResources.length} resources
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </button>
            <button onClick={() => navigate('/resources')} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
              <Database className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Resources</span>
            </button>
            <button onClick={toggleLanguage} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <Globe className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4 flex-wrap">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Account:</span>
          <select
            value={selectedAccount || ''}
            onChange={(e) => {
              setSelectedAccount(e.target.value || null);
              setSelectedRegion(null);
              setSelectedVpc(null);
            }}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">All Accounts</option>
            {accounts.map(a => (
              <option key={a} value={a}>{a.length > 12 ? `...${a.slice(-8)}` : a}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Region:</span>
          <select
            value={selectedRegion || ''}
            onChange={(e) => {
              setSelectedRegion(e.target.value || null);
              setSelectedVpc(null);
            }}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">All Regions</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">VPC:</span>
          <select
            value={selectedVpc || ''}
            onChange={(e) => setSelectedVpc(e.target.value || null)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">All VPCs</option>
            {vpcs.map(v => (
              <option key={v} value={v}>{v === 'no-vpc' ? 'No VPC' : `...${v.slice(-8)}`}</option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Canvas Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Canvas:</span>
          <button
            onClick={zoomOut}
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={fitToScreen}
            className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
            title="Fit to Screen"
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset View"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={downloadDiagram}
            className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"
            title="Download Diagram"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Relationships */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Connections:</span>
          <button
            onClick={() => setShowConnections(!showConnections)}
            className={`p-1.5 rounded ${showConnections ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
            title={showConnections ? 'Hide Connections' : 'Show Connections'}
          >
            {showConnections ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <span className="text-xs text-gray-600">
            {relationships.length} links
          </span>
          <button
            onClick={extractRelationships}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
            title="Extract relationships from imported data"
          >
            <GitBranch className="w-3 h-3 inline mr-1" />
            Extract
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Resource Type Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Show:</span>
          <button
            onClick={toggleAllTypes}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            {visibleTypes.size === availableTypes.length ? 'Main Only' : 'All Types'}
          </button>
          
          {/* Main resource types as checkboxes */}
          {['ec2', 's3', 'vpc', 'rds', 'codepipeline', 'rabbitmq'].map(type => {
            const count = resources.filter(r => r.type?.toLowerCase() === type).length;
            if (count === 0) return null;
            return (
              <label key={type} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={visibleTypes.has(type)}
                  onChange={() => toggleType(type)}
                  className="rounded"
                />
                <span className="font-medium" style={{ color: getServiceColor(type) }}>
                  {type.toUpperCase()}
                </span>
                <span className="text-gray-500">({count})</span>
              </label>
            );
          })}
          
          {/* Show count of other types */}
          {availableTypes.filter(t => !['ec2', 'instance', 's3', 'vpc', 'subnet', 'rds', 'aurora', 'codepipeline', 'rabbitmq', 'mq'].includes(t)).length > 0 && (
            <details className="relative">
              <summary className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 cursor-pointer list-none">
                +{availableTypes.filter(t => !['ec2', 'instance', 's3', 'vpc', 'subnet', 'rds', 'aurora', 'codepipeline', 'rabbitmq', 'mq'].includes(t)).length} more
              </summary>
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-10 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1 min-w-[300px]">
                  {availableTypes.filter(t => !['ec2', 'instance', 's3', 'vpc', 'subnet', 'rds', 'aurora', 'codepipeline', 'rabbitmq', 'mq'].includes(t)).map(type => {
                    const count = resources.filter(r => r.type?.toLowerCase() === type).length;
                    return (
                      <label key={type} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={visibleTypes.has(type)}
                          onChange={() => toggleType(type)}
                          className="rounded"
                        />
                        <span className="font-medium truncate" style={{ color: getServiceColor(type) }}>
                          {type}
                        </span>
                        <span className="text-gray-500">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* View controls */}
        <button
          onClick={() => setShowConnections(!showConnections)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${showConnections ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
        >
          {showConnections ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Connections
        </button>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-white rounded">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="px-2 text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-1.5 hover:bg-white rounded">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <button onClick={resetView} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>

        <button onClick={downloadDiagram} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          <Download className="w-4 h-4" />
          Export PNG
        </button>

        <div className="h-6 w-px bg-gray-300" />

        {/* Connection Mode Toggle */}
        <button 
          onClick={() => {
            setConnectionMode(!connectionMode);
            if (connectionMode) {
              // Cancel any in-progress connection
              setRelationshipSource(null);
              setIsDrawingRelationship(false);
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            connectionMode 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Click to toggle connection mode"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {connectionMode ? 'Connection Mode ON' : 'Add Connection'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative">
          {/* Connection Mode Instruction Banner */}
          {connectionMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 text-sm animate-pulse">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <div className="font-bold">Connection Mode Active</div>
                <div className="text-xs text-green-100">
                  {relationshipSource 
                    ? `Click target resource to connect with "${relationshipSource.name}"` 
                    : 'Click first resource to start connection'}
                </div>
              </div>
              <button
                onClick={() => {
                  setConnectionMode(false);
                  setRelationshipSource(null);
                  setIsDrawingRelationship(false);
                }}
                className="ml-2 p-1 hover:bg-green-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {filteredResources.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Resources</h3>
                <p className="text-gray-500">Select different filters or import resources</p>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          )}
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l shadow-lg overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Resource Details</h3>
              <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                  style={{ backgroundColor: getServiceColor(selectedNode.type) }}
                >
                  {getServiceEmoji(selectedNode.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedNode.name || 'Unnamed'}</h4>
                  <p className="text-sm text-gray-500">{getServiceLabel(selectedNode.type)}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {selectedNode.resource_id && (
                  <div><span className="font-medium">ID:</span> <span className="font-mono text-xs">{selectedNode.resource_id}</span></div>
                )}
                {selectedNode.status && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${selectedNode.status === 'active' || selectedNode.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedNode.status}
                    </span>
                  </div>
                )}
                {selectedNode.region && <div><span className="font-medium">Region:</span> {selectedNode.region}</div>}
                {selectedNode.vpc_id && <div><span className="font-medium">VPC:</span> <span className="font-mono text-xs">{selectedNode.vpc_id}</span></div>}
                {selectedNode.subnet_id && <div><span className="font-medium">Subnet:</span> <span className="font-mono text-xs">{selectedNode.subnet_id}</span></div>}
                {selectedNode.private_ip && <div><span className="font-medium">Private IP:</span> {selectedNode.private_ip}</div>}
                {selectedNode.public_ip && <div><span className="font-medium">Public IP:</span> {selectedNode.public_ip}</div>}
              </div>

              <button
                onClick={() => navigate(`/resources?search=${selectedNode.resource_id || selectedNode.name}`)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                View in Resources
              </button>
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
                  <div className="font-semibold text-blue-900 mb-1">From: {newRelationshipData.source.name}</div>
                  <div className="text-blue-700">→</div>
                  <div className="font-semibold text-blue-900 mt-1">To: {newRelationshipData.target.name}</div>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleCreateRelationship({
                  source: newRelationshipData.source,
                  target: newRelationshipData.target,
                  relationship_type: formData.get('relationship_type'),
                  direction: formData.get('direction'),
                  port: formData.get('port'),
                  protocol: formData.get('protocol'),
                  label: formData.get('label'),
                  description: formData.get('description'),
                  status: 'active'
                });
              }} className="space-y-4">
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
                    <option value="applies_to">Applies To</option>
                    <option value="manages">Manages</option>
                    <option value="monitors">Monitors</option>
                    <option value="backs_up">Backs Up</option>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Additional details..."
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
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchitectureDiagram;
