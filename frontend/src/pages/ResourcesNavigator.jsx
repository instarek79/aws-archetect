import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Search, ChevronRight, ChevronDown, RefreshCw,
  X, Plus, Link2, Layers, ArrowRight
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';

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
function FlowNode({ resource, label, isSelected, onClick, onAddLink }) {
  const color = TYPE_COLORS[resource?.type] || '#64748B';
  const active = ['active', 'running', 'deployed', 'available'].includes(resource?.status);
  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border cursor-pointer transition-all hover:scale-[1.02] min-w-[200px] max-w-[220px] ${
        isSelected ? 'ring-2 ring-purple-500 bg-slate-700' : 'bg-slate-800 border-slate-600 hover:border-slate-500'
      }`}
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
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="mt-1.5 text-[9px] text-slate-500 space-y-0.5">
          {resource?.account_id && <p>Account: ...{resource.account_id.slice(-4)}</p>}
          {resource?.private_ip && <p>IP: {resource.private_ip}</p>}
          {resource?.instance_type && <p>{resource.instance_type}</p>}
          {resource?.dns_name && <p className="truncate">DNS: {resource.dns_name}</p>}
        </div>
      </div>
      {onAddLink && (
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
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedZones, setExpandedZones] = useState(new Set());

  // Manual link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkTypeFilter, setLinkTypeFilter] = useState('');
  const [linkSourceNode, setLinkSourceNode] = useState(null);
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [linkSearchLoading, setLinkSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const flowsRes = await axios.get(`${API_URL}/api/resources/url-flows`);
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

  // Build columns for the flow diagram
  const flowColumns = useMemo(() => {
    if (!selectedUrl) return [];
    const cols = [];
    // Col 0: DNS Record
    cols.push({ label: 'DNS Record', items: [{ ...selectedUrl.record, _label: selectedUrl.url }] });
    // Col 1: ALBs + CloudFront
    const col1 = [...(selectedUrl.albs || []), ...(selectedUrl.cloudfront || [])];
    if (col1.length > 0) cols.push({ label: 'Load Balancer / CDN', items: col1 });
    else if (selectedUrl.record_values?.length > 0) {
      cols.push({ label: 'Target (unresolved)', items: [{ name: selectedUrl.record_values[0], type: 'unknown', status: 'unresolved', _placeholder: true }] });
    }
    // Col 2: EC2
    const ec2s = selectedUrl.ec2_instances || [];
    if (ec2s.length > 0) cols.push({ label: 'EC2 Instances', items: ec2s });
    // Col 3: Databases
    const dbs = selectedUrl.databases || [];
    if (dbs.length > 0) cols.push({ label: 'Databases', items: dbs });
    // Col 4: S3 + Pipelines + Other
    const extras = [...(selectedUrl.s3_buckets || []), ...(selectedUrl.pipelines || []), ...(selectedUrl.other || [])];
    if (extras.length > 0) cols.push({ label: 'Storage / CI/CD / Other', items: extras });
    return cols;
  }, [selectedUrl]);

  // Link modal
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
      const res = await axios.get(`${API_URL}/api/resources/url-search-resources?${params}`);
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
      await axios.post(`${API_URL}/api/resources/url-link`, {
        source_resource_id: sourceId,
        target_resource_id: targetResource.id,
        label: 'manual_link',
      });
      setShowLinkModal(false);
      setLinkSourceNode(null);
      fetchData();
    } catch (err) {
      alert('Failed to create link: ' + (err.response?.data?.detail || err.message));
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
          <button onClick={fetchData} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => navigate('/architecture')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs">
            <Layers className="w-3 h-3" /> Diagram
          </button>
        </div>
      </header>

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
              <div className="ml-auto">
                <button onClick={() => openLinkModal(selectedUrl.record)} className="flex items-center gap-1 px-2 py-1 bg-purple-600 rounded hover:bg-purple-700 text-[10px] font-medium">
                  <Plus className="w-3 h-3" /> Add Connection
                </button>
              </div>
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
                    {/* Column */}
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center mb-1">{col.label}</p>
                      {col.items.map((item, itemIdx) => (
                        <FlowNode
                          key={item.id || `${colIdx}-${itemIdx}`}
                          resource={item}
                          label={item._label}
                          isSelected={selectedNode?.id === item.id}
                          onClick={() => setSelectedNode(selectedNode?.id === item.id ? null : item)}
                          onAddLink={item._placeholder ? null : openLinkModal}
                        />
                      ))}
                    </div>
                    {/* Arrow between columns */}
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
            <div className="bg-slate-800 border-t border-slate-700 flex-shrink-0 max-h-[200px] overflow-y-auto">
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
                  <button onClick={() => setSelectedNode(null)} className="ml-2 p-1 hover:bg-slate-700 rounded"><X className="w-3 h-3" /></button>
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
                </div>
                <button
                  onClick={() => openLinkModal(selectedNode)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 text-[10px] font-medium flex-shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add Connection
                </button>
              </div>
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
                        onClick={() => { setSelectedUrl(flow); setSelectedNode(null); }}
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
    </div>
  );
}

export default ResourcesNavigator;
