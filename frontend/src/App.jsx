import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import AIInsights from './pages/AIInsights';
import ArchitectureDiagram from './pages/ArchitectureDiagramFlow';
import ResourcesNavigator from './pages/ResourcesNavigator';
import RelationshipManager from './pages/RelationshipManager';
import ManagementView from './pages/ManagementView';
import Import from './pages/Import';
import './i18n';

function App() {
  const { i18n } = useTranslation();
  
  // Set initial direction based on language
  document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/architecture" element={<ArchitectureDiagram />} />
        <Route path="/navigator" element={<ResourcesNavigator />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/relationships" element={<RelationshipManager />} />
        <Route path="/management" element={<ManagementView />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </Router>
  );
}

export default App;
