import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { LogOut, User, Globe, Database, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    fetchUserData();
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
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {t('welcomeBack')}, {user?.username}!
              </h2>
              <p className="text-gray-600 mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('email')}
                </h3>
                <p className="text-gray-700">{user?.email}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('username')}
                </h3>
                <p className="text-gray-700">{user?.username}</p>
              </div>
            </div>

            <div className="mt-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Account Created
              </h3>
              <p className="text-gray-700">
                {new Date(user?.created_at).toLocaleDateString(isRTL ? 'ar' : 'en', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Quick Access to Resources */}
            <div className="mt-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border-2 border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {t('myResources')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Manage your AWS resources
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/resources')}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {t('resources')}
                </button>
              </div>
            </div>

            {/* Quick Access to AI Insights */}
            <div className="mt-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {t('aiInsights')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      AI-powered architecture analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/ai-insights')}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  {t('aiInsights')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
