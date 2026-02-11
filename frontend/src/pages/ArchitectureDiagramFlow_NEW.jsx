import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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
  Download, X, RefreshCw, Layers, Sparkles, FileImage, FileText, Film, Brain, Network
} from 'lucide-react';
import axios from 'axios';
import dagre from 'dagre';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import GIF from 'gif.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';

// AWS Service Colors
const getServiceColor = (type) => {
  const colorMap = {
    ec2: '#FF9900',
    rds: '#527FFF',
    s3: '#569A31',
    lambda: '#FF9900',
    dynamodb: '#4053D6',
    elb: '#8C4FFF',
    alb: '#8C4FFF',
    nlb: '#8C4FFF',
    ecs: '#FF9900',
    eks: '#FF9900',
    vpc: '#4B5563',
    subnet: '#6B7280',
    'api-gateway': '#FF4F8B',
    cloudfront: '#8C4FFF',
    route53: '#8C4FFF',
    codepipeline: '#4B5563',
    codebuild: '#4B5563',
    codecommit: '#4B5563',
    codedeploy: '#4B5563',
  };
  return colorMap[type?.toLowerCase()] || '#6B7280';
};

const getServiceEmoji = (type) => {
  const emojiMap = {
    ec2: '🖥️',
    rds: '🗄️',
    s3: '🪣',
    lambda: 'λ',
    dynamodb: '⚡',
    elb: '⚖️',
    alb: '⚖️',
    nlb: '⚖️',
    ecs: '📦',
    eks: '☸️',
    'api-gateway': '🚪',
    cloudfront: '🌐',
    route53: '🌍',
    codepipeline: '🔄',
    codebuild: '🔨',
    codecommit: '📝',
    codedeploy: '🚀',
  };
  return emojiMap[type?.toLowerCase()] || '📦';
};

// Compact Resource Node (90px width)
function ResourceNode({ data, selected }) {
  const color = getServiceColor(data.resource.type);
  return (
    <div
      className={`group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-2 w-[90px] overflow-hidden ${
        selected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
      }`}
      style={{ borderColor: selected ? '#3B82F6' : color }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-blue-500 border border-white" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-blue-500 border border-white" />
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-blue-500 border border-white" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-blue-500 border border-white" />
      
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)` }} />
      
      <div className="p-1.5">
        <div className="flex flex-col items-center gap-1 mb-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-sm shadow-sm"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            {getServiceEmoji(data.resource.type)}
          </div>
          <div className="w-full text-center">
            <div className="font-semibold text-[9px] text-gray-900 truncate" title={data.resource.name}>
              {data.resource.name || data.resource.resource_id?.slice(-8)}
            </div>
            <div className="text-[8px] font-medium text-gray-500 truncate">
              {data.resource.type?.toUpperCase()}
            </div>
          </div>
        </div>

        {data.resource.status && (
          <div className="flex justify-center mt-1">
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium ${
              data.resource.status === 'active' || data.resource.status === 'running'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-1 h-1 rounded-full ${
                data.resource.status === 'active' || data.resource.status === 'running'
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-gray-400'
              }`} />
              <span>{data.resource.status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Cluster Group Node - Visual grouping box
function ClusterNode({ data }) {
  return (
    <div
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300 p-4"
      style={{
        width: data.width || 400,
        height: data.height || 300,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-blue-900">{data.label}</span>
        <span className="text-xs text-blue-600">({data.count} resources)</span>
      </div>
      <div className="text-xs text-blue-700">{data.description}</div>
    </div>
  );
}

// VPC Container Node
function VPCNode({ data }) {
  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-purple-700" />
        <div>
          <div className="font-bold text-sm text-purple-900">VPC</div>
          <div className="text-xs text-purple-700">{data.label}</div>
          {data.name && <div className="text-xs text-purple-600">{data.name}</div>}
        </div>
      </div>
    </div>
  );
}

// Account Container Node
function AccountNode({ data }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
          AWS
        </div>
        <div>
          <div className="font-bold text-sm text-blue-900">AWS ACCOUNT</div>
          <div className="text-xs text-blue-700">{data.label}</div>
          {data.name && <div className="text-xs text-blue-600">{data.name}</div>}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  resource: ResourceNode,
  cluster: ClusterNode,
  vpc: VPCNode,
  account: AccountNode,
};

export default function ArchitectureDiagramFlow() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [resources, setResources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedPositions, setSavedPositions] = useState({});
  const [previousPositions, setPreviousPositions] = useState({});
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [newRelationshipData, setNewRelationshipData] = useState(null);
  const [layoutMode, setLayoutMode] = useState('smart'); // 'smart', 'hierarchical', 'clustered'

  // Filters
  const [uncheckedAccounts, setUncheckedAccounts] = useState(new Set());
  const [uncheckedVPCs, setUncheckedVPCs] = useState(new Set());
  const [showAccountFilter, setShowAccountFilter] = useState(false);
  const [showVPCFilter, setShowVPCFilter] = useState(false);

  const accounts = useMemo(() => {
    const accountSet = new Set(resources.map(r => r.account_id || 'unknown'));
    return Array.from(accountSet);
  }, [resources]);

  const vpcs = useMemo(() => {
    const vpcSet = new Set(resources.map(r => r.vpc_id || 'no-vpc'));
    return Array.from(vpcSet);
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const accountMatch = !uncheckedAccounts.has(r.account_id || 'unknown');
      const vpcMatch = !uncheckedVPCs.has(r.vpc_id || 'no-vpc');
      return accountMatch && vpcMatch;
    });
  }, [resources, uncheckedAccounts, uncheckedVPCs]);

  useEffect(() => {
    fetchResources();
    fetchRelationships();
    
    const saved = localStorage.getItem('diagram_node_positions');
    if (saved) {
      try {
        setSavedPositions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved positions:', e);
      }
    }
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
      console.log('✅ Fetched relationships:', response.data.length);
      setRelationships(response.data || []);
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
      setRelationships([]);
    }
  };

  // INNOVATIVE CLUSTERING ALGORITHM
  const buildClusters = useCallback((resources, relationships) => {
    // Build adjacency list
    const adjacency = {};
    resources.forEach(r => {
      adjacency[r.id] = new Set();
    });

    relationships.forEach(rel => {
      const src = rel.source_resource_id;
      const tgt = rel.target_resource_id;
      if (adjacency[src]) adjacency[src].add(tgt);
      if (adjacency[tgt]) adjacency[tgt].add(src);
    });

    // Find connected components using Union-Find
    const parent = {};
    const rank = {};
    
    const find = (x) => {
      if (!parent[x]) parent[x] = x;
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };

    const union = (x, y) => {
      const px = find(x);
      const py = find(y);
      if (px === py) return;
      
      if (!rank[px]) rank[px] = 0;
      if (!rank[py]) rank[py] = 0;
      
      if (rank[px] < rank[py]) {
        parent[px] = py;
      } else if (rank[px] > rank[py]) {
        parent[py] = px;
      } else {
        parent[py] = px;
        rank[px]++;
      }
    };

    // Union all connected resources
    relationships.forEach(rel => {
      union(rel.source_resource_id, rel.target_resource_id);
    });

    // Group resources by cluster
    const clusters = {};
    resources.forEach(r => {
      const root = find(r.id);
      if (!clusters[root]) clusters[root] = [];
      clusters[root].push(r);
    });

    return Object.values(clusters).filter(c => c.length > 1); // Only clusters with 2+ resources
  }, []);

  // SMART LAYOUT ENGINE
  const applySmartLayout = useCallback(async () => {
    if (filteredResources.length === 0) return;

    setPreviousPositions({...savedPositions});

    const clusters = buildClusters(filteredResources, relationships);
    console.log(`🧠 Smart Layout: Found ${clusters.length} clusters`);

    const newPositions = {};
    let clusterX = 50;
    const clusterY = 150;
    const clusterGap = 100;

    // Layout each cluster separately
    clusters.forEach((clusterResources, idx) => {
      const graph = new dagre.graphlib.Graph();
      graph.setDefaultEdgeLabel(() => ({}));
      graph.setGraph({
        rankdir: 'LR',
        nodesep: 40,
        ranksep: 80,
        edgesep: 20,
      });

      // Add nodes
      clusterResources.forEach(r => {
        graph.setNode(r.id.toString(), { width: 90, height: 70 });
      });

      // Add edges within cluster
      const clusterIds = new Set(clusterResources.map(r => r.id));
      relationships.forEach(rel => {
        if (clusterIds.has(rel.source_resource_id) && clusterIds.has(rel.target_resource_id)) {
          graph.setEdge(rel.source_resource_id.toString(), rel.target_resource_id.toString());
        }
      });

      dagre.layout(graph);

      // Calculate cluster bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      clusterResources.forEach(r => {
        const node = graph.node(r.id.toString());
        if (node) {
          minX = Math.min(minX, node.x);
          maxX = Math.max(maxX, node.x);
          minY = Math.min(minY, node.y);
          maxY = Math.max(maxY, node.y);
        }
      });

      const clusterWidth = maxX - minX + 180;
      const clusterHeight = maxY - minY + 140;

      // Position nodes
      clusterResources.forEach(r => {
        const node = graph.node(r.id.toString());
        if (node) {
          newPositions[r.id] = {
            x: clusterX + (node.x - minX) + 40,
            y: clusterY + (node.y - minY) + 40,
            cluster: idx,
            clusterBounds: { x: clusterX, y: clusterY, width: clusterWidth, height: clusterHeight }
          };
        }
      });

      clusterX += clusterWidth + clusterGap;
    });

    // Position isolated resources in grid
    const isolated = filteredResources.filter(r => !newPositions[r.id]);
    let gridX = 50, gridY = clusterY + 400;
    isolated.forEach((r, i) => {
      newPositions[r.id] = {
        x: gridX + (i % 8) * 110,
        y: gridY + Math.floor(i / 8) * 90
      };
    });

    localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
    localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
    setSavedPositions(newPositions);
    window.location.reload();
  }, [filteredResources, relationships, savedPositions, buildClusters]);

  // Build nodes with cluster grouping
  useEffect(() => {
    if (filteredResources.length === 0) {
      setNodes([]);
      return;
    }

    const flowNodes = [];
    const clusters = buildClusters(filteredResources, relationships);
    const clusterMap = {};

    // Map resources to clusters
    clusters.forEach((clusterResources, idx) => {
      clusterResources.forEach(r => {
        clusterMap[r.id] = idx;
      });
    });

    // Add resource nodes
    filteredResources.forEach(resource => {
      const position = savedPositions[resource.id] || { x: 50 + Math.random() * 800, y: 150 + Math.random() * 400 };
      
      flowNodes.push({
        id: resource.id.toString(),
        type: 'resource',
        position: { x: position.x || 0, y: position.y || 0 },
        data: { resource },
        draggable: true,
      });
    });

    setNodes(flowNodes);
  }, [filteredResources, savedPositions, relationships, buildClusters]);

  // Build edges with enhanced styling
  useEffect(() => {
    if (relationships.length === 0) {
      setEdges([]);
      return;
    }

    console.log(`🔗 Creating ${relationships.length} edges`);

    const flowEdges = relationships.map((rel) => {
      const edgeColor = rel.relationship_type === 'deploy_to' ? '#10B981' :
                        rel.relationship_type === 'depends_on' ? '#F59E0B' :
                        rel.relationship_type === 'uses' ? '#3B82F6' : '#6B7280';

      return {
        id: `edge-${rel.id}`,
        source: rel.source_resource_id.toString(),
        target: rel.target_resource_id.toString(),
        label: rel.relationship_type,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 20,
          height: 20,
        },
        style: {
          stroke: edgeColor,
          strokeWidth: 2,
        },
        labelStyle: {
          fill: '#1F2937',
          fontWeight: 600,
          fontSize: 10,
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: 0.95,
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 3,
      };
    });

    console.log(`✅ Created ${flowEdges.length} edges`);
    setEdges(flowEdges);
  }, [relationships, setEdges]);

  const onConnect = useCallback((params) => {
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
  }, [resources]);

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
          port: data.port ? parseInt(data.port) : null,
          protocol: data.protocol || null,
          label: data.label || null,
          description: data.description || null,
          status: data.status || 'active',
          auto_detected: "no",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Relationship created! Refreshing diagram...');
      setShowRelationshipModal(false);
      setNewRelationshipData(null);
      await fetchRelationships();
      setTimeout(() => applySmartLayout(), 500);
    } catch (error) {
      console.error('Failed to create relationship:', error);
      alert('Failed to create relationship: ' + (error.response?.data?.detail || error.message));
    }
  };

  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === 'resource') {
      const newPositions = { ...savedPositions, [node.id]: node.position };
      localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
      setSavedPositions(newPositions);
    }
  }, [savedPositions]);

  const resetLayout = useCallback(() => {
    if (confirm('Reset diagram layout?')) {
      localStorage.removeItem('diagram_node_positions');
      setSavedPositions({});
      window.location.reload();
    }
  }, []);

  const undoLayout = useCallback(() => {
    const previous = localStorage.getItem('diagram_previous_positions');
    if (!previous) {
      alert('No previous layout to restore.');
      return;
    }
    if (confirm('Restore previous layout?')) {
      localStorage.setItem('diagram_node_positions', previous);
      localStorage.removeItem('diagram_previous_positions');
      window.location.reload();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">AWS Architecture Diagram</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={applySmartLayout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
            >
              <Brain className="w-4 h-4" />
              Smart Layout
            </button>
            <button
              onClick={undoLayout}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 shadow-md"
            >
              <RefreshCw className="w-4 h-4 transform scale-x-[-1]" />
              Undo
            </button>
            <button
              onClick={resetLayout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={() => navigate('/resources')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Back to Resources
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{filteredResources.length} resources</span>
          <span>•</span>
          <span>{relationships.length} relationships</span>
          <span>•</span>
          <span>{buildClusters(filteredResources, relationships).length} clusters</span>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap nodeColor={(node) => getServiceColor(node.data?.resource?.type)} />
        </ReactFlow>
      </div>

      {showRelationshipModal && newRelationshipData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-bold mb-4">Create Relationship</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleCreateRelationship({
                ...newRelationshipData,
                relationship_type: formData.get('relationship_type'),
                direction: formData.get('direction'),
                label: formData.get('label'),
                description: formData.get('description'),
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From</label>
                  <input type="text" value={newRelationshipData.source_name} disabled className="w-full px-3 py-2 border rounded bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <input type="text" value={newRelationshipData.target_name} disabled className="w-full px-3 py-2 border rounded bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship Type</label>
                  <select name="relationship_type" required className="w-full px-3 py-2 border rounded">
                    <option value="deploy_to">Deploy To</option>
                    <option value="depends_on">Depends On</option>
                    <option value="uses">Uses</option>
                    <option value="connects_to">Connects To</option>
                    <option value="routes_to">Routes To</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Direction</label>
                  <select name="direction" required className="w-full px-3 py-2 border rounded">
                    <option value="unidirectional">Unidirectional</option>
                    <option value="bidirectional">Bidirectional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Label (optional)</label>
                  <input name="label" type="text" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea name="description" className="w-full px-3 py-2 border rounded" rows="2"></textarea>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Create
                </button>
                <button type="button" onClick={() => setShowRelationshipModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
