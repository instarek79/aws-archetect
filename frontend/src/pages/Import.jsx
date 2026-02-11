import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Database, Sparkles, ArrowRight, X, Terminal, FileText, Download, Server, HardDrive, Cloud, Layers, Link2, GitBranch } from 'lucide-react';
import axios from '../utils/axiosConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8800';

// Import Templates for different AWS resource types
const IMPORT_TEMPLATES = {
  ec2: {
    name: "EC2 Instances",
    icon: "🖥️",
    description: "Virtual servers in AWS",
    color: "orange",
    columns: [
      { name: "Name", field: "name", required: true, example: "web-server-01" },
      { name: "Instance ID", field: "resource_id", required: true, example: "i-0abc123def456" },
      { name: "Instance Type", field: "instance_type", required: false, example: "t3.medium" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Availability Zone", field: "availability_zone", required: false, example: "us-east-1a" },
      { name: "Public IP", field: "public_ip", required: false, example: "54.123.45.67" },
      { name: "Private IP", field: "private_ip", required: false, example: "10.0.1.50" },
      { name: "VPC ID", field: "vpc_id", required: false, example: "vpc-0abc123" },
      { name: "Subnet ID", field: "subnet_id", required: false, example: "subnet-0abc123" },
      { name: "Status", field: "status", required: false, example: "running" },
      { name: "Tags", field: "tags", required: false, example: "env=prod,team=backend" }
    ]
  },
  ebs: {
    name: "EBS Volumes",
    icon: "💾",
    description: "Block storage volumes",
    color: "blue",
    columns: [
      { name: "Name", field: "name", required: true, example: "data-volume-01" },
      { name: "Volume ID", field: "resource_id", required: true, example: "vol-0abc123def456" },
      { name: "Size (GB)", field: "size_gb", required: false, example: "100" },
      { name: "Volume Type", field: "volume_type", required: false, example: "gp3" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Availability Zone", field: "availability_zone", required: false, example: "us-east-1a" },
      { name: "Status", field: "status", required: false, example: "in-use" },
      { name: "Attached To", field: "attached_instance", required: false, example: "i-0abc123" },
      { name: "Encrypted", field: "encrypted", required: false, example: "true" }
    ]
  },
  rds: {
    name: "RDS Databases",
    icon: "🗃️",
    description: "Managed relational databases",
    color: "indigo",
    columns: [
      { name: "Name", field: "name", required: true, example: "prod-mysql-01" },
      { name: "DB Instance ID", field: "resource_id", required: true, example: "prod-mysql-01" },
      { name: "Engine", field: "engine", required: false, example: "mysql" },
      { name: "Engine Version", field: "engine_version", required: false, example: "8.0.32" },
      { name: "Instance Class", field: "instance_type", required: false, example: "db.t3.medium" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Status", field: "status", required: false, example: "available" },
      { name: "Endpoint", field: "endpoint", required: false, example: "prod-mysql-01.abc123.rds.amazonaws.com" },
      { name: "Port", field: "port", required: false, example: "3306" },
      { name: "VPC ID", field: "vpc_id", required: false, example: "vpc-0abc123" }
    ]
  },
  s3: {
    name: "S3 Buckets",
    icon: "🪣",
    description: "Object storage buckets",
    color: "green",
    columns: [
      { name: "Bucket Name", field: "name", required: true, example: "my-app-assets" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Creation Date", field: "resource_creation_date", required: false, example: "2024-01-15" },
      { name: "Versioning", field: "versioning", required: false, example: "Enabled" },
      { name: "Encryption", field: "encryption", required: false, example: "AES256" },
      { name: "Tags", field: "tags", required: false, example: "env=prod" }
    ]
  },
  lambda: {
    name: "Lambda Functions",
    icon: "⚡",
    description: "Serverless functions",
    color: "yellow",
    columns: [
      { name: "Function Name", field: "name", required: true, example: "process-orders" },
      { name: "ARN", field: "arn", required: false, example: "arn:aws:lambda:us-east-1:123456789012:function:process-orders" },
      { name: "Runtime", field: "runtime", required: false, example: "python3.9" },
      { name: "Memory (MB)", field: "memory_mb", required: false, example: "256" },
      { name: "Timeout (sec)", field: "timeout_seconds", required: false, example: "30" },
      { name: "Region", field: "region", required: true, example: "us-east-1" }
    ]
  },
  elb: {
    name: "Load Balancers",
    icon: "⚖️",
    description: "Application & Network Load Balancers",
    color: "purple",
    columns: [
      { name: "Name", field: "name", required: true, example: "prod-alb-01" },
      { name: "ARN", field: "arn", required: false, example: "arn:aws:elasticloadbalancing:..." },
      { name: "Type", field: "lb_type", required: false, example: "application" },
      { name: "DNS Name", field: "dns_name", required: false, example: "prod-alb-01.elb.amazonaws.com" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "VPC ID", field: "vpc_id", required: false, example: "vpc-0abc123" },
      { name: "Status", field: "status", required: false, example: "active" }
    ]
  },
  vpc: {
    name: "VPCs & Networks",
    icon: "🌐",
    description: "Virtual Private Clouds",
    color: "cyan",
    columns: [
      { name: "Name", field: "name", required: true, example: "prod-vpc" },
      { name: "VPC ID", field: "resource_id", required: true, example: "vpc-0abc123" },
      { name: "CIDR Block", field: "cidr_block", required: false, example: "10.0.0.0/16" },
      { name: "Region", field: "region", required: true, example: "us-east-1" },
      { name: "Status", field: "status", required: false, example: "available" },
      { name: "Tags", field: "tags", required: false, example: "env=prod" }
    ]
  }
};

function Import() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Import method selection
  const [importMethod, setImportMethod] = useState(null); // 'file', 'template', 'cli', 'manual'
  
  const [step, setStep] = useState(1); // 1: upload, 2: analyze, 3: preview, 4: confirm
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // AI options
  const [useAIInParsing, setUseAIInParsing] = useState(true);
  const [useAIInAnalyze, setUseAIInAnalyze] = useState(true);
  
  const [parsedData, setParsedData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [llmAnalysis, setLlmAnalysis] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Field mappings (editable by user)
  const [fieldMappings, setFieldMappings] = useState({});
  const [typeSpecificMappings, setTypeSpecificMappings] = useState({});
  const [resourceType, setResourceType] = useState('');
  
  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // CLI paste
  const [cliInput, setCliInput] = useState('');
  const [cliParsing, setCliParsing] = useState(false);
  
  // Manual input
  const [manualResources, setManualResources] = useState([]);
  
  // Connectivity options
  const [showConnectivity, setShowConnectivity] = useState(false);
  const [connectivityMappings, setConnectivityMappings] = useState({});
  
  // Resource type filtering
  const [selectedResourceTypes, setSelectedResourceTypes] = useState(new Set([
    'vpc', 'subnet', 'ec2', 'instance', 'rds', 'aurora', 
    'codepipeline', 'codebuild', 'rabbitmq', 'mq'
  ]));
  const [resourceTypeCounts, setResourceTypeCounts] = useState({});

  // Generate CSV template for download
  const downloadTemplate = (templateKey) => {
    const template = IMPORT_TEMPLATES[templateKey];
    if (!template) return;
    
    const headers = template.columns.map(c => c.name).join(',');
    const exampleRow = template.columns.map(c => c.example).join(',');
    const csvContent = `${headers}\n${exampleRow}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateKey}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Parse AWS CLI JSON output
  const handleCLIParse = async () => {
    if (!cliInput.trim()) {
      alert('Please paste AWS CLI JSON output');
      return;
    }
    
    setCliParsing(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/import/parse-cli`,
        { cli_output: cliInput },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Convert CLI parsed resources to preview format
        setPreviewData({
          valid_resources: response.data.resources,
          valid_count: response.data.resources.length,
          invalid_count: 0,
          invalid_resources: []
        });
        setResourceType(response.data.detected_type);
        setStep(4);
      }
    } catch (error) {
      console.error('CLI parsing failed:', error);
      // Fallback: try to parse locally
      try {
        const data = JSON.parse(cliInput);
        const resources = parseCliLocally(data);
        if (resources.length > 0) {
          setPreviewData({
            valid_resources: resources,
            valid_count: resources.length,
            invalid_count: 0,
            invalid_resources: []
          });
          setResourceType(resources[0]?.type || 'ec2');
          setStep(4);
        } else {
          alert('Could not parse any resources from the input');
        }
      } catch (parseError) {
        alert('Invalid JSON. Make sure to use --output json with AWS CLI');
      }
    } finally {
      setCliParsing(false);
    }
  };
  
  // Local CLI parsing fallback
  const parseCliLocally = (data) => {
    const resources = [];
    
    // EC2 instances
    if (data.Reservations) {
      data.Reservations.forEach(reservation => {
        (reservation.Instances || []).forEach(instance => {
          const tags = {};
          let name = instance.InstanceId;
          (instance.Tags || []).forEach(tag => {
            if (tag.Key === 'Name') name = tag.Value;
            tags[tag.Key] = tag.Value;
          });
          
          resources.push({
            name,
            type: 'ec2',
            resource_id: instance.InstanceId,
            instance_type: instance.InstanceType,
            region: (instance.Placement?.AvailabilityZone || '').slice(0, -1),
            availability_zone: instance.Placement?.AvailabilityZone,
            status: instance.State?.Name,
            public_ip: instance.PublicIpAddress,
            private_ip: instance.PrivateIpAddress,
            vpc_id: instance.VpcId,
            subnet_id: instance.SubnetId,
            tags
          });
        });
      });
    }
    
    // EBS volumes
    if (data.Volumes) {
      data.Volumes.forEach(volume => {
        const tags = {};
        let name = volume.VolumeId;
        (volume.Tags || []).forEach(tag => {
          if (tag.Key === 'Name') name = tag.Value;
          tags[tag.Key] = tag.Value;
        });
        
        resources.push({
          name,
          type: 'ebs',
          resource_id: volume.VolumeId,
          region: (volume.AvailabilityZone || '').slice(0, -1),
          availability_zone: volume.AvailabilityZone,
          status: volume.State,
          tags,
          type_specific_properties: {
            size_gb: volume.Size,
            volume_type: volume.VolumeType,
            encrypted: volume.Encrypted,
            attached_instance: volume.Attachments?.[0]?.InstanceId
          }
        });
      });
    }
    
    // RDS instances
    if (data.DBInstances) {
      data.DBInstances.forEach(db => {
        resources.push({
          name: db.DBInstanceIdentifier,
          type: 'rds',
          resource_id: db.DBInstanceIdentifier,
          arn: db.DBInstanceArn,
          instance_type: db.DBInstanceClass,
          status: db.DBInstanceStatus,
          region: (db.AvailabilityZone || '').slice(0, -1),
          availability_zone: db.AvailabilityZone,
          vpc_id: db.DBSubnetGroup?.VpcId,
          type_specific_properties: {
            engine: db.Engine,
            engine_version: db.EngineVersion,
            storage_gb: db.AllocatedStorage,
            endpoint: db.Endpoint?.Address,
            port: db.Endpoint?.Port,
            multi_az: db.MultiAZ
          }
        });
      });
    }
    
    // S3 buckets
    if (data.Buckets) {
      data.Buckets.forEach(bucket => {
        resources.push({
          name: bucket.Name,
          type: 's3',
          resource_id: bucket.Name,
          region: 'us-east-1', // S3 list-buckets doesn't include region
          resource_creation_date: bucket.CreationDate
        });
      });
    }
    
    // Lambda functions
    if (data.Functions) {
      data.Functions.forEach(fn => {
        resources.push({
          name: fn.FunctionName,
          type: 'lambda',
          resource_id: fn.FunctionName,
          arn: fn.FunctionArn,
          region: fn.FunctionArn?.split(':')[3] || 'us-east-1',
          type_specific_properties: {
            runtime: fn.Runtime,
            memory_mb: fn.MemorySize,
            timeout_seconds: fn.Timeout,
            handler: fn.Handler
          }
        });
      });
    }
    
    return resources;
  };
  
  // Reset to method selection
  const resetToMethodSelection = () => {
    setImportMethod(null);
    setStep(1);
    setFile(null);
    setParsedData(null);
    setSelectedSheet(null);
    setLlmAnalysis(null);
    setPreviewData(null);
    setImportResult(null);
    setFieldMappings({});
    setTypeSpecificMappings({});
    setResourceType('');
    setSelectedTemplate(null);
    setCliInput('');
    setManualResources([]);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase().split('.').pop();
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        setFile(selectedFile);
      } else {
        alert('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai', useAIInParsing.toString());

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_URL}/api/import/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setParsedData(response.data);
      
      // Check if AWS Resource Explorer format was detected
      if (response.data.aws_resource_explorer && response.data.parsed_resources) {
        console.log('AWS Resource Explorer format detected:', response.data.message);
        
        // Skip directly to preview with auto-mapped resources
        setPreviewData({
          valid_resources: response.data.parsed_resources,
          valid_count: response.data.resource_count,
          invalid_count: 0,
          invalid_resources: []
        });
        
        // Calculate resource type counts
        const typeCounts = {};
        response.data.parsed_resources.forEach(r => {
          const type = r.type?.toLowerCase() || 'unknown';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        setResourceTypeCounts(typeCounts);
        
        setResourceType('mixed'); // Multiple resource types
        setStep(4); // Go directly to preview
        return;
      }
      
      setSelectedSheet(response.data.sheet_names?.[0] || 'data');
      
      // If AI was used in parsing, show AI suggestions
      if (useAIInParsing && response.data.ai_suggestions) {
        alert(`AI Parsing: ${response.data.ai_suggestions.message || 'Data cleaned and validated'}`);
      }
      
      setStep(2);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.detail || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!parsedData || !selectedSheet) return;
    
    if (!useAIInAnalyze) {
      // Skip AI analysis, go directly to manual mapping
      setStep(3);
      return;
    }
    
    setAnalyzing(true);
    const sheetData = parsedData.sheets[selectedSheet];

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/import/analyze`,
        {
          sheet_name: selectedSheet,
          sample_data: sheetData.slice(0, 5)
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const analysis = response.data.analysis;
      setLlmAnalysis(analysis);
      setFieldMappings(analysis.field_mappings || {});
      setTypeSpecificMappings(analysis.type_specific_mappings || {});
      setResourceType(analysis.detected_resource_type || 'ec2');
      setStep(3);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('LLM analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All progress will be lost.')) {
      // Reset to initial state
      setStep(1);
      setFile(null);
      setParsedData(null);
      setSelectedSheet(null);
      setLlmAnalysis(null);
      setPreviewData(null);
      setImportResult(null);
      setFieldMappings({});
      setTypeSpecificMappings({});
      setResourceType('');
    }
  };

  const handlePreview = async () => {
    const sheetData = parsedData.sheets[selectedSheet];

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/import/preview`,
        {
          sheet_data: sheetData,
          field_mappings: fieldMappings,
          type_specific_mappings: typeSpecificMappings,
          resource_type: resourceType
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setPreviewData(response.data);
      
      // Calculate resource type counts
      const typeCounts = {};
      response.data.valid_resources.forEach(r => {
        const type = r.type?.toLowerCase() || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      setResourceTypeCounts(typeCounts);
      
      setStep(4);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Preview generation failed');
    }
  };

  const handleImport = async () => {
    if (!previewData || !previewData.valid_resources) {
      console.error('No valid resources to import', previewData);
      alert('No valid resources to import');
      return;
    }
    
    // Filter resources by selected types
    let allResources = previewData.valid_resources.filter(r => {
      const type = r.type?.toLowerCase();
      return selectedResourceTypes.has(type);
    });
    
    if (allResources.length === 0) {
      alert('No resources selected for import. Please select at least one resource type.');
      return;
    }
    console.log(`=== STARTING IMPORT === Total: ${allResources.length} resources`);
    console.log('First resource keys:', Object.keys(allResources[0]));
    console.log('First resource:', JSON.stringify(allResources[0]).substring(0, 500));
    
    setImporting(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('No auth token found. Please login again.');
        return;
      }
      console.log('Auth token present:', token.substring(0, 20) + '...');
      
      // Import in batches of 50 to avoid request size limits
      const BATCH_SIZE = 50;
      let totalImported = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      
      const totalBatches = Math.ceil(allResources.length / BATCH_SIZE);
      
      for (let i = 0; i < allResources.length; i += BATCH_SIZE) {
        const batch = allResources.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i/BATCH_SIZE) + 1;
        console.log(`Batch ${batchNum}/${totalBatches}: Sending ${batch.length} resources...`);
        
        try {
          const response = await axios.post(
            `${API_URL}/api/import/execute`,
            { resources: batch },
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 120000 // 2 minutes per batch
            }
          );
          
          console.log(`Batch ${batchNum} SUCCESS:`, response.data);
          totalImported += response.data.imported_count || 0;
          totalCreated += response.data.created_count || 0;
          totalUpdated += response.data.updated_count || 0;
          totalErrors += response.data.error_count || 0;
        } catch (batchError) {
          console.error(`Batch ${batchNum} FAILED:`, batchError.message);
          console.error('Error details:', batchError.response?.data);
          totalErrors += batch.length;
        }
      }
      
      console.log(`=== IMPORT COMPLETE === Imported: ${totalImported}, Errors: ${totalErrors}`);
      setImportResult({
        success: true,
        imported_count: totalImported,
        created_count: totalCreated,
        updated_count: totalUpdated,
        error_count: totalErrors,
        message: `Imported ${totalImported} resources (${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors)`
      });
    } catch (error) {
      console.error('Import failed:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.detail || `Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                <Upload className="inline-block w-8 h-8 mr-2 text-indigo-600" />
                Import AWS Resources
              </h1>
              <p className="text-gray-600">
                Multiple ways to import your infrastructure data
              </p>
            </div>
            {importMethod && (
              <button
                onClick={resetToMethodSelection}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center"
              >
                <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                Change Method
              </button>
            )}
          </div>
        </div>

        {/* Import Method Selection */}
        {!importMethod && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Import Method</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* File Upload */}
              <button
                onClick={() => setImportMethod('file')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
              >
                <FileSpreadsheet className="w-12 h-12 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">Upload File</h3>
                <p className="text-sm text-gray-600">
                  Import from Excel (.xlsx) or CSV files with AI-assisted mapping
                </p>
              </button>
              
              {/* Templates */}
              <button
                onClick={() => setImportMethod('template')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
              >
                <FileText className="w-12 h-12 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">Use Template</h3>
                <p className="text-sm text-gray-600">
                  Download pre-formatted templates for EC2, RDS, S3, and more
                </p>
              </button>
              
              {/* CLI Paste */}
              <button
                onClick={() => setImportMethod('cli')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group"
              >
                <Terminal className="w-12 h-12 text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">AWS CLI Paste</h3>
                <p className="text-sm text-gray-600">
                  Paste output from aws describe-instances and similar commands
                </p>
              </button>
              
              {/* Manual Entry */}
              <button
                onClick={() => navigate('/resources')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
              >
                <Database className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">Manual Entry</h3>
                <p className="text-sm text-gray-600">
                  Add resources one by one with full control over all fields
                </p>
              </button>
            </div>
            
            {/* Quick Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
                AI-Powered Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                  <span>Auto-detect resource types from data</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                  <span>Smart field mapping with ARN parsing</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                  <span>Automatic connectivity detection</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Template Selection */}
        {importMethod === 'template' && step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Resource Template</h2>
            <p className="text-gray-600 mb-6">Download a template, fill it with your data, then upload</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(IMPORT_TEMPLATES).map(([key, template]) => (
                <div
                  key={key}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === key 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedTemplate(key)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{template.icon}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {template.columns.length} columns
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              ))}
            </div>
            
            {selectedTemplate && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">
                  {IMPORT_TEMPLATES[selectedTemplate].icon} {IMPORT_TEMPLATES[selectedTemplate].name} Template Columns:
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left">Column Name</th>
                        <th className="px-3 py-2 text-left">Maps To</th>
                        <th className="px-3 py-2 text-left">Required</th>
                        <th className="px-3 py-2 text-left">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IMPORT_TEMPLATES[selectedTemplate].columns.map((col, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2 font-medium">{col.name}</td>
                          <td className="px-3 py-2 text-gray-600">{col.field}</td>
                          <td className="px-3 py-2">
                            {col.required ? (
                              <span className="text-red-600">Required</span>
                            ) : (
                              <span className="text-gray-400">Optional</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-500 font-mono text-xs">{col.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => downloadTemplate(selectedTemplate)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template CSV
                  </button>
                  <button
                    onClick={() => {
                      // Set up field mappings from template
                      const mappings = {};
                      IMPORT_TEMPLATES[selectedTemplate].columns.forEach(col => {
                        mappings[col.name] = col.field;
                      });
                      setFieldMappings(mappings);
                      setResourceType(selectedTemplate);
                      setImportMethod('file');
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Filled Template
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLI Paste Input */}
        {importMethod === 'cli' && step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              <Terminal className="inline-block w-6 h-6 mr-2 text-orange-600" />
              Paste AWS CLI Output
            </h2>
            <p className="text-gray-600 mb-6">
              Run an AWS CLI command with <code className="bg-gray-100 px-2 py-1 rounded">--output json</code> and paste the result below
            </p>
            
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-2">Example commands:</p>
              <code className="text-green-400 text-sm block mb-1">aws ec2 describe-instances --output json</code>
              <code className="text-green-400 text-sm block mb-1">aws ec2 describe-volumes --output json</code>
              <code className="text-green-400 text-sm block mb-1">aws rds describe-db-instances --output json</code>
              <code className="text-green-400 text-sm block mb-1">aws s3api list-buckets --output json</code>
              <code className="text-green-400 text-sm block">aws lambda list-functions --output json</code>
            </div>
            
            <textarea
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder='Paste your AWS CLI JSON output here...\n\n{\n  "Reservations": [...]\n}'
              className="w-full h-64 p-4 border rounded-lg font-mono text-sm bg-gray-50"
            />
            
            <div className="flex gap-4 mt-4">
              <button
                onClick={resetToMethodSelection}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCLIParse}
                disabled={cliParsing || !cliInput.trim()}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 flex items-center justify-center"
              >
                {cliParsing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Parse & Import
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps - only show when in file upload flow */}
        {importMethod === 'file' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              {['Upload', 'Analyze', 'Map Fields', 'Import'].map((label, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step > idx + 1 ? 'bg-green-500' : step === idx + 1 ? 'bg-indigo-600' : 'bg-gray-300'
                  } text-white font-bold`}>
                    {step > idx + 1 ? <CheckCircle className="w-6 h-6" /> : idx + 1}
                  </div>
                  <span className={`ml-2 font-medium ${step >= idx + 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {idx < 3 && <ArrowRight className="w-5 h-5 mx-4 text-gray-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Upload - only show when file method selected */}
        {importMethod === 'file' && step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload File</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors">
              <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg text-gray-700 mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports: Excel (.xlsx, .xls) and CSV (.csv) files
              </p>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700"
              >
                Select File
              </label>
            </div>

            {file && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                </div>
                
                {/* AI Option for Parsing */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAIInParsing}
                      onChange={(e) => setUseAIInParsing(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
                        <span className="font-medium text-gray-900">Use AI in Parsing</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        AI will clean data, fix formatting issues, and validate values during parsing
                      </p>
                    </div>
                  </label>
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold flex items-center justify-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {useAIInParsing ? 'Parsing with AI...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      {useAIInParsing ? 'Upload & Parse with AI' : 'Upload & Parse'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Analyze with AI */}
        {step === 2 && parsedData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              <Sparkles className="inline-block w-6 h-6 mr-2 text-yellow-500" />
              Analyze with AI
            </h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                {parsedData.sheet_names.length > 1 ? (
                  <>
                    File contains <strong>{parsedData.sheet_names.length} sheets</strong>.
                    Select a sheet to analyze:
                  </>
                ) : (
                  <>File contains <strong>{parsedData.total_rows} rows</strong>.</>
                )}
              </p>

              {parsedData.sheet_names.length > 1 && (
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  {parsedData.sheet_names.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* AI Parsing Results */}
            {parsedData.ai_suggestions && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI Parsing Results
                </h3>
                <p className="text-sm text-green-700 mb-2">{parsedData.ai_suggestions.message}</p>
                {parsedData.ai_suggestions.fixes_applied && parsedData.ai_suggestions.fixes_applied.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-green-700">
                    {parsedData.ai_suggestions.fixes_applied.map((fix, idx) => (
                      <li key={idx}>{fix}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Sample Data Preview:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(parsedData.sheets[selectedSheet][0] || {}).map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-gray-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.sheets[selectedSheet].slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-3 py-2 text-gray-600">
                            {val !== null ? String(val) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* AI Option for Analysis */}
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAIInAnalyze}
                  onChange={(e) => setUseAIInAnalyze(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="font-medium text-gray-900">Use AI for Field Mapping</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    AI will analyze your data and suggest field mappings automatically
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 flex items-center justify-center"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing with AI...
                  </>
                ) : useAIInAnalyze ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze with AI
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Continue to Mapping
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Field Mapping */}
        {step === 3 && parsedData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {llmAnalysis ? 'AI Analysis Results' : 'Manual Field Mapping'}
            </h2>
            
            <div className="space-y-6">
              {/* AI Analysis Info - only show if AI was used */}
              {llmAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">
                    <CheckCircle className="inline-block w-5 h-5 mr-2" />
                    Detected Resource Type: <span className="uppercase">{llmAnalysis.detected_resource_type || resourceType}</span>
                  </h3>
                  {llmAnalysis.confidence && (
                    <p className="text-sm text-green-700">
                      Confidence: {llmAnalysis.confidence}
                    </p>
                  )}
                </div>
              )}

              {/* Manual mode - resource type selector */}
              {!llmAnalysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Select Resource Type:</h3>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select type...</option>
                    <option value="ec2">EC2 Instances</option>
                    <option value="ebs">EBS Volumes</option>
                    <option value="rds">RDS Databases</option>
                    <option value="s3">S3 Buckets</option>
                    <option value="lambda">Lambda Functions</option>
                    <option value="elb">Load Balancers</option>
                    <option value="vpc">VPCs & Networks</option>
                  </select>
                </div>
              )}

              {llmAnalysis?.warnings && llmAnalysis.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    <AlertTriangle className="inline-block w-5 h-5 mr-2" />
                    Warnings
                  </h3>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {llmAnalysis.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Field Mappings */}
              <div>
                <h3 className="font-semibold mb-3">Field Mappings (Review and Edit if Needed):</h3>
                
                {/* If no mappings exist, create from CSV columns */}
                {Object.keys(fieldMappings).length === 0 && parsedData?.sheets?.[selectedSheet]?.[0] && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-700">
                      No AI mappings available. Please map your CSV columns manually:
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {/* Show existing mappings or create from CSV columns */}
                  {(Object.keys(fieldMappings).length > 0 
                    ? Object.entries(fieldMappings) 
                    : Object.keys(parsedData?.sheets?.[selectedSheet]?.[0] || {}).map(col => [col, ''])
                  ).map(([source, target]) => (
                    <div key={source} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                      <span className="flex-1 font-medium">{source}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <select
                        value={target || ''}
                        onChange={(e) => setFieldMappings({...fieldMappings, [source]: e.target.value})}
                        className="flex-1 px-3 py-2 border rounded"
                      >
                        <option value="">-- Skip --</option>
                        <option value="name">name</option>
                        <option value="resource_id">resource_id</option>
                        <option value="type">type</option>
                        <option value="region">region</option>
                        <option value="availability_zone">availability_zone</option>
                        <option value="status">status</option>
                        <option value="instance_type">instance_type</option>
                        <option value="public_ip">public_ip</option>
                        <option value="private_ip">private_ip</option>
                        <option value="vpc_id">vpc_id</option>
                        <option value="subnet_id">subnet_id</option>
                        <option value="arn">arn</option>
                        <option value="account_id">account_id</option>
                        <option value="tags">tags</option>
                        <option value="environment">environment</option>
                        <option value="description">description</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connectivity Mapping Section */}
              <div className="border-t pt-6">
                <button
                  onClick={() => setShowConnectivity(!showConnectivity)}
                  className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <Link2 className="w-5 h-5 mr-2" />
                  {showConnectivity ? 'Hide' : 'Show'} Connectivity Options
                  <ArrowRight className={`w-4 h-4 ml-2 transition-transform ${showConnectivity ? 'rotate-90' : ''}`} />
                </button>
                
                {showConnectivity && (
                  <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 mb-3">
                      <GitBranch className="inline-block w-4 h-4 mr-2" />
                      Resource Relationships
                    </h4>
                    <p className="text-sm text-indigo-700 mb-3">
                      Map columns that define relationships between resources:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-sm">Dependencies:</span>
                        <select
                          value={connectivityMappings.dependencies || ''}
                          onChange={(e) => setConnectivityMappings({...connectivityMappings, dependencies: e.target.value})}
                          className="flex-1 px-3 py-2 border rounded text-sm"
                        >
                          <option value="">-- None --</option>
                          {Object.keys(parsedData?.sheets?.[selectedSheet]?.[0] || {}).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-sm">Connected To:</span>
                        <select
                          value={connectivityMappings.connected_resources || ''}
                          onChange={(e) => setConnectivityMappings({...connectivityMappings, connected_resources: e.target.value})}
                          className="flex-1 px-3 py-2 border rounded text-sm"
                        >
                          <option value="">-- None --</option>
                          {Object.keys(parsedData?.sheets?.[selectedSheet]?.[0] || {}).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-sm">Attached To:</span>
                        <select
                          value={connectivityMappings.attached_to || ''}
                          onChange={(e) => setConnectivityMappings({...connectivityMappings, attached_to: e.target.value})}
                          className="flex-1 px-3 py-2 border rounded text-sm"
                        >
                          <option value="">-- None --</option>
                          {Object.keys(parsedData?.sheets?.[selectedSheet]?.[0] || {}).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 flex items-center justify-center"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!resourceType}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  Preview Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Confirm */}
        {step === 4 && previewData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {parsedData?.aws_resource_explorer ? '🌐 AWS Resource Explorer Import' : 'Import Preview'}
            </h2>
            
            {/* AWS Resource Explorer format message */}
            {parsedData?.aws_resource_explorer && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">
                  ✅ {parsedData.message}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  All fields have been automatically mapped from AWS Resource Explorer format.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Valid Resources</span>
                  <span className="text-2xl font-bold text-green-600">{previewData.valid_count}</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Invalid Resources</span>
                  <span className="text-2xl font-bold text-red-600">{previewData.invalid_count}</span>
                </div>
              </div>
            </div>
            
            {/* Resource Type Filtering */}
            {Object.keys(resourceTypeCounts).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Server className="w-5 h-5 mr-2 text-indigo-600" />
                  Filter Resource Types to Import
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select which resource types you want to import. Default selection includes main infrastructure components.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(resourceTypeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const isSelected = selectedResourceTypes.has(type);
                      const isDefault = ['vpc', 'subnet', 'ec2', 'instance', 'rds', 'aurora', 'codepipeline', 'codebuild', 'rabbitmq', 'mq'].includes(type);
                      
                      return (
                        <label 
                          key={type}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedResourceTypes);
                              if (e.target.checked) {
                                newSet.add(type);
                              } else {
                                newSet.delete(type);
                              }
                              setSelectedResourceTypes(newSet);
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mr-2"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium truncate ${
                                isSelected ? 'text-indigo-900' : 'text-gray-700'
                              }`}>
                                {type}
                              </span>
                              {isDefault && (
                                <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">✓</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{count} items</span>
                          </div>
                        </label>
                      );
                    })
                  }
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSelectedResourceTypes(new Set(Object.keys(resourceTypeCounts)))}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedResourceTypes(new Set())}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={() => setSelectedResourceTypes(new Set([
                      'vpc', 'subnet', 'ec2', 'instance', 'rds', 'aurora', 
                      'codepipeline', 'codebuild', 'rabbitmq', 'mq'
                    ]))}
                    className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium"
                  >
                    Reset to Defaults
                  </button>
                </div>
                
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedResourceTypes.size}</strong> resource types selected • 
                    <strong>{previewData.valid_resources.filter(r => selectedResourceTypes.has(r.type?.toLowerCase())).length}</strong> resources will be imported
                  </p>
                </div>
              </div>
            )}
            
            {/* Sample Resources Preview */}
            {previewData.valid_resources && previewData.valid_resources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Sample Resources (showing first 10)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Region</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Account</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.valid_resources.slice(0, 10).map((resource, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-xs truncate">
                            {resource.name}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {resource.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{resource.region}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                            {resource.account_id}
                          </td>
                          <td className="px-3 py-2 text-gray-500 text-xs">
                            {resource.tags ? Object.keys(resource.tags).length + ' tags' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.valid_resources.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ... and {previewData.valid_resources.length - 10} more resources
                  </p>
                )}
              </div>
            )}

            {!importResult ? (
              <button
                onClick={handleImport}
                disabled={importing || previewData.valid_count === 0 || selectedResourceTypes.size === 0}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Import {previewData.valid_resources.filter(r => selectedResourceTypes.has(r.type?.toLowerCase())).length} Resources
                  </>
                )}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-green-900 mb-2">Import Successful!</h3>
                <p className="text-green-700 mb-4">
                  Imported {importResult.imported_count} resources successfully
                </p>
                <button
                  onClick={() => navigate('/resources')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  View Resources
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Import;
