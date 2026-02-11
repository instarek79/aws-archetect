import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Search, Filter, RefreshCw, 
  ArrowRight, Network, ChevronDown, X, Check, AlertCircle,
  Link2, Unlink, Download, Upload
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8800';

// Relationship type colors
const RELATIONSHIP_COLORS = {
  connects_to: '#8B5CF6',
  depends_on: '#F59E0B',
  uses: '#3B82F6',
  triggers: '#EC4899',
  streams_to: '#06B6D4',
  deploy_to: '#10B981',
  deployed_with: '#10B981',
  references: '#6B7280',
  reads_from: '#14B8A6',
  writes_to: '#F97316',
  invokes: '#A855F7',
  authenticates: '#EF4444',
};

const RELATIONSHIP_TYPES = [
  { value: 'connects_to', label: 'Connects To', color: '#8B5CF6', description: 'Network connection' },
  { value: 'depends_on', label: 'Depends On', color: '#F59E0B', description: 'Dependency relationship' },
  { value: 'uses', label: 'Uses', color: '#3B82F6', description: 'Usage relationship' },
  { value: 'triggers', label: 'Triggers', color: '#EC4899', description: 'Event trigger' },
  { value: 'streams_to', label: 'Streams To', color: '#06B6D4', description: 'Data streaming' },
  { value: 'deploy_to', label: 'Deploy To', color: '#10B981', description: 'Deployment target' },
  { value: 'deployed_with', label: 'Deployed With', color: '#10B981', description: 'Co-deployment' },
  { value: 'references', label: 'References', color: '#6B7280', description: 'Reference link' },
  { value: 'reads_from', label: 'Reads From', color: '#14B8A6', description: 'Data read' },
  { value: 'writes_to', label: 'Writes To', color: '#F97316', description: 'Data write' },
  { value: 'invokes', label: 'Invokes', color: '#A855F7', description: 'Function invocation' },
  { value: 'authenticates', label: 'Authenticates', color: '#EF4444', description: 'Authentication' },
];

export default function RelationshipManager() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRelType, setSelectedRelType] = useState('all');
  const [showCrossAccountOnly, setShowCrossAccountOnly] = useState(false);
  
  // Create relationship modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRelationship, setNewRelationship] = useState({
    source_resource_id: '',
    target_resource_id: '',
    relationship_type: 'connects_to',
    description: ''
  });
  
  // Edit relationship modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState(null);
  
  // Bulk selection
  const [selectedRelationships, setSelectedRelationships] = useState(new Set());

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resourcesRes, relationshipsRes] = await Promise.all([
        axios.get(`${API_URL}/api/resources/?limit=10000`, { headers }),
        axios.get(`${API_URL}/api/relationships`, { headers })
      ]);
      
      setResources(resourcesRes.data || []);
      setRelationships(relationshipsRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique accounts
  const accounts = useMemo(() => {
    const accountSet = new Set();
    resources.forEach(r => {
      if (r.account_id) accountSet.add(r.account_id);
    });
    return Array.from(accountSet);
  }, [resources]);

  // Get unique resource types
  const resourceTypes = useMemo(() => {
    const typeSet = new Set();
    resources.forEach(r => {
      if (r.type) typeSet.add(r.type);
    });
    return Array.from(typeSet).sort();
  }, [resources]);

  // Create resource lookup map
  const resourceMap = useMemo(() => {
    const map = {};
    resources.forEach(r => {
      map[r.id] = r;
    });
    return map;
  }, [resources]);

  // Filter relationships
  const filteredRelationships = useMemo(() => {
    return relationships.filter(rel => {
      const source = resourceMap[rel.source_resource_id];
      const target = resourceMap[rel.target_resource_id];
      
      if (!source || !target) return false;
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSource = (source.name || '').toLowerCase().includes(search) ||
                             (source.resource_id || '').toLowerCase().includes(search);
        const matchesTarget = (target.name || '').toLowerCase().includes(search) ||
                             (target.resource_id || '').toLowerCase().includes(search);
        if (!matchesSource && !matchesTarget) return false;
      }
      
      // Account filter
      if (selectedAccount !== 'all') {
        if (source.account_id !== selectedAccount && target.account_id !== selectedAccount) {
          return false;
        }
      }
      
      // Resource type filter
      if (selectedType !== 'all') {
        if (source.type !== selectedType && target.type !== selectedType) {
          return false;
        }
      }
      
      // Relationship type filter
      if (selectedRelType !== 'all') {
        if (rel.relationship_type !== selectedRelType) return false;
      }
      
      // Cross-account filter
      if (showCrossAccountOnly) {
        if (source.account_id === target.account_id) return false;
      }
      
      return true;
    });
  }, [relationships, resourceMap, searchTerm, selectedAccount, selectedType, selectedRelType, showCrossAccountOnly]);

  // Group resources by account for easier selection
  const resourcesByAccount = useMemo(() => {
    const grouped = {};
    resources.forEach(r => {
      const acc = r.account_id || 'unknown';
      if (!grouped[acc]) grouped[acc] = [];
      grouped[acc].push(r);
    });
    return grouped;
  }, [resources]);

  // Create relationship
  const handleCreateRelationship = async () => {
    if (!newRelationship.source_resource_id || !newRelationship.target_resource_id) {
      alert('Please select both source and target resources');
      return;
    }
    
    if (newRelationship.source_resource_id === newRelationship.target_resource_id) {
      alert('Source and target cannot be the same resource');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_URL}/api/relationships`, {
        source_resource_id: parseInt(newRelationship.source_resource_id),
        target_resource_id: parseInt(newRelationship.target_resource_id),
        relationship_type: newRelationship.relationship_type,
        description: newRelationship.description || `Created from Relationship Manager`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowCreateModal(false);
      setNewRelationship({
        source_resource_id: '',
        target_resource_id: '',
        relationship_type: 'connects_to',
        description: ''
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create relationship:', err);
      alert('Failed to create relationship: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Update relationship
  const handleUpdateRelationship = async () => {
    if (!editingRelationship) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API_URL}/api/relationships/${editingRelationship.id}`, {
        source_resource_id: parseInt(editingRelationship.source_resource_id),
        target_resource_id: parseInt(editingRelationship.target_resource_id),
        relationship_type: editingRelationship.relationship_type,
        description: editingRelationship.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowEditModal(false);
      setEditingRelationship(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update relationship:', err);
      alert('Failed to update relationship: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Delete relationship
  const handleDeleteRelationship = async (id) => {
    if (!window.confirm('Delete this relationship?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_URL}/api/relationships/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete relationship:', err);
      alert('Failed to delete relationship: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedRelationships.size === 0) return;
    if (!window.confirm(`Delete ${selectedRelationships.size} relationships?`)) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await Promise.all(
        Array.from(selectedRelationships).map(id =>
          axios.delete(`${API_URL}/api/relationships/${id}`, { headers })
        )
      );
      
      setSelectedRelationships(new Set());
      fetchData();
    } catch (err) {
      console.error('Failed to delete relationships:', err);
      alert('Failed to delete some relationships');
    }
  };

  // Swap direction
  const handleSwapDirection = async (rel) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API_URL}/api/relationships/${rel.id}`, {
        source_resource_id: rel.target_resource_id,
        target_resource_id: rel.source_resource_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to swap direction:', err);
      alert('Failed to swap direction: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedRelationships(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all visible
  const selectAllVisible = () => {
    const allIds = new Set(filteredRelationships.map(r => r.id));
    setSelectedRelationships(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRelationships(new Set());
  };

  // Resource selector component with type filter
  const ResourceSelector = ({ value, onChange, label, excludeId }) => {
    const [searchFilter, setSearchFilter] = useState('');
    const [accountFilter, setAccountFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    
    const filteredResources = useMemo(() => {
      return resources.filter(r => {
        if (excludeId && r.id.toString() === excludeId) return false;
        if (accountFilter !== 'all' && r.account_id !== accountFilter) return false;
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (searchFilter) {
          const search = searchFilter.toLowerCase();
          return (r.name || '').toLowerCase().includes(search) ||
                 (r.resource_id || '').toLowerCase().includes(search) ||
                 (r.type || '').toLowerCase().includes(search);
        }
        return true;
      });
    }, [searchFilter, accountFilter, typeFilter, excludeId]);

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Accounts</option>
            {accounts.map(acc => (
              <option key={acc} value={acc}>{acc.slice(-8)}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {resourceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-500 mb-1">
          {filteredResources.length} resources found
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          size={6}
        >
          <option value="">-- Select Resource --</option>
          {filteredResources.map(r => (
            <option key={r.id} value={r.id}>
              [{r.type}] {r.name || r.resource_id} ({r.account_id?.slice(-4) || 'N/A'})
            </option>
          ))}
        </select>
        {value && resourceMap[value] && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Selected: <span className="font-medium">{resourceMap[value]?.name || resourceMap[value]?.resource_id}</span>
            <br />
            Type: {resourceMap[value]?.type} | Account: {resourceMap[value]?.account_id?.slice(-8)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading relationships...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <NavBar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/architecture')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Diagram"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Network className="w-6 h-6 text-blue-600" />
                  Relationship Manager
                </h1>
                <p className="text-sm text-gray-500">
                  {relationships.length} total relationships • {filteredRelationships.length} shown
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                New Relationship
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Account Filter */}
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc} value={acc}>{acc.slice(-8)}</option>
              ))}
            </select>
            
            {/* Resource Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            {/* Relationship Type Filter */}
            <select
              value={selectedRelType}
              onChange={(e) => setSelectedRelType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Relationship Types</option>
              {RELATIONSHIP_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            
            {/* Cross-account toggle */}
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
              <input
                type="checkbox"
                checked={showCrossAccountOnly}
                onChange={(e) => setShowCrossAccountOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Cross-Account Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRelationships.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedRelationships.size} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
              >
                Clear
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Relationships Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRelationships.size === filteredRelationships.length && filteredRelationships.length > 0}
                      onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Target</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Cross-Account</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRelationships.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <Network className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No relationships found</p>
                      <p className="text-sm">Try adjusting your filters or create a new relationship</p>
                    </td>
                  </tr>
                ) : (
                  filteredRelationships.map(rel => {
                    const source = resourceMap[rel.source_resource_id];
                    const target = resourceMap[rel.target_resource_id];
                    const isCrossAccount = source?.account_id !== target?.account_id;
                    const relType = RELATIONSHIP_TYPES.find(t => t.value === rel.relationship_type);
                    
                    return (
                      <tr key={rel.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRelationships.has(rel.id)}
                            onChange={() => toggleSelection(rel.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {source?.name || source?.resource_id || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {source?.type} • {source?.account_id?.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: relType?.color || '#6B7280' }}
                            >
                              {rel.relationship_type}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {target?.name || target?.resource_id || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {target?.type} • {target?.account_id?.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCrossAccount ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              <Link2 className="w-3 h-3" />
                              Cross-Account
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Same Account</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSwapDirection(rel)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                              title="Swap Direction"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRelationship({ ...rel });
                                setShowEditModal(true);
                              }}
                              className="p-1.5 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="p-1.5 hover:bg-red-100 rounded text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{relationships.length}</div>
            <div className="text-sm text-gray-500">Total Relationships</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">
              {relationships.filter(r => {
                const s = resourceMap[r.source_resource_id];
                const t = resourceMap[r.target_resource_id];
                return s?.account_id !== t?.account_id;
              }).length}
            </div>
            <div className="text-sm text-gray-500">Cross-Account</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">
              {new Set(relationships.map(r => r.relationship_type)).size}
            </div>
            <div className="text-sm text-gray-500">Relationship Types</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {new Set([
                ...relationships.map(r => r.source_resource_id),
                ...relationships.map(r => r.target_resource_id)
              ]).size}
            </div>
            <div className="text-sm text-gray-500">Connected Resources</div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Create New Relationship</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <ResourceSelector
                value={newRelationship.source_resource_id}
                onChange={(v) => setNewRelationship(prev => ({ ...prev, source_resource_id: v }))}
                label="Source Resource"
                excludeId={newRelationship.target_resource_id}
              />
              
              <div>
                <label className="text-sm font-medium text-gray-700">Relationship Type</label>
                <select
                  value={newRelationship.relationship_type}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, relationship_type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {RELATIONSHIP_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <ResourceSelector
                value={newRelationship.target_resource_id}
                onChange={(v) => setNewRelationship(prev => ({ ...prev, target_resource_id: v }))}
                label="Target Resource"
                excludeId={newRelationship.source_resource_id}
              />
              
              <div>
                <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                  value={newRelationship.description}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a description for this relationship..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRelationship}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Relationship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRelationship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Edit Relationship</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRelationship(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <ResourceSelector
                value={editingRelationship.source_resource_id?.toString()}
                onChange={(v) => setEditingRelationship(prev => ({ ...prev, source_resource_id: v }))}
                label="Source Resource"
                excludeId={editingRelationship.target_resource_id?.toString()}
              />
              
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setEditingRelationship(prev => ({
                      ...prev,
                      source_resource_id: prev.target_resource_id,
                      target_resource_id: prev.source_resource_id
                    }));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Swap Direction
                </button>
              </div>
              
              <ResourceSelector
                value={editingRelationship.target_resource_id?.toString()}
                onChange={(v) => setEditingRelationship(prev => ({ ...prev, target_resource_id: v }))}
                label="Target Resource"
                excludeId={editingRelationship.source_resource_id?.toString()}
              />
              
              <div>
                <label className="text-sm font-medium text-gray-700">Relationship Type</label>
                <select
                  value={editingRelationship.relationship_type}
                  onChange={(e) => setEditingRelationship(prev => ({ ...prev, relationship_type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {RELATIONSHIP_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  if (window.confirm('Delete this relationship?')) {
                    handleDeleteRelationship(editingRelationship.id);
                    setShowEditModal(false);
                    setEditingRelationship(null);
                  }
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRelationship(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRelationship}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
