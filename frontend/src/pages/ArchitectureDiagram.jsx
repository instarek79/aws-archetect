import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Network, Download, RefreshCw, Layers, Filter, X, Database, Sparkles, Globe, LogOut, LayoutDashboard } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ArchitectureDiagram() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Filters
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedVPC, setSelectedVPC] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const [vpcs, setVPCs] = useState([]);
  
  // View modes
  const [showConnections, setShowConnections] = useState(true);
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy', 'network', 'flat'
  const [connectionType, setConnectionType] = useState('all'); // 'all', 'vpc', 'dependencies', 'attached'

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [resources, selectedAccount, selectedVPC]);

  useEffect(() => {
    if (filteredResources.length > 0) {
      drawDiagram();
    }
  }, [filteredResources, zoom, pan, selectedNode, showConnections, connectionType]);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/resources/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setResources(data);
      
      // Extract unique accounts and VPCs
      const uniqueAccounts = [...new Set(data.map(r => r.account_id).filter(a => a))];
      const uniqueVPCs = [...new Set(data.map(r => r.vpc_id).filter(v => v))];
      setAccounts(uniqueAccounts);
      setVPCs(uniqueVPCs);
      
    } catch (error) {
      console.error('Failed to fetch resources', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = resources;
    
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(r => r.account_id === selectedAccount);
    }
    
    if (selectedVPC !== 'all') {
      filtered = filtered.filter(r => r.vpc_id === selectedVPC);
    }
    
    setFilteredResources(filtered);
  };

  const getResourceColor = (type) => {
    const colors = {
      ec2: '#FF9900',
      s3: '#569A31',
      rds: '#527FFF',
      lambda: '#FF9900',
      vpc: '#4B92D4',
      elb: '#8C4FFF',
      cloudfront: '#8B5CF6',
      route53: '#10B981',
      dynamodb: '#527FFF',
      sns: '#FF6B6B',
      sqs: '#FF9F1C'
    };
    return colors[type] || '#6B7280';
  };

  const getResourceIcon = (type) => {
    const icons = {
      ec2: '🖥️',
      s3: '🪣',
      rds: '🗃️',
      lambda: 'λ',
      vpc: '🔒',
      elb: '⚖️',
      cloudfront: '🌐',
      route53: '🌍',
      dynamodb: '📊',
      sns: '📨',
      sqs: '📬'
    };
    return icons[type] || '📦';
  };

  const getCriticalInfo = (resource) => {
    // Extract critical connection info based on resource type
    const props = resource.type_specific_properties || {};
    
    if (resource.type === 'rds' && props.endpoint) {
      // Show endpoint:port for RDS
      return props.port ? `${props.endpoint.split('.')[0]}:${props.port}` : props.endpoint.split('.')[0];
    }
    
    if (resource.type === 'elb' && props.dns_name) {
      // Show shortened DNS name for load balancers
      const parts = props.dns_name.split('.');
      return parts[0]; // Just show the first part
    }
    
    if (resource.type === 'lambda' && props.runtime) {
      // Show runtime for Lambda
      return props.runtime;
    }
    
    return null;
  };

  const drawDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Organize resources by Region → VPC → Subnet
    const structure = organizeResources(filteredResources);
    
    let yOffset = 50;
    
    // Draw each region
    Object.entries(structure).forEach(([region, vpcs]) => {
      const regionHeight = calculateRegionHeight(vpcs);
      
      // Region background
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(50, yOffset, 1400, regionHeight);
      
      // Region label
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(region.toUpperCase(), 70, yOffset + 35);
      
      let xOffset = 70;
      let maxHeightInRow = 0;
      
      // Draw VPCs within region
      Object.entries(vpcs).forEach(([vpcId, subnets], vpcIndex) => {
        const vpcWidth = 450;
        const vpcHeight = calculateVPCHeight(subnets);
        
        // Check if we need to wrap to next row
        if (xOffset + vpcWidth > 1400) {
          xOffset = 70;
          yOffset += maxHeightInRow + 30;
          maxHeightInRow = 0;
        }
        
        // VPC container
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.strokeRect(xOffset, yOffset + 60, vpcWidth, vpcHeight);
        
        // VPC label
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`VPC: ${vpcId || 'Default'}`, xOffset + 10, yOffset + 80);
        
        let subnetYOffset = yOffset + 100;
        
        // Draw subnets within VPC
        Object.entries(subnets).forEach(([subnetId, resourcesInSubnet]) => {
          const subnetHeight = Math.ceil(resourcesInSubnet.length / 3) * 100 + 60;
          
          // Check if this is the multi-subnet section
          const isMultiSubnet = subnetId === 'multi-subnet';
          
          // Subnet container
          if (isMultiSubnet) {
            // Multi-subnet resources: different color and style
            ctx.strokeStyle = '#F59E0B'; // Orange for multi-subnet
            ctx.fillStyle = '#FEF3C744'; // Light orange background
            ctx.fillRect(xOffset + 10, subnetYOffset, vpcWidth - 20, subnetHeight);
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
          } else {
            // Regular subnet
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
          }
          ctx.strokeRect(xOffset + 10, subnetYOffset, vpcWidth - 20, subnetHeight);
          ctx.setLineDash([]);
          
          // Subnet label
          if (isMultiSubnet) {
            ctx.fillStyle = '#D97706'; // Orange text
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('🌐 Multi-Subnet Resources', xOffset + 20, subnetYOffset + 20);
          } else {
            ctx.fillStyle = '#047857';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`Subnet: ${subnetId || 'Default'}`, xOffset + 20, subnetYOffset + 20);
          }
          
          // Draw resources in subnet
          resourcesInSubnet.forEach((resource, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const resX = xOffset + 20 + (col * 130);
            const resY = subnetYOffset + 35 + (row * 90);
            
            // Resource card
            drawResourceNode(ctx, resource, resX, resY);
          });
          
          subnetYOffset += subnetHeight + 15;
        });
        
        maxHeightInRow = Math.max(maxHeightInRow, vpcHeight + 80);
        xOffset += vpcWidth + 30;
      });
      
      yOffset += maxHeightInRow + 50;
    });

    // Draw resources without VPC (global resources like S3, CloudFront)
    const globalResources = filteredResources.filter(r => !r.vpc_id);
    if (globalResources.length > 0) {
      ctx.fillStyle = '#FEF3C7';
      const globalHeight = Math.ceil(globalResources.length / 3) * 100 + 80;
      ctx.fillRect(50, yOffset, 1400, globalHeight);
      
      ctx.fillStyle = '#92400E';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('GLOBAL / NO VPC', 70, yOffset + 35);
      
      globalResources.forEach((resource, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const resX = 90 + (col * 450);
        const resY = yOffset + 60 + (row * 90);
        drawResourceNode(ctx, resource, resX, resY);
      });
    }

    // Draw connection lines between resources
    drawConnections(ctx);

    ctx.restore();
  };

  const drawResourceNode = (ctx, resource, x, y) => {
    const width = 120;
    const height = 75;
    const isSelected = selectedNode && selectedNode.id === resource.id;
    
    // Shadow
    if (isSelected) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    } else {
      ctx.shadowBlur = 5;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
    }
    
    // Background
    ctx.fillStyle = getResourceColor(resource.type);
    roundRect(ctx, x, y, width, height, 8, true, false);
    ctx.shadowBlur = 0;
    
    // Status indicator
    const statusColors = {
      running: '#10B981',
      stopped: '#EF4444',
      available: '#10B981',
      'in-use': '#3B82F6',
      pending: '#F59E0B',
      terminated: '#6B7280',
      unknown: '#9CA3AF'
    };
    ctx.fillStyle = statusColors[resource.status] || '#9CA3AF';
    ctx.beginPath();
    ctx.arc(x + width - 10, y + 10, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Icon
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(getResourceIcon(resource.type), x + 8, y + 32);
    
    // Name
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const truncatedName = resource.name.length > 11 ? resource.name.substring(0, 11) + '...' : resource.name;
    ctx.fillText(truncatedName, x + 38, y + 25);
    
    // Type
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#FFFFFFCC';
    ctx.fillText(resource.type.toUpperCase(), x + 38, y + 38);
    
    // Show critical info: endpoint for RDS, DNS for ELB
    const criticalInfo = getCriticalInfo(resource);
    if (criticalInfo) {
      ctx.font = '8px sans-serif';
      ctx.fillStyle = '#FFFFFFAA';
      const truncatedInfo = criticalInfo.length > 15 ? criticalInfo.substring(0, 15) + '...' : criticalInfo;
      ctx.fillText(truncatedInfo, x + 38, y + 48);
    }
    
    // Environment badge
    if (resource.environment) {
      ctx.font = '8px sans-serif';
      const envText = resource.environment.toUpperCase();
      const envWidth = ctx.measureText(envText).width + 8;
      ctx.fillStyle = '#00000033';
      roundRect(ctx, x + 8, y + 48, envWidth, 14, 3, true, false);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(envText, x + 12, y + 58);
    }
    
    // Instance type badge (if exists)
    if (resource.instance_type) {
      ctx.font = '8px sans-serif';
      const typeText = resource.instance_type;
      const typeWidth = ctx.measureText(typeText).width + 8;
      ctx.fillStyle = '#00000033';
      roundRect(ctx, x + width - typeWidth - 8, y + height - 20, typeWidth, 14, 3, true, false);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(typeText, x + width - typeWidth - 4, y + height - 10);
    }
    
    // Multi-subnet badge (if resource spans multiple subnets)
    if (resource._isMultiSubnet && resource._subnetList) {
      ctx.font = 'bold 9px sans-serif';
      const subnetCount = resource._subnetList.length;
      const badgeText = `${subnetCount} Subnets`;
      const badgeWidth = ctx.measureText(badgeText).width + 12;
      
      // Orange badge for multi-subnet
      ctx.fillStyle = '#F59E0B';
      roundRect(ctx, x + 8, y + height - 20, badgeWidth, 14, 3, true, false);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(badgeText, x + 14, y + height - 10);
    }
    
    // Border for selected
    if (isSelected) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      roundRect(ctx, x, y, width, height, 8, false, true);
    }
    
    // Store click area
    resource._clickArea = { x, y, width, height };
  };

  // Draw connection lines between resources
  const drawConnections = (ctx) => {
    if (!showConnections) return;
    
    // Build a map of resource positions by multiple identifiers
    const resourcePositions = {};
    filteredResources.forEach(r => {
      if (r._clickArea) {
        const pos = {
          x: r._clickArea.x + r._clickArea.width / 2,
          y: r._clickArea.y + r._clickArea.height / 2,
          resource: r
        };
        // Map by multiple identifiers for flexible matching
        if (r.resource_id) resourcePositions[r.resource_id] = pos;
        if (r.name) resourcePositions[r.name] = pos;
        if (r.arn) resourcePositions[r.arn] = pos;
        if (r.id) resourcePositions[`id:${r.id}`] = pos;
      }
    });
    
    // Helper to find target position
    const findTarget = (id) => {
      if (!id) return null;
      return resourcePositions[id] || resourcePositions[`id:${id}`];
    };
    
    // Draw connections
    filteredResources.forEach(resource => {
      if (!resource._clickArea) return;
      
      const sourceX = resource._clickArea.x + resource._clickArea.width / 2;
      const sourceY = resource._clickArea.y + resource._clickArea.height / 2;
      
      // Draw VPC connections (resources in same VPC)
      if ((connectionType === 'all' || connectionType === 'vpc') && resource.vpc_id) {
        const sameVpcResources = filteredResources.filter(r => 
          r.id !== resource.id && 
          r.vpc_id === resource.vpc_id && 
          r._clickArea
        );
        
        sameVpcResources.forEach(target => {
          const targetX = target._clickArea.x + target._clickArea.width / 2;
          const targetY = target._clickArea.y + target._clickArea.height / 2;
          
          // Only draw if resources are different types (to avoid clutter)
          if (resource.type !== target.type) {
            drawConnectionLine(ctx, sourceX, sourceY, targetX, targetY, '#3B82F633', 1, 'vpc');
          }
        });
      }
      
      // Draw dependency connections
      if ((connectionType === 'all' || connectionType === 'dependencies')) {
        const deps = Array.isArray(resource.dependencies) ? resource.dependencies : [];
        deps.forEach(depId => {
          const target = findTarget(depId);
          if (target) {
            drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#EF4444', 2, 'dependency');
          }
        });
      }
      
      // Draw connected_resources connections
      if ((connectionType === 'all' || connectionType === 'dependencies')) {
        const connected = Array.isArray(resource.connected_resources) ? resource.connected_resources : [];
        connected.forEach(connId => {
          const target = findTarget(connId);
          if (target) {
            drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#10B981', 2, 'connected');
          }
        });
      }
      
      // Draw attached_to connections (new field)
      if ((connectionType === 'all' || connectionType === 'attached') && resource.attached_to) {
        const target = findTarget(resource.attached_to);
        if (target) {
          drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#F59E0B', 2, 'attached');
        }
      }
      
      // Draw parent_resource connections (hierarchical)
      if ((connectionType === 'all' || connectionType === 'attached') && resource.parent_resource) {
        const target = findTarget(resource.parent_resource);
        if (target) {
          drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#6366F1', 1.5, 'parent');
        }
      }
      
      // Draw target_resources connections (ELB targets, etc.)
      if ((connectionType === 'all' || connectionType === 'attached')) {
        const targets = Array.isArray(resource.target_resources) ? resource.target_resources : [];
        targets.forEach(targetId => {
          const target = findTarget(targetId);
          if (target) {
            drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#8B5CF6', 2, 'loadbalancer');
          }
        });
      }
      
      // Draw source_resources connections (resources connecting TO this)
      if ((connectionType === 'all' || connectionType === 'dependencies')) {
        const sources = Array.isArray(resource.source_resources) ? resource.source_resources : [];
        sources.forEach(sourceId => {
          const srcPos = findTarget(sourceId);
          if (srcPos) {
            drawConnectionLine(ctx, srcPos.x, srcPos.y, sourceX, sourceY, '#EC4899', 2, 'source');
          }
        });
      }
      
      // Legacy: Draw from type_specific_properties (backward compatibility)
      if ((connectionType === 'all' || connectionType === 'attached')) {
        const attachedTo = resource.type_specific_properties?.attached_instance || 
                          resource.type_specific_properties?.attached_to;
        if (attachedTo && !resource.attached_to) {
          const target = findTarget(attachedTo);
          if (target) {
            drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#F59E0B', 2, 'attached');
          }
        }
        
        // ELB to target instances from type_specific_properties
        const targetGroups = resource.type_specific_properties?.target_instances ||
                            resource.type_specific_properties?.targets;
        if (targetGroups && Array.isArray(targetGroups) && (!resource.target_resources || resource.target_resources.length === 0)) {
          targetGroups.forEach(targetId => {
            const target = findTarget(targetId);
            if (target) {
              drawConnectionLine(ctx, sourceX, sourceY, target.x, target.y, '#8B5CF6', 2, 'loadbalancer');
            }
          });
        }
      }
    });
  };
  
  // Draw a single connection line with arrow
  const drawConnectionLine = (ctx, x1, y1, x2, y2, color, width, type) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    
    // Different line styles for different connection types
    if (type === 'vpc') {
      ctx.setLineDash([5, 5]);
    } else if (type === 'dependency') {
      ctx.setLineDash([10, 5]);
    } else {
      ctx.setLineDash([]);
    }
    
    // Draw curved line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Calculate control points for bezier curve
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Curve offset based on distance
    const curveOffset = Math.min(50, dist * 0.2);
    const perpX = -dy / dist * curveOffset;
    const perpY = dx / dist * curveOffset;
    
    ctx.quadraticCurveTo(midX + perpX, midY + perpY, x2, y2);
    ctx.stroke();
    
    // Draw arrow at end
    if (type !== 'vpc') {
      const angle = Math.atan2(y2 - (midY + perpY), x2 - (midX + perpX));
      const arrowSize = 8;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowSize * Math.cos(angle - Math.PI / 6),
        y2 - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - arrowSize * Math.cos(angle + Math.PI / 6),
        y2 - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  };

  const roundRect = (ctx, x, y, width, height, radius, fill, stroke) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  const organizeResources = (resourceList) => {
    const structure = {};
    
    resourceList.forEach(resource => {
      const region = resource.region || 'unknown';
      const vpcId = resource.vpc_id || 'no-vpc';
      
      // Check for multi-subnet resources (RDS, ELB, etc.)
      const subnetGroups = resource.type_specific_properties?.subnet_groups || 
                          resource.type_specific_properties?.subnets;
      
      if (subnetGroups && Array.isArray(subnetGroups) && subnetGroups.length > 1) {
        // Multi-subnet resource - place in special "multi-subnet" section
        const multiSubnetKey = 'multi-subnet';
        
        if (!structure[region]) structure[region] = {};
        if (!structure[region][vpcId]) structure[region][vpcId] = {};
        if (!structure[region][vpcId][multiSubnetKey]) structure[region][vpcId][multiSubnetKey] = [];
        
        // Mark resource as multi-subnet and store subnet list
        resource._isMultiSubnet = true;
        resource._subnetList = subnetGroups;
        structure[region][vpcId][multiSubnetKey].push(resource);
      } else {
        // Single subnet resource - normal behavior
        const subnetId = resource.subnet_id || (subnetGroups && subnetGroups[0]) || 'no-subnet';
        
        if (!structure[region]) structure[region] = {};
        if (!structure[region][vpcId]) structure[region][vpcId] = {};
        if (!structure[region][vpcId][subnetId]) structure[region][vpcId][subnetId] = [];
        
        structure[region][vpcId][subnetId].push(resource);
      }
    });
    
    return structure;
  };

  const calculateVPCHeight = (subnets) => {
    let totalHeight = 40;
    Object.values(subnets).forEach(resources => {
      const subnetHeight = Math.ceil(resources.length / 3) * 100 + 60;
      totalHeight += subnetHeight + 15;
    });
    return totalHeight;
  };

  const calculateRegionHeight = (vpcs) => {
    let maxHeight = 0;
    Object.values(vpcs).forEach(subnets => {
      const vpcHeight = calculateVPCHeight(subnets);
      maxHeight = Math.max(maxHeight, vpcHeight);
    });
    return maxHeight + 120;
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const clickedResource = filteredResources.find(r => {
      if (!r._clickArea) return false;
      const area = r._clickArea;
      return x >= area.x && x <= area.x + area.width &&
             y >= area.y && y <= area.y + area.height;
    });

    setSelectedNode(clickedResource || null);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(2, prev * delta)));
  };

  const downloadDiagram = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'aws-architecture-diagram.png';
    link.href = url;
    link.click();
  };

  const resetView = () => {
    setZoom(0.8);
    setPan({ x: 50, y: 50 });
    setSelectedNode(null);
  };

  const clearFilters = () => {
    setSelectedAccount('all');
    setSelectedVPC('all');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation Toolbar */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Architecture Diagram
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-medium">{t('dashboardTitle') || 'Dashboard'}</span>
              </button>
              <button
                onClick={() => navigate('/resources')}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">{t('resources') || 'Resources'}</span>
              </button>
              <button
                onClick={() => navigate('/ai-insights')}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{t('aiInsights') || 'AI Insights'}</span>
              </button>
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {i18n.language === 'en' ? 'العربية' : 'English'}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">{t('logout') || 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Header with Filters */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('architectureDiagram') || 'Architecture Diagram'}
              </h1>
              <p className="text-sm text-gray-600">
                {filteredResources.length} resources
                {selectedAccount !== 'all' && ` • Account: ${selectedAccount}`}
                {selectedVPC !== 'all' && ` • VPC: ${selectedVPC}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetView}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset View
            </button>
            <button
              onClick={downloadDiagram}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Accounts</option>
            {accounts.map(account => (
              <option key={account} value={account}>{account}</option>
            ))}
          </select>

          <select
            value={selectedVPC}
            onChange={(e) => setSelectedVPC(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All VPCs</option>
            {vpcs.map(vpc => (
              <option key={vpc} value={vpc}>{vpc}</option>
            ))}
          </select>

          {(selectedAccount !== 'all' || selectedVPC !== 'all') && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
          
          {/* Separator */}
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          
          {/* Connection Controls */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showConnections}
              onChange={(e) => setShowConnections(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Show Connections</span>
          </label>
          
          {showConnections && (
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Connections</option>
              <option value="vpc">VPC Only</option>
              <option value="dependencies">Dependencies</option>
              <option value="attached">Attached Resources</option>
            </select>
          )}
        </div>
        
        {/* Connection Legend */}
        {showConnections && (
          <div className="mt-3 flex items-center gap-6 text-xs">
            <span className="text-gray-500 font-medium">Connection Types:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-300" style={{borderStyle: 'dashed'}}></div>
              <span className="text-gray-600">Same VPC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-green-500"></div>
              <span className="text-gray-600">Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-yellow-500"></div>
              <span className="text-gray-600">Attached</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-purple-500"></div>
              <span className="text-gray-600">Target/LB</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-indigo-500"></div>
              <span className="text-gray-600">Parent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-pink-500"></div>
              <span className="text-gray-600">Source</span>
            </div>
          </div>
        )}
      </div>

      {/* Diagram Area */}
      <div className="flex-1 flex min-h-[600px]">
        {/* Canvas */}
        <div className="flex-1 relative min-h-full">
          {filteredResources.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No Resources
                </h3>
                <p className="text-gray-500">
                  {resources.length > 0 
                    ? 'No resources match the selected filters'
                    : 'Add AWS resources to see your architecture diagram'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-move"
                style={{ touchAction: 'none' }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />

              {/* Zoom Controls */}
              <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
                <button
                  onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                  className="px-3 py-2 hover:bg-gray-100 rounded"
                >
                  +
                </button>
                <div className="text-xs text-center text-gray-600">
                  {Math.round(zoom * 100)}%
                </div>
                <button
                  onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
                  className="px-3 py-2 hover:bg-gray-100 rounded"
                >
                  −
                </button>
              </div>

              {/* Legend */}
              <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-sm mb-2">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 border-2 border-blue-500"></div>
                    <span>VPC Container</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 border-2 border-green-500" style={{borderStyle: 'dashed'}}></div>
                    <span>Subnet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Running/Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Stopped</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Side Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l shadow-lg p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Resource Details</h3>
              <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-4xl mb-2">{getResourceIcon(selectedNode.type)}</div>
                <h4 className="font-semibold text-gray-900">{selectedNode.name}</h4>
                <p className="text-sm text-gray-600">{selectedNode.type.toUpperCase()}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Region:</span> {selectedNode.region}
                </div>
                {selectedNode.account_id && (
                  <div>
                    <span className="font-medium">Account:</span> <span className="font-mono text-xs">{selectedNode.account_id}</span>
                  </div>
                )}
                {selectedNode.status && (
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedNode.status === 'running' ? 'bg-green-100 text-green-800' :
                      selectedNode.status === 'stopped' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedNode.status}
                    </span>
                  </div>
                )}
                {selectedNode.environment && (
                  <div>
                    <span className="font-medium">Environment:</span> {selectedNode.environment}
                  </div>
                )}
                {selectedNode.vpc_id && (
                  <div>
                    <span className="font-medium">VPC:</span> {selectedNode.vpc_id}
                  </div>
                )}
                {selectedNode.subnet_id && (
                  <div>
                    <span className="font-medium">Subnet:</span> {selectedNode.subnet_id}
                  </div>
                )}
                {selectedNode.availability_zone && (
                  <div>
                    <span className="font-medium">AZ:</span> {selectedNode.availability_zone}
                  </div>
                )}
                {selectedNode.instance_type && (
                  <div>
                    <span className="font-medium">Instance Type:</span> {selectedNode.instance_type}
                  </div>
                )}
                {selectedNode.public_ip && (
                  <div>
                    <span className="font-medium">Public IP:</span> {selectedNode.public_ip}
                  </div>
                )}
                {selectedNode.private_ip && (
                  <div>
                    <span className="font-medium">Private IP:</span> {selectedNode.private_ip}
                  </div>
                )}
              </div>

              {selectedNode.security_groups && selectedNode.security_groups.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Security Groups</h5>
                  <div className="space-y-1">
                    {selectedNode.security_groups.map((sg, i) => (
                      <div key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {sg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Dependencies</h5>
                  <div className="space-y-1">
                    {selectedNode.dependencies.map((dep, i) => (
                      <div key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.connected_resources && selectedNode.connected_resources.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Connected Resources</h5>
                  <div className="space-y-1">
                    {selectedNode.connected_resources.map((conn, i) => (
                      <div key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                        {conn}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type-Specific Properties */}
              {selectedNode.type_specific_properties && Object.keys(selectedNode.type_specific_properties).length > 0 && (
                <div className="border-t pt-4">
                  <h5 className="font-medium text-sm mb-3 text-indigo-600">
                    {selectedNode.type.toUpperCase()} Properties
                  </h5>
                  <div className="space-y-2 text-sm">
                    {/* RDS-specific */}
                    {selectedNode.type === 'rds' && (
                      <>
                        {selectedNode.type_specific_properties.endpoint && (
                          <div className="bg-blue-50 p-2 rounded">
                            <span className="font-medium text-blue-900">Endpoint:</span>
                            <div className="text-xs text-blue-700 font-mono break-all">
                              {selectedNode.type_specific_properties.endpoint}
                            </div>
                          </div>
                        )}
                        {selectedNode.type_specific_properties.port && (
                          <div>
                            <span className="font-medium">Port:</span> {selectedNode.type_specific_properties.port}
                          </div>
                        )}
                        {selectedNode.type_specific_properties.engine && (
                          <div>
                            <span className="font-medium">Engine:</span> {selectedNode.type_specific_properties.engine}
                            {selectedNode.type_specific_properties.engine_version && (
                              <span className="text-gray-600"> ({selectedNode.type_specific_properties.engine_version})</span>
                            )}
                          </div>
                        )}
                        {selectedNode.type_specific_properties.db_instance_class && (
                          <div>
                            <span className="font-medium">Instance Class:</span> {selectedNode.type_specific_properties.db_instance_class}
                          </div>
                        )}
                        {selectedNode.type_specific_properties.multi_az && (
                          <div className="text-green-600 font-medium">
                            ✓ Multi-AZ Enabled
                          </div>
                        )}
                        {selectedNode.type_specific_properties.subnet_groups && selectedNode.type_specific_properties.subnet_groups.length > 0 && (
                          <div>
                            <span className="font-medium">Subnet Groups:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedNode.type_specific_properties.subnet_groups.map((sg, i) => (
                                <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                  {sg}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* ELB-specific */}
                    {selectedNode.type === 'elb' && (
                      <>
                        {selectedNode.type_specific_properties.dns_name && (
                          <div className="bg-blue-50 p-2 rounded">
                            <span className="font-medium text-blue-900">DNS Name:</span>
                            <div className="text-xs text-blue-700 font-mono break-all">
                              {selectedNode.type_specific_properties.dns_name}
                            </div>
                          </div>
                        )}
                        {selectedNode.type_specific_properties.lb_type && (
                          <div>
                            <span className="font-medium">Type:</span> {selectedNode.type_specific_properties.lb_type.toUpperCase()}
                          </div>
                        )}
                        {selectedNode.type_specific_properties.scheme && (
                          <div>
                            <span className="font-medium">Scheme:</span> {selectedNode.type_specific_properties.scheme}
                          </div>
                        )}
                        {selectedNode.type_specific_properties.subnets && selectedNode.type_specific_properties.subnets.length > 0 && (
                          <div>
                            <span className="font-medium">Subnets:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedNode.type_specific_properties.subnets.map((subnet, i) => (
                                <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                  {subnet}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedNode.type_specific_properties.target_groups && selectedNode.type_specific_properties.target_groups.length > 0 && (
                          <div>
                            <span className="font-medium">Target Groups:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedNode.type_specific_properties.target_groups.map((tg, i) => (
                                <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                                  {tg}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedNode.type_specific_properties.listeners && (
                          <div>
                            <span className="font-medium">Listeners:</span> {selectedNode.type_specific_properties.listeners}
                          </div>
                        )}
                      </>
                    )}

                    {/* Lambda-specific */}
                    {selectedNode.type === 'lambda' && selectedNode.type_specific_properties.runtime && (
                      <>
                        <div>
                          <span className="font-medium">Runtime:</span> {selectedNode.type_specific_properties.runtime}
                        </div>
                        {selectedNode.type_specific_properties.memory_mb && (
                          <div>
                            <span className="font-medium">Memory:</span> {selectedNode.type_specific_properties.memory_mb} MB
                          </div>
                        )}
                        {selectedNode.type_specific_properties.timeout_seconds && (
                          <div>
                            <span className="font-medium">Timeout:</span> {selectedNode.type_specific_properties.timeout_seconds}s
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchitectureDiagram;
