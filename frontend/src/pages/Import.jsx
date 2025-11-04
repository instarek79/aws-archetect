import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Database, Sparkles, ArrowRight, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Import() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
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
      setSelectedSheet(response.data.sheet_names[0]);
      
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
      setStep(4);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Preview generation failed');
    }
  };

  const handleImport = async () => {
    if (!previewData || !previewData.valid_resources) return;
    
    setImporting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/api/import/execute`,
        { resources: previewData.valid_resources },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setImportResult(response.data);
    } catch (error) {
      console.error('Import failed:', error);
      alert(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Upload className="inline-block w-8 h-8 mr-2 text-indigo-600" />
            Import AWS Resources
          </h1>
          <p className="text-gray-600">
            Upload Excel or CSV files and use AI to intelligently map your data
          </p>
        </div>

        {/* Progress Steps */}
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

        {/* Step 1: Upload */}
        {step === 1 && (
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
        {step === 3 && llmAnalysis && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Analysis Results</h2>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  <CheckCircle className="inline-block w-5 h-5 mr-2" />
                  Detected Resource Type: <span className="uppercase">{llmAnalysis.detected_resource_type}</span>
                </h3>
                <p className="text-sm text-green-700">
                  Confidence: {llmAnalysis.confidence}
                </p>
              </div>

              {llmAnalysis.warnings && llmAnalysis.warnings.length > 0 && (
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

              <div>
                <h3 className="font-semibold mb-3">Field Mappings (Review and Edit if Needed):</h3>
                <div className="space-y-2">
                  {Object.entries(fieldMappings).map(([source, target]) => (
                    <div key={source} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                      <span className="flex-1 font-medium">{source}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={target}
                        onChange={(e) => setFieldMappings({...fieldMappings, [source]: e.target.value})}
                        className="flex-1 px-3 py-2 border rounded"
                      />
                    </div>
                  ))}
                </div>
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
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Import Preview</h2>
            
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

            {!importResult ? (
              <button
                onClick={handleImport}
                disabled={importing || previewData.valid_count === 0}
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
                    Import {previewData.valid_count} Resources
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
