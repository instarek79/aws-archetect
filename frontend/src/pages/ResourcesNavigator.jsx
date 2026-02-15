import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Search, ChevronRight, ChevronDown, RefreshCw,
  Server, Database, Cloud, HardDrive, GitBranch, Shield,
  ArrowRight, ExternalLink, Monitor, Cpu, Network, X,
  Info, Eye, Layers
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { getServiceColor } from '../components/AWSIcons';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';

// Service type icons and colors
const SERVICE_CONFIG = {
  route53: { icon: Globe, color: '#8C4FFF', label: 'Route 53' },
  elb: { icon: Network, color: '#8C4FFF', label: 'Load Balancer' },
  alb: { icon: Network, color: '#8C4FFF', label: 'ALB' },
  nlb: { icon: Network, color: '#8C4FFF', label: 'NLB' },
  elasticloadbalancing: { icon: Network, color: '#8C4FFF', label: 'Load Balancer' },
  ec2: { icon: Server, color: '#FF9900', label: 'EC2' },
  instance: { icon: Server, color: '#FF9900', label: 'EC2' },
  rds: { icon: Database, color: '#527FFF', label: 'RDS' },
  aurora: { icon: Database, color: '#527FFF', label: 'Aurora' },
  dynamodb: { icon: Database, color: '#4053D6', label: 'DynamoDB' },
  cloudfront: { icon: Cloud, color: '#8C4FFF', label: 'CloudFront' },
  s3: { icon: HardDrive, color: '#569A31', label: 'S3' },
  codepipeline: { icon: GitBranch, color: '#4053D6', label: 'Pipeline' },
  codebuild: { icon: Cpu, color: '#4053D6', label: 'CodeBuild' },
  codecommit: { icon: GitBranch, color: '#4053D6', label: 'CodeCommit' },
  codedeploy: { icon: GitBranch, color: '#4053D6', label: 'CodeDeploy' },
};

// Resource card component for the flow diagram
const ResourceCard = ({ resource, size = 'normal', onClick, isHighlighted }) => {
  const config = SERVICE_CONFIG[resource?.type] || { icon: Server, color: '#64748B', label: resource?.type || 'Unknown' };
  const IconComponent = config.icon;
  
  const sizeClasses = {
    small: 'p-2',
    normal: 'p-3',
    large: 'p-4',
  };
  
  return (
    <div 
      onClick={onClick}
      className={`bg-slate-800 border rounded-lg ${sizeClasses[size]} cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
        isHighlighted ? 'border-cyan-400 shadow-cyan-400/20 shadow-lg' : 'border-slate-600 hover:border-slate-500'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.color + '20', border: `1px solid ${config.color}` }}
        >
          <IconComponent className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{resource?.name || 'Unknown'}</p>
          <p className="text-[10px] text-slate-400">{config.label}</p>
        </div>
      </div>
      {resource?.instance_type && (
        <p className="text-[10px] text-slate-500 mt-1 font-mono">{resource.instance_type}</p>
      )}
      {resource?.private_ip && (
        <p className="text-[10px] text-slate-500 font-mono">{resource.private_ip}</p>
      )}
      {resource?.status && (
        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${
          resource.status === 'active' || resource.status === 'running' || resource.status === 'deployed'
            ? 'bg-green-900/50 text-green-400'
            : resource.status === 'stopped'
            ? 'bg-red-900/50 text-red-400'
            : 'bg-slate-700 text-slate-400'
        }`}>
          {resource.status}
        </span>
      )}
    </div>
  );
};

// Flow arrow component
const FlowArrow = ({ label }) => (
  <div className="flex flex-col items-center justify-center px-2 py-1">
    <div className="flex items-center gap-1">
      <div className="w-8 h-0.5 bg-cyan-500"></div>
      <ArrowRight className="w-4 h-4 text-cyan-500 -ml-1" />
    </div>
    {label && <span className="text-[9px] text-cyan-400 mt-0.5">{label}</span>}
  </div>
);

// Resource detail panel
const ResourceDetailPanel = ({ resource, onClose }) => {
  if (!resource) return null;
  
  const config = SERVICE_CONFIG[resource.type] || { icon: Server, color: '#64748B', label: resource.type };
  const IconComponent = config.icon;
  const props = resource.type_specific_properties || {};
  
  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-slate-800 border-l border-slate-700 z-20 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-bold text-sm">Resource Details</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: config.color + '20', border: `2px solid ${config.color}` }}
          >
            <IconComponent className="w-6 h-6" style={{ color: config.color }} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{resource.name}</h4>
            <p className="text-xs text-slate-400">{config.label}</p>
          </div>
        </div>
        
        <div className="space-y-2 text-xs">
          {resource.resource_id && (
            <div className="p-2 bg-slate-700/50 rounded">
              <span className="text-slate-400 block">Resource ID</span>
              <span className="font-mono break-all">{resource.resource_id}</span>
            </div>
          )}
          {resource.account_id && (
            <div className="flex justify-between p-2 bg-slate-700/50 rounded">
              <span className="text-slate-400">Account</span>
              <span className="font-mono">...{resource.account_id.slice(-4)}</span>
            </div>
          )}
          {resource.region && (
            <div className="flex justify-between"><span className="text-slate-400">Region</span><span>{resource.region}</span></div>
          )}
          {resource.status && (
            <div className="flex justify-between"><span className="text-slate-400">Status</span>
              <span className={`px-2 py-0.5 rounded ${
                resource.status === 'active' || resource.status === 'running' ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-300'
              }`}>{resource.status}</span>
            </div>
          )}
          {resource.vpc_id && (
            <div className="flex justify-between"><span className="text-slate-400">VPC</span><span className="font-mono">...{resource.vpc_id.slice(-8)}</span></div>
          )}
          {resource.subnet_id && (
            <div className="flex justify-between"><span className="text-slate-400">Subnet</span><span className="font-mono">...{resource.subnet_id.slice(-8)}</span></div>
          )}
          {resource.instance_type && (
            <div className="flex justify-between"><span className="text-slate-400">Instance Type</span><span className="font-mono">{resource.instance_type}</span></div>
          )}
          {resource.private_ip && (
            <div className="flex justify-between"><span className="text-slate-400">Private IP</span><span className="font-mono">{resource.private_ip}</span></div>
          )}
          {resource.public_ip && (
            <div className="flex justify-between"><span className="text-slate-400">Public IP</span><span className="font-mono">{resource.public_ip}</span></div>
          )}
          {resource.dns_name && (
            <div className="p-2 bg-slate-700/50 rounded">
              <span className="text-slate-400 block">DNS Name</span>
              <span className="font-mono break-all">{resource.dns_name}</span>
            </div>
          )}
          {resource.environment && (
            <div className="flex justify-between"><span className="text-slate-400">Environment</span><span>{resource.environment}</span></div>
          )}
          
          {/* Type-specific properties */}
          {Object.keys(props).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <h5 className="text-slate-400 font-medium mb-2">Properties</h5>
              {Object.entries(props).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-slate-500">{key.replace(/_/g, ' ')}</span>
                  <span className="text-slate-300 text-right max-w-[150px] truncate font-mono">
                    {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Tags */}
          {resource.tags && Object.keys(resource.tags).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <h5 className="text-slate-400 font-medium mb-2">Tags</h5>
              {Object.entries(resource.tags).slice(0, 10).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-slate-500 truncate max-w-[120px]">{key}</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function ResourcesNavigator() {
  const navigate = useNavigate();
  
  // Data state
  const [urlFlows, setUrlFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set(['ec2', 'cloudfront', 's3', 'pipelines', 'databases']));

  useEffect(() => {
    fetchUrlFlows();
  }, []);

  const fetchUrlFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/resources/url-flows`);
      setUrlFlows(response.data);
      // Auto-select first URL
      if (response.data.length > 0) {
        setSelectedUrl(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch URL flows', err);
      setError('Failed to load URL flows. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Filter URLs by search
  const filteredUrls = useMemo(() => {
    if (!searchQuery) return urlFlows;
    const q = searchQuery.toLowerCase();
    return urlFlows.filter(flow => 
      flow.url?.toLowerCase().includes(q) ||
      flow.account_id?.includes(q) ||
      flow.alb?.name?.toLowerCase().includes(q)
    );
  }, [urlFlows, searchQuery]);

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

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
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold">URL Navigator</h1>
          </div>
          <span className="text-sm text-slate-400 px-2 py-1 bg-slate-700 rounded">
            {urlFlows.length} URLs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUrlFlows} className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={() => navigate('/architecture')} className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-sm">
            <Layers className="w-4 h-4" />
            Diagram
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Main Flow Diagram Area */}
        <div className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">Error Loading Data</h3>
                <p className="text-slate-500 mb-4">{error}</p>
                <button onClick={fetchUrlFlows} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Retry
                </button>
              </div>
            </div>
          ) : !selectedUrl ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">Select a URL</h3>
                <p className="text-slate-500">Choose a Route 53 URL from the sidebar to view its flow</p>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              {/* Account Info Banner */}
              <div className="bg-gradient-to-r from-purple-900/30 to-slate-800 border border-purple-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                      {selectedUrl.url}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Account: <span className="font-mono text-purple-300">{selectedUrl.account_id || 'Unknown'}</span>
                      {selectedUrl.zone?.region && <> &middot; Region: <span className="text-purple-300">{selectedUrl.zone.region}</span></>}
                      {selectedUrl.zone?.status && <> &middot; Status: <span className={selectedUrl.zone.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{selectedUrl.zone.status}</span></>}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{selectedUrl.ec2_instances?.length || 0} EC2 instances</p>
                    <p>{selectedUrl.databases?.length || 0} databases</p>
                    <p>{selectedUrl.pipelines?.length || 0} pipelines</p>
                  </div>
                </div>
              </div>

              {/* Main Flow: Route53 → ALB → EC2 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Request Flow</h3>
                <div className="flex items-start gap-1 overflow-x-auto pb-4">
                  {/* Route 53 Zone */}
                  <div className="flex-shrink-0">
                    <ResourceCard 
                      resource={selectedUrl.zone} 
                      size="large"
                      onClick={() => setSelectedResource(selectedUrl.zone)}
                      isHighlighted={selectedResource?.id === selectedUrl.zone?.id}
                    />
                  </div>
                  
                  <FlowArrow label="DNS" />
                  
                  {/* ALB */}
                  {selectedUrl.alb ? (
                    <>
                      <div className="flex-shrink-0">
                        <ResourceCard 
                          resource={selectedUrl.alb} 
                          size="large"
                          onClick={() => setSelectedResource(selectedUrl.alb)}
                          isHighlighted={selectedResource?.id === selectedUrl.alb?.id}
                        />
                      </div>
                      <FlowArrow label="HTTP/S" />
                    </>
                  ) : (
                    <div className="flex-shrink-0 p-3 border border-dashed border-slate-600 rounded-lg text-center">
                      <Network className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">No ALB</p>
                    </div>
                  )}
                  
                  {/* EC2 Instances */}
                  <div className="flex-shrink-0">
                    {selectedUrl.ec2_instances?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUrl.ec2_instances.slice(0, 4).map(ec2 => (
                          <ResourceCard 
                            key={ec2.id} 
                            resource={ec2} 
                            size="normal"
                            onClick={() => setSelectedResource(ec2)}
                            isHighlighted={selectedResource?.id === ec2.id}
                          />
                        ))}
                        {selectedUrl.ec2_instances.length > 4 && (
                          <p className="text-xs text-slate-500 text-center">+{selectedUrl.ec2_instances.length - 4} more</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-slate-600 rounded-lg text-center">
                        <Server className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">No EC2</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Databases */}
                  {selectedUrl.databases?.length > 0 && (
                    <>
                      <FlowArrow label="Query" />
                      <div className="flex-shrink-0 space-y-2">
                        {selectedUrl.databases.slice(0, 3).map(db => (
                          <ResourceCard 
                            key={db.id} 
                            resource={db} 
                            size="normal"
                            onClick={() => setSelectedResource(db)}
                            isHighlighted={selectedResource?.id === db.id}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CloudFront Section */}
              {selectedUrl.cloudfront?.length > 0 && (
                <div className="mb-4">
                  <button 
                    onClick={() => toggleSection('cloudfront')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-300"
                  >
                    {expandedSections.has('cloudfront') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Cloud className="w-4 h-4 text-purple-400" />
                    CloudFront Distributions ({selectedUrl.cloudfront.length})
                  </button>
                  {expandedSections.has('cloudfront') && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pl-6">
                      {selectedUrl.cloudfront.map(cf => (
                        <ResourceCard 
                          key={cf.id} 
                          resource={cf} 
                          size="small"
                          onClick={() => setSelectedResource(cf)}
                          isHighlighted={selectedResource?.id === cf.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* S3 Buckets Section */}
              {selectedUrl.s3_buckets?.length > 0 && (
                <div className="mb-4">
                  <button 
                    onClick={() => toggleSection('s3')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-300"
                  >
                    {expandedSections.has('s3') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <HardDrive className="w-4 h-4 text-green-400" />
                    S3 Buckets ({selectedUrl.s3_buckets.length})
                  </button>
                  {expandedSections.has('s3') && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pl-6">
                      {selectedUrl.s3_buckets.map(s3 => (
                        <ResourceCard 
                          key={s3.id} 
                          resource={s3} 
                          size="small"
                          onClick={() => setSelectedResource(s3)}
                          isHighlighted={selectedResource?.id === s3.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pipelines Section */}
              {selectedUrl.pipelines?.length > 0 && (
                <div className="mb-4">
                  <button 
                    onClick={() => toggleSection('pipelines')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-300"
                  >
                    {expandedSections.has('pipelines') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <GitBranch className="w-4 h-4 text-blue-400" />
                    CI/CD Pipelines ({selectedUrl.pipelines.length})
                  </button>
                  {expandedSections.has('pipelines') && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pl-6">
                      {selectedUrl.pipelines.map(p => (
                        <ResourceCard 
                          key={p.id} 
                          resource={p} 
                          size="small"
                          onClick={() => setSelectedResource(p)}
                          isHighlighted={selectedResource?.id === p.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state for no connected resources */}
              {!selectedUrl.alb && selectedUrl.ec2_instances?.length === 0 && selectedUrl.cloudfront?.length === 0 && selectedUrl.s3_buckets?.length === 0 && selectedUrl.pipelines?.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Info className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-lg font-medium">No connected resources found</p>
                  <p className="text-sm mt-1">This Route 53 zone has no discovered connections to other resources</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - URL List */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              Route 53 URLs
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search URLs..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredUrls.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Globe className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">No Route 53 URLs found</p>
                <p className="text-xs mt-1">Import AWS resources with Route 53 zones</p>
              </div>
            ) : (
              filteredUrls.map((flow, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedUrl(flow);
                    setSelectedResource(null);
                  }}
                  className={`p-3 border-b border-slate-700 cursor-pointer transition hover:bg-slate-700 ${
                    selectedUrl?.url === flow.url && selectedUrl?.account_id === flow.account_id
                      ? 'bg-purple-900/30 border-l-2 border-l-purple-500' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-900/50 border border-purple-700 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-white">{flow.url}</p>
                      <p className="text-xs text-slate-400">
                        Account: ...{flow.account_id?.slice(-4) || '????'}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {flow.alb && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">ALB</span>
                        )}
                        {flow.ec2_instances?.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded">
                            {flow.ec2_instances.length} EC2
                          </span>
                        )}
                        {flow.cloudfront?.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">CF</span>
                        )}
                        {flow.pipelines?.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-900/50 text-indigo-300 rounded">
                            {flow.pipelines.length} CI/CD
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resource Detail Overlay */}
        {selectedResource && (
          <ResourceDetailPanel 
            resource={selectedResource} 
            onClose={() => setSelectedResource(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default ResourcesNavigator;
