import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import AIInsights from './pages/AIInsights';
import './i18n';

function App() {
  const { i18n } = useTranslation();
  
  // Set initial direction based on language
  document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/ai-insights" element={<AIInsights />} />
      </Routes>
    </Router>
  );
}

export default App;
