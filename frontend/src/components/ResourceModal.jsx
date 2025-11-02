import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Wand2, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ResourceModal({ isOpen, onClose, onSave, resource, mode = 'add' }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('basic');
  const [arnInput, setArnInput] = useState('');
  const [arnParsing, setArnParsing] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'ec2', region: 'us-east-1', description: '',
    arn: '', account_id: '', resource_id: '',
    status: 'unknown', environment: '', cost_center: '', owner: '',
    vpc_id: '', subnet_id: '', availability_zone: '', security_groups: [],
    public_ip: '', private_ip: '', instance_type: '', resource_creation_date: '',
    dependencies: [], connected_resources: [],
    tags: {}, notes: ''
  });

  const [dependencyInput, setDependencyInput] = useState('');
  const [connectedInput, setConnectedInput] = useState('');
  const [sgInput, setSgInput] = useState('');
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');

  // Helper function to format datetime for datetime-local input
  const formatDatetimeLocal = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format as YYYY-MM-DDTHH:mm (no seconds, no timezone)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (resource && mode === 'edit') {
      setFormData({
        name: resource.name || '', type: resource.type || 'ec2', region: resource.region || 'us-east-1',
        description: resource.description || '', arn: resource.arn || '', account_id: resource.account_id || '',
        resource_id: resource.resource_id || '', status: resource.status || 'unknown',
        environment: resource.environment || '', cost_center: resource.cost_center || '', owner: resource.owner || '',
        vpc_id: resource.vpc_id || '', subnet_id: resource.subnet_id || '',
        availability_zone: resource.availability_zone || '', security_groups: resource.security_groups || [],
        public_ip: resource.public_ip || '', private_ip: resource.private_ip || '',
        instance_type: resource.instance_type || '', 
        resource_creation_date: formatDatetimeLocal(resource.resource_creation_date),
        dependencies: resource.dependencies || [], connected_resources: resource.connected_resources || [],
        tags: resource.tags || {}, notes: resource.notes || ''
      });
      setArnInput(resource.arn || '');
    } else {
      setFormData({
        name: '', type: 'ec2', region: 'us-east-1', description: '', arn: '', account_id: '', resource_id: '',
        status: 'unknown', environment: '', cost_center: '', owner: '', vpc_id: '', subnet_id: '',
        availability_zone: '', security_groups: [], public_ip: '', private_ip: '', instance_type: '',
        resource_creation_date: '', dependencies: [], connected_resources: [], tags: {}, notes: ''
      });
      setArnInput('');
    }
    setActiveTab('basic');
  }, [resource, mode, isOpen]);

  const resourceTypes = [
    { value: 'ec2', label: t('ec2') },
    { value: 's3', label: t('s3') },
    { value: 'rds', label: t('rds') },
    { value: 'lambda', label: t('lambda') },
    { value: 'vpc', label: t('vpc') },
    { value: 'elb', label: t('elb') },
    { value: 'cloudfront', label: t('cloudfront') },
    { value: 'route53', label: t('route53') },
    { value: 'dynamodb', label: t('dynamodb') },
    { value: 'sns', label: t('sns') },
    { value: 'sqs', label: t('sqs') },
  ];

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-west-2', label: 'EU (London)' },
    { value: 'eu-west-3', label: 'EU (Paris)' },
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'eu-central-2', label: 'EU (Zurich)' },
    { value: 'eu-north-1', label: 'EU (Stockholm)' },
    { value: 'eu-south-1', label: 'EU (Milan)' },
    { value: 'eu-south-2', label: 'EU (Spain)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
    { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
    { value: 'ca-central-1', label: 'Canada (Central)' },
    { value: 'sa-east-1', label: 'South America (São Paulo)' },
    { value: 'me-south-1', label: 'Middle East (Bahrain)' },
    { value: 'af-south-1', label: 'Africa (Cape Town)' },
  ];

  const instanceTypes = [
    { value: '', label: '-- Select --' },
    // General Purpose
    { value: 't2.micro', label: 't2.micro' },
    { value: 't2.small', label: 't2.small' },
    { value: 't2.medium', label: 't2.medium' },
    { value: 't3.micro', label: 't3.micro' },
    { value: 't3.small', label: 't3.small' },
    { value: 't3.medium', label: 't3.medium' },
    { value: 't3.large', label: 't3.large' },
    { value: 't3.xlarge', label: 't3.xlarge' },
    { value: 't3.2xlarge', label: 't3.2xlarge' },
    // Compute Optimized
    { value: 'c5.large', label: 'c5.large' },
    { value: 'c5.xlarge', label: 'c5.xlarge' },
    { value: 'c5.2xlarge', label: 'c5.2xlarge' },
    { value: 'c5.4xlarge', label: 'c5.4xlarge' },
    // Memory Optimized
    { value: 'r5.large', label: 'r5.large' },
    { value: 'r5.xlarge', label: 'r5.xlarge' },
    { value: 'r5.2xlarge', label: 'r5.2xlarge' },
    { value: 'r5.4xlarge', label: 'r5.4xlarge' },
    // General Purpose M5
    { value: 'm5.large', label: 'm5.large' },
    { value: 'm5.xlarge', label: 'm5.xlarge' },
    { value: 'm5.2xlarge', label: 'm5.2xlarge' },
    { value: 'm5.4xlarge', label: 'm5.4xlarge' },
  ];

  const statuses = [
    { value: 'running', label: t('statusRunning') || 'Running' },
    { value: 'stopped', label: t('statusStopped') || 'Stopped' },
    { value: 'available', label: t('statusAvailable') || 'Available' },
    { value: 'in-use', label: t('statusInUse') || 'In Use' },
    { value: 'pending', label: t('statusPending') || 'Pending' },
    { value: 'terminated', label: t('statusTerminated') || 'Terminated' },
    { value: 'unknown', label: t('statusUnknown') || 'Unknown' }
  ];

  const environments = [
    { value: '', label: '-- Select --' },
    { value: 'dev', label: t('envDev') || 'Development' },
    { value: 'staging', label: t('envStaging') || 'Staging' },
    { value: 'prod', label: t('envProd') || 'Production' },
    { value: 'test', label: t('envTest') || 'Test' }
  ];

  const parseARN = async () => {
    if (!arnInput.trim()) return;
    setArnParsing(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/resources/parse-arn`,
        { arn: arnInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.valid && response.data.info) {
        const info = response.data.info;
        setFormData(prev => ({
          ...prev,
          arn: info.arn || arnInput,
          account_id: info.account_id || prev.account_id,
          resource_id: info.resource_id || prev.resource_id,
          type: info.type || prev.type,
          region: info.region && info.region !== 'global' ? info.region : prev.region,
          name: info.suggested_name || prev.name
        }));
        alert(t('arnParsedSuccess') || 'ARN parsed successfully!');
      } else {
        alert(response.data.message || t('arnParseError'));
      }
    } catch (error) {
      alert(t('arnParseError') || 'Failed to parse ARN');
    } finally {
      setArnParsing(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addItem = (type, value, setter, field) => {
    if (value.trim()) {
      setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
      setter('');
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const addTag = () => {
    if (tagKey.trim() && tagValue.trim()) {
      setFormData(prev => ({ ...prev, tags: { ...prev.tags, [tagKey.trim()]: tagValue.trim() } }));
      setTagKey('');
      setTagValue('');
    }
  };

  const removeTag = (key) => {
    setFormData(prev => {
      const newTags = { ...prev.tags };
      delete newTags[key];
      return { ...prev, tags: newTags };
    });
  };

  const handleAddDependency = () => addItem('dep', dependencyInput, setDependencyInput, 'dependencies');
  const handleRemoveDependency = (index) => removeItem('dependencies', index);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean data before sending to backend
    const cleanedData = {
      ...formData,
      // Convert empty strings to null for optional string fields
      arn: formData.arn?.trim() || null,
      account_id: formData.account_id?.trim() || null,
      resource_id: formData.resource_id?.trim() || null,
      environment: formData.environment?.trim() || null,
      cost_center: formData.cost_center?.trim() || null,
      owner: formData.owner?.trim() || null,
      vpc_id: formData.vpc_id?.trim() || null,
      subnet_id: formData.subnet_id?.trim() || null,
      availability_zone: formData.availability_zone?.trim() || null,
      public_ip: formData.public_ip?.trim() || null,
      private_ip: formData.private_ip?.trim() || null,
      instance_type: formData.instance_type?.trim() || null,
      resource_creation_date: formData.resource_creation_date || null,
      description: formData.description?.trim() || null,
      notes: formData.notes?.trim() || null,
      // Ensure arrays are arrays (not empty strings)
      security_groups: Array.isArray(formData.security_groups) ? formData.security_groups : [],
      dependencies: Array.isArray(formData.dependencies) ? formData.dependencies : [],
      connected_resources: Array.isArray(formData.connected_resources) ? formData.connected_resources : [],
      // Ensure tags is an object
      tags: typeof formData.tags === 'object' && formData.tags !== null ? formData.tags : {}
    };
    
    onSave(cleanedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {mode === 'edit' ? t('editResource') : t('addResource')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'basic', label: t('basicInfo') || 'Basic Info' },
              { id: 'aws', label: t('awsIdentifiers') || 'AWS Identifiers' },
              { id: 'details', label: t('details') || 'Details' },
              { id: 'networking', label: t('networking') || 'Networking' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-indigo-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* BASIC INFO TAB */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('resourceName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="my-web-server"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('resourceType')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {resourceTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('region')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {regions.map(region => (
                      <option key={region.value} value={region.value}>{region.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('descriptionPlaceholder') || 'Describe this resource...'}
                />
              </div>
            </div>
          )}

          {/* AWS IDENTIFIERS TAB */}
          {activeTab === 'aws' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  {t('parseArn') || 'Parse ARN'}
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  {t('arnHelp') || 'Paste an AWS ARN to auto-fill resource details'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={arnInput}
                    onChange={(e) => setArnInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0"
                  />
                  <button
                    type="button"
                    onClick={parseARN}
                    disabled={arnParsing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Wand2 className="w-4 h-4" />
                    {arnParsing ? (t('parsing') || 'Parsing...') : (t('parse') || 'Parse')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('arn') || 'ARN (Amazon Resource Name)'}
                </label>
                <input
                  type="text"
                  name="arn"
                  value={formData.arn}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="arn:aws:..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('accountId') || 'AWS Account ID'}
                  </label>
                  <input
                    type="text"
                    name="account_id"
                    value={formData.account_id}
                    onChange={handleChange}
                    maxLength="12"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="123456789012"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('resourceId') || 'Resource ID'}
                  </label>
                  <input
                    type="text"
                    name="resource_id"
                    value={formData.resource_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="i-1234567890abcdef0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('status') || 'Status'}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('environment') || 'Environment'}
                  </label>
                  <select
                    name="environment"
                    value={formData.environment}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {environments.map(env => (
                      <option key={env.value} value={env.value}>{env.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('costCenter') || 'Cost Center'}
                  </label>
                  <input
                    type="text"
                    name="cost_center"
                    value={formData.cost_center}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="CC-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner') || 'Owner/Team'}
                  </label>
                  <input
                    type="text"
                    name="owner"
                    value={formData.owner}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Platform Team"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tags') || 'AWS Tags'}
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagKey}
                      onChange={(e) => setTagKey(e.target.value)}
                      placeholder="Key"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={tagValue}
                      onChange={(e) => setTagValue(e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {Object.entries(formData.tags).length === 0 ? (
                      <p className="text-gray-400 text-sm">{t('noTags') || 'No tags added'}</p>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(formData.tags).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                            <span><strong>{key}:</strong> {value}</span>
                            <button type="button" onClick={() => removeTag(key)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notes') || 'Notes'}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional operational notes..."
                />
              </div>
            </div>
          )}

          {/* NETWORKING TAB */}
          {activeTab === 'networking' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('vpcId') || 'VPC ID'}
                  </label>
                  <input
                    type="text"
                    name="vpc_id"
                    value={formData.vpc_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="vpc-1234567890abcdef0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subnetId') || 'Subnet ID'}
                  </label>
                  <input
                    type="text"
                    name="subnet_id"
                    value={formData.subnet_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="subnet-1234567890abcdef0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('availabilityZone') || 'Availability Zone'}
                  </label>
                  <input
                    type="text"
                    name="availability_zone"
                    value={formData.availability_zone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="us-east-1a"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('instanceType') || 'Instance Type'}
                  </label>
                  <select
                    name="instance_type"
                    value={formData.instance_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {instanceTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('publicIp') || 'Public IP Address'}
                  </label>
                  <input
                    type="text"
                    name="public_ip"
                    value={formData.public_ip}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="54.123.45.67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('privateIp') || 'Private IP Address'}
                  </label>
                  <input
                    type="text"
                    name="private_ip"
                    value={formData.private_ip}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="10.0.1.123"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('resourceCreationDate') || 'Resource Creation Date'}
                  </label>
                  <input
                    type="datetime-local"
                    name="resource_creation_date"
                    value={formData.resource_creation_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('securityGroups') || 'Security Groups'}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={sgInput}
                    onChange={(e) => setSgInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('sg', sgInput, setSgInput, 'security_groups'))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="sg-1234567890abcdef0"
                  />
                  <button
                    type="button"
                    onClick={() => addItem('sg', sgInput, setSgInput, 'security_groups')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.security_groups.map((sg, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                      {sg}
                      <button type="button" onClick={() => removeItem('security_groups', index)} className="hover:text-indigo-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dependencies') || 'Dependencies'}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={dependencyInput}
                    onChange={(e) => setDependencyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDependency())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="resource-name or ID"
                  />
                  <button
                    type="button"
                    onClick={handleAddDependency}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.dependencies.map((dep, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                      {dep}
                      <button type="button" onClick={() => handleRemoveDependency(index)} className="hover:text-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('connectedResources') || 'Connected Resources'}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={connectedInput}
                    onChange={(e) => setConnectedInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('connected', connectedInput, setConnectedInput, 'connected_resources'))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="resource-name"
                  />
                  <button
                    type="button"
                    onClick={() => addItem('connected', connectedInput, setConnectedInput, 'connected_resources')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.connected_resources.map((res, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      {res}
                      <button type="button" onClick={() => removeItem('connected_resources', index)} className="hover:text-green-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t mt-6">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResourceModal;
