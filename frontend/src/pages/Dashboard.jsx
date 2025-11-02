import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { LogOut, User, Globe, Database, Sparkles, Network, Server, HardDrive, MapPin, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState({ total: 0, byType: {}, byRegion: {}, byStatus: {} });
  const [loading, setLoading] = useState(true);

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    fetchUserData();
    fetchResources();
  }, []);

  const fetchUserData = async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data);
    } catch (error) {
      // Token might be expired, try to refresh
      if (error.response?.status === 401) {
        await refreshToken();
      } else {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    
    if (!refresh) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: refresh
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      // Retry fetching user data
      await fetchUserData();
    } catch (error) {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const fetchResources = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/resources/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setResources(data);

      // Calculate stats
      const byType = {};
      const byRegion = {};
      const byStatus = {};

      data.forEach(resource => {
        byType[resource.type] = (byType[resource.type] || 0) + 1;
        byRegion[resource.region] = (byRegion[resource.region] || 0) + 1;
        byStatus[resource.status] = (byStatus[resource.status] || 0) + 1;
      });

      setStats({
        total: data.length,
        byType,
        byRegion,
        byStatus
      });
    } catch (error) {
      console.error('Failed to fetch resources', error);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('dashboardTitle')}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/resources')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">{t('resources')}</span>
              </button>
              <button
                onClick={() => navigate('/architecture')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Network className="w-4 h-4" />
                <span className="text-sm font-medium">Diagram</span>
              </button>
              <button
                onClick={() => navigate('/ai-insights')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{t('aiInsights')}</span>
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
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('welcomeBack')}, {user?.username}!
              </h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Resources</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Server className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resource Types</p>
                <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.byType).length}</p>
              </div>
              <HardDrive className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regions</p>
                <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.byRegion).length}</p>
              </div>
              <MapPin className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-gray-900">{stats.byStatus['running'] || 0}</p>
              </div>
              <Activity className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Resource Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Resources by Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Resources by Type</h3>
            {Object.keys(stats.byType).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-700 uppercase">{type}</span>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-semibold text-sm">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No resources yet</p>
            )}
          </div>

          {/* Resources by Region */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Resources by Region</h3>
            {Object.keys(stats.byRegion).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(stats.byRegion).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between">
                    <span className="text-gray-700">{region}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold text-sm">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No resources yet</p>
            )}
          </div>

          {/* VPCs and Network */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Network Resources</h3>
            {resources.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">VPCs</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold text-sm">
                    {new Set(resources.map(r => r.vpc_id).filter(v => v)).size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Subnets</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold text-sm">
                    {new Set(resources.map(r => r.subnet_id).filter(s => s)).size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Security Groups</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold text-sm">
                    {new Set(resources.flatMap(r => r.security_groups || [])).size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Availability Zones</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold text-sm">
                    {new Set(resources.map(r => r.availability_zone).filter(a => a)).size}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No network resources yet</p>
            )}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Accounts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">AWS Accounts</h3>
            {resources.length > 0 ? (
              <div className="space-y-2">
                {Array.from(new Set(resources.map(r => r.account_id).filter(a => a))).map(account => (
                  <div key={account} className="flex items-center justify-between">
                    <span className="text-gray-700 font-mono text-sm">{account}</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold text-sm">
                      {resources.filter(r => r.account_id === account).length} resources
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No accounts configured</p>
            )}
          </div>

          {/* Environments */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Environments</h3>
            {resources.length > 0 ? (
              <div className="space-y-2">
                {Array.from(new Set(resources.map(r => r.environment).filter(e => e))).map(env => (
                  <div key={env} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{env}</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-semibold text-sm">
                      {resources.filter(r => r.environment === env).length} resources
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No environments configured</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border-2 border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/resources')}>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Resources</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600">Add, edit, and organize your AWS resources</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6 border-2 border-emerald-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/architecture')}>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Architecture Diagram</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600">Visualize your AWS infrastructure topology</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/ai-insights')}>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600">Get AI-powered architecture recommendations</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
