import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Search, ChevronRight, ChevronDown, RefreshCw,
  X, Plus, Link2, Layers, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';

// Colors per service type
const TYPE_COLORS = {
  route53_record: '#8C4FFF', route53: '#8C4FFF',
  elb: '#8C4FFF', alb: '#8C4FFF', nlb: '#8C4FFF', elasticloadbalancing: '#8C4FFF',
  ec2: '#FF9900', instance: '#FF9900',
  rds: '#527FFF', aurora: '#527FFF', dynamodb: '#4053D6', elasticache: '#C925D1',
  cloudfront: '#8C4FFF',
  s3: '#569A31',
  codepipeline: '#4053D6', codebuild: '#4053D6', codecommit: '#4053D6', codedeploy: '#4053D6',
  ecs: '#FF9900', eks: '#FF9900',
};
const TYPE_LABELS = {
  route53_record: 'DNS Record', route53: 'Hosted Zone',
  elb: 'Load Balancer', alb: 'ALB', nlb: 'NLB', elasticloadbalancing: 'ELB',
  ec2: 'EC2', instance: 'EC2',
  rds: 'RDS', aurora: 'Aurora', dynamodb: 'DynamoDB', elasticache: 'ElastiCache',
  cloudfront: 'CloudFront', s3: 'S3',
  codepipeline: 'Pipeline', codebuild: 'CodeBuild', codecommit: 'CodeCommit', codedeploy: 'CodeDeploy',
  ecs: 'ECS', eks: 'EKS',
};
const TYPE_ICONS = {
  route53_record: 'R53', route53: 'R53',
  elb: 'ALB', alb: 'ALB', nlb: 'NLB', elasticloadbalancing: 'ELB',
  ec2: 'EC2', instance: 'EC2',
  rds: 'RDS', aurora: 'AUR', dynamodb: 'DDB', elasticache: 'ELC',
  cloudfront: 'CF', s3: 'S3',
  codepipeline: 'PIP', codebuild: 'BLD', codecommit: 'GIT', codedeploy: 'DEP',
  ecs: 'ECS', eks: 'EKS',
};

function ResourcesNavigator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [urlFlows, setUrlFlows] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [expandedZones, setExpandedZones] = useState(new Set());
  
  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  
  // Manual link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [flowsRes, resourcesRes] = await Promise.all([
        axios.get(`${API_URL}/api/resources/url-flows`),
        axios.get(`${API_URL}/api/resources/?limit=10000`),
      ]);
      setUrlFlows(flowsRes.data);
      setAllResources(resourcesRes.data.filter(r => r.type !== 'route53' && r.type !== 'route53_record'));
      if (flowsRes.data.length > 0) setSelectedUrl(flowsRes.data[0]);
      // Auto-expand all zones
      const zones = new Set(flowsRes.data.map(f => f.zone_name || 'Unknown Zone'));
      setExpandedZones(zones);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setError('Failed to load data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Group URLs by zone
  const groupedUrls = useMemo(() => {
    const groups = {};
    const q = searchQuery.toLowerCase();
    urlFlows.forEach(flow => {
      if (q && !flow.url?.toLowerCase().includes(q) && !flow.record_type?.toLowerCase().includes(q)) return;
      const zone = flow.zone_name || 'Unknown Zone';
      if (!groups[zone]) groups[zone] = [];
      groups[zone].push(flow);
    });
    return groups;
  }, [urlFlows, searchQuery]);

  // Build canvas nodes and edges from selectedUrl
  const buildDiagram = useCallback(() => {
    if (!selectedUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    
    const nodes = [];
    const edges = [];
    let nodeId = 0;
    
    const addNode = (resource, col, row, totalInCol, label) => {
      const colSpacing = 220;
      const startX = 80;
      const x = startX + col * colSpacing;
      const rowHeight = Math.min(90, (H - 100) / Math.max(totalInCol, 1));
      const startY = (H / 2) - ((totalInCol - 1) * rowHeight / 2);
      const y = startY + row * rowHeight;
      const id = nodeId++;
      nodes.push({ id, resource, x, y, col, label });
      return id;
    };
    
    // Column 0: DNS Record
    const dnsId = addNode(selectedUrl.record, 0, 0, 1, selectedUrl.url);
    
    // Column 1: ALBs / CloudFront (direct targets)
    const col1 = [...(selectedUrl.albs || []), ...(selectedUrl.cloudfront || [])];
    const col1Ids = [];
    col1.forEach((r, i) => {
      const id = addNode(r, 1, i, col1.length);
      col1Ids.push(id);
      edges.push({ from: dnsId, to: id, label: selectedUrl.record_type === 'A' ? 'ALIAS' : 'CNAME' });
    });
    
    // If no direct targets, show placeholder
    if (col1.length === 0 && selectedUrl.record_values?.length > 0) {
      const placeholderId = nodeId++;
      nodes.push({
        id: placeholderId,
        resource: { name: selectedUrl.record_values[0], type: 'unknown', status: 'unresolved' },
        x: 80 + 220, y: H / 2, col: 1, label: selectedUrl.record_values[0],
        isPlaceholder: true,
      });
    }
    
    // Column 2: EC2 instances
    const ec2s = selectedUrl.ec2_instances || [];
    const col2Ids = [];
    ec2s.forEach((r, i) => {
      const id = addNode(r, 2, i, ec2s.length);
      col2Ids.push(id);
      // Connect from ALBs
      col1Ids.forEach(albId => {
        const albNode = nodes.find(n => n.id === albId);
        if (albNode && ['elb', 'alb', 'nlb', 'elasticloadbalancing'].includes(albNode.resource.type)) {
          edges.push({ from: albId, to: id, label: 'HTTP' });
        }
      });
    });
    
    // Column 3: Databases
    const dbs = selectedUrl.databases || [];
    dbs.forEach((r, i) => {
      const id = addNode(r, 3, i, dbs.length);
      // Connect from EC2s
      if (col2Ids.length > 0) {
        edges.push({ from: col2Ids[0], to: id, label: 'Query' });
      }
    });
    
    // Column 4: S3 + Pipelines
    const extras = [...(selectedUrl.s3_buckets || []), ...(selectedUrl.pipelines || []), ...(selectedUrl.other || [])];
    extras.forEach((r, i) => {
      const id = addNode(r, 4, i, extras.length);
      // Connect from EC2 or ALB
      if (col2Ids.length > 0) {
        edges.push({ from: col2Ids[0], to: id, label: '' });
      } else if (col1Ids.length > 0) {
        edges.push({ from: col1Ids[0], to: id, label: '' });
      }
    });
    
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [selectedUrl]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Grid
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 0.5;
    const gs = 30;
    for (let x = (pan.x % gs + gs) % gs; x < rect.width; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
    }
    for (let y = (pan.y % gs + gs) % gs; y < rect.height; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
    }
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    
    // Draw edges
    edges.forEach(edge => {
      const from = nodes.find(n => n.id === edge.from);
      const to = nodes.find(n => n.id === edge.to);
      if (!from || !to) return;
      
      const nodeW = 180, nodeH = 70;
      const x1 = from.x + nodeW;
      const y1 = from.y + nodeH / 2;
      const x2 = to.x;
      const y2 = to.y + nodeH / 2;
      
      // Curved line
      const cpx = (x1 + x2) / 2;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cpx, y1, cpx, y2, x2, y2);
      ctx.stroke();
      
      // Arrow
      const angle = Math.atan2(y2 - y1, x2 - cpx);
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 8 * Math.cos(angle - 0.4), y2 - 8 * Math.sin(angle - 0.4));
      ctx.lineTo(x2 - 8 * Math.cos(angle + 0.4), y2 - 8 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      
      // Label
      if (edge.label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 8;
        ctx.fillStyle = '#64748B';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, mx, my);
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const nodeW = 180, nodeH = 70;
      const x = node.x, y = node.y;
      const color = TYPE_COLORS[node.resource?.type] || '#64748B';
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.resource?.id;
      
      // Shadow
      if (isHovered || isSelected) {
        ctx.shadowColor = color + '60';
        ctx.shadowBlur = 15;
      }
      
      // Card background
      ctx.fillStyle = isSelected ? '#1E3A5F' : '#1E293B';
      ctx.strokeStyle = isHovered || isSelected ? color : '#334155';
      ctx.lineWidth = isHovered || isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, nodeW, nodeH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Color bar on left
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, 5, nodeH, [8, 0, 0, 8]);
      ctx.fill();
      
      // Icon circle
      ctx.fillStyle = color + '30';
      ctx.beginPath();
      ctx.arc(x + 28, y + nodeH / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = 'bold 9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TYPE_ICONS[node.resource?.type] || '?', x + 28, y + nodeH / 2);
      
      // Name
      ctx.fillStyle = '#F1F5F9';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let name = node.resource?.name || 'Unknown';
      if (name.length > 20) name = name.substring(0, 18) + '..';
      ctx.fillText(name, x + 48, y + 10);
      
      // Type label
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(TYPE_LABELS[node.resource?.type] || node.resource?.type || '', x + 48, y + 26);
      
      // Account / IP info
      ctx.fillStyle = '#64748B';
      ctx.font = '9px Inter, system-ui, sans-serif';
      const info = node.resource?.private_ip || node.resource?.instance_type || 
                   (node.resource?.account_id ? `Acct: ...${node.resource.account_id.slice(-4)}` : '');
      if (info) ctx.fillText(info, x + 48, y + 42);
      
      // Status dot
      if (node.resource?.status) {
        const active = ['active', 'running', 'deployed', 'available'].includes(node.resource.status);
        ctx.fillStyle = active ? '#22C55E' : '#EF4444';
        ctx.beginPath();
        ctx.arc(x + nodeW - 14, y + 14, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Store hit area
      node.hitX = x; node.hitY = y; node.hitW = nodeW; node.hitH = nodeH;
    });
    
    // Title bar
    if (selectedUrl) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 600, 36);
      ctx.fillStyle = '#8C4FFF';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${selectedUrl.url}  [${selectedUrl.record_type || 'A'}]  →  ${selectedUrl.record_values?.join(', ') || ''}`, 12, 18);
    }
    
    ctx.restore();
  }, [selectedUrl, zoom, pan, hoveredNode, selectedNode]);

  useEffect(() => { buildDiagram(); }, [buildDiagram]);
  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // Canvas event handlers
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  };
  
  const findNodeAt = (pos) => {
    return nodesRef.current.find(n => 
      pos.x >= n.hitX && pos.x <= n.hitX + n.hitW && pos.y >= n.hitY && pos.y <= n.hitY + n.hitH
    );
  };

  const handleCanvasClick = (e) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos);
    setSelectedNode(node ? node.resource : null);
    drawCanvas();
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos);
    if (node !== hoveredNode) {
      setHoveredNode(node || null);
    }
    if (canvasRef.current) canvasRef.current.style.cursor = node ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
  };

  const handleMouseDown = (e) => { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(3, z * (e.deltaY > 0 ? 0.9 : 1.1)))); };

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  // Manual link
  const handleManualLink = async (targetResource) => {
    if (!selectedUrl) return;
    try {
      await axios.post(`${API_URL}/api/resources/url-link`, {
        record_id: selectedUrl.record_id,
        target_resource_id: targetResource.id,
        label: 'manual_link',
      });
      setShowLinkModal(false);
      setLinkSearch('');
      fetchData();
    } catch (err) {
      console.error('Failed to link', err);
      alert('Failed to create link: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredLinkResources = useMemo(() => {
    if (!linkSearch) return [];
    const q = linkSearch.toLowerCase();
    return allResources.filter(r =>
      r.name?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q) || r.resource_id?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allResources, linkSearch]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-white">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading URL flows...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      <NavBar />
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-bold">URL Navigator</h1>
          <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-700 rounded">{urlFlows.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => navigate('/architecture')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">
            <Layers className="w-3 h-3" /> Diagram
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main Canvas */}
        <div className="flex-1 relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 text-sm">Retry</button>
              </div>
            </div>
          ) : !selectedUrl ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg text-slate-300 mb-2">Select a URL record</h3>
                <p className="text-sm text-slate-500">Choose a DNS record from the sidebar</p>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          )}
          
          {/* Canvas controls */}
          <div className="absolute top-4 left-4 flex gap-1">
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700"><ZoomIn className="w-3.5 h-3.5" /></button>
            <span className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-[10px]">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button onClick={resetView} className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700"><Maximize2 className="w-3.5 h-3.5" /></button>
          </div>
          
          {/* Manual link button */}
          {selectedUrl && (
            <div className="absolute bottom-4 left-4">
              <button 
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-xs font-medium shadow-lg"
              >
                <Link2 className="w-3.5 h-3.5" /> Link Resource
              </button>
            </div>
          )}
          
          {/* Selected node detail panel */}
          {selectedNode && (
            <div className="absolute top-0 right-0 w-72 h-full bg-slate-800 border-l border-slate-700 z-10 flex flex-col shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-xs">Resource Details</h3>
                <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-700 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[10px]"
                    style={{ backgroundColor: TYPE_COLORS[selectedNode.type] || '#64748B' }}>
                    {TYPE_ICONS[selectedNode.type] || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedNode.name}</p>
                    <p className="text-slate-400">{TYPE_LABELS[selectedNode.type] || selectedNode.type}</p>
                  </div>
                </div>
                {[
                  ['Resource ID', selectedNode.resource_id],
                  ['Account', selectedNode.account_id],
                  ['Region', selectedNode.region],
                  ['Status', selectedNode.status],
                  ['VPC', selectedNode.vpc_id],
                  ['Subnet', selectedNode.subnet_id],
                  ['Instance Type', selectedNode.instance_type],
                  ['Private IP', selectedNode.private_ip],
                  ['Public IP', selectedNode.public_ip],
                  ['DNS Name', selectedNode.dns_name],
                  ['Environment', selectedNode.environment],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-mono text-slate-300 text-right max-w-[140px] truncate">{value}</span>
                  </div>
                ))}
                {selectedNode.type_specific_properties && Object.keys(selectedNode.type_specific_properties).length > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-400 font-medium mb-1">Properties</p>
                    {Object.entries(selectedNode.type_specific_properties).slice(0, 15).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5">
                        <span className="text-slate-500">{k.replace(/_/g, ' ')}</span>
                        <span className="text-slate-300 max-w-[120px] truncate font-mono text-[10px]">
                          {typeof v === 'object' ? JSON.stringify(v).slice(0, 25) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - URL Records grouped by zone */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-slate-700">
            <h3 className="font-bold text-xs mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" /> Route 53 DNS Records
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedUrls).length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Globe className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No DNS records found</p>
                <p className="text-[10px] mt-1">Rescan account 318 to import Route 53 records</p>
              </div>
            ) : (
              Object.entries(groupedUrls).map(([zone, records]) => (
                <div key={zone}>
                  <button
                    onClick={() => setExpandedZones(prev => {
                      const next = new Set(prev);
                      next.has(zone) ? next.delete(zone) : next.add(zone);
                      return next;
                    })}
                    className="w-full px-3 py-2 flex items-center gap-2 bg-slate-750 hover:bg-slate-700 border-b border-slate-700 text-left"
                  >
                    {expandedZones.has(zone) ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                    <Globe className="w-3 h-3 text-purple-400" />
                    <span className="text-xs font-semibold text-slate-300 flex-1 truncate">{zone}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{records.length}</span>
                  </button>
                  {expandedZones.has(zone) && records.map((flow, idx) => (
                    <div
                      key={`${flow.record_id}-${idx}`}
                      onClick={() => { setSelectedUrl(flow); setSelectedNode(null); resetView(); }}
                      className={`px-3 py-2 border-b border-slate-700/50 cursor-pointer transition hover:bg-slate-700 ${
                        selectedUrl?.record_id === flow.record_id ? 'bg-purple-900/30 border-l-2 border-l-purple-500' : 'pl-7'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-white">{flow.url}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1 py-0 bg-slate-700 text-slate-400 rounded">{flow.record_type}</span>
                            {flow.has_connections ? (
                              <span className="text-[10px] text-green-400">connected</span>
                            ) : (
                              <span className="text-[10px] text-slate-500">no match</span>
                            )}
                            {flow.albs?.length > 0 && <span className="text-[10px] px-1 bg-purple-900/50 text-purple-300 rounded">ALB</span>}
                            {flow.ec2_instances?.length > 0 && <span className="text-[10px] px-1 bg-orange-900/50 text-orange-300 rounded">{flow.ec2_instances.length} EC2</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowLinkModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-[500px] max-h-[600px] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" />
                Link Resource to: <span className="text-purple-300">{selectedUrl?.url}</span>
              </h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1 hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Search resources by name, type, or ID..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
              {filteredLinkResources.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-4">
                  {linkSearch ? 'No resources found' : 'Type to search resources...'}
                </p>
              ) : (
                filteredLinkResources.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleManualLink(r)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 cursor-pointer transition"
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[r.type] || '#64748B' }}>
                      {TYPE_ICONS[r.type] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{TYPE_LABELS[r.type] || r.type} &middot; Acct: ...{r.account_id?.slice(-4) || '?'}</p>
                    </div>
                    <Plus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcesNavigator;
