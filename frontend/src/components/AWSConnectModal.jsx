import React, { useState } from 'react';
import { X, Cloud, CheckCircle, AlertCircle, Loader, Database } from 'lucide-react';
import axios from '../utils/axiosConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';

const AWSConnectModal = ({ isOpen, onClose, onScanComplete }) => {
  const [step, setStep] = useState('credentials'); // credentials, testing, scanning, confirm, importing, complete
  const [credentials, setCredentials] = useState({
    aws_access_key_id: '',
    aws_secret_access_key: '',
    region: 'us-east-1',
    aws_session_token: ''
  });
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([
    'ec2', 'rds', 'lambda', 's3', 'elb', 'vpc', 'ecs', 'eks', 'dynamodb', 'sns', 'sqs', 'apigateway', 'codepipeline'
  ]);

  const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-south-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2',
    'ca-central-1', 'sa-east-1'
  ];

  const resourceTypes = [
    { id: 'ec2', name: 'EC2 Instances', icon: '🖥️' },
    { id: 'rds', name: 'RDS Databases', icon: '🗄️' },
    { id: 'lambda', name: 'Lambda Functions', icon: '⚡' },
    { id: 's3', name: 'S3 Buckets', icon: '🪣' },
    { id: 'elb', name: 'Load Balancers', icon: '⚖️' },
    { id: 'vpc', name: 'VPCs', icon: '🌐' },
    { id: 'ecs', name: 'ECS Clusters', icon: '📦' },
    { id: 'eks', name: 'EKS Clusters', icon: '☸️' },
    { id: 'dynamodb', name: 'DynamoDB Tables', icon: '💾' },
    { id: 'sns', name: 'SNS Topics', icon: '📢' },
    { id: 'sqs', name: 'SQS Queues', icon: '📬' },
    { id: 'apigateway', name: 'API Gateway', icon: '🚪' },
    { id: 'codepipeline', name: 'CodePipeline', icon: '🔄' }
  ];

  const handleTestConnection = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/aws/test-connection`,
        credentials,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setConnectionInfo(response.data);
      setStep('testing');
      setTimeout(() => setStep('scanning'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to AWS. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/aws/scan`,
        {
          credentials,
          resource_types: selectedResourceTypes.length === 13 ? null : selectedResourceTypes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setScanResults(response.data);
      setStep('confirm'); // Show confirmation step instead of complete
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to scan AWS resources.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    // User confirmed, proceed to complete
    setStep('complete');
    
    // Notify parent component
    if (onScanComplete) {
      onScanComplete(scanResults);
    }
  };

  const handleCancelImport = () => {
    // User cancelled, go back to scanning step
    setStep('scanning');
    setScanResults(null);
  };

  const handleClose = () => {
    setStep('credentials');
    setCredentials({
      aws_access_key_id: '',
      aws_secret_access_key: '',
      region: 'us-east-1',
      aws_session_token: ''
    });
    setConnectionInfo(null);
    setScanResults(null);
    setError('');
    onClose();
  };

  const toggleResourceType = (type) => {
    setSelectedResourceTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Connect to AWS</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step: Credentials */}
          {step === 'credentials' && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 mb-4">
                  Enter your AWS credentials to scan and import resources from your AWS account.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> You can find your AWS credentials in the AWS Console under IAM → Users → Security Credentials
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AWS Access Key ID *
                </label>
                <input
                  type="text"
                  value={credentials.aws_access_key_id}
                  onChange={(e) => setCredentials({ ...credentials, aws_access_key_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AWS Secret Access Key *
                </label>
                <input
                  type="password"
                  value={credentials.aws_secret_access_key}
                  onChange={(e) => setCredentials({ ...credentials, aws_secret_access_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region *
                </label>
                <select
                  value={credentials.region}
                  onChange={(e) => setCredentials({ ...credentials, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Token (Optional)
                </label>
                <input
                  type="password"
                  value={credentials.aws_session_token}
                  onChange={(e) => setCredentials({ ...credentials, aws_session_token: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="For temporary credentials only"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Resource Types to Scan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {resourceTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => toggleResourceType(type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedResourceTypes.includes(type.id)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-medium text-xs">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={loading || !credentials.aws_access_key_id || !credentials.aws_secret_access_key || selectedResourceTypes.length === 0}
                  className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-5 h-5" />
                      Connect & Scan
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Testing Connection */}
          {step === 'testing' && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connected Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Account ID: <span className="font-mono font-semibold">{connectionInfo?.account_id}</span>
              </p>
              <p className="text-gray-600">
                Region: <span className="font-semibold">{connectionInfo?.current_region}</span>
              </p>
              <div className="mt-6">
                <Loader className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                <p className="text-gray-600 mt-3">Preparing to scan resources...</p>
              </div>
            </div>
          )}

          {/* Step: Scanning */}
          {step === 'scanning' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Database className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Scanning AWS Resources</h3>
                <p className="text-gray-600 mb-6">
                  Discovering resources in your AWS account...
                </p>
                <div className="max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Scanning Progress</span>
                    <Loader className="w-4 h-4 text-orange-500 animate-spin" />
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-3 font-medium">Scanning resource types:</p>
                <div className="grid grid-cols-3 gap-2">
                  {resourceTypes.filter(t => selectedResourceTypes.includes(t.id)).map(type => (
                    <div key={type.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span>{type.icon}</span>
                      <span>{type.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!loading && (
                <button
                  onClick={handleScan}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-5 h-5" />
                  Start Scan
                </button>
              )}

              {loading && (
                <div className="text-center">
                  <Loader className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Scanning in progress...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Confirm Import */}
          {step === 'confirm' && scanResults && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <Database className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Review Scanned Resources</h3>
                <p className="text-gray-600">
                  Found {Object.values(scanResults.resources_found || {}).reduce((a, b) => a + b, 0)} resources. Review and confirm to import into database.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-bold text-gray-900 mb-4">Resources Found</h4>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {Object.entries(scanResults.resources_found || {}).map(([type, count]) => {
                    const resourceType = resourceTypes.find(t => t.id === type);
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{resourceType?.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{resourceType?.name}</span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Note:</strong> Clicking "Import to Database" will add these resources to your inventory. 
                  Existing resources with the same ID will be updated.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancelImport}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      Import to Database
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && scanResults && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Scan Complete!</h3>
                <p className="text-gray-600">
                  Successfully imported resources from your AWS account
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-6 border border-orange-200">
                <h4 className="font-bold text-gray-900 mb-4">Resources Found</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(scanResults.resources_found).map(([type, count]) => {
                    const resourceType = resourceTypes.find(t => t.id === type);
                    return (
                      <div key={type} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{resourceType?.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{resourceType?.name}</span>
                        </div>
                        <span className="text-lg font-bold text-orange-600">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {scanResults.import_stats && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-3">Import Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{scanResults.import_stats.created}</div>
                      <div className="text-xs text-gray-600">Created</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{scanResults.import_stats.updated}</div>
                      <div className="text-xs text-gray-600">Updated</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{scanResults.import_stats.errors}</div>
                      <div className="text-xs text-gray-600">Errors</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AWSConnectModal;
