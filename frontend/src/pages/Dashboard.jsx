import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { LogOut, User, Globe, Database, Sparkles, Network, Server, HardDrive, MapPin, Activity, Upload, Shield, Cloud, Layers, BarChart3, TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, DollarSign } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Estimated monthly cost per resource type (in USD) - for visualization purposes
const ESTIMATED_COSTS = {
  ec2: 85,
  instance: 85,
  rds: 150,
  aurora: 200,
  redshift: 180,
  elasticache: 120,
  elasticsearch: 140,
  opensearch: 140,
  eks: 75,
  ecs: 50,
  lambda: 15,
  nat_gateway: 45,
  nat: 45,
  elb: 25,
  alb: 25,
  nlb: 25,
  elasticloadbalancing: 25,
  cloudfront: 30,
  s3: 20,
  ebs: 15,
  efs: 35,
  fsx: 60,
  dynamodb: 40,
  apigateway: 20,
  route53: 5,
  vpc: 0,
  subnet: 0,
  security_group: 0,
  iam: 0,
  kms: 3,
  secrets: 5,
  cloudwatch: 10,
  sns: 2,
  sqs: 3
};

// Resource categories for dashboard display
const RESOURCE_CATEGORIES = {
  infrastructure: { label: 'Infrastructure', icon: Server, color: 'blue', types: ['ec2', 'instance', 'rds', 'lambda', 'ecs', 'eks', 'elasticache', 'redshift'] },
  storage: { label: 'Storage', icon: HardDrive, color: 'purple', types: ['s3', 'ebs', 'efs', 'fsx', 'backup', 'snapshot'] },
  network: { label: 'Network', icon: Network, color: 'green', types: ['vpc', 'subnet', 'security_group', 'elb', 'alb', 'nlb', 'cloudfront', 'route53', 'nat', 'igw'] },
  identity: { label: 'Identity & Access', icon: Shield, color: 'yellow', types: ['iam', 'role', 'policy', 'user', 'group', 'kms', 'secrets'] },
  monitoring: { label: 'Monitoring', icon: Activity, color: 'orange', types: ['cloudwatch', 'cloudtrail', 'sns', 'sqs', 'eventbridge'] }
};

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState({ total: 0, byType: {}, byRegion: {}, byStatus: {}, linked: { total: 0, by_type: {} } });
  const [loading, setLoading] = useState(true);
  
  // View selectors for resource cards
  const [mainView, setMainView] = useState('type'); // type, region, account
  const [ec2View, setEc2View] = useState('region');
  const [rdsView, setRdsView] = useState('engine');
  const [lambdaView, setLambdaView] = useState('runtime');
  const [s3View, setS3View] = useState('region');
  const [elbView, setElbView] = useState('type');

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
    try {
      // Fetch stats from dedicated endpoint for accurate counts - no auth required
      const statsResponse = await axios.get(`${API_URL}/resources/stats`);
      const statsData = statsResponse.data;
      
      setStats({
        total: statsData.total,
        totalAll: statsData.total_all,
        byType: statsData.by_type,
        byRegion: statsData.by_region,
        byStatus: statsData.by_status,
        byAccount: statsData.by_account || {},
        byEnvironment: statsData.by_environment || {},
        network: statsData.network,
        typeCount: statsData.type_count,
        regionCount: statsData.region_count,
        linked: statsData.linked || { total: 0, by_type: {} }
      });
      
      // Fetch ALL resources for accurate breakdown calculations - no auth required
      const response = await axios.get(`${API_URL}/resources/?limit=5000`);
      setResources(response.data);
    } catch (error) {
      console.error('Failed to fetch resources', error);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Calculate category counts from resources
  const getCategoryCounts = () => {
    const counts = {};
    Object.keys(RESOURCE_CATEGORIES).forEach(cat => {
      counts[cat] = 0;
    });
    counts.other = 0;
    
    resources.forEach(resource => {
      const type = resource.type?.toLowerCase() || '';
      let found = false;
      for (const [cat, config] of Object.entries(RESOURCE_CATEGORIES)) {
        if (config.types.some(t => type.includes(t))) {
          counts[cat]++;
          found = true;
          break;
        }
      }
      if (!found) counts.other++;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  // Get status summary
  const getStatusSummary = () => {
    const running = Object.entries(stats.byStatus || {})
      .filter(([status]) => ['running', 'active', 'available', 'in-use'].includes(status.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);
    const stopped = Object.entries(stats.byStatus || {})
      .filter(([status]) => ['stopped', 'terminated', 'deleted'].includes(status.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);
    const pending = Object.entries(stats.byStatus || {})
      .filter(([status]) => ['pending', 'creating', 'modifying'].includes(status.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);
    return { running, stopped, pending };
  };

  const statusSummary = getStatusSummary();

  // Calculate estimated costs by resource type
  const getCostEstimates = () => {
    const costByType = {};
    
    resources.forEach(resource => {
      const type = resource.type?.toLowerCase() || 'other';
      // Find matching cost key
      let costPerUnit = 10; // default cost
      for (const [key, cost] of Object.entries(ESTIMATED_COSTS)) {
        if (type.includes(key)) {
          costPerUnit = cost;
          break;
        }
      }
      
      if (!costByType[type]) {
        costByType[type] = { count: 0, unitCost: costPerUnit, totalCost: 0 };
      }
      costByType[type].count++;
      costByType[type].totalCost = costByType[type].count * costByType[type].unitCost;
    });
    
    // Sort by total cost descending and take top 8
    const sorted = Object.entries(costByType)
      .filter(([, data]) => data.totalCost > 0)
      .sort((a, b) => b[1].totalCost - a[1].totalCost)
      .slice(0, 8);
    
    const totalEstimatedCost = sorted.reduce((sum, [, data]) => sum + data.totalCost, 0);
    const maxCost = sorted.length > 0 ? sorted[0][1].totalCost : 0;
    
    return { sorted, totalEstimatedCost, maxCost };
  };

  const costData = getCostEstimates();

  // Get resource-specific breakdowns using stats.byType for totals
  const getResourceBreakdowns = () => {
    const breakdowns = {
      ec2: { byRegion: {}, byStatus: {}, byType: {}, byAccount: {}, total: 0 },
      rds: { byRegion: {}, byEngine: {}, byStatus: {}, byAccount: {}, total: 0 },
      s3: { byRegion: {}, byAccount: {}, byStatus: {}, total: 0 },
      lambda: { byRegion: {}, byRuntime: {}, byAccount: {}, byStatus: {}, total: 0 },
      vpc: { byRegion: {}, total: 0 },
      elb: { byRegion: {}, byType: {}, byAccount: {}, byStatus: {}, total: 0 }
    };

    // Use stats.byType to get accurate totals for each resource type
    // This ensures we match the exact type names from the backend
    const typeKeys = Object.keys(stats.byType || {});
    
    // Find EC2 count from stats
    typeKeys.forEach(typeKey => {
      const lowerKey = typeKey.toLowerCase();
      if (lowerKey === 'ec2' || lowerKey === 'instance' || lowerKey.includes('ec2')) {
        breakdowns.ec2.total += stats.byType[typeKey];
      }
      if (lowerKey === 'rds' || lowerKey.includes('rds') || lowerKey === 'db' || lowerKey.includes('aurora')) {
        breakdowns.rds.total += stats.byType[typeKey];
      }
      if (lowerKey === 's3' || lowerKey.includes('s3') || lowerKey === 'bucket') {
        breakdowns.s3.total += stats.byType[typeKey];
      }
      if (lowerKey === 'lambda' || lowerKey.includes('lambda') || lowerKey === 'function') {
        breakdowns.lambda.total += stats.byType[typeKey];
      }
      if (lowerKey === 'vpc' || lowerKey.includes('vpc')) {
        breakdowns.vpc.total += stats.byType[typeKey];
      }
      if (lowerKey === 'elb' || lowerKey === 'alb' || lowerKey === 'nlb' || lowerKey.includes('loadbalancer')) {
        breakdowns.elb.total += stats.byType[typeKey];
      }
    });

    // Now calculate breakdowns from resources array
    resources.forEach(resource => {
      const type = resource.type?.toLowerCase() || '';
      const region = resource.region || 'unknown';
      const status = resource.status?.toLowerCase() || 'unknown';
      const account = resource.account_id || 'unknown';

      // EC2 instances - match various EC2-related type names
      const isEC2 = type === 'ec2' || type === 'instance' || type === 'ec2_instance' || 
                    type.includes('ec2') || type.startsWith('i-') ||
                    (resource.resource_id && resource.resource_id.startsWith('i-'));
      if (isEC2) {
        // Don't increment total here - already counted from stats.byType
        breakdowns.ec2.byRegion[region] = (breakdowns.ec2.byRegion[region] || 0) + 1;
        breakdowns.ec2.byStatus[status] = (breakdowns.ec2.byStatus[status] || 0) + 1;
        breakdowns.ec2.byAccount[account] = (breakdowns.ec2.byAccount[account] || 0) + 1;
        const instanceType = resource.instance_type || resource.type_specific_properties?.instance_type || 'unknown';
        breakdowns.ec2.byType[instanceType] = (breakdowns.ec2.byType[instanceType] || 0) + 1;
      }
      
      // RDS databases - match various RDS-related type names
      const isRDS = type === 'rds' || type === 'db' || type === 'database' || type === 'rds_instance' ||
                    type.includes('rds') || type.includes('aurora') || type.includes('mysql') || 
                    type.includes('postgres') || type.includes('mariadb') || type.includes('oracle') ||
                    type.includes('sqlserver') || type.includes('db_instance');
      if (isRDS) {
        breakdowns.rds.byRegion[region] = (breakdowns.rds.byRegion[region] || 0) + 1;
        breakdowns.rds.byStatus[status] = (breakdowns.rds.byStatus[status] || 0) + 1;
        breakdowns.rds.byAccount[account] = (breakdowns.rds.byAccount[account] || 0) + 1;
        const engine = resource.type_specific_properties?.engine || resource.engine || type;
        breakdowns.rds.byEngine[engine] = (breakdowns.rds.byEngine[engine] || 0) + 1;
      }
      
      // S3 buckets
      const isS3 = type === 's3' || type === 'bucket' || type === 's3_bucket' || type.includes('s3');
      if (isS3) {
        breakdowns.s3.byRegion[region] = (breakdowns.s3.byRegion[region] || 0) + 1;
        breakdowns.s3.byAccount[account] = (breakdowns.s3.byAccount[account] || 0) + 1;
        breakdowns.s3.byStatus[status] = (breakdowns.s3.byStatus[status] || 0) + 1;
      }
      
      // Lambda functions
      const isLambda = type === 'lambda' || type === 'function' || type === 'lambda_function' || type.includes('lambda');
      if (isLambda) {
        breakdowns.lambda.byRegion[region] = (breakdowns.lambda.byRegion[region] || 0) + 1;
        breakdowns.lambda.byAccount[account] = (breakdowns.lambda.byAccount[account] || 0) + 1;
        breakdowns.lambda.byStatus[status] = (breakdowns.lambda.byStatus[status] || 0) + 1;
        const runtime = resource.type_specific_properties?.runtime || resource.runtime || 'unknown';
        breakdowns.lambda.byRuntime[runtime] = (breakdowns.lambda.byRuntime[runtime] || 0) + 1;
      }
      
      // VPCs
      const isVPC = type === 'vpc' || type.includes('vpc');
      if (isVPC) {
        breakdowns.vpc.byRegion[region] = (breakdowns.vpc.byRegion[region] || 0) + 1;
      }
      
      // Load Balancers
      const isELB = type === 'elb' || type === 'alb' || type === 'nlb' || type === 'clb' ||
                    type.includes('elb') || type.includes('loadbalancer') || type.includes('load_balancer') ||
                    type.includes('elasticloadbalancing');
      if (isELB) {
        breakdowns.elb.byRegion[region] = (breakdowns.elb.byRegion[region] || 0) + 1;
        breakdowns.elb.byAccount[account] = (breakdowns.elb.byAccount[account] || 0) + 1;
        breakdowns.elb.byStatus[status] = (breakdowns.elb.byStatus[status] || 0) + 1;
        const lbType = type.includes('alb') || type === 'alb' ? 'ALB' : 
                       type.includes('nlb') || type === 'nlb' ? 'NLB' : 'CLB';
        breakdowns.elb.byType[lbType] = (breakdowns.elb.byType[lbType] || 0) + 1;
      }
    });

    return breakdowns;
  };

  const resourceBreakdowns = getResourceBreakdowns();

  // Horizontal Bar Chart - Better for reading labels and comparing values
  const HorizontalBarChart = ({ data, title, onBarClick, maxBars = 6, colorScheme = 'blue' }) => {
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxBars);
    const max = sorted.length > 0 ? Math.max(...sorted.map(([, v]) => v)) : 0;
    const total = sorted.reduce((sum, [, v]) => sum + v, 0);
    
    if (sorted.length === 0 || total === 0) {
      return (
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
          No data available
        </div>
      );
    }

    // Distinct color schemes for different chart types
    const schemes = {
      blue: ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
      green: ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80'],
      purple: ['#581c87', '#6b21a8', '#7e22ce', '#9333ea', '#a855f7', '#c084fc'],
      orange: ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c'],
      teal: ['#134e4a', '#115e59', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf'],
      pink: ['#831843', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6'],
      indigo: ['#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#818cf8'],
      multi: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']
    };
    
    const colors = schemes[colorScheme] || schemes.blue;
    
    return (
      <div className="w-full">
        {title && <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">{title}</p>}
        <div className="space-y-2">
          {sorted.map(([label, value], index) => {
            const percentage = max > 0 ? (value / max) * 100 : 0;
            const sharePercent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return (
              <div 
                key={label} 
                className="group cursor-pointer"
                onClick={() => onBarClick && onBarClick(label, value)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]" title={label}>
                    {label}
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {value.toLocaleString()} <span className="text-gray-400 font-normal">({sharePercent}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{ 
                      width: `${Math.max(percentage, 2)}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Total: <span className="font-bold text-gray-800">{total.toLocaleString()}</span></span>
          <span className="text-xs text-gray-400">{sorted.length} of {Object.keys(data).length}</span>
        </div>
      </div>
    );
  };

  // Compact Stat Cards for quick metrics
  const StatCard = ({ label, value, color, icon: Icon, onClick }) => (
    <div 
      className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-all ${color}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        {Icon && <Icon className="w-6 h-6 opacity-50" />}
      </div>
    </div>
  );

  // Donut Chart Component for proportional data
  const DonutChart = ({ data, colors, size = 120, onSegmentClick }) => {
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const total = sorted.reduce((sum, [, v]) => sum + v, 0);
    
    if (total === 0) {
      return (
        <div className="flex items-center justify-center" style={{ width: size, height: size }}>
          <span className="text-gray-400 text-xs">No data</span>
        </div>
      );
    }

    const colorPalette = colors || [
      '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#f59e0b'
    ];

    let currentAngle = 0;
    const segments = sorted.map(([label, value], index) => {
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { label, value, percentage, startAngle, angle, color: colorPalette[index % colorPalette.length] };
    });

    const radius = size / 2;
    const innerRadius = radius * 0.6;

    return (
      <div className="flex items-center gap-4">
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((seg, i) => {
            const startRad = (seg.startAngle * Math.PI) / 180;
            const endRad = ((seg.startAngle + seg.angle) * Math.PI) / 180;
            const largeArc = seg.angle > 180 ? 1 : 0;
            
            const x1 = radius + radius * Math.cos(startRad);
            const y1 = radius + radius * Math.sin(startRad);
            const x2 = radius + radius * Math.cos(endRad);
            const y2 = radius + radius * Math.sin(endRad);
            const x3 = radius + innerRadius * Math.cos(endRad);
            const y3 = radius + innerRadius * Math.sin(endRad);
            const x4 = radius + innerRadius * Math.cos(startRad);
            const y4 = radius + innerRadius * Math.sin(startRad);

            const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;

            return (
              <path
                key={i}
                d={path}
                fill={seg.color}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onSegmentClick && onSegmentClick(seg.label, seg.value)}
              >
                <title>{seg.label}: {seg.value} ({seg.percentage.toFixed(1)}%)</title>
              </path>
            );
          })}
          {/* Center text */}
          <text x={radius} y={radius} textAnchor="middle" dominantBaseline="middle" className="transform rotate-90 origin-center" style={{ transformOrigin: `${radius}px ${radius}px` }}>
            <tspan x={radius} dy="-0.3em" className="text-lg font-bold fill-gray-800">{total}</tspan>
            <tspan x={radius} dy="1.2em" className="text-xs fill-gray-500">total</tspan>
          </text>
        </svg>
        {/* Legend */}
        <div className="flex flex-col gap-1">
          {segments.map((seg, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 rounded text-xs"
              onClick={() => onSegmentClick && onSegmentClick(seg.label, seg.value)}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-gray-600 truncate max-w-20" title={seg.label}>{seg.label}</span>
              <span className="font-semibold text-gray-800">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Horizontal Stacked Bar for comparison
  const StackedBar = ({ data, colors, height = 24 }) => {
    const total = Object.values(data).reduce((sum, v) => sum + v, 0);
    if (total === 0) return null;

    const colorPalette = colors || ['#22c55e', '#ef4444', '#f59e0b', '#6b7280'];
    const entries = Object.entries(data);

    return (
      <div className="w-full">
        <div className="flex rounded-lg overflow-hidden" style={{ height: `${height}px` }}>
          {entries.map(([label, value], index) => {
            const width = (value / total) * 100;
            if (width === 0) return null;
            return (
              <div
                key={label}
                className="flex items-center justify-center text-white text-xs font-semibold transition-all hover:opacity-80"
                style={{ width: `${width}%`, backgroundColor: colorPalette[index % colorPalette.length] }}
                title={`${label}: ${value} (${width.toFixed(1)}%)`}
              >
                {width > 10 && value}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          {entries.map(([label, value], index) => (
            <div key={label} className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorPalette[index % colorPalette.length] }} />
              <span className="text-gray-600">{label}: {value}</span>
            </div>
          ))}
        </div>
      </div>
    );
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
                onClick={() => navigate('/import')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Import</span>
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

      {/* Main Content - Full Width */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Summary Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t('welcomeBack')}, {user?.username}!</h2>
                <p className="text-gray-500 text-xs">AWS Infrastructure Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center px-4 border-r border-gray-200">
                <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
                <p className="text-xs text-gray-500">Resources</p>
              </div>
              <div className="text-center px-4 border-r border-gray-200">
                <p className="text-2xl font-bold text-green-600">{statusSummary.running}</p>
                <p className="text-xs text-gray-500">Running</p>
              </div>
              <div className="text-center px-4 border-r border-gray-200">
                <p className="text-2xl font-bold text-red-600">{statusSummary.stopped}</p>
                <p className="text-xs text-gray-500">Stopped</p>
              </div>
              <div className="text-center px-4 border-r border-gray-200">
                <p className="text-2xl font-bold text-blue-600">{Object.keys(stats.byRegion || {}).length}</p>
                <p className="text-xs text-gray-500">Regions</p>
              </div>
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-purple-600">{Object.keys(stats.byAccount || {}).length}</p>
                <p className="text-xs text-gray-500">Accounts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics - Combined Resources Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Large Resource Distribution Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Resource Distribution</h3>
                  <p className="text-xs text-gray-500">Overview of all {stats.total} resources</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/resources')} 
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View All →
              </button>
            </div>
            {/* View Selector Tabs */}
            <div className="flex gap-2 mb-4 border-b pb-2">
              {[
                { key: 'type', label: 'By Type', icon: Layers },
                { key: 'region', label: 'By Region', icon: MapPin },
                { key: 'account', label: 'By Account', icon: Shield }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMainView(key)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    mainView === key 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <HorizontalBarChart 
              data={
                mainView === 'type' ? stats.byType || {} :
                mainView === 'region' ? stats.byRegion || {} :
                stats.byAccount || {}
              }
              maxBars={8}
              colorScheme={mainView === 'type' ? 'indigo' : mainView === 'region' ? 'teal' : 'purple'}
              onBarClick={(val) => navigate(`/resources?${mainView}=${encodeURIComponent(val)}`)}
            />
          </div>

          {/* Status & Environment Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Status & Environment</h3>
                <p className="text-xs text-gray-500">Health and deployment overview</p>
              </div>
            </div>
            
            {/* Status Summary */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Status</p>
              <div className="flex items-center justify-center mb-2">
                <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
                <span className="text-sm text-gray-500 ml-2">total</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs mb-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> active: {statusSummary.running}</span>
              </div>
              <StackedBar 
                data={{ Running: statusSummary.running, Stopped: statusSummary.stopped, Pending: statusSummary.pending }}
                colors={['#22c55e', '#ef4444', '#f59e0b']}
                height={28}
              />
            </div>

            {/* Environment Donut */}
            <div className="pt-4 border-t">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-3">By Environment</p>
              <div className="flex justify-center">
                <DonutChart 
                  data={stats.byEnvironment || {}}
                  size={120}
                  colors={['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4', '#6b7280']}
                  onSegmentClick={(env) => navigate(`/resources?environment=${encodeURIComponent(env)}`)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account Distribution - Full Width */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Multi-Account Overview</h3>
                <p className="text-xs text-gray-500">{Object.keys(stats.byAccount || {}).length} AWS accounts</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <DonutChart 
              data={stats.byAccount || {}}
              size={160}
              colors={['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']}
              onSegmentClick={(account) => navigate(`/resources?account=${encodeURIComponent(account)}`)}
            />
          </div>
        </div>

        {/* Resource-Specific Deep Dive with View Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* EC2 Instances */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Server className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">EC2 Instances</h3>
                  <p className="text-xs text-gray-500">{resourceBreakdowns.ec2.total} instances</p>
                </div>
              </div>
              <button onClick={() => navigate('/resources?type=ec2')} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">View →</button>
            </div>
            {/* View Selector Tabs */}
            <div className="flex gap-1 mb-3 border-b">
              {['region', 'type', 'account', 'status'].map(view => (
                <button
                  key={view}
                  onClick={() => setEc2View(view)}
                  className={`px-2 py-1 text-xs font-medium rounded-t transition-colors ${
                    ec2View === view 
                      ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <HorizontalBarChart 
              data={
                ec2View === 'region' ? resourceBreakdowns.ec2.byRegion :
                ec2View === 'type' ? resourceBreakdowns.ec2.byType :
                ec2View === 'account' ? resourceBreakdowns.ec2.byAccount :
                resourceBreakdowns.ec2.byStatus
              }
              maxBars={5}
              colorScheme="orange"
              onBarClick={(val) => navigate(`/resources?type=ec2&${ec2View}=${encodeURIComponent(val)}`)}
            />
          </div>

          {/* RDS Databases */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">RDS Databases</h3>
                  <p className="text-xs text-gray-500">{resourceBreakdowns.rds.total} databases</p>
                </div>
              </div>
              <button onClick={() => navigate('/resources?type=rds')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">View →</button>
            </div>
            {/* View Selector Tabs */}
            <div className="flex gap-1 mb-3 border-b">
              {['engine', 'region', 'account', 'status'].map(view => (
                <button
                  key={view}
                  onClick={() => setRdsView(view)}
                  className={`px-2 py-1 text-xs font-medium rounded-t transition-colors ${
                    rdsView === view 
                      ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <HorizontalBarChart 
              data={
                rdsView === 'engine' ? resourceBreakdowns.rds.byEngine :
                rdsView === 'region' ? resourceBreakdowns.rds.byRegion :
                rdsView === 'account' ? resourceBreakdowns.rds.byAccount :
                resourceBreakdowns.rds.byStatus
              }
              maxBars={5}
              colorScheme="blue"
              onBarClick={(val) => navigate(`/resources?type=rds`)}
            />
          </div>

          {/* Lambda Functions */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Lambda Functions</h3>
                  <p className="text-xs text-gray-500">{resourceBreakdowns.lambda.total} functions</p>
                </div>
              </div>
              <button onClick={() => navigate('/resources?type=lambda')} className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">View →</button>
            </div>
            {/* View Selector Tabs */}
            <div className="flex gap-1 mb-3 border-b">
              {['runtime', 'region', 'account'].map(view => (
                <button
                  key={view}
                  onClick={() => setLambdaView(view)}
                  className={`px-2 py-1 text-xs font-medium rounded-t transition-colors ${
                    lambdaView === view 
                      ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <HorizontalBarChart 
              data={
                lambdaView === 'runtime' ? resourceBreakdowns.lambda.byRuntime :
                lambdaView === 'region' ? resourceBreakdowns.lambda.byRegion :
                resourceBreakdowns.lambda.byAccount
              }
              maxBars={5}
              colorScheme="purple"
              onBarClick={(val) => navigate(`/resources?type=lambda`)}
            />
          </div>
        </div>

        {/* Additional Resources Row - S3, VPC, Load Balancers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* S3 Buckets with Tabs */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">S3 Buckets</h3>
                  <p className="text-xs text-gray-500">{resourceBreakdowns.s3.total} buckets</p>
                </div>
              </div>
              <button onClick={() => navigate('/resources?type=s3')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">View →</button>
            </div>
            {/* View Selector Tabs */}
            <div className="flex gap-1 mb-3 border-b">
              {['region', 'account', 'status'].map(view => (
                <button
                  key={view}
                  onClick={() => setS3View(view)}
                  className={`px-2 py-1 text-xs font-medium rounded-t transition-colors ${
                    s3View === view 
                      ? 'bg-green-100 text-green-700 border-b-2 border-green-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <HorizontalBarChart 
              data={
                s3View === 'region' ? resourceBreakdowns.s3.byRegion :
                s3View === 'account' ? resourceBreakdowns.s3.byAccount :
                resourceBreakdowns.s3.byStatus
              }
              maxBars={5}
              colorScheme="green"
              onBarClick={(val) => navigate(`/resources?type=s3&${s3View}=${encodeURIComponent(val)}`)}
            />
          </div>

          {/* VPCs & Network */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Network className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Network Infrastructure</h3>
                  <p className="text-xs text-gray-500">{resourceBreakdowns.vpc.total} VPCs</p>
                </div>
              </div>
              <button onClick={() => navigate('/resources?category=network')} className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700">View →</button>
            </div>
            <HorizontalBarChart 
              data={{
                'VPCs': stats.network?.vpcs || 0,
                'Subnets': stats.network?.subnets || 0,
                'Security Groups': stats.network?.security_groups || 0,
                'Availability Zones': stats.network?.availability_zones || 0
              }}
              maxBars={4}
              colorScheme="teal"
              onBarClick={() => navigate('/resources?category=network')}
            />
          </div>

          {/* Load Balancers with Tabs */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Load Balancers</h3>
                  <p className="text-xs text-gray-500">{resourceBreakdowns.elb.total} balancers</p>
                </div>
              </div>
              <button onClick={() => navigate('/resources?type=elb')} className="px-2 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700">View →</button>
            </div>
            {/* View Selector Tabs */}
            <div className="flex gap-1 mb-3 border-b">
              {['type', 'region', 'account', 'status'].map(view => (
                <button
                  key={view}
                  onClick={() => setElbView(view)}
                  className={`px-2 py-1 text-xs font-medium rounded-t transition-colors ${
                    elbView === view 
                      ? 'bg-pink-100 text-pink-700 border-b-2 border-pink-500' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <HorizontalBarChart 
              data={
                elbView === 'type' ? resourceBreakdowns.elb.byType :
                elbView === 'region' ? resourceBreakdowns.elb.byRegion :
                elbView === 'account' ? resourceBreakdowns.elb.byAccount :
                resourceBreakdowns.elb.byStatus
              }
              maxBars={5}
              colorScheme="pink"
              onBarClick={(val) => navigate(`/resources?type=elb`)}
            />
          </div>
        </div>

        {/* Cost Estimation - At Bottom */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Estimated Monthly Cost
            </h3>
            <div className="px-3 py-1 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Total: </span>
              <span className="text-lg font-bold text-green-600">${costData.totalEstimatedCost.toLocaleString()}</span>
              <span className="text-xs text-gray-500">/mo</span>
            </div>
          </div>
          
          {costData.sorted.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {costData.sorted.map(([type, data], index) => {
                const colors = ['bg-red-100 text-red-800', 'bg-orange-100 text-orange-800', 'bg-amber-100 text-amber-800', 'bg-yellow-100 text-yellow-800', 'bg-lime-100 text-lime-800', 'bg-green-100 text-green-800', 'bg-teal-100 text-teal-800', 'bg-cyan-100 text-cyan-800'];
                return (
                  <div 
                    key={type} 
                    className={`p-2 rounded-lg ${colors[index]} cursor-pointer hover:shadow-md transition-all text-center`}
                    onClick={() => navigate(`/resources?type=${encodeURIComponent(type)}`)}
                  >
                    <p className="text-xs font-semibold uppercase truncate">{type}</p>
                    <p className="text-lg font-bold">${data.totalCost}</p>
                    <p className="text-xs opacity-75">{data.count} × ${data.unitCost}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">Import resources to see cost estimates</p>
          )}
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Estimates based on typical AWS pricing. Actual costs vary.
          </p>
        </div>

        {/* Quick Actions - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow flex items-center gap-3" onClick={() => navigate('/resources')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Manage Resources</h3>
              <p className="text-xs text-gray-600">Add, edit, organize</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200 cursor-pointer hover:shadow-lg transition-shadow flex items-center gap-3" onClick={() => navigate('/architecture')}>
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Architecture Diagram</h3>
              <p className="text-xs text-gray-600">Visualize topology</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 cursor-pointer hover:shadow-lg transition-shadow flex items-center gap-3" onClick={() => navigate('/ai-insights')}>
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
              <p className="text-xs text-gray-600">Get recommendations</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
