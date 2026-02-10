import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Database, GitBranch, Compass, Network, BarChart3 } from 'lucide-react';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/resources', label: 'Resources', icon: Database },
    { path: '/architecture', label: 'Diagram', icon: GitBranch },
    { path: '/navigator', label: 'Navigator', icon: Compass },
    { path: '/relationships', label: 'Relationships', icon: Network },
    { path: '/management', label: 'Management', icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                  isActive(path)
                    ? 'bg-white/20 font-medium'
                    : 'hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="text-xs text-white/60">
            AWS Architecture Manager
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
