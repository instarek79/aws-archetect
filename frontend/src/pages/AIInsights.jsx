import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from '../utils/axiosConfig';
import { Sparkles, Send, Download, Globe, LogOut, Loader, Database, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function AIInsights() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      setError(t('promptRequired'));
      return;
    }

    const headers = getAuthHeader();
    if (!headers) return;

    setLoading(true);
    setError('');
    setAnalysis('');

    try {
      const response = await axios.post(
        `${API_URL}/ai/analyze`,
        {
          prompt: prompt,
          include_resources: true
        },
        { headers }
      );

      setAnalysis(response.data.analysis);
      setSuccessMessage(t('analysisComplete'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 503) {
        setError(t('aiServiceUnavailable'));
      } else {
        setError(err.response?.data?.detail || t('analysisError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSummary = async () => {
    const headers = getAuthHeader();
    if (!headers) return;

    setLoading(true);
    setError('');
    setSummary(null);

    try {
      const response = await axios.get(`${API_URL}/api/ai/summary`, { headers });
      setSummary(response.data);
      setSuccessMessage(t('summaryGenerated'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || t('summaryError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!summary && !analysis) {
      setError(t('noContentToDownload'));
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text(t('aiInsights'), margin, yPosition);
      yPosition += 15;

      // Date
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(new Date().toLocaleDateString(), margin, yPosition);
      yPosition += 15;

      if (summary) {
        // Architecture Summary
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(t('architectureSummary'), margin, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        // Total resources
        doc.text(`${t('totalResources')}: ${summary.total_resources}`, margin, yPosition);
        yPosition += 8;

        // Regions
        doc.text(`${t('regions')}: ${summary.regions_used.join(', ')}`, margin, yPosition);
        yPosition += 10;

        // Summary text
        const summaryLines = doc.splitTextToSize(summary.architecture_summary, maxWidth);
        doc.text(summaryLines, margin, yPosition);
        yPosition += (summaryLines.length * 7) + 10;

        // Cost Optimization
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(t('costOptimization'), margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        summary.cost_optimization_tips.forEach((tip, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          const tipLines = doc.splitTextToSize(`${index + 1}. ${tip}`, maxWidth);
          doc.text(tipLines, margin, yPosition);
          yPosition += (tipLines.length * 6) + 5;
        });

        // Security Recommendations
        yPosition += 5;
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(t('securityRecommendations'), margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        summary.security_recommendations.forEach((rec, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          const recLines = doc.splitTextToSize(`${index + 1}. ${rec}`, maxWidth);
          doc.text(recLines, margin, yPosition);
          yPosition += (recLines.length * 6) + 5;
        });

        // Best Practices
        yPosition += 5;
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(t('bestPractices'), margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        summary.best_practices.forEach((practice, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          const practiceLines = doc.splitTextToSize(`${index + 1}. ${practice}`, maxWidth);
          doc.text(practiceLines, margin, yPosition);
          yPosition += (practiceLines.length * 6) + 5;
        });
      }

      if (analysis) {
        if (yPosition > 200 || summary) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(t('customAnalysis'), margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const analysisLines = doc.splitTextToSize(analysis, maxWidth);
        analysisLines.forEach(line => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
      }

      doc.save(`aws-architecture-insights-${new Date().getTime()}.pdf`);
      setSuccessMessage(t('pdfDownloaded'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(t('pdfError'));
    }
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

  const quickPrompts = [
    t('explainArchitecture'),
    t('suggestImprovements'),
    t('costOptimizationTips'),
    t('securityAudit')
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {t('aiInsights')}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('dashboardTitle')}
              </button>
              <button
                onClick={() => navigate('/resources')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Database className="w-4 h-4" />
                {t('resources')}
              </button>
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {i18n.language === 'en' ? 'العربية' : 'English'}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Prompt Interface */}
          <div className="space-y-6">
            {/* Auto Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                {t('autoGenerateSummary')}
              </h2>
              <p className="text-gray-600 mb-4">
                {t('autoSummaryDescription')}
              </p>
              <button
                onClick={handleAutoSummary}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {t('generating')}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('generateSummary')}
                  </>
                )}
              </button>
            </div>

            {/* Custom Prompt Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Send className="w-6 h-6 text-purple-600" />
                {t('customPrompt')}
              </h2>

              {/* Quick Prompts */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">{t('quickPrompts')}:</p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((quickPrompt, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(quickPrompt)}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                    >
                      {quickPrompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('promptPlaceholder')}
                rows={6}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
              />

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading || !prompt.trim()}
                className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {t('analyzing')}...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {t('analyzeButton')}
                  </>
                )}
              </button>
            </div>

            {/* Download Button */}
            {(summary || analysis) && (
              <button
                onClick={handleDownloadPDF}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {t('downloadPDF')}
              </button>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Architecture Summary */}
            {summary && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('architectureSummary')}
                </h2>

                {/* Overview */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">{t('totalResources')}</p>
                      <p className="text-3xl font-bold text-purple-600">{summary.total_resources}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">{t('regions')}</p>
                      <p className="text-lg font-bold text-indigo-600">{summary.regions_used.length}</p>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed">
                    {summary.architecture_summary}
                  </p>
                </div>

                {/* Cost Optimization */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    💰 {t('costOptimization')}
                  </h3>
                  <ul className="space-y-2">
                    {summary.cost_optimization_tips.map((tip, index) => (
                      <li key={index} className="flex gap-2 text-gray-700">
                        <span className="text-purple-600 font-bold">{index + 1}.</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Security */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    🔒 {t('securityRecommendations')}
                  </h3>
                  <ul className="space-y-2">
                    {summary.security_recommendations.map((rec, index) => (
                      <li key={index} className="flex gap-2 text-gray-700">
                        <span className="text-red-600 font-bold">{index + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best Practices */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    ✨ {t('bestPractices')}
                  </h3>
                  <ul className="space-y-2">
                    {summary.best_practices.map((practice, index) => (
                      <li key={index} className="flex gap-2 text-gray-700">
                        <span className="text-green-600 font-bold">{index + 1}.</span>
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Custom Analysis */}
            {analysis && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('analysisResults')}
                </h2>
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {analysis}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!summary && !analysis && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('aiEmptyState')}
                </h3>
                <p className="text-gray-600">
                  {t('aiEmptyStateDescription')}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AIInsights;
