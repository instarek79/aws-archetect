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
  Download, X, RefreshCw, Layers, Sparkles, FileImage, FileText, Film, Brain, Network
} from 'lucide-react';
import axios from 'axios';
import dagre from 'dagre';
import ELK from 'elkjs/lib/elk.bundled.js';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import GIF from 'gif.js';

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

// Custom Node Components with Professional AWS Styling
function ResourceNode({ data, selected }) {
  const color = getServiceColor(data.resource.type);
  return (
    <div
      className={`group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-2 w-[90px] overflow-hidden ${
        selected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
      }`}
      style={{ borderColor: selected ? '#3B82F6' : color }}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      
      {/* Gradient Header */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`
        }}
      />
      
      <div className="p-1.5">
        {/* Icon and Title */}
        <div className="flex flex-col items-center gap-1 mb-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-sm shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`
            }}
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

        {/* Status Badge */}
        {data.resource.status && (
          <div className="flex justify-center mt-1">
            <div
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium ${
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
          <div className="text-[10px] text-purple-700 font-mono">
            {data.name && <span className="font-semibold">{data.name}</span>}
            {data.name && data.label && <span className="mx-1">•</span>}
            <span>{data.label}</span>
          </div>
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
          <div className="font-bold text-white text-base">
            {data.name && <div className="font-semibold">{data.name}</div>}
            <div className="font-mono text-sm">{data.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureDiagramFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [resources, setResources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
    if (confirm('Reset diagram layout to default? This will clear all saved positions.')) {
      localStorage.removeItem('diagram_node_positions');
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

    try {
      // Save current positions for undo
      setPreviousPositions({...savedPositions});

      const resourceNodes = nodes.filter(n => n.type === 'resource');
      
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

      // Call Ollama qwen2.5 for intelligent grouping analysis
      alert('Analyzing architecture with AI... This may take a few seconds.');
      
      const response = await axios.post(`${API_URL}/api/ai/analyze-layout`, layoutData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });

      const aiSuggestions = response.data;
      console.log('AI Layout Suggestions:', aiSuggestions);

      // Apply AI-suggested groupings
      const newPositions = applyAISuggestedLayout(resourceNodes, relationships, aiSuggestions);
      
      // Save the new positions
      localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
      localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
      setSavedPositions(newPositions);
      
      window.location.reload();
    } catch (error) {
      console.error('AI layout failed:', error);
      alert('AI layout failed. Falling back to standard auto-layout.');
      applyAutoLayout();
    }
  }, [nodes, relationships, savedPositions]);

  // ELK-based layout that minimizes edge crossings
  const applyELKLayout = useCallback(async () => {
    if (nodes.length === 0) {
      alert('No nodes to layout.');
      return;
    }

    try {
      // Save current positions for undo
      setPreviousPositions({...savedPositions});

      const resourceNodes = nodes.filter(n => n.type === 'resource');
      
      // Build ELK graph structure
      const elkGraph = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '80',
          'elk.layered.spacing.nodeNodeBetweenLayers': '120',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.layered.mergeEdges': 'true',
          'elk.layered.mergeHierarchyEdges': 'true',
        },
        children: resourceNodes.map(node => ({
          id: node.id,
          width: 100,
          height: 80,
        })),
        edges: relationships.map(rel => ({
          id: `elk-edge-${rel.id}`,
          sources: [rel.source_resource_id.toString()],
          targets: [rel.target_resource_id.toString()],
        })),
      };

      console.log('🔄 Running ELK layout with crossing minimization...');
      const layoutedGraph = await elk.layout(elkGraph);
      
      const newPositions = {};
      layoutedGraph.children?.forEach(node => {
        newPositions[node.id] = { x: node.x || 0, y: node.y || 0 };
      });

      console.log(`✅ ELK positioned ${Object.keys(newPositions).length} nodes`);
      
      // Save positions
      localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
      localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
      setSavedPositions(newPositions);
      
      window.location.reload();
    } catch (error) {
      console.error('ELK layout failed:', error);
      alert('ELK layout failed: ' + error.message);
    }
  }, [nodes, relationships, savedPositions]);

  const applyAutoLayout = useCallback(() => {
    if (nodes.length === 0 || relationships.length === 0) {
      alert('No relationships found. Auto-layout works best when resources have connections.');
      return;
    }

    // Save current positions for undo
    setPreviousPositions({...savedPositions});

    const resourceNodes = nodes.filter(n => n.type === 'resource');
    const newPositions = {};

    // Group resources by their parent (VPC or Account)
    const parentGroups = {};
    resourceNodes.forEach(node => {
      const parentId = node.parentNode || 'root';
      if (!parentGroups[parentId]) {
        parentGroups[parentId] = [];
      }
      parentGroups[parentId].push(node);
    });

    // Process each parent group separately to maintain hierarchy
    Object.entries(parentGroups).forEach(([parentId, groupNodes]) => {
      if (groupNodes.length === 0) return;

      // Create a subgraph for this parent's resources only
      const subGraph = new dagre.graphlib.Graph();
      subGraph.setDefaultEdgeLabel(() => ({}));
      
      subGraph.setGraph({ 
        rankdir: 'TB', // Top to bottom for better fit in containers
        nodesep: 50,
        ranksep: 60,
        edgesep: 30,
        marginx: 15,
        marginy: 15
      });

      // Add nodes from this group
      groupNodes.forEach(node => {
        subGraph.setNode(node.id, { 
          width: 90, 
          height: 70 
        });
      });

      // Add edges only between nodes in this group
      const groupNodeIds = new Set(groupNodes.map(n => n.id));
      relationships.forEach(rel => {
        const sourceId = rel.source_resource_id.toString();
        const targetId = rel.target_resource_id.toString();
        if (groupNodeIds.has(sourceId) && groupNodeIds.has(targetId)) {
          subGraph.setEdge(sourceId, targetId);
        }
      });

      // Run layout for this group
      dagre.layout(subGraph);

      // Apply positions relative to parent container
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

    // Save the new positions
    localStorage.setItem('diagram_node_positions', JSON.stringify(newPositions));
    localStorage.setItem('diagram_previous_positions', JSON.stringify(savedPositions));
    setSavedPositions(newPositions);
    
    // Reload to apply
    window.location.reload();
  }, [nodes, relationships, savedPositions]);

  const undoAutoLayout = useCallback(() => {
    const previous = localStorage.getItem('diagram_previous_positions');
    if (!previous) {
      alert('No previous layout to restore.');
      return;
    }

    if (confirm('Restore previous layout before auto-layout?')) {
      localStorage.setItem('diagram_node_positions', previous);
      localStorage.removeItem('diagram_previous_positions');
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
              position: savedPositions[resourceId] || defaultPosition,
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
              position: savedPositions[resourceId] || defaultPosition,
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
  }, [filteredResources, setNodes, savedPositions]);

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

    const flowEdges = filteredRelationships.map((rel, index) => {
      const sourceId = rel.source_resource_id.toString();
      const targetId = rel.target_resource_id.toString();
      const relType = rel.relationship_type || 'default';
      const edgeColor = getRelationshipColor(relType);
      
      // Validate that both nodes exist
      if (!nodeIds.has(sourceId)) {
        console.warn(`⚠️ Source node ${sourceId} not found for relationship ${rel.id}`);
      }
      if (!nodeIds.has(targetId)) {
        console.warn(`⚠️ Target node ${targetId} not found for relationship ${rel.id}`);
      }

      // Use different edge types to reduce crossing visual confusion
      // Alternate between smoothstep and bezier for variety
      const edgeType = index % 3 === 0 ? 'smoothstep' : index % 3 === 1 ? 'default' : 'straight';

      // Highlight edges connected to highlighted node
      const isHighlighted = highlightedNode && (sourceId === highlightedNode || targetId === highlightedNode);
      const isDimmed = highlightedNode && !isHighlighted;

      return {
        id: `edge-${rel.id}`,
        source: sourceId,
        target: targetId,
        label: rel.label || relType,
        type: edgeType,
        animated: isHighlighted || relType.includes('deploy') || relType.includes('trigger'),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted ? edgeColor : (isDimmed ? '#E5E7EB' : edgeColor),
          width: isHighlighted ? 20 : 16,
          height: isHighlighted ? 20 : 16,
        },
        style: {
          stroke: isHighlighted ? edgeColor : (isDimmed ? '#E5E7EB' : edgeColor),
          strokeWidth: isHighlighted ? 4 : 2,
          opacity: isDimmed ? 0.2 : 0.8,
          zIndex: isHighlighted ? 1000 : 1,
        },
        labelStyle: {
          fill: isDimmed ? '#9CA3AF' : edgeColor,
          fontWeight: 600,
          fontSize: isHighlighted ? 11 : 9,
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: isDimmed ? 0.5 : 0.95,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 3,
      };
    });

    console.log(`✅ Created ${flowEdges.length} edges`);
    console.log('Sample edges:', flowEdges.slice(0, 3));
    setEdges(flowEdges);
  }, [filteredRelationships, nodes, setEdges, highlightedNode]);

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

      alert('Relationship created successfully! Applying AI layout...');
      setShowRelationshipModal(false);
      setNewRelationshipData(null);

      await fetchRelationships();
      
      // Auto-trigger AI layout after creating relationship
      setTimeout(() => {
        applyAILayout();
      }, 500);
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
            <button
              onClick={exportAsPNG}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 shadow-md hover:shadow-lg transition-all"
              title="Export diagram as PNG image"
            >
              <FileImage className="w-4 h-4" />
              Export PNG
            </button>
            <button
              onClick={exportAsPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 shadow-md hover:shadow-lg transition-all"
              title="Export diagram as PDF document"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={exportAsGIF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 shadow-md hover:shadow-lg transition-all"
              title="Export diagram as animated GIF"
            >
              <Film className="w-4 h-4" />
              Export GIF
            </button>
            <button
              onClick={async () => {
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
              title="Automatically discover relationships from CloudFormation stacks, VPC associations, and more"
            >
              <Network className="w-4 h-4" />
              Discover Relationships
            </button>
            <button
              onClick={applyAILayout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
              title="AI-powered intelligent layout using Ollama qwen2.5 - analyzes relationships and suggests optimal grouping"
            >
              <Brain className="w-4 h-4" />
              AI Layout
            </button>
            <button
              onClick={applyELKLayout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-violet-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
              title="ELK Layout - Advanced algorithm that minimizes edge crossings"
            >
              <Layers className="w-4 h-4" />
              ELK Layout
            </button>
            <button
              onClick={applyAutoLayout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
              title="Standard auto-layout using dagre algorithm"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Layout
            </button>
            <button
              onClick={undoAutoLayout}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 shadow-md hover:shadow-lg transition-all"
              title="Undo last auto-layout and restore previous positions"
            >
              <RefreshCw className="w-4 h-4 transform scale-x-[-1]" />
              Undo Layout
            </button>
            <button
              onClick={resetLayout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-md hover:shadow-lg transition-all"
              title="Reset diagram layout to default"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Layout
            </button>
            <button
              onClick={() => navigate('/resources')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-md hover:shadow-lg transition-all"
            >
              Back to Resources
            </button>
          </div>
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

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
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
    </div>
  );
}

// Define nodeTypes outside component to avoid React Flow warning
const nodeTypes = {
  resource: ResourceNode,
  vpc: VPCNode,
  account: AccountNode,
};

export default ArchitectureDiagramFlow;
