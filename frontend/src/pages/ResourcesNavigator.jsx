import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Search, ChevronRight, ChevronDown, RefreshCw,
  X, Plus, Link2, Layers, ArrowRight, Edit3, Trash2, Save, Check, AlertTriangle, SlidersHorizontal
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import NavBar from '../components/NavBar';

const TYPE_COLORS = {
  route53_record: '#8C4FFF', route53: '#8C4FFF',
  elb: '#E07941', alb: '#E07941', nlb: '#E07941', elasticloadbalancing: '#E07941',
  ec2: '#FF9900', instance: '#FF9900',
  rds: '#527FFF', aurora: '#527FFF', dynamodb: '#4053D6', elasticache: '#C925D1',
  cloudfront: '#8C4FFF', s3: '#569A31',
  codepipeline: '#4053D6', codebuild: '#4053D6', codecommit: '#4053D6', codedeploy: '#4053D6',
  ecs: '#FF9900', eks: '#FF9900', lambda: '#FF9900',
};
const TYPE_LABELS = {
  route53_record: 'DNS Record', route53: 'Hosted Zone',
  elb: 'Load Balancer', alb: 'ALB', nlb: 'NLB', elasticloadbalancing: 'ELB',
  ec2: 'EC2', instance: 'EC2',
  rds: 'RDS', aurora: 'Aurora', dynamodb: 'DynamoDB', elasticache: 'ElastiCache',
  cloudfront: 'CloudFront', s3: 'S3',
  codepipeline: 'Pipeline', codebuild: 'CodeBuild', codecommit: 'CodeCommit', codedeploy: 'CodeDeploy',
  ecs: 'ECS', eks: 'EKS', lambda: 'Lambda',
};
const TYPE_ICONS = {
  route53_record: 'R53', route53: 'R53',
  elb: 'ALB', alb: 'ALB', nlb: 'NLB', elasticloadbalancing: 'ELB',
  ec2: 'EC2', instance: 'EC2',
  rds: 'RDS', aurora: 'AUR', dynamodb: 'DDB', elasticache: 'ELC',
  cloudfront: 'CF', s3: 'S3',
  codepipeline: 'PIP', codebuild: 'BLD', codecommit: 'GIT', codedeploy: 'DEP',
  ecs: 'ECS', eks: 'EKS', lambda: 'FN',
};

const LINK_TYPE_SUGGESTIONS = {
  route53_record: { suggest: 'elb', label: 'Load Balancers' },
  elb: { suggest: 'ec2', label: 'EC2 Instances' },
  alb: { suggest: 'ec2', label: 'EC2 Instances' },
  nlb: { suggest: 'ec2', label: 'EC2 Instances' },
  elasticloadbalancing: { suggest: 'ec2', label: 'EC2 Instances' },
  ec2: { suggest: 'rds', label: 'Databases' },
  instance: { suggest: 'rds', label: 'Databases' },
  cloudfront: { suggest: 's3', label: 'S3 Buckets' },
};

// Flow node card component
function FlowNode({ resource, label, isSelected, onClick, onAddLink, editMode, onRemove, onEdit }) {
  const color = TYPE_COLORS[resource?.type] || '#64748B';
  const active = ['active', 'running', 'deployed', 'available'].includes(resource?.status);
  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border cursor-pointer transition-all hover:scale-[1.02] min-w-[200px] max-w-[220px] ${
        isSelected ? 'ring-2 ring-purple-500 bg-slate-700' : 'bg-slate-800 border-slate-600 hover:border-slate-500'
      } ${editMode ? 'ring-1 ring-dashed ring-amber-500/30' : ''}`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="p-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ backgroundColor: color }}>
            {TYPE_ICONS[resource?.type] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{label || resource?.name || 'Unknown'}</p>
            <p className="text-[10px] text-slate-400">{TYPE_LABELS[resource?.type] || resource?.type}</p>
          </div>
          {!editMode && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-green-500' : 'bg-red-500'}`} />}
        </div>
        <div className="mt-1.5 text-[9px] text-slate-500 space-y-0.5">
          {resource?.account_id && <p>Account: ...{resource.account_id.slice(-4)}</p>}
          {resource?.private_ip && <p>IP: {resource.private_ip}</p>}
          {resource?.instance_type && <p>{resource.instance_type}</p>}
          {resource?.dns_name && <p className="truncate">DNS: {resource.dns_name}</p>}
          {resource?.type_specific_properties?.navigator_notes && (
            <p className="text-amber-400 truncate">Note: {resource.type_specific_properties.navigator_notes}</p>
          )}
        </div>
      </div>
      {/* Edit mode action buttons */}
      {editMode && !resource?._placeholder && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(resource); }}
              className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center hover:bg-amber-500 shadow-lg"
              title="Edit resource"
            >
              <Edit3 className="w-2.5 h-2.5 text-white" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(resource); }}
              className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 shadow-lg"
              title="Remove from flow"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          )}
        </div>
      )}
      {/* Add link button (non-edit mode) */}
      {!editMode && onAddLink && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddLink(resource); }}
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 shadow-lg z-10"
          title="Add connection"
        >
          <Plus className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
}

function ResourcesNavigator() {
  const navigate = useNavigate();
  const [urlFlows, setUrlFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('zone');
  const [accountFilter, setAccountFilter] = useState('');
  const [lbFilter, setLbFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('');
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [showProviderExternalOnly, setShowProviderExternalOnly] = useState(false);
  const [showCertValidationOnly, setShowCertValidationOnly] = useState(false);
  const [importantPathsOnly, setImportantPathsOnly] = useState(false);
  const [showDatabasesInDiagram, setShowDatabasesInDiagram] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedZones, setExpandedZones] = useState(new Set());

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', environment: '', notes: '', status: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Remove confirmation
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Connections panel
  const [showConnectionsPanel, setShowConnectionsPanel] = useState(false);
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Manual link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkTypeFilter, setLinkTypeFilter] = useState('');
  const [linkSourceNode, setLinkSourceNode] = useState(null);
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [linkSearchLoading, setLinkSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const flowsRes = await axios.get('/api/resources/url-flows');
      setUrlFlows(flowsRes.data);
      if (flowsRes.data.length > 0 && !selectedUrl) setSelectedUrl(flowsRes.data[0]);
      else if (selectedUrl) {
        const updated = flowsRes.data.find(f => f.record_id === selectedUrl.record_id);
        if (updated) setSelectedUrl(updated);
      }
      const zones = new Set(flowsRes.data.map(f => f.zone_name || 'Unknown Zone'));
      setExpandedZones(zones);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setError('Failed to load data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const groupingOptions = useMemo(() => {
    const accounts = new Set();
    const lbs = new Set();
    const ips = new Set();
    urlFlows.forEach(flow => {
      (flow.grouping?.target_accounts || []).forEach(a => a && accounts.add(a));
      (flow.grouping?.load_balancers || []).forEach(lb => lb && lbs.add(lb));
      (flow.grouping?.target_ips || []).forEach(ip => ip && ips.add(ip));
      (flow.classification?.unmatched_public_ips || []).forEach(ip => ip && ips.add(ip));
    });
    return {
      accounts: Array.from(accounts).sort(),
      loadBalancers: Array.from(lbs).sort(),
      ips: Array.from(ips).sort(),
    };
  }, [urlFlows]);

  const groupedUrls = useMemo(() => {
    const groups = {};
    const q = searchQuery.toLowerCase();

    const flowMatchesSearch = (flow) => {
      if (!q) return true;
      const labels = flow.classification?.labels || [];
      const searchable = [
        flow.url,
        flow.record_type,
        flow.zone_name,
        ...(flow.record_values || []),
        ...(flow.grouping?.target_accounts || []),
        ...(flow.grouping?.load_balancers || []),
        ...(flow.grouping?.target_ips || []),
        ...labels,
      ].filter(Boolean).map(v => String(v).toLowerCase());
      return searchable.some(v => v.includes(q));
    };

    const flowPassesFilters = (flow) => {
      if (!flowMatchesSearch(flow)) return false;
      if (recordTypeFilter && flow.record_type !== recordTypeFilter) return false;
      if (accountFilter && !(flow.grouping?.target_accounts || []).includes(accountFilter)) return false;
      if (lbFilter && !(flow.grouping?.load_balancers || []).includes(lbFilter)) return false;
      if (ipFilter) {
        const ips = [
          ...(flow.grouping?.target_ips || []),
          ...(flow.classification?.unmatched_public_ips || []),
        ];
        if (!ips.includes(ipFilter)) return false;
      }
      if (showInvalidOnly && !flow.classification?.has_invalid_a_target) return false;
      if (showProviderExternalOnly && !flow.classification?.is_provider_or_external_a_record) return false;
      if (showCertValidationOnly && !flow.classification?.is_certificate_validation) return false;
      if (importantPathsOnly && !((flow.important_path_count || 0) > 0)) return false;
      return true;
    };

    const groupLabel = (flow) => {
      if (groupBy === 'account') {
        const accounts = flow.grouping?.target_accounts || [];
        if (accounts.length > 1) return `${accounts[0]} (+${accounts.length - 1})`;
        return accounts[0] || flow.account_id || 'No Target Account';
      }
      if (groupBy === 'load_balancer') {
        return (flow.grouping?.load_balancers || [])[0] || 'No Load Balancer';
      }
      if (groupBy === 'ip') {
        return (flow.grouping?.target_ips || [])[0] || (flow.classification?.unmatched_public_ips || [])[0] || 'No IP Target';
      }
      return flow.zone_name || 'Unknown Zone';
    };

    urlFlows.forEach(flow => {
      if (!flowPassesFilters(flow)) return;
      const key = groupLabel(flow);
      if (!groups[key]) groups[key] = [];
      groups[key].push(flow);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const diff = (b.important_path_count || 0) - (a.important_path_count || 0);
        if (diff !== 0) return diff;
        return (a.url || '').localeCompare(b.url || '');
      });
    });
    return groups;
  }, [
    urlFlows,
    searchQuery,
    groupBy,
    accountFilter,
    lbFilter,
    ipFilter,
    recordTypeFilter,
    showInvalidOnly,
    showProviderExternalOnly,
    showCertValidationOnly,
    importantPathsOnly,
  ]);

  useEffect(() => {
    const keys = Object.keys(groupedUrls);
    setExpandedZones(prev => {
      const next = new Set();
      keys.forEach(k => {
        if (prev.has(k) || groupBy !== 'zone') next.add(k);
      });
      if (next.size === 0) {
        keys.forEach(k => next.add(k));
      }
      return next;
    });
  }, [groupedUrls, groupBy]);

  useEffect(() => {
    if (!selectedUrl) return;
    const visible = Object.values(groupedUrls).flat();
    if (!visible.some(flow => flow.record_id === selectedUrl.record_id)) {
      setSelectedUrl(visible[0] || null);
      setSelectedNode(null);
      setShowConnectionsPanel(false);
    }
  }, [groupedUrls, selectedUrl]);

  // Build columns for the flow diagram
  const flowColumns = useMemo(() => {
    if (!selectedUrl) return [];
    const cols = [];
    cols.push({ label: 'DNS Record', items: [{ ...selectedUrl.record, _label: selectedUrl.url }] });
    const cloudfront = selectedUrl.cloudfront || [];
    const s3Buckets = selectedUrl.s3_buckets || [];
    const loadBalancers = selectedUrl.albs || [];
    const ec2s = selectedUrl.ec2_instances || [];
    const pipelines = selectedUrl.pipelines || [];
    const dbs = selectedUrl.databases || [];

    if (cloudfront.length > 0) cols.push({ label: 'Frontend CDN', items: cloudfront });
    if (s3Buckets.length > 0) cols.push({ label: 'Frontend Storage', items: s3Buckets });

    if (loadBalancers.length > 0) cols.push({ label: 'Backend Load Balancer', items: loadBalancers });
    else if (ec2s.length === 0 && selectedUrl.record_values?.length > 0) {
      cols.push({ label: 'Target (unresolved)', items: [{ name: selectedUrl.record_values[0], type: 'unknown', status: 'unresolved', _placeholder: true }] });
    }

    if (ec2s.length > 0) cols.push({ label: 'Backend Compute', items: ec2s });
    if (pipelines.length > 0) {
      cols.push({ label: 'Pipelines', items: pipelines });
    }

    if (showDatabasesInDiagram && dbs.length > 0) cols.push({ label: 'Databases (Optional)', items: dbs });

    const extras = (selectedUrl.other || []).filter(r =>
      r.type !== 'cloudfront' && r.type !== 's3' && !['codepipeline', 'codebuild', 'codecommit', 'codedeploy'].includes(r.type)
    );
    if (extras.length > 0) cols.push({ label: 'Other', items: extras });
    return cols;
  }, [selectedUrl, showDatabasesInDiagram]);

  const urlPathSummary = useMemo(() => {
    if (!selectedUrl) return { frontend: null, backend: null };
    const hasCloudFront = (selectedUrl.cloudfront || []).length > 0;
    const hasS3 = (selectedUrl.s3_buckets || []).length > 0;
    const hasPipelines = (selectedUrl.pipelines || []).length > 0;
    const hasLb = (selectedUrl.albs || []).length > 0;
    const hasEc2 = (selectedUrl.ec2_instances || []).length > 0;

    let frontend = null;
    if (hasCloudFront && hasS3 && hasPipelines) frontend = 'URL -> CloudFront -> S3 <- Pipeline';
    else if (hasCloudFront && hasS3) frontend = 'URL -> CloudFront -> S3';
    else if (hasCloudFront) frontend = 'URL -> CloudFront';

    let backend = null;
    if (hasLb && hasEc2 && hasPipelines) backend = 'URL -> Load Balancer -> EC2 <- Pipeline';
    else if (hasLb && hasEc2) backend = 'URL -> Load Balancer -> EC2';
    else if (hasEc2 && hasPipelines) backend = 'URL -> EC2 <- Pipeline';
    else if (hasEc2) backend = 'URL -> EC2';

    return { frontend, backend };
  }, [selectedUrl]);

  // ---- Edit Resource ----
  const openEditModal = (resource) => {
    setEditTarget(resource);
    setEditForm({
      name: resource.name || '',
      environment: resource.environment || '',
      notes: resource.type_specific_properties?.navigator_notes || '',
      status: resource.status || '',
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editTarget?.id) return;
    setEditSaving(true);
    try {
      const payload = {};
      if (editForm.name !== (editTarget.name || '')) payload.name = editForm.name;
      if (editForm.environment !== (editTarget.environment || '')) payload.environment = editForm.environment;
      if (editForm.status !== (editTarget.status || '')) payload.status = editForm.status;
      if (editForm.notes !== (editTarget.type_specific_properties?.navigator_notes || '')) payload.notes = editForm.notes;

      if (Object.keys(payload).length === 0) {
        setShowEditModal(false);
        return;
      }
      await axios.patch(`/api/resources/url-resource/${editTarget.id}`, payload);
      setShowEditModal(false);
      setEditTarget(null);
      showToast('Resource updated');
      fetchData();
    } catch (err) {
      showToast('Failed to save: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ---- Remove Connection ----
  const openRemoveConfirm = (resource) => {
    setRemoveTarget(resource);
    setShowRemoveConfirm(true);
  };

  const confirmRemove = async () => {
    if (!removeTarget?.id || !selectedUrl?.record_id) return;
    setRemoving(true);
    try {
      await axios.post('/api/resources/url-remove-connection', {
        source_resource_id: selectedUrl.record_id,
        target_resource_id: removeTarget.id,
      });
      setShowRemoveConfirm(false);
      setRemoveTarget(null);
      showToast('Connection removed');
      fetchData();
    } catch (err) {
      // Try removing between any pair in the chain
      try {
        // Find which resource in the chain connects to this one
        const allItems = [
          ...(selectedUrl.albs || []),
          ...(selectedUrl.cloudfront || []),
          ...(selectedUrl.ec2_instances || []),
          ...(selectedUrl.databases || []),
          ...(selectedUrl.s3_buckets || []),
          ...(selectedUrl.pipelines || []),
          ...(selectedUrl.other || []),
        ];
        let removed = false;
        for (const item of allItems) {
          if (item.id === removeTarget.id) continue;
          try {
            await axios.post('/api/resources/url-remove-connection', {
              source_resource_id: item.id,
              target_resource_id: removeTarget.id,
            });
            removed = true;
            break;
          } catch { /* try next */ }
        }
        if (!removed) throw err;
        setShowRemoveConfirm(false);
        setRemoveTarget(null);
        showToast('Connection removed');
        fetchData();
      } catch (innerErr) {
        showToast('Failed to remove connection', 'error');
      }
    } finally {
      setRemoving(false);
    }
  };

  // ---- View Connections ----
  const viewConnections = async (resource) => {
    if (!resource?.id) return;
    setShowConnectionsPanel(true);
    setConnectionsLoading(true);
    try {
      const res = await axios.get(`/api/resources/url-connections/${resource.id}`);
      setConnections(res.data);
    } catch {
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const removeConnectionById = async (conn) => {
    try {
      await axios.post('/api/resources/url-remove-connection', {
        source_resource_id: conn.source_id,
        target_resource_id: conn.target_id,
      });
      showToast('Connection removed');
      // Refresh connections list
      if (selectedNode?.id) viewConnections(selectedNode);
      fetchData();
    } catch (err) {
      showToast('Failed: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  // ---- Link modal ----
  const openLinkModal = (sourceNode) => {
    setLinkSourceNode(sourceNode);
    setLinkSearch('');
    setLinkTypeFilter('');
    setLinkSearchResults([]);
    setShowLinkModal(true);
    const suggestion = LINK_TYPE_SUGGESTIONS[sourceNode?.type];
    if (suggestion) {
      setLinkTypeFilter(suggestion.suggest);
      doSearch('', suggestion.suggest);
    } else {
      doSearch('', '');
    }
  };

  const doSearch = async (query, typeFilter) => {
    setLinkSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (typeFilter) params.set('type_filter', typeFilter);
      const res = await axios.get(`/api/resources/url-search-resources?${params}`);
      setLinkSearchResults(res.data);
    } catch (err) {
      setLinkSearchResults([]);
    } finally {
      setLinkSearchLoading(false);
    }
  };

  const handleLinkSearchChange = (value) => {
    setLinkSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(value, linkTypeFilter), 300);
  };

  const handleLinkTypeFilterChange = (tf) => {
    setLinkTypeFilter(tf);
    doSearch(linkSearch, tf);
  };

  const handleManualLink = async (targetResource) => {
    const sourceId = linkSourceNode?.id || selectedUrl?.record_id;
    if (!sourceId) return;
    try {
      await axios.post('/api/resources/url-link', {
        source_resource_id: sourceId,
        target_resource_id: targetResource.id,
        label: 'manual_link',
      });
      setShowLinkModal(false);
      setLinkSourceNode(null);
      showToast('Connection added');
      fetchData();
    } catch (err) {
      showToast('Failed to link: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-white">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      <NavBar />
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-bold">URL Navigator</h1>
          <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-700 rounded">{urlFlows.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit mode toggle */}
          <button
            onClick={() => { setEditMode(!editMode); setSelectedNode(null); setShowConnectionsPanel(false); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              editMode ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {editMode ? <><Check className="w-3 h-3" /> Done Editing</> : <><Edit3 className="w-3 h-3" /> Edit</>}
          </button>
          <button onClick={fetchData} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => navigate('/architecture')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">
            <Layers className="w-3 h-3" /> Diagram
          </button>
        </div>
      </header>

      {/* Edit mode banner */}
      {editMode && (
        <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-1.5 flex items-center gap-2 flex-shrink-0">
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-amber-300">Edit Mode — Click the pencil to edit resource details, or the X to remove a connection from the flow</span>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Main Flow Diagram */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* URL title bar */}
          {selectedUrl && (
            <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2 flex items-center gap-2 flex-shrink-0">
              <span className="text-purple-400 font-bold text-sm">{selectedUrl.url}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">{selectedUrl.record_type}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500 truncate">{selectedUrl.record_values?.join(', ')}</span>
              {selectedUrl.connections?.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded">{selectedUrl.connections.length} links</span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {!editMode && (
                  <button onClick={() => openLinkModal(selectedUrl.record)} className="flex items-center gap-1 px-2 py-1 bg-purple-600 rounded hover:bg-purple-700 text-[10px] font-medium">
                    <Plus className="w-3 h-3" /> Add Connection
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedUrl && (urlPathSummary.frontend || urlPathSummary.backend) && (
            <div className="bg-slate-900/80 border-b border-slate-700 px-4 py-2 flex flex-wrap gap-2 flex-shrink-0">
              {urlPathSummary.frontend && (
                <div className="px-2 py-1 bg-cyan-900/30 border border-cyan-700/40 rounded text-[10px] text-cyan-200">
                  <span className="font-semibold">Frontend:</span> {urlPathSummary.frontend}
                </div>
              )}
              {urlPathSummary.backend && (
                <div className="px-2 py-1 bg-emerald-900/30 border border-emerald-700/40 rounded text-[10px] text-emerald-200">
                  <span className="font-semibold">Backend:</span> {urlPathSummary.backend}
                </div>
              )}
            </div>
          )}

          {/* Flow diagram area */}
          <div className="flex-1 overflow-auto p-6">
            {error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">{error}</p>
                  <button onClick={fetchData} className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 text-sm">Retry</button>
                </div>
              </div>
            ) : !selectedUrl ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg text-slate-300 mb-2">Select a URL record</h3>
                  <p className="text-sm text-slate-500">Choose a DNS record from the sidebar to see its flow</p>
                </div>
              </div>
            ) : flowColumns.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No data for this record</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 min-h-full">
                {flowColumns.map((col, colIdx) => (
                  <div key={colIdx} className="flex items-center gap-2">
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center mb-1">{col.label}</p>
                      {col.items.map((item, itemIdx) => (
                        <FlowNode
                          key={item.id || `${colIdx}-${itemIdx}`}
                          resource={item}
                          label={item._label}
                          isSelected={selectedNode?.id === item.id}
                          onClick={() => {
                            setSelectedNode(selectedNode?.id === item.id ? null : item);
                            setShowConnectionsPanel(false);
                          }}
                          onAddLink={editMode ? null : (item._placeholder ? null : openLinkModal)}
                          editMode={editMode}
                          onEdit={editMode && !item._placeholder ? openEditModal : null}
                          onRemove={editMode && !item._placeholder && colIdx > 0 ? openRemoveConfirm : null}
                        />
                      ))}
                    </div>
                    {colIdx < flowColumns.length - 1 && (
                      <div className="flex flex-col items-center justify-center px-1 self-center">
                        <ArrowRight className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel at bottom */}
          {selectedNode && (
            <div className="bg-slate-800 border-t border-slate-700 flex-shrink-0 max-h-[220px] overflow-y-auto">
              <div className="p-3 flex items-start gap-4">
                <div className="flex items-center gap-2 min-w-[200px]">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[10px]"
                    style={{ backgroundColor: TYPE_COLORS[selectedNode.type] || '#64748B' }}>
                    {TYPE_ICONS[selectedNode.type] || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedNode.name}</p>
                    <p className="text-[10px] text-slate-400">{TYPE_LABELS[selectedNode.type] || selectedNode.type}</p>
                  </div>
                  <button onClick={() => { setSelectedNode(null); setShowConnectionsPanel(false); }} className="ml-2 p-1 hover:bg-slate-700 rounded"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                  {[
                    ['Resource ID', selectedNode.resource_id],
                    ['Account', selectedNode.account_id],
                    ['Region', selectedNode.region],
                    ['Status', selectedNode.status],
                    ['VPC', selectedNode.vpc_id],
                    ['Instance Type', selectedNode.instance_type],
                    ['Private IP', selectedNode.private_ip],
                    ['Public IP', selectedNode.public_ip],
                    ['DNS Name', selectedNode.dns_name],
                    ['Environment', selectedNode.environment],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label}>
                      <span className="text-slate-500">{label}: </span>
                      <span className="text-slate-300 font-mono">{value}</span>
                    </div>
                  ))}
                  {selectedNode.type_specific_properties?.navigator_notes && (
                    <div className="col-span-4">
                      <span className="text-amber-500">Notes: </span>
                      <span className="text-amber-300">{selectedNode.type_specific_properties.navigator_notes}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {!editMode && (
                    <button
                      onClick={() => openLinkModal(selectedNode)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 text-[10px] font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add Connection
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(selectedNode)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 rounded-lg hover:bg-amber-700 text-[10px] font-medium"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Details
                  </button>
                  <button
                    onClick={() => viewConnections(selectedNode)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 rounded-lg hover:bg-slate-500 text-[10px] font-medium"
                  >
                    <Link2 className="w-3 h-3" /> View Connections
                  </button>
                </div>
              </div>

              {/* Connections sub-panel */}
              {showConnectionsPanel && (
                <div className="border-t border-slate-700 px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">Connections for {selectedNode.name}</p>
                  {connectionsLoading ? (
                    <div className="flex items-center gap-2 py-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div><span className="text-[10px] text-slate-500">Loading...</span></div>
                  ) : connections.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-1">No connections found</p>
                  ) : (
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                      {connections.map(conn => (
                        <div key={conn.id} className="flex items-center gap-2 text-[10px] p-1.5 bg-slate-700/50 rounded group">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0"
                            style={{ backgroundColor: TYPE_COLORS[conn.source_type] || '#64748B' }}>
                            {TYPE_ICONS[conn.source_type] || '?'}
                          </div>
                          <span className="truncate text-slate-300">{conn.source_name}</span>
                          <ArrowRight className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0"
                            style={{ backgroundColor: TYPE_COLORS[conn.target_type] || '#64748B' }}>
                            {TYPE_ICONS[conn.target_type] || '?'}
                          </div>
                          <span className="truncate text-slate-300">{conn.target_name}</span>
                          <span className="text-slate-500 flex-shrink-0">({conn.label})</span>
                          <button
                            onClick={() => removeConnectionById(conn)}
                            className="ml-auto p-0.5 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                            title="Remove this connection"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-slate-700">
            <h3 className="font-bold text-[11px] mb-2 flex items-center gap-1.5">
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

            <div className="mt-2 pt-2 border-t border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <SlidersHorizontal className="w-3 h-3" /> Group & Filter
                </div>
                <button
                  onClick={() => setShowAdvancedFilters(v => !v)}
                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300"
                >
                  {showAdvancedFilters ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="zone">Group: Zone</option>
                  <option value="account">Group: Target Account</option>
                  <option value="load_balancer">Group: Load Balancer</option>
                  <option value="ip">Group: Target IP</option>
                </select>
              </div>

              {showAdvancedFilters && (
                <>
                  <div className="grid grid-cols-1 gap-1.5">
                    <select
                      value={accountFilter}
                      onChange={(e) => setAccountFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">All target accounts</option>
                      {groupingOptions.accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>

                    <select
                      value={lbFilter}
                      onChange={(e) => setLbFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">All load balancers</option>
                      {groupingOptions.loadBalancers.map(lb => <option key={lb} value={lb}>{lb}</option>)}
                    </select>

                    <select
                      value={ipFilter}
                      onChange={(e) => setIpFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">All target IPs</option>
                      {groupingOptions.ips.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                    </select>

                    <select
                      value={recordTypeFilter}
                      onChange={(e) => setRecordTypeFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">All record types</option>
                      <option value="A">A</option>
                      <option value="AAAA">AAAA</option>
                      <option value="CNAME">CNAME</option>
                      <option value="ALIAS">ALIAS</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-[10px] text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={showInvalidOnly} onChange={(e) => setShowInvalidOnly(e.target.checked)} />
                      Invalid A/AAAA targets only
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={showProviderExternalOnly} onChange={(e) => setShowProviderExternalOnly(e.target.checked)} />
                      Provider/external A records only
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={showCertValidationOnly} onChange={(e) => setShowCertValidationOnly(e.target.checked)} />
                      Certificate validation CNAME only
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={importantPathsOnly} onChange={(e) => setImportantPathsOnly(e.target.checked)} />
                      Important paths only (CloudFront/S3/Pipelines)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={showDatabasesInDiagram} onChange={(e) => setShowDatabasesInDiagram(e.target.checked)} />
                      Show databases in diagram
                    </label>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setAccountFilter('');
                        setLbFilter('');
                        setIpFilter('');
                        setRecordTypeFilter('');
                        setShowInvalidOnly(false);
                        setShowProviderExternalOnly(false);
                        setShowCertValidationOnly(false);
                        setImportantPathsOnly(false);
                      }}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300"
                    >
                      Clear Filters
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedUrls).length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Globe className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No DNS records found</p>
                <p className="text-[10px] mt-1">Rescan account to import Route 53 records</p>
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
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700 border-b border-slate-700 text-left"
                  >
                    {expandedZones.has(zone) ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                    <Globe className="w-3 h-3 text-purple-400" />
                    <span className="text-[11px] font-semibold text-slate-300 flex-1 truncate">{zone}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{records.length}</span>
                  </button>
                  {expandedZones.has(zone) && records.map((flow, idx) => {
                    const totalConn = (flow.albs?.length || 0) + (flow.ec2_instances?.length || 0) + (flow.databases?.length || 0) + (flow.s3_buckets?.length || 0) + (flow.pipelines?.length || 0) + (flow.cloudfront?.length || 0) + (flow.other?.length || 0);
                    return (
                      <div
                        key={`${flow.record_id}-${idx}`}
                        onClick={() => { setSelectedUrl(flow); setSelectedNode(null); setShowConnectionsPanel(false); }}
                        className={`px-3 py-2 border-b border-slate-700/50 cursor-pointer transition hover:bg-slate-700 ${
                          selectedUrl?.record_id === flow.record_id ? 'bg-purple-900/30 border-l-2 border-l-purple-500' : 'pl-6'
                        }`}
                      >
                        <p className="text-[11px] font-medium truncate text-white">{flow.url}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[9px] px-1 bg-slate-700 text-slate-400 rounded">{flow.record_type}</span>
                          {totalConn > 0 ? (
                            <span className="text-[9px] text-green-400">{totalConn} connected</span>
                          ) : (
                            <span className="text-[9px] text-slate-500">no match</span>
                          )}
                          {flow.albs?.length > 0 && <span className="text-[9px] px-1 bg-orange-900/40 text-orange-300 rounded">{flow.albs.length} ALB</span>}
                          {flow.ec2_instances?.length > 0 && <span className="text-[9px] px-1 bg-yellow-900/40 text-yellow-300 rounded">{flow.ec2_instances.length} EC2</span>}
                          {flow.pipelines?.length > 0 && <span className="text-[9px] px-1 bg-blue-900/40 text-blue-300 rounded">{flow.pipelines.length} CI/CD</span>}
                          {flow.classification?.is_certificate_validation && (
                            <span className="text-[9px] px-1 bg-cyan-900/40 text-cyan-300 rounded">cert-validation</span>
                          )}
                          {flow.classification?.has_invalid_a_target && (
                            <span className="text-[9px] px-1 bg-red-900/40 text-red-300 rounded">invalid-ip</span>
                          )}
                          {flow.classification?.is_provider_or_external_a_record && (
                            <span className="text-[9px] px-1 bg-amber-900/40 text-amber-300 rounded">provider/external</span>
                          )}
                          {(flow.important_path_count || 0) > 0 && (
                            <span className="text-[9px] px-1 bg-emerald-900/40 text-emerald-300 rounded">important-path</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== MODALS ===== */}

      {/* Edit Resource Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowEditModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Edit Resource
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Resource info header */}
              <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: TYPE_COLORS[editTarget.type] || '#64748B' }}>
                  {TYPE_ICONS[editTarget.type] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{editTarget.name}</p>
                  <p className="text-[10px] text-slate-400">{TYPE_LABELS[editTarget.type] || editTarget.type} &middot; ID: {editTarget.id}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Name</label>
                <input
                  type="text" value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Environment */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Environment</label>
                <select
                  value={editForm.environment}
                  onChange={(e) => setEditForm(f => ({ ...f, environment: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Not set</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Not set</option>
                  <option value="active">Active</option>
                  <option value="running">Running</option>
                  <option value="available">Available</option>
                  <option value="deployed">Deployed</option>
                  <option value="stopped">Stopped</option>
                  <option value="inactive">Inactive</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Navigator Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add notes about this resource in the flow..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">Cancel</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="flex items-center gap-1 px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-700 text-xs font-medium disabled:opacity-50">
                {editSaving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save className="w-3 h-3" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && removeTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowRemoveConfirm(false)}>
          <div className="bg-slate-800 border border-red-700/50 rounded-xl w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-sm">Remove Connection</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-300 mb-3">
                Remove <strong className="text-white">{removeTarget.name}</strong> ({TYPE_LABELS[removeTarget.type] || removeTarget.type}) from this URL flow?
              </p>
              <p className="text-[10px] text-slate-500">
                This will delete the relationship connecting this resource in the flow. The resource itself will not be deleted.
              </p>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <button onClick={() => setShowRemoveConfirm(false)} className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">Cancel</button>
              <button onClick={confirmRemove} disabled={removing}
                className="flex items-center gap-1 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-xs font-medium disabled:opacity-50">
                {removing ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Trash2 className="w-3 h-3" />}
                Remove Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => { setShowLinkModal(false); setLinkSourceNode(null); }}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-[560px] max-h-[650px] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-400" /> Add Connection
                </h3>
                <button onClick={() => { setShowLinkModal(false); setLinkSourceNode(null); }} className="p-1 hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                <div className="w-7 h-7 rounded flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: TYPE_COLORS[linkSourceNode?.type] || '#64748B' }}>
                  {TYPE_ICONS[linkSourceNode?.type] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{linkSourceNode?.name || 'Unknown'}</p>
                  <p className="text-[10px] text-slate-400">{TYPE_LABELS[linkSourceNode?.type] || linkSourceNode?.type}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-300">Select target</span>
              </div>
            </div>
            <div className="p-3 border-b border-slate-700 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" value={linkSearch} onChange={(e) => handleLinkSearchChange(e.target.value)}
                  placeholder="Search by name, IP, DNS, or ID..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => handleLinkTypeFilterChange('')}
                  className={`px-2 py-1 rounded text-[10px] font-medium ${!linkTypeFilter ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                >All</button>
                {[
                  { type: 'elb', label: 'Load Balancers' },
                  { type: 'ec2', label: 'EC2' },
                  { type: 'rds', label: 'RDS' },
                  { type: 'cloudfront', label: 'CloudFront' },
                  { type: 's3', label: 'S3' },
                  { type: 'ecs', label: 'ECS' },
                  { type: 'lambda', label: 'Lambda' },
                  { type: 'codepipeline', label: 'Pipeline' },
                ].map(t => (
                  <button key={t.type}
                    onClick={() => handleLinkTypeFilterChange(t.type === linkTypeFilter ? '' : t.type)}
                    className={`px-2 py-1 rounded text-[10px] font-medium ${linkTypeFilter === t.type ? 'text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    style={linkTypeFilter === t.type ? { backgroundColor: TYPE_COLORS[t.type] || '#64748B' } : {}}
                  >{t.label}</button>
                ))}
              </div>
              {linkSourceNode && LINK_TYPE_SUGGESTIONS[linkSourceNode.type] && (
                <p className="text-[10px] text-purple-400">
                  Tip: {TYPE_LABELS[linkSourceNode.type]} typically connects to {LINK_TYPE_SUGGESTIONS[linkSourceNode.type].label}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {linkSearchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
              ) : linkSearchResults.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-6">
                  {linkSearch || linkTypeFilter ? 'No resources found' : 'Search or select a type filter'}
                </p>
              ) : (
                <div className="space-y-0.5 mt-1">
                  <p className="text-[10px] text-slate-500 px-1 mb-1">{linkSearchResults.length} results</p>
                  {linkSearchResults.map(r => (
                    <div key={r.id} onClick={() => handleManualLink(r)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-700 cursor-pointer group">
                      <div className="w-8 h-8 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[r.type] || '#64748B' }}>
                        {TYPE_ICONS[r.type] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {TYPE_LABELS[r.type] || r.type}
                          {r.account_id && <> &middot; ...{r.account_id.slice(-4)}</>}
                          {r.private_ip && <> &middot; {r.private_ip}</>}
                          {r.dns_name && <> &middot; {r.dns_name.length > 30 ? r.dns_name.slice(0, 28) + '..' : r.dns_name}</>}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default ResourcesNavigator;
