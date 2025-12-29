import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Download, X, RefreshCw, Layers
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// Custom Node Components with Professional AWS Styling
function ResourceNode({ data }) {
  const color = getServiceColor(data.resource.type);
  return (
    <div
      className="group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-2 min-w-[140px] overflow-hidden"
      style={{ borderColor: color }}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      
      {/* Gradient Header */}
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`
        }}
      />
      
      <div className="p-2.5">
        {/* Icon and Title */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`
            }}
          >
            {getServiceEmoji(data.resource.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs text-gray-900 truncate" title={data.resource.name}>
              {data.resource.name || data.resource.resource_id?.slice(-8)}
            </div>
            <div className="text-[10px] font-medium text-gray-500">
              {data.resource.type?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {data.resource.status && (
          <div className="flex items-center gap-1 mt-1.5">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                data.resource.status === 'active' || data.resource.status === 'running'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <div className={`w-1 h-1 rounded-full ${
                data.resource.status === 'active' || data.resource.status === 'running'
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-gray-400'
              }`} />
              {data.resource.status}
            </div>
          </div>
        )}
      </div>

      {/* Hover Effect Border */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          boxShadow: `0 0 0 2px ${color}40`
        }}
      />
    </div>
  );
}

function VPCNode({ data }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed border-purple-400 bg-gradient-to-br from-purple-50 via-purple-50/50 to-transparent p-4 shadow-inner w-full h-full"
    >
      {/* VPC Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-md border border-purple-200 mb-3 inline-flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-md flex items-center justify-center text-white text-base shadow-lg">
          🔒
        </div>
        <div>
          <div className="font-bold text-purple-900 text-xs">VPC</div>
          <div className="text-[10px] text-purple-700 font-mono">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

function AccountNode({ data }) {
  return (
    <div
      className="rounded-2xl border-3 border-blue-300 bg-gradient-to-br from-blue-50 via-blue-50/30 to-transparent p-6 shadow-xl w-full h-full"
    >
      {/* Account Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 shadow-lg mb-4 inline-flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white text-xl shadow-lg">
          🏢
        </div>
        <div>
          <div className="text-[10px] font-medium text-blue-100 uppercase tracking-wider">AWS Account</div>
          <div className="font-bold text-white text-base font-mono">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  resource: ResourceNode,
  vpc: VPCNode,
  account: AccountNode,
};

function ArchitectureDiagramFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [resources, setResources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [newRelationshipData, setNewRelationshipData] = useState(null);
  const [connectionMode, setConnectionMode] = useState(false);
  
  // Filters - using Set for unchecked items (inverse logic - all checked by default)
  const [uncheckedAccounts, setUncheckedAccounts] = useState(new Set());
  const [uncheckedVPCs, setUncheckedVPCs] = useState(new Set());
  const [uncheckedTypes, setUncheckedTypes] = useState(new Set());
  const [showAccountFilter, setShowAccountFilter] = useState(false);
  const [showVPCFilter, setShowVPCFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
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
  const types = useMemo(() => {
    const visibleAccounts = accounts.filter(acc => !uncheckedAccounts.has(acc));
    const visibleVPCs = vpcs.filter(vpc => !uncheckedVPCs.has(vpc));
    const typeSet = new Set(
      resources
        .filter(r => 
          visibleAccounts.includes(r.account_id) &&
          (visibleVPCs.length === 0 || visibleVPCs.includes(r.vpc_id))
        )
        .map(r => r.type)
        .filter(Boolean)
    );
    return Array.from(typeSet);
  }, [resources, accounts, vpcs, uncheckedAccounts, uncheckedVPCs]);
  
  // Filtered resources - show all except unchecked items
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (uncheckedAccounts.has(r.account_id)) return false;
      if (uncheckedVPCs.has(r.vpc_id)) return false;
      if (uncheckedTypes.has(r.type)) return false;
      return true;
    });
  }, [resources, uncheckedAccounts, uncheckedVPCs, uncheckedTypes]);

  useEffect(() => {
    fetchResources();
    fetchRelationships();
  }, []);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/api/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
        return;
      }
      const response = await axios.get(`${API_URL}/api/relationships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRelationships(response.data || []);
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
      if (error.response?.status === 401) {
        console.warn('Unauthorized - token may be expired');
      }
      setRelationships([]);
    }
  };

  // Convert resources to React Flow nodes with hierarchy
  useEffect(() => {
    if (filteredResources.length === 0) {
      setNodes([]);
      return;
    }

    const flowNodes = [];
    const accountGroups = {};
    
    // Filter out container-type resources (VPC, subnet, etc.) - they are containers, not resources
    const containerTypes = ['vpc', 'subnet', 'internet-gateway', 'nat-gateway', 'route-table', 'network-acl'];
    const actualResources = filteredResources.filter(r => 
      !containerTypes.includes(r.type?.toLowerCase())
    );
    
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
          flowNodes.push({
            id: vpcNodeId,
            type: 'vpc',
            position: { x: 60, y: vpcY }, // Relative to account
            data: { label: vpcId },
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
            
            flowNodes.push({
              id: resource.id.toString(),
              type: 'resource',
              position: {
                x: resourceGap + col * (resourceWidth + resourceGap),
                y: 70 + row * (resourceHeight + resourceGap), // Relative to VPC
              },
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
            
            flowNodes.push({
              id: resource.id.toString(),
              type: 'resource',
              position: {
                x: 80 + resourceGap + col * (resourceWidth + resourceGap),
                y: vpcY + row * (resourceHeight + resourceGap),
              },
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
      flowNodes.unshift({
        id: accountNodeId,
        type: 'account',
        position: { x: accountX, y: accountY },
        data: { label: accountId },
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
  }, [filteredResources, setNodes]);

  // Convert relationships to React Flow edges with enhanced styling
  useEffect(() => {
    if (relationships.length === 0) {
      setEdges([]);
      return;
    }

    const flowEdges = relationships.map((rel) => ({
      id: rel.id.toString(),
      source: rel.source_resource_id.toString(),
      target: rel.target_resource_id.toString(),
      label: rel.label || rel.relationship_type,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3B82F6',
        width: 20,
        height: 20,
      },
      style: {
        stroke: '#3B82F6',
        strokeWidth: 3,
      },
      labelStyle: {
        fill: '#1F2937',
        fontWeight: 600,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: '#FFFFFF',
        fillOpacity: 0.9,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
    }));

    setEdges(flowEdges);
  }, [relationships, setEdges]);

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

  const onNodeDoubleClick = useCallback(
    (event, node) => {
      navigate(`/resources?edit=${node.data.resource.id}`);
    },
    [navigate]
  );

  const handleCreateRelationship = async (data) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/api/relationships`,
        {
          source_resource_id: data.source_resource_id,
          target_resource_id: data.target_resource_id,
          relationship_type: data.relationship_type,
          direction: data.direction,
          port: data.port || null,
          protocol: data.protocol || null,
          label: data.label || null,
          description: data.description || null,
          status: data.status || 'active',
          auto_detected: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('Relationship created successfully!');
      setShowRelationshipModal(false);
      setNewRelationshipData(null);

      await fetchRelationships();
    } catch (error) {
      console.error('Failed to create relationship:', error);
      alert(`Failed to create relationship: ${error.response?.data?.detail || error.message}`);
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
          <button
            onClick={() => navigate('/resources')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Back to Resources
          </button>
        </div>

        {/* Filters with Checkboxes */}
        <div className="flex items-center gap-6 flex-wrap">
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

          <div className="text-sm text-gray-600">
            Showing {filteredResources.length} of {resources.length} resources
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
          minZoom={0.1}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 3 },
          }}
        >
          <Background 
            color="#E5E7EB" 
            gap={20} 
            size={1.5}
            variant="dots"
          />
          <Controls 
            showInteractive={false}
            className="bg-white shadow-lg rounded-lg border border-gray-200"
          />
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
        </ReactFlow>
      </div>

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
    </div>
  );
}

export default ArchitectureDiagramFlow;
