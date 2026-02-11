import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Compass, Search, Filter, ZoomIn, ZoomOut, Maximize2, 
  LayoutDashboard, LogOut, Globe, X, ChevronRight, ChevronDown,
  Link2, Unlink, Eye, Layers, Target, Circle, ArrowRight,
  Info, ExternalLink, RefreshCw, Home, Settings, Sparkles
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { AWSIcon, getServiceColor, AWS_SERVICE_COLORS } from '../components/AWSIcons';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8800';

// Linked/metadata resources - filtered out
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

// Relationship types with colors and labels
const RELATIONSHIP_TYPES = {
  vpc: { color: '#8C4FFF', label: 'Same VPC', dash: false },
  subnet: { color: '#6366F1', label: 'Same Subnet', dash: false },
  security_group: { color: '#EC4899', label: 'Security Group', dash: true },
  load_balancer: { color: '#F59E0B', label: 'Load Balanced', dash: false },
  database: { color: '#3B82F6', label: 'Database Connection', dash: false },
  storage: { color: '#10B981', label: 'Storage Access', dash: true },
  iam: { color: '#EF4444', label: 'IAM Relationship', dash: true },
};

function ResourcesNavigator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Data state
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation state
  const [focusedResource, setFocusedResource] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [expandedConnections, setExpandedConnections] = useState(new Set());
  const [viewMode, setViewMode] = useState('radial'); // 'radial', 'tree', 'list'
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  
  // Canvas state
  const [nodes, setNodes] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  
  // Animation state
  const [animationProgress, setAnimationProgress] = useState(1);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    const resourceId = searchParams.get('resource');
    if (resourceId && resources.length > 0) {
      const resource = resources.find(r => r.id === parseInt(resourceId) || r.resource_id === resourceId);
      if (resource) {
        setFocusedResource(resource);
        setSelectedResource(resource);
      }
    }
  }, [searchParams, resources]);

  useEffect(() => {
    if (focusedResource) {
      computeRadialLayout();
    }
  }, [focusedResource, expandedConnections, relationshipFilter]);

  useEffect(() => {
    if (nodes.length > 0) {
      startAnimation();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes]);

  useEffect(() => {
    drawCanvas();
  }, [nodes, zoom, pan, hoveredNode, selectedResource, animationProgress]);

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/resources/?limit=10000`);
      const mainResources = response.data.filter(r => !LINKED_RESOURCE_TYPES.has(r.type));
      setResources(mainResources);
      
      // Set initial focus to first resource or from URL
      if (mainResources.length > 0 && !searchParams.get('resource')) {
        setFocusedResource(mainResources[0]);
      }
    } catch (error) {
      console.error('Failed to fetch resources', error);
    } finally {
      setLoading(false);
    }
  };

  // Find related resources
  const findRelatedResources = useCallback((resource) => {
    if (!resource) return [];
    
    const related = [];
    const seen = new Set([resource.id]);
    
    resources.forEach(r => {
      if (seen.has(r.id)) return;
      
      let relationship = null;
      
      // Same VPC
      if (resource.vpc_id && r.vpc_id === resource.vpc_id && resource.vpc_id !== '') {
        relationship = { type: 'vpc', strength: 0.3 };
      }
      
      // Same Subnet (stronger connection)
      if (resource.subnet_id && r.subnet_id === resource.subnet_id && resource.subnet_id !== '') {
        relationship = { type: 'subnet', strength: 0.6 };
      }
      
      // Security Group relationship
      if (resource.type === 'security_group' && r.vpc_id === resource.vpc_id) {
        relationship = { type: 'security_group', strength: 0.5 };
      }
      
      // Load Balancer to EC2
      if ((resource.type === 'elb' || resource.type === 'elasticloadbalancing') && 
          (r.type === 'ec2' || r.type === 'instance') && 
          r.vpc_id === resource.vpc_id) {
        relationship = { type: 'load_balancer', strength: 0.8 };
      }
      
      // EC2 to RDS
      if ((resource.type === 'ec2' || resource.type === 'instance') && 
          (r.type === 'rds' || r.type === 'aurora') && 
          r.vpc_id === resource.vpc_id) {
        relationship = { type: 'database', strength: 0.7 };
      }
      
      // Lambda to DynamoDB
      if (resource.type === 'lambda' && r.type === 'dynamodb') {
        relationship = { type: 'database', strength: 0.6 };
      }
      
      // EC2 to S3 (same account)
      if ((resource.type === 'ec2' || resource.type === 'instance') && 
          r.type === 's3' && 
          r.account_id === resource.account_id) {
        relationship = { type: 'storage', strength: 0.4 };
      }
      
      // IAM Role connections
      if (resource.type === 'iam_role' && r.account_id === resource.account_id) {
        relationship = { type: 'iam', strength: 0.3 };
      }
      
      if (relationship && (relationshipFilter === 'all' || relationshipFilter === relationship.type)) {
        related.push({ resource: r, ...relationship });
        seen.add(r.id);
      }
    });
    
    // Sort by strength and limit
    return related.sort((a, b) => b.strength - a.strength).slice(0, 30);
  }, [resources, relationshipFilter]);

  // Compute radial layout around focused resource
  const computeRadialLayout = useCallback(() => {
    if (!focusedResource) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    
    const newNodes = [];
    
    // Center node (focused resource)
    newNodes.push({
      id: focusedResource.id,
      resource: focusedResource,
      x: centerX,
      y: centerY,
      targetX: centerX,
      targetY: centerY,
      radius: 45,
      isCenter: true,
      ring: 0,
    });
    
    // First ring - direct connections
    const directRelated = findRelatedResources(focusedResource);
    const ring1Radius = 180;
    const ring1Count = Math.min(directRelated.length, 12);
    
    directRelated.slice(0, ring1Count).forEach((rel, idx) => {
      const angle = (idx / ring1Count) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * ring1Radius;
      const y = centerY + Math.sin(angle) * ring1Radius;
      
      newNodes.push({
        id: rel.resource.id,
        resource: rel.resource,
        x: centerX,
        y: centerY,
        targetX: x,
        targetY: y,
        radius: 35,
        isCenter: false,
        ring: 1,
        relationship: rel,
        angle,
      });
      
      // Second ring - expanded connections
      if (expandedConnections.has(rel.resource.id)) {
        const secondaryRelated = findRelatedResources(rel.resource)
          .filter(sr => sr.resource.id !== focusedResource.id && 
                       !directRelated.some(dr => dr.resource.id === sr.resource.id));
        
        const ring2Radius = 120;
        const ring2Count = Math.min(secondaryRelated.length, 5);
        
        secondaryRelated.slice(0, ring2Count).forEach((sr, sidx) => {
          const spreadAngle = 0.3;
          const sangle = angle + (sidx - ring2Count / 2) * spreadAngle;
          const sx = x + Math.cos(sangle) * ring2Radius;
          const sy = y + Math.sin(sangle) * ring2Radius;
          
          newNodes.push({
            id: sr.resource.id,
            resource: sr.resource,
            x: x,
            y: y,
            targetX: sx,
            targetY: sy,
            radius: 28,
            isCenter: false,
            ring: 2,
            relationship: sr,
            parentId: rel.resource.id,
            angle: sangle,
          });
        });
      }
    });
    
    setNodes(newNodes);
    setAnimationProgress(0);
  }, [focusedResource, findRelatedResources, expandedConnections]);

  // Animation
  const startAnimation = () => {
    const animate = () => {
      setAnimationProgress(prev => {
        if (prev >= 1) return 1;
        return prev + 0.05;
      });
      if (animationProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  // Easing function
  const easeOutElastic = (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || resources.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Grid pattern
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = (pan.x % gridSize); x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = (pan.y % gridSize); y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    const progress = easeOutElastic(Math.min(animationProgress, 1));
    
    // Draw connections first
    nodes.forEach(node => {
      if (node.isCenter) return;
      
      const parentNode = node.parentId 
        ? nodes.find(n => n.id === node.parentId)
        : nodes.find(n => n.isCenter);
      
      if (!parentNode) return;
      
      const x = node.x + (node.targetX - node.x) * progress;
      const y = node.y + (node.targetY - node.y) * progress;
      const px = parentNode.x + (parentNode.targetX - parentNode.x) * progress;
      const py = parentNode.y + (parentNode.targetY - parentNode.y) * progress;
      
      // Connection line
      const relType = RELATIONSHIP_TYPES[node.relationship?.type] || RELATIONSHIP_TYPES.vpc;
      ctx.strokeStyle = relType.color;
      ctx.lineWidth = 2 * (node.relationship?.strength || 0.5);
      
      if (relType.dash) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Animated pulse on connection
      if (hoveredNode?.id === node.id || selectedResource?.id === node.resource.id) {
        const pulseProgress = (Date.now() % 1000) / 1000;
        const pulseX = px + (x - px) * pulseProgress;
        const pulseY = py + (y - py) * pulseProgress;
        
        ctx.fillStyle = relType.color;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const x = node.x + (node.targetX - node.x) * progress;
      const y = node.y + (node.targetY - node.y) * progress;
      const radius = Math.max(1, node.radius * progress);
      
      // Skip drawing if radius is too small
      if (radius < 2) return;
      
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedResource?.id === node.resource.id;
      const isExpanded = expandedConnections.has(node.id);
      
      // Glow effect for center/hovered/selected
      if ((node.isCenter || isHovered || isSelected) && radius > 10) {
        const glowRadius = radius + 15;
        const gradient = ctx.createRadialGradient(x, y, Math.max(1, radius), x, y, glowRadius);
        const color = getServiceColor(node.resource.type);
        gradient.addColorStop(0, color + '60');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Node circle
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = isSelected ? '#FFFFFF' : getServiceColor(node.resource.type);
      ctx.lineWidth = isHovered || isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Inner colored circle (only if radius is big enough)
      const innerRadius = Math.max(1, radius - 8);
      if (innerRadius > 1) {
        ctx.fillStyle = getServiceColor(node.resource.type);
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Icon placeholder (type initial)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(12, radius * 0.5)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const typeLabel = node.resource.type?.substring(0, 3).toUpperCase() || '?';
      ctx.fillText(typeLabel, x, y);
      
      // Resource name label
      if (radius > 25) {
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '11px Inter, system-ui, sans-serif';
        const name = truncateText(node.resource.name || 'Unnamed', 15);
        ctx.fillText(name, x, y + radius + 14);
      }
      
      // Expand indicator
      if (node.ring === 1 && !isExpanded) {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.fillText('+', x + radius - 5, y - radius + 5);
      }
      
      // Store click area
      node.currentX = x;
      node.currentY = y;
    });
    
    ctx.restore();
    
    // Draw legend
    drawLegend(ctx, rect);
    
    // Request next frame for animations
    if (hoveredNode || selectedResource) {
      requestAnimationFrame(() => drawCanvas());
    }
  }, [nodes, zoom, pan, hoveredNode, selectedResource, animationProgress, expandedConnections, resources]);

  const truncateText = (text, maxLen) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
  };

  const drawLegend = (ctx, rect) => {
    const legendX = 20;
    const legendY = rect.height - 180;
    
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, 180, 160, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Relationship Types', legendX + 12, legendY + 22);
    
    let y = legendY + 45;
    Object.entries(RELATIONSHIP_TYPES).forEach(([key, rel]) => {
      ctx.strokeStyle = rel.color;
      ctx.lineWidth = 2;
      if (rel.dash) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(legendX + 12, y);
      ctx.lineTo(legendX + 40, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(rel.label, legendX + 50, y + 4);
      y += 18;
    });
  };

  // Event handlers
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const clicked = nodes.find(node => {
      const dx = x - node.currentX;
      const dy = y - node.currentY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    if (clicked) {
      if (clicked.ring === 1) {
        // Toggle expand for ring 1 nodes
        setExpandedConnections(prev => {
          const next = new Set(prev);
          if (next.has(clicked.id)) {
            next.delete(clicked.id);
          } else {
            next.add(clicked.id);
          }
          return next;
        });
      }
      setSelectedResource(clicked.resource);
    } else {
      setSelectedResource(null);
    }
  };

  const handleCanvasDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const clicked = nodes.find(node => {
      const dx = x - node.currentX;
      const dy = y - node.currentY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    if (clicked && !clicked.isCenter) {
      // Navigate to this resource as center
      setFocusedResource(clicked.resource);
      setExpandedConnections(new Set());
      setSearchParams({ resource: clicked.resource.resource_id || clicked.resource.id });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const hovered = nodes.find(node => {
      const dx = x - node.currentX;
      const dy = y - node.currentY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    setHoveredNode(hovered || null);
    canvasRef.current.style.cursor = hovered ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  // Filtered resources for search
  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources.slice(0, 50);
    const query = searchQuery.toLowerCase();
    return resources.filter(r => 
      r.name?.toLowerCase().includes(query) ||
      r.resource_id?.toLowerCase().includes(query) ||
      r.type?.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [resources, searchQuery]);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      {/* Navigation Bar */}
      <NavBar />
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold">Resources Navigator</h1>
          </div>
          <span className="text-sm text-slate-400 px-2 py-1 bg-slate-700 rounded">
            {resources.length} resources
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Dashboard</span>
          </button>
          <button onClick={() => navigate('/architecture')} className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
            <Layers className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Architecture</span>
          </button>
          <button onClick={toggleLanguage} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600">
            <Globe className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="p-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Sidebar - Resource Search & List */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          
          {/* Relationship Filter */}
          <div className="p-4 border-b border-slate-700">
            <label className="block text-xs text-slate-400 mb-2">Filter Relationships</label>
            <select
              value={relationshipFilter}
              onChange={(e) => setRelationshipFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Relationships</option>
              {Object.entries(RELATIONSHIP_TYPES).map(([key, rel]) => (
                <option key={key} value={key}>{rel.label}</option>
              ))}
            </select>
          </div>
          
          {/* Resource List */}
          <div className="flex-1 overflow-y-auto">
            {filteredResources.map(resource => (
              <div
                key={resource.id}
                onClick={() => {
                  setFocusedResource(resource);
                  setExpandedConnections(new Set());
                  setSearchParams({ resource: resource.resource_id || resource.id });
                }}
                className={`p-3 border-b border-slate-700 cursor-pointer transition hover:bg-slate-700 ${
                  focusedResource?.id === resource.id ? 'bg-cyan-900/30 border-l-2 border-l-cyan-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getServiceColor(resource.type) }}
                  >
                    {resource.type?.substring(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{resource.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-400 truncate">{resource.type}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          {resources.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Compass className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">No Resources Found</h3>
                <p className="text-slate-500 mb-4">Import some AWS resources to explore relationships</p>
                <button
                  onClick={() => navigate('/import')}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Import Resources
                </button>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          )}
          
          {/* Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button 
              onClick={() => setZoom(z => Math.min(3, z + 0.2))}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-center">
              {Math.round(zoom * 100)}%
            </div>
            <button 
              onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg text-xs text-slate-400">
            <span className="mr-4">🖱️ Click to select</span>
            <span className="mr-4">👆 Double-click to focus</span>
            <span>🔍 Scroll to zoom</span>
          </div>
        </div>

        {/* Right Sidebar - Resource Details */}
        {selectedResource && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold">Resource Details</h3>
              <button onClick={() => setSelectedResource(null)} className="p-1 hover:bg-slate-700 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: getServiceColor(selectedResource.type) }}
                >
                  {selectedResource.type?.substring(0, 3).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold">{selectedResource.name || 'Unnamed'}</h4>
                  <p className="text-sm text-slate-400">{selectedResource.type}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFocusedResource(selectedResource);
                    setExpandedConnections(new Set());
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 text-sm font-medium"
                >
                  <Target className="w-4 h-4" />
                  Focus Here
                </button>
                <button
                  onClick={() => navigate(`/resources?search=${selectedResource.resource_id || selectedResource.name}`)}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Properties */}
              <div className="space-y-2 text-sm">
                {selectedResource.resource_id && (
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400 text-xs block">Resource ID</span>
                    <span className="font-mono text-xs break-all">{selectedResource.resource_id}</span>
                  </div>
                )}
                {selectedResource.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      selectedResource.status === 'active' || selectedResource.status === 'running'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {selectedResource.status}
                    </span>
                  </div>
                )}
                {selectedResource.region && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Region:</span>
                    <span>{selectedResource.region}</span>
                  </div>
                )}
                {selectedResource.vpc_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">VPC:</span>
                    <span className="font-mono text-xs">...{selectedResource.vpc_id.slice(-8)}</span>
                  </div>
                )}
                {selectedResource.subnet_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subnet:</span>
                    <span className="font-mono text-xs">...{selectedResource.subnet_id.slice(-8)}</span>
                  </div>
                )}
                {selectedResource.private_ip && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Private IP:</span>
                    <span className="font-mono">{selectedResource.private_ip}</span>
                  </div>
                )}
                {selectedResource.public_ip && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Public IP:</span>
                    <span className="font-mono">{selectedResource.public_ip}</span>
                  </div>
                )}
              </div>

              {/* Related Resources */}
              <div>
                <h5 className="text-sm font-medium text-slate-400 mb-2">Related Resources</h5>
                <div className="space-y-1">
                  {findRelatedResources(selectedResource).slice(0, 5).map(rel => (
                    <div 
                      key={rel.resource.id}
                      onClick={() => setSelectedResource(rel.resource)}
                      className="p-2 bg-slate-700/50 rounded flex items-center gap-2 cursor-pointer hover:bg-slate-700"
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: RELATIONSHIP_TYPES[rel.type]?.color }}
                      />
                      <span className="text-sm flex-1 truncate">{rel.resource.name || 'Unnamed'}</span>
                      <span className="text-xs text-slate-400">{rel.resource.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResourcesNavigator;
