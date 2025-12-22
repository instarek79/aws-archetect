import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Edit, Trash2, Globe, LogOut, Database, Sparkles, Network, CheckSquare, Square, Settings, Filter, Search, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Copy, ExternalLink, MoreHorizontal, Download, RefreshCw, SlidersHorizontal } from 'lucide-react';
import ResourceModal from '../components/ResourceModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Linked/metadata resource types (not counted as main resources)
const LINKED_RESOURCE_TYPES = new Set([
  'config', 'security_group_rule', 'rds_snapshot', 'rds_backup', 'aurora_snapshot',
  'snapshot', 'rds_parameter_group', 'rds_option_group', 'aurora_parameter_group',
  'db_subnet_group', 'dhcp_options', 'resource-explorer-2', 'flow_log',
  'ipam', 'ipam_scope', 'ipam_discovery', 'ipam_discovery_assoc', 'network_insights'
]);

// Resource categories
const RESOURCE_CATEGORIES = {
  infrastructure: {
    label: 'Infrastructure',
    types: ['ec2', 'rds', 'aurora', 's3', 'ebs', 'lambda', 'ecs', 'eks', 'elasticache',
            'dynamodb', 'elasticfilesystem', 'mq', 'memorydb', 'apprunner', 'elasticbeanstalk']
  },
  network: {
    label: 'Network',
    types: ['vpc', 'subnet', 'security_group', 'eni', 'eip', 'nat_gateway', 'igw',
            'route_table', 'nacl', 'vpc_endpoint', 'vpc_peering', 'transit_gateway',
            'elasticloadbalancing', 'target_group', 'cloudfront', 'apigateway', 'route53']
  },
  identity: {
    label: 'Identity & Access',
    types: ['iam_role', 'iam_policy', 'iam_user', 'iam_group', 'iam', 'instance_profile',
            'secrets_manager', 'kms', 'acm_certificate']
  },
  devops: {
    label: 'DevOps & CI/CD',
    types: ['codebuild', 'codepipeline', 'codedeploy', 'codecommit', 'codeconnections',
            'codestar-connections', 'cloudformation', 'cfn_stack', 'servicecatalog']
  },
  monitoring: {
    label: 'Monitoring & Logging',
    types: ['log_group', 'cloudwatch', 'cloudwatch_alarm', 'cloudtrail', 'eventbridge',
            'eventbridge_rule', 'sns', 'ses', 'guardduty', 'access-analyzer']
  },
  storage: {
    label: 'Storage & Backup',
    types: ['ami', 'snapshot', 'backup_vault', 'backup_plan', 'transfer']
  },
  other: {
    label: 'Other',
    types: ['ssm', 'ssm_document', 'ssm_parameter', 'waf', 'wafv2', 'dms', 'athena',
            'ecr', 'launch_template', 'key_pair', 'resource-groups']
  }
};

// Get category for a resource type
const getResourceCategory = (type) => {
  for (const [category, data] of Object.entries(RESOURCE_CATEGORIES)) {
    if (data.types.includes(type)) return category;
  }
  return 'other';
};

// Default column configuration
const DEFAULT_COLUMNS = [
  { id: 'select', label: '', width: 50, minWidth: 40, visible: true, sortable: false, resizable: false },
  { id: 'name', label: 'Name', width: 250, minWidth: 100, visible: true, sortable: true, resizable: true },
  { id: 'type', label: 'Type', width: 120, minWidth: 80, visible: true, sortable: true, resizable: true },
  { id: 'category', label: 'Category', width: 120, minWidth: 80, visible: false, sortable: true, resizable: true },
  { id: 'region', label: 'Region', width: 120, minWidth: 80, visible: true, sortable: true, resizable: true },
  { id: 'account_id', label: 'Account', width: 130, minWidth: 80, visible: true, sortable: true, resizable: true },
  { id: 'status', label: 'Status', width: 100, minWidth: 60, visible: true, sortable: true, resizable: true },
  { id: 'environment', label: 'Environment', width: 110, minWidth: 80, visible: false, sortable: true, resizable: true },
  { id: 'vpc_id', label: 'VPC', width: 140, minWidth: 80, visible: false, sortable: true, resizable: true },
  { id: 'tags', label: 'Tags', width: 100, minWidth: 60, visible: true, sortable: false, resizable: true },
  { id: 'created_at', label: 'Created', width: 110, minWidth: 80, visible: true, sortable: true, resizable: true },
  { id: 'actions', label: 'Actions', width: 100, minWidth: 80, visible: true, sortable: false, resizable: false },
];

function Resources() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRTL = i18n.language === 'ar';

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedResource, setSelectedResource] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Load display settings from Dashboard
  const displaySettings = (() => {
    const saved = localStorage.getItem('resourceDisplaySettings');
    return saved ? JSON.parse(saved) : null;
  })();
  
  // Column configuration - apply display settings if available
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('resourceColumns');
    if (saved) return JSON.parse(saved);
    
    // Apply display settings column widths if available
    if (displaySettings?.columnWidths) {
      return DEFAULT_COLUMNS.map(col => ({
        ...col,
        width: displaySettings.columnWidths[col.id] || col.width,
        visible: col.id === 'select' || col.id === 'actions' || displaySettings.visibleColumns?.includes(col.id) || col.visible
      }));
    }
    return DEFAULT_COLUMNS;
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  
  // Filtering and search - initialize from URL params
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [regionFilter, setRegionFilter] = useState(searchParams.get('region') || 'all');
  const [accountFilter, setAccountFilter] = useState(searchParams.get('account') || 'all');
  const [environmentFilter, setEnvironmentFilter] = useState(searchParams.get('environment') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || displaySettings?.defaultCategory || 'all');
  const [showLinked, setShowLinked] = useState(searchParams.get('linked') === 'true' || displaySettings?.showLinkedByDefault || false);
  
  // Column resize state
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  // Pagination - use display settings default
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(displaySettings?.defaultPageSize || 25);
  
  // Resource detail view
  const [detailResource, setDetailResource] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  
  // Sorting - use display settings defaults
  const [sortColumn, setSortColumn] = useState(displaySettings?.defaultSortColumn || 'name');
  const [sortDirection, setSortDirection] = useState(displaySettings?.defaultSortDirection || 'asc');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      // Fetch all resources by setting a high limit - no auth required
      const response = await axios.get(`${API_URL}/resources/?limit=10000`);
      setResources(response.data);
      setError('');
    } catch (err) {
      setError(t('resourceError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = () => {
    setModalMode('add');
    setSelectedResource(null);
    setIsModalOpen(true);
  };

  const handleEditResource = (resource) => {
    setModalMode('edit');
    setSelectedResource(resource);
    setIsModalOpen(true);
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm(t('confirmDelete'))) return;

    const headers = getAuthHeader();
    if (!headers) return;

    try {
      await axios.delete(`${API_URL}/resources/${resourceId}`, { headers });
      setSuccessMessage(t('resourceDeleted'));
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchResources();
    } catch (err) {
      setError(t('resourceError'));
    }
  };

  const handleSaveResource = async (formData) => {
    const headers = getAuthHeader();
    if (!headers) return;

    try {
      if (modalMode === 'add') {
        await axios.post(`${API_URL}/resources/`, formData, { headers });
        setSuccessMessage(t('resourceCreated'));
      } else {
        await axios.put(`${API_URL}/resources/${selectedResource.id}`, formData, { headers });
        setSuccessMessage(t('resourceUpdated'));
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsModalOpen(false);
      fetchResources();
    } catch (err) {
      setError(t('resourceError'));
    }
  };

  // Multi-select handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResources.map(r => r.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} resources? This cannot be undone.`)) {
      return;
    }

    const headers = getAuthHeader();
    if (!headers) return;

    setBulkDeleting(true);
    let deleted = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        await axios.delete(`${API_URL}/resources/${id}`, { headers });
        deleted++;
      } catch (err) {
        failed++;
      }
    }

    setBulkDeleting(false);
    setSelectedIds(new Set());
    
    if (failed > 0) {
      setSuccessMessage(`Deleted ${deleted} resources. ${failed} failed.`);
    } else {
      setSuccessMessage(`Successfully deleted ${deleted} resources.`);
    }
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchResources();
  };

  // Column management
  const toggleColumn = (columnId) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(newColumns);
    localStorage.setItem('resourceColumns', JSON.stringify(newColumns));
  };

  const updateColumnWidth = (columnId, width) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, width: Math.max(50, width) } : col
    );
    setColumns(newColumns);
    localStorage.setItem('resourceColumns', JSON.stringify(newColumns));
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.removeItem('resourceColumns');
  };

  // Column resize handlers
  const handleResizeStart = (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find(c => c.id === columnId);
    if (!col || !col.resizable) return;
    
    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(col.width);
  };

  const handleResizeMove = (e) => {
    if (!resizingColumn) return;
    
    const col = columns.find(c => c.id === resizingColumn);
    if (!col) return;
    
    const diff = e.clientX - resizeStartX;
    const newWidth = Math.max(col.minWidth || 50, resizeStartWidth + diff);
    
    const newColumns = columns.map(c => 
      c.id === resizingColumn ? { ...c, width: newWidth } : c
    );
    setColumns(newColumns);
  };

  const handleResizeEnd = () => {
    if (resizingColumn) {
      localStorage.setItem('resourceColumns', JSON.stringify(columns));
      setResizingColumn(null);
    }
  };

  // Add mouse event listeners for resize
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // Separate main resources from linked resources
  const mainResources = resources.filter(r => !LINKED_RESOURCE_TYPES.has(r.type));
  const linkedResources = resources.filter(r => LINKED_RESOURCE_TYPES.has(r.type));
  
  // Get unique values for filters (from main resources only for cleaner UI)
  const uniqueTypes = [...new Set(mainResources.map(r => r.type))].sort();
  const uniqueRegions = [...new Set(mainResources.map(r => r.region))].filter(Boolean).sort();
  const uniqueAccounts = [...new Set(mainResources.map(r => r.account_id))].filter(Boolean).sort();
  const uniqueEnvironments = [...new Set(mainResources.map(r => r.environment))].filter(Boolean).sort();
  const uniqueCategories = Object.entries(RESOURCE_CATEGORIES).map(([key, val]) => ({ key, label: val.label }));

  // Filter resources
  const baseResources = showLinked ? resources : mainResources;
  const filteredResources = baseResources.filter(resource => {
    const matchesSearch = searchTerm === '' || 
      resource.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.resource_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.arn?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || resource.type === typeFilter;
    const matchesRegion = regionFilter === 'all' || resource.region === regionFilter;
    const matchesAccount = accountFilter === 'all' || resource.account_id === accountFilter;
    const matchesEnvironment = environmentFilter === 'all' || resource.environment === environmentFilter;
    const matchesCategory = categoryFilter === 'all' || getResourceCategory(resource.type) === categoryFilter;
    
    return matchesSearch && matchesType && matchesRegion && matchesAccount && matchesEnvironment && matchesCategory;
  });
  
  // Sort resources
  const sortedResources = [...filteredResources].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
    
    // Handle null/undefined values
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    
    // Handle dates
    if (sortColumn === 'created_at' || sortColumn === 'last_reported_at') {
      aVal = new Date(aVal).getTime() || 0;
      bVal = new Date(bVal).getTime() || 0;
    }
    
    // Handle tags (sort by count)
    if (sortColumn === 'tags') {
      aVal = aVal ? Object.keys(aVal).length : 0;
      bVal = bVal ? Object.keys(bVal).length : 0;
    }
    
    // String comparison
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Handle column sort click
  const handleSort = (columnId) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Visible columns
  const visibleColumns = columns.filter(col => col.visible);
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedResources.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResources = sortedResources.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, regionFilter, accountFilter, environmentFilter, categoryFilter, showLinked, pageSize]);
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setRegionFilter('all');
    setAccountFilter('all');
    setEnvironmentFilter('all');
    setCategoryFilter('all');
    setShowLinked(false);
    setSearchParams({});
  };
  
  // Check if any filter is active
  const hasActiveFilters = searchTerm || typeFilter !== 'all' || regionFilter !== 'all' || accountFilter !== 'all' || environmentFilter !== 'all' || categoryFilter !== 'all' || showLinked;
  
  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);
  
  // View resource details
  const viewResourceDetails = (resource) => {
    setDetailResource(resource);
    setShowDetailPanel(true);
  };
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Render cell content based on column type
  const renderCell = (resource, columnId) => {
    switch (columnId) {
      case 'select':
        return (
          <button onClick={() => toggleSelect(resource.id)} className="p-1">
            {selectedIds.has(resource.id) ? (
              <CheckSquare className="w-5 h-5 text-indigo-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        );
      case 'name':
        return (
          <div>
            <div className="font-medium text-gray-900 truncate">{resource.name}</div>
            {resource.resource_id && resource.resource_id !== resource.name && (
              <div className="text-xs text-gray-500 truncate font-mono">{resource.resource_id}</div>
            )}
          </div>
        );
      case 'type':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
            {resource.type}
          </span>
        );
      case 'region':
        return <span className="text-sm text-gray-600">{resource.region || '-'}</span>;
      case 'account_id':
        return <span className="text-xs font-mono text-gray-600">{resource.account_id || '-'}</span>;
      case 'status':
        const statusColors = {
          running: 'bg-green-100 text-green-800',
          active: 'bg-green-100 text-green-800',
          stopped: 'bg-red-100 text-red-800',
          pending: 'bg-yellow-100 text-yellow-800',
          available: 'bg-blue-100 text-blue-800',
        };
        const statusClass = statusColors[resource.status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
        return resource.status ? (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusClass}`}>
            {resource.status}
          </span>
        ) : <span className="text-gray-400">-</span>;
      case 'category':
        const category = getResourceCategory(resource.type);
        const categoryColors = {
          infrastructure: 'bg-blue-100 text-blue-800',
          network: 'bg-green-100 text-green-800',
          identity: 'bg-yellow-100 text-yellow-800',
          devops: 'bg-purple-100 text-purple-800',
          monitoring: 'bg-orange-100 text-orange-800',
          storage: 'bg-pink-100 text-pink-800',
          other: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${categoryColors[category] || 'bg-gray-100 text-gray-800'}`}>
            {RESOURCE_CATEGORIES[category]?.label || 'Other'}
          </span>
        );
      case 'environment':
        return resource.environment ? (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
            {resource.environment}
          </span>
        ) : <span className="text-gray-400">-</span>;
      case 'vpc_id':
        return <span className="text-xs font-mono text-gray-600">{resource.vpc_id || '-'}</span>;
      case 'tags':
        const tagCount = resource.tags ? Object.keys(resource.tags).length : 0;
        return tagCount > 0 ? (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
            {tagCount} tags
          </span>
        ) : <span className="text-gray-400">-</span>;
      case 'created_at':
        return (
          <span className="text-sm text-gray-600">
            {new Date(resource.created_at).toLocaleDateString('en', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        );
      case 'actions':
        return (
          <div className="flex gap-1">
            <button
              onClick={() => viewResourceDetails(resource)}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEditResource(resource)}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteResource(resource.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      default:
        return resource[columnId] || '-';
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Compact Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">Resources</h1>
              <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
                {filteredResources.length} of {mainResources.length}
              </span>
              {linkedResources.length > 0 && (
                <button
                  onClick={() => setShowLinked(!showLinked)}
                  className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                    showLinked ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={showLinked ? 'Hide linked resources' : 'Show linked resources'}
                >
                  +{linkedResources.length} linked
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                Dashboard
              </button>
              <button onClick={() => navigate('/architecture')} className="px-3 py-1.5 text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded flex items-center gap-1">
                <Network className="w-4 h-4" /> Diagram
              </button>
              <button onClick={() => navigate('/import')} className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1">
                <Plus className="w-4 h-4" /> Import
              </button>
              <button onClick={toggleLanguage} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1">
                <Globe className="w-4 h-4" /> {i18n.language === 'en' ? 'AR' : 'EN'}
              </button>
              <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded flex items-center gap-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-3">
        {/* Row 1: Actions and Column Settings */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Left: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddResource}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
            <button
              onClick={fetchResources}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 text-sm disabled:bg-red-400"
              >
                <Trash2 className="w-4 h-4" />
                {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Selected`}
              </button>
            )}
          </div>

          {/* Right: Settings Buttons */}
          <div className="flex items-center gap-2">
            {/* Display Settings */}
            <div className="relative">
              <button
                onClick={() => { setShowDisplaySettings(!showDisplaySettings); setShowColumnSettings(false); }}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Display
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showDisplaySettings && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-xl z-50 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-sm">Display Settings</span>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('resourceDisplaySettings');
                        setPageSize(25);
                        setSortColumn('name');
                        setSortDirection('asc');
                        setShowLinked(false);
                      }} 
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Page Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>
                    
                    {/* Default Sort */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                        <select
                          value={sortColumn}
                          onChange={(e) => setSortColumn(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="name">Name</option>
                          <option value="type">Type</option>
                          <option value="region">Region</option>
                          <option value="status">Status</option>
                          <option value="created_at">Created</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                        <select
                          value={sortDirection}
                          onChange={(e) => setSortDirection(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Show Linked Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Include Linked Resources</span>
                      <button
                        onClick={() => setShowLinked(!showLinked)}
                        className={`w-10 h-6 rounded-full transition-colors ${showLinked ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${showLinked ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t">
                    <button
                      onClick={() => setShowDisplaySettings(false)}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Column Settings */}
            <div className="relative">
              <button
                onClick={() => { setShowColumnSettings(!showColumnSettings); setShowDisplaySettings(false); }}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Columns
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showColumnSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border rounded-lg shadow-lg z-50 p-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-sm">Show Columns</span>
                    <button onClick={resetColumns} className="text-xs text-indigo-600 hover:underline">
                      Reset
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {columns.filter(col => col.id !== 'select' && col.id !== 'actions').map(col => (
                      <div key={col.id} className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() => toggleColumn(col.id)}
                            className="rounded text-indigo-600"
                          />
                          {col.label}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={col.width}
                            onChange={(e) => updateColumnWidth(col.id, parseInt(e.target.value) || col.minWidth)}
                            className="w-16 px-2 py-1 text-xs border rounded"
                            min={col.minWidth}
                            max={500}
                          />
                          <span className="text-xs text-gray-400">px</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Row 2: Search and Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or ARN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Regions</option>
            {uniqueRegions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Accounts</option>
            {uniqueAccounts.map(account => (
              <option key={account} value={account}>{account}</option>
            ))}
          </select>
          
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Envs</option>
            {uniqueEnvironments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Full Width Table */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredResources.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {resources.length === 0 ? 'No Resources' : 'No Matching Resources'}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {resources.length === 0 
                  ? 'Import resources or add them manually to get started.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {resources.length === 0 && (
                <div className="flex gap-3 justify-center">
                  <button onClick={() => navigate('/import')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                    Import Resources
                  </button>
                  <button onClick={handleAddResource} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                    Add Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {visibleColumns.map(col => (
                      <th 
                        key={col.id} 
                        style={{ width: col.width, position: 'relative' }}
                        className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                        }`}
                        onClick={() => col.sortable && handleSort(col.id)}
                      >
                        {col.id === 'select' ? (
                          <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }} className="p-1">
                            {selectedIds.size === paginatedResources.length && paginatedResources.length > 0 ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{col.label}</span>
                            {col.sortable && sortColumn === col.id && (
                              <span className="text-indigo-600">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                            {col.sortable && sortColumn !== col.id && (
                              <span className="text-gray-300">↕</span>
                            )}
                          </div>
                        )}
                        {/* Column resize handle */}
                        {col.resizable && (
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-400 group"
                            onMouseDown={(e) => handleResizeStart(e, col.id)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-indigo-500" />
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedResources.map((resource) => (
                    <tr 
                      key={resource.id} 
                      className={`hover:bg-gray-50 ${selectedIds.has(resource.id) ? 'bg-indigo-50' : ''}`}
                    >
                      {visibleColumns.map(col => (
                        <td 
                          key={col.id} 
                          style={{ width: col.width }}
                          className="px-3 py-3 text-sm"
                        >
                          {renderCell(resource, col.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {filteredResources.length > 0 && (
            <div className="bg-gray-50 border-t px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredResources.length)}</span> of{' '}
                  <span className="font-medium">{filteredResources.length}</span> resources
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Page number buttons */}
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`w-8 h-8 rounded text-sm font-medium ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource Detail Panel */}
      {showDetailPanel && detailResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Resource Details</h2>
              <button
                onClick={() => setShowDetailPanel(false)}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900">{detailResource.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {detailResource.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Region</span>
                    <span className="text-sm text-gray-900">{detailResource.region || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      detailResource.status === 'active' || detailResource.status === 'running'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {detailResource.status || '-'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* AWS Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">AWS Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Account ID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono text-gray-900">{detailResource.account_id || '-'}</span>
                      {detailResource.account_id && (
                        <button onClick={() => copyToClipboard(detailResource.account_id)} className="p-1 hover:bg-gray-200 rounded">
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Resource ID</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono text-gray-900 truncate max-w-[200px]">{detailResource.resource_id || '-'}</span>
                      {detailResource.resource_id && (
                        <button onClick={() => copyToClipboard(detailResource.resource_id)} className="p-1 hover:bg-gray-200 rounded">
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  {detailResource.arn && (
                    <div>
                      <span className="text-sm text-gray-500">ARN</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded break-all">{detailResource.arn}</span>
                        <button onClick={() => copyToClipboard(detailResource.arn)} className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Network Info */}
              {(detailResource.vpc_id || detailResource.subnet_id || detailResource.public_ip || detailResource.private_ip) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Network</h3>
                  <div className="space-y-2">
                    {detailResource.vpc_id && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">VPC ID</span>
                        <span className="text-sm font-mono text-gray-900">{detailResource.vpc_id}</span>
                      </div>
                    )}
                    {detailResource.subnet_id && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Subnet ID</span>
                        <span className="text-sm font-mono text-gray-900">{detailResource.subnet_id}</span>
                      </div>
                    )}
                    {detailResource.availability_zone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Availability Zone</span>
                        <span className="text-sm text-gray-900">{detailResource.availability_zone}</span>
                      </div>
                    )}
                    {detailResource.public_ip && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Public IP</span>
                        <span className="text-sm font-mono text-gray-900">{detailResource.public_ip}</span>
                      </div>
                    )}
                    {detailResource.private_ip && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Private IP</span>
                        <span className="text-sm font-mono text-gray-900">{detailResource.private_ip}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tags */}
              {detailResource.tags && Object.keys(detailResource.tags).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags ({Object.keys(detailResource.tags).length})</h3>
                  <div className="space-y-1">
                    {Object.entries(detailResource.tags).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 truncate max-w-[150px]">{key}</span>
                        <span className="text-gray-900 truncate max-w-[180px]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Timestamps */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Timestamps</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Created</span>
                    <span className="text-sm text-gray-900">
                      {new Date(detailResource.created_at).toLocaleString()}
                    </span>
                  </div>
                  {detailResource.last_reported_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Last Reported</span>
                      <span className="text-sm text-gray-900">
                        {new Date(detailResource.last_reported_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowDetailPanel(false);
                    handleEditResource(detailResource);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Edit Resource
                </button>
                <button
                  onClick={() => {
                    setShowDetailPanel(false);
                    handleDeleteResource(detailResource.id);
                  }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <ResourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveResource}
        resource={selectedResource}
        mode={modalMode}
      />
    </div>
  );
}

export default Resources;
