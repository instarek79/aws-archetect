import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Shield, Cloud, Database, Server, HardDrive, 
  Network, Globe, Lock, Activity, Layers, Box,
  ChevronRight, ChevronDown, RefreshCw, Download, Filter, Eye,
  BarChart3, PieChart, TrendingUp, AlertTriangle, ArrowRight,
  Zap, Monitor, ShieldCheck, Radio, Cpu, ExternalLink
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import NavBar from '../components/NavBar';
import { AWSIcon, getServiceColor } from '../components/AWSIcons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8805';

// AWS Service Colors (official AWS colors)
const AWS_COLORS = {
  // Compute - Orange
  ec2: { bg: '#FF9900', light: '#FFF4E5', border: '#ED8936' },
  lambda: { bg: '#FF9900', light: '#FFF4E5', border: '#ED8936' },
  ecs: { bg: '#FF9900', light: '#FFF4E5', border: '#ED8936' },
  eks: { bg: '#FF9900', light: '#FFF4E5', border: '#ED8936' },
  
  // Storage - Green
  s3: { bg: '#3F8624', light: '#E6F4E1', border: '#38A169' },
  ebs: { bg: '#3F8624', light: '#E6F4E1', border: '#38A169' },
  efs: { bg: '#3F8624', light: '#E6F4E1', border: '#38A169' },
  
  // Database - Blue
  rds: { bg: '#3B48CC', light: '#E8EAF6', border: '#5C6BC0' },
  dynamodb: { bg: '#3B48CC', light: '#E8EAF6', border: '#5C6BC0' },
  elasticache: { bg: '#3B48CC', light: '#E8EAF6', border: '#5C6BC0' },
  
  // Networking - Purple
  vpc: { bg: '#8C4FFF', light: '#F3E8FF', border: '#9F7AEA' },
  elb: { bg: '#8C4FFF', light: '#F3E8FF', border: '#9F7AEA' },
  alb: { bg: '#8C4FFF', light: '#F3E8FF', border: '#9F7AEA' },
  cloudfront: { bg: '#8C4FFF', light: '#F3E8FF', border: '#9F7AEA' },
  route53: { bg: '#8C4FFF', light: '#F3E8FF', border: '#9F7AEA' },
  apigateway: { bg: '#8C4FFF', light: '#F3E8FF', border: '#9F7AEA' },
  
  // Security - Red
  waf: { bg: '#DD344C', light: '#FEE2E2', border: '#F56565' },
  shield: { bg: '#DD344C', light: '#FEE2E2', border: '#F56565' },
  iam: { bg: '#DD344C', light: '#FEE2E2', border: '#F56565' },
  guardduty: { bg: '#DD344C', light: '#FEE2E2', border: '#F56565' },
  
  // DevOps - Cyan
  codepipeline: { bg: '#00A1C9', light: '#E0F7FA', border: '#00ACC1' },
  codebuild: { bg: '#00A1C9', light: '#E0F7FA', border: '#00ACC1' },
  codecommit: { bg: '#00A1C9', light: '#E0F7FA', border: '#00ACC1' },
  
  // Monitoring - Pink
  cloudwatch: { bg: '#E7157B', light: '#FCE4EC', border: '#EC407A' },
  cloudtrail: { bg: '#E7157B', light: '#FCE4EC', border: '#EC407A' },
  
  // Messaging - Pink/Orange
  sns: { bg: '#FF4F8B', light: '#FFE4EC', border: '#F687B3' },
  sqs: { bg: '#FF4F8B', light: '#FFE4EC', border: '#F687B3' },
  eventbridge: { bg: '#FF4F8B', light: '#FFE4EC', border: '#F687B3' },
  
  // Default
  default: { bg: '#7D8998', light: '#F1F5F9', border: '#94A3B8' }
};

// Get color for service type
const getAWSColor = (type) => {
  const lowerType = (type || '').toLowerCase();
  for (const [key, colors] of Object.entries(AWS_COLORS)) {
    if (lowerType.includes(key)) return colors;
  }
  return AWS_COLORS.default;
};

// Service category mapping
const SERVICE_CATEGORIES = {
  compute: ['ec2', 'lambda', 'ecs', 'eks', 'fargate', 'batch'],
  storage: ['s3', 'ebs', 'efs', 'fsx', 'glacier'],
  database: ['rds', 'dynamodb', 'elasticache', 'redshift', 'neptune'],
  networking: ['vpc', 'elb', 'alb', 'nlb', 'cloudfront', 'route53', 'apigateway', 'nat', 'igw'],
  security: ['iam', 'waf', 'shield', 'guardduty', 'inspector', 'securityhub', 'kms'],
  devops: ['codepipeline', 'codebuild', 'codecommit', 'codedeploy', 'cloudformation'],
  monitoring: ['cloudwatch', 'cloudtrail', 'config', 'xray'],
  messaging: ['sqs', 'sns', 'eventbridge', 'mq', 'kinesis']
};

// Category colors for sections
const CATEGORY_SECTION_COLORS = {
  compute: { border: '#FF9900', bg: '#FFFBF5', header: '#FF9900' },
  storage: { border: '#3F8624', bg: '#F6FBF4', header: '#3F8624' },
  database: { border: '#3B48CC', bg: '#F5F6FC', header: '#3B48CC' },
  networking: { border: '#8C4FFF', bg: '#FAF5FF', header: '#8C4FFF' },
  security: { border: '#DD344C', bg: '#FEF5F5', header: '#DD344C' },
  devops: { border: '#00A1C9', bg: '#F0FCFF', header: '#00A1C9' },
  monitoring: { border: '#E7157B', bg: '#FDF2F8', header: '#E7157B' },
  messaging: { border: '#FF4F8B', bg: '#FFF5F8', header: '#FF4F8B' }
};

function ManagementView() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewMode, setViewMode] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resourcesRes, relationshipsRes] = await Promise.all([
        axios.get(`${API_URL}/api/resources`, { headers }),
        axios.get(`${API_URL}/api/relationships`, { headers })
      ]);
      
      setResources(resourcesRes.data);
      setRelationships(relationshipsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get category for a resource type
  const getCategory = (type) => {
    const lowerType = (type || '').toLowerCase();
    for (const [category, types] of Object.entries(SERVICE_CATEGORIES)) {
      if (types.some(t => lowerType.includes(t))) {
        return category;
      }
    }
    return 'other';
  };

  // Compute statistics
  const stats = useMemo(() => {
    const accounts = [...new Set(resources.map(r => r.account_id).filter(Boolean))];
    const regions = [...new Set(resources.map(r => r.region).filter(Boolean))];
    // Count unique VPC IDs from vpc_id field
    const vpcIds = [...new Set(resources.map(r => r.vpc_id).filter(Boolean))];
    // Also count VPC type resources
    const vpcResources = resources.filter(r => (r.type || '').toLowerCase().includes('vpc'));
    const types = [...new Set(resources.map(r => r.type).filter(Boolean))];
    
    const byType = {};
    resources.forEach(r => {
      const type = (r.type || 'unknown').toLowerCase();
      byType[type] = (byType[type] || 0) + 1;
    });
    
    const byCategory = {};
    resources.forEach(r => {
      const category = getCategory(r.type);
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    
    const byAccount = {};
    resources.forEach(r => {
      const account = r.account_id || 'unknown';
      if (!byAccount[account]) {
        byAccount[account] = { total: 0, byType: {}, byCategory: {}, vpcs: new Set() };
      }
      byAccount[account].total++;
      if (r.vpc_id) byAccount[account].vpcs.add(r.vpc_id);
      const type = (r.type || 'unknown').toLowerCase();
      byAccount[account].byType[type] = (byAccount[account].byType[type] || 0) + 1;
      const category = getCategory(r.type);
      byAccount[account].byCategory[category] = (byAccount[account].byCategory[category] || 0) + 1;
    });
    
    // Convert VPC sets to counts
    Object.values(byAccount).forEach(acc => {
      acc.vpcCount = acc.vpcs.size;
      delete acc.vpcs;
    });
    
    // Main component counts for summary table
    const mainComponents = {
      ec2: Object.entries(byType).filter(([k]) => k.includes('ec2')).reduce((s, [, v]) => s + v, 0),
      rds: Object.entries(byType).filter(([k]) => k.includes('rds') || k.includes('aurora')).reduce((s, [, v]) => s + v, 0),
      mq: Object.entries(byType).filter(([k]) => k.includes('mq') || k.includes('sqs') || k.includes('sns') || k.includes('eventbridge')).reduce((s, [, v]) => s + v, 0),
      s3: Object.entries(byType).filter(([k]) => k.includes('s3')).reduce((s, [, v]) => s + v, 0),
      pipelines: Object.entries(byType).filter(([k]) => k.includes('codepipeline') || k.includes('codebuild') || k.includes('codecommit') || k.includes('codedeploy')).reduce((s, [, v]) => s + v, 0),
      lambda: Object.entries(byType).filter(([k]) => k.includes('lambda')).reduce((s, [, v]) => s + v, 0),
      elb: Object.entries(byType).filter(([k]) => k.includes('elb') || k.includes('alb') || k.includes('nlb') || k.includes('loadbalancer')).reduce((s, [, v]) => s + v, 0),
      vpc: vpcResources.length || vpcIds.length,
      cloudfront: Object.entries(byType).filter(([k]) => k.includes('cloudfront')).reduce((s, [, v]) => s + v, 0),
      route53: Object.entries(byType).filter(([k]) => k.includes('route53')).reduce((s, [, v]) => s + v, 0),
      waf: Object.entries(byType).filter(([k]) => k.includes('waf')).reduce((s, [, v]) => s + v, 0),
      ecs: Object.entries(byType).filter(([k]) => k.includes('ecs') || k.includes('eks')).reduce((s, [, v]) => s + v, 0),
      dynamodb: Object.entries(byType).filter(([k]) => k.includes('dynamo')).reduce((s, [, v]) => s + v, 0),
      cloudwatch: Object.entries(byType).filter(([k]) => k.includes('cloudwatch') || k.includes('cloudtrail')).reduce((s, [, v]) => s + v, 0),
    };
    
    return { 
      total: resources.length, 
      accounts, 
      regions, 
      vpcs: vpcIds,
      vpcCount: vpcResources.length || vpcIds.length,
      types, 
      byType, 
      byCategory, 
      byAccount, 
      relationships: relationships.length,
      mainComponents
    };
  }, [resources, relationships]);

  // Enhanced AWS-style Service Icon with count badge - LARGER SIZES
  const AWSServiceIcon = ({ type, count, size = 'md', label, onClick, className = '' }) => {
    const colors = getAWSColor(type);
    const sizes = {
      xs: { box: 'w-12 h-12', icon: 24, badge: 'w-6 h-6 text-[10px]', label: 'text-[10px]' },
      sm: { box: 'w-16 h-16', icon: 36, badge: 'w-7 h-7 text-xs', label: 'text-xs' },
      md: { box: 'w-20 h-20', icon: 44, badge: 'w-8 h-8 text-sm', label: 'text-sm' },
      lg: { box: 'w-24 h-24', icon: 52, badge: 'w-9 h-9 text-sm', label: 'text-sm' },
      xl: { box: 'w-24 h-24', icon: 48, badge: 'w-9 h-9 text-sm', label: 'text-sm' }
    };
    const s = sizes[size];
    
    return (
      <div 
        className={`flex flex-col items-center gap-1.5 ${onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${className}`}
        onClick={onClick}
      >
        <div 
          className={`${s.box} rounded-xl flex items-center justify-center relative shadow-lg hover:shadow-xl transition-shadow`}
          style={{ 
            backgroundColor: colors.light, 
            border: `3px solid ${colors.border}`,
            boxShadow: `0 4px 14px ${colors.bg}30`
          }}
        >
          <AWSIcon type={type} size={s.icon} />
          {count > 0 && (
            <div 
              className={`absolute -bottom-2 -right-2 ${s.badge} rounded-full flex items-center justify-center font-bold text-white shadow-md`}
              style={{ backgroundColor: colors.bg }}
            >
              {count}
            </div>
          )}
        </div>
        {label !== false && (
          <span className={`${s.label} font-semibold text-gray-700 text-center max-w-[90px] leading-tight`}>
            {label || type?.toUpperCase() || 'Unknown'}
          </span>
        )}
      </div>
    );
  };

  // Connection Arrow Component
  const ConnectionArrow = ({ direction = 'right', label, dashed = false, color = '#94A3B8' }) => {
    const isVertical = direction === 'down' || direction === 'up';
    
    if (isVertical) {
      return (
        <div className="flex flex-col items-center py-2">
          <div 
            className={`w-0.5 h-8 ${dashed ? 'border-l-2 border-dashed' : ''}`}
            style={{ backgroundColor: dashed ? 'transparent' : color, borderColor: color }}
          />
          <div 
            className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
            style={{ borderTopColor: color }}
          />
          {label && <span className="text-[10px] text-gray-500 mt-1">{label}</span>}
        </div>
      );
    }
    
    return (
      <div className="flex items-center px-2">
        <div 
          className={`h-0.5 w-8 ${dashed ? 'border-t-2 border-dashed' : ''}`}
          style={{ backgroundColor: dashed ? 'transparent' : color, borderColor: color }}
        />
        <div 
          className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent"
          style={{ borderLeftColor: color }}
        />
        {label && <span className="text-[10px] text-gray-500 ml-1">{label}</span>}
      </div>
    );
  };

  // Bidirectional Arrow
  const BiArrow = ({ color = '#94A3B8' }) => (
    <div className="flex items-center px-1">
      <div 
        className="w-0 h-0 border-t-[5px] border-b-[5px] border-r-[7px] border-t-transparent border-b-transparent"
        style={{ borderRightColor: color }}
      />
      <div className="h-0.5 w-6" style={{ backgroundColor: color }} />
      <div 
        className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[7px] border-t-transparent border-b-transparent"
        style={{ borderLeftColor: color }}
      />
    </div>
  );

  // Section Container Component
  const SectionContainer = ({ title, icon: Icon, color, children, className = '', dashed = false }) => (
    <div 
      className={`rounded-xl p-4 ${className}`}
      style={{ 
        backgroundColor: color?.bg || '#F8FAFC',
        border: `2px ${dashed ? 'dashed' : 'solid'} ${color?.border || '#E2E8F0'}`
      }}
    >
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon className="w-4 h-4" style={{ color: color?.header || '#64748B' }} />}
          <span className="text-sm font-bold" style={{ color: color?.header || '#64748B' }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );

  // Enhanced Architecture Diagram
  const ArchitectureDiagram = ({ accountId }) => {
    // Use mainComponents from stats for accurate counts
    const mc = stats.mainComponents;
    
    const vpcCount = mc.vpc || stats.vpcCount || 0;
    const ec2Count = mc.ec2 || 0;
    const rdsCount = mc.rds || 0;
    const s3Count = mc.s3 || 0;
    const lambdaCount = mc.lambda || 0;
    const elbCount = mc.elb || 0;
    const cloudfrontCount = mc.cloudfront || 0;
    const route53Count = mc.route53 || 0;
    const wafCount = mc.waf || 0;
    const snsCount = mc.mq || 0; // MQ includes SNS/SQS
    const sqsCount = 0; // Already counted in mq
    const dynamoCount = mc.dynamodb || 0;
    const ecsCount = mc.ecs || 0;
    const apiGwCount = 0;
    const codepipelineCount = mc.pipelines || 0;
    const cloudwatchCount = mc.cloudwatch || 0;
    
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <Layers className="w-6 h-6 text-orange-400" />
            Architecture Overview
            {accountId && <span className="text-sm font-normal text-white/70">(...{accountId.slice(-8)})</span>}
          </h3>
          <button
            onClick={() => navigate('/architecture')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Full Diagram
          </button>
        </div>
        
        <div className="p-6">
          {/* AWS Region Container */}
          <SectionContainer 
            title="AWS Region" 
            icon={Globe}
            color={{ border: '#FF9900', bg: '#FFFBF5', header: '#FF9900' }}
            dashed
          >
            {/* Security & Entry Layer */}
            <div className="flex items-center justify-center gap-4 mb-6 pb-6 border-b-2 border-dashed border-orange-200">
              {/* Users */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                  <Users className="w-7 h-7 text-gray-600" />
                </div>
                <span className="text-xs font-semibold text-gray-600">Users</span>
              </div>
              
              <ConnectionArrow color="#DD344C" />
              
              {/* WAF */}
              {wafCount > 0 && (
                <>
                  <AWSServiceIcon type="waf" count={wafCount} size="md" label="WAF" />
                  <ConnectionArrow color="#DD344C" />
                </>
              )}
              
              {/* Route53 */}
              <AWSServiceIcon type="route53" count={route53Count || 0} size="md" label="ROUTE53" />
              
              <ConnectionArrow color="#8C4FFF" />
              
              {/* CloudFront */}
              <AWSServiceIcon type="cloudfront" count={cloudfrontCount || 0} size="md" label="CLOUDFRONT" />
              
              <ConnectionArrow color="#8C4FFF" />
              
              {/* API Gateway */}
              {apiGwCount > 0 && (
                <AWSServiceIcon type="apigateway" count={apiGwCount} size="md" label="API GW" />
              )}
            </div>
            
            {/* VPC Container */}
            <SectionContainer 
              title={`VPC (${vpcCount} VPCs)`}
              icon={Network}
              color={CATEGORY_SECTION_COLORS.networking}
              dashed
              className="mb-4"
            >
              {/* Load Balancer Row */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <AWSServiceIcon type="elb" count={elbCount || 0} size="lg" label="ELB" />
                <AWSServiceIcon type="vpc" count={vpcCount || 0} size="lg" label="VPC" />
              </div>
              
              <ConnectionArrow direction="down" color="#8C4FFF" />
              
              {/* Availability Zones */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* AZ 1 */}
                <SectionContainer
                  title="Availability Zone 1"
                  color={{ border: '#38A169', bg: '#F0FFF4', header: '#38A169' }}
                >
                  <div className="flex flex-wrap gap-4 justify-center">
                    <AWSServiceIcon type="ec2" count={Math.ceil(ec2Count / 2)} size="md" label="EC2" />
                    {snsCount > 0 && <AWSServiceIcon type="sns" count={Math.ceil(snsCount / 2)} size="md" label="SNS" />}
                    {lambdaCount > 0 && <AWSServiceIcon type="lambda" count={Math.ceil(lambdaCount / 2)} size="md" label="Lambda" />}
                    {ecsCount > 0 && <AWSServiceIcon type="ecs" count={Math.ceil(ecsCount / 2)} size="md" label="ECS" />}
                  </div>
                </SectionContainer>
                
                {/* AZ 2 */}
                <SectionContainer
                  title="Availability Zone 2"
                  color={{ border: '#38A169', bg: '#F0FFF4', header: '#38A169' }}
                >
                  <div className="flex flex-wrap gap-4 justify-center">
                    <AWSServiceIcon type="ec2" count={Math.floor(ec2Count / 2)} size="md" label="EC2" />
                    {snsCount > 0 && <AWSServiceIcon type="sns" count={Math.floor(snsCount / 2)} size="md" label="SNS" />}
                    {lambdaCount > 0 && <AWSServiceIcon type="lambda" count={Math.floor(lambdaCount / 2)} size="md" label="Lambda" />}
                    {ecsCount > 0 && <AWSServiceIcon type="ecs" count={Math.floor(ecsCount / 2)} size="md" label="ECS" />}
                  </div>
                </SectionContainer>
              </div>
              
              <ConnectionArrow direction="down" color="#3B48CC" />
              
              {/* Data Tier */}
              <SectionContainer
                title="Data Tier"
                icon={Database}
                color={CATEGORY_SECTION_COLORS.database}
              >
                <div className="flex flex-wrap gap-6 justify-center">
                  <AWSServiceIcon type="rds" count={rdsCount || 0} size="lg" label="RDS" />
                  <AWSServiceIcon type="s3" count={s3Count || 0} size="lg" label="S3" />
                  {dynamoCount > 0 && <AWSServiceIcon type="dynamodb" count={dynamoCount} size="lg" label="DynamoDB" />}
                  {sqsCount > 0 && <AWSServiceIcon type="sqs" count={sqsCount} size="lg" label="SQS" />}
                </div>
              </SectionContainer>
            </SectionContainer>
            
            {/* Bottom Services Row */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* DevOps */}
              <SectionContainer
                title="DevOps & CI/CD"
                color={CATEGORY_SECTION_COLORS.devops}
              >
                <div className="flex flex-wrap gap-4">
                  <AWSServiceIcon type="codepipeline" count={codepipelineCount || 0} size="md" label="CODEPIPELINE" />
                </div>
              </SectionContainer>
              
              {/* Monitoring */}
              <SectionContainer
                title="Monitoring & Security"
                color={CATEGORY_SECTION_COLORS.monitoring}
              >
                <div className="flex flex-wrap gap-4">
                  <AWSServiceIcon type="cloudwatch" count={cloudwatchCount || 0} size="md" label="CLOUDWATCH" />
                </div>
              </SectionContainer>
            </div>
          </SectionContainer>
        </div>
      </div>
    );
  };

  // Account Card Component
  const AccountCard = ({ accountId, data }) => {
    const topTypes = Object.entries(data.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    
    return (
      <div 
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all cursor-pointer group"
        onClick={() => {
          setSelectedAccount(accountId);
          setViewMode('account');
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">AWS Account</h3>
              <p className="text-xs text-gray-500 font-mono">...{accountId?.slice(-8) || 'Unknown'}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-800">{data.total}</div>
            <div className="text-xs text-gray-500">Resources</div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mb-4">
          {topTypes.map(([type, count]) => (
            <AWSServiceIcon key={type} type={type} count={count} size="sm" label={false} />
          ))}
        </div>
        
        <button className="w-full py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-2 transition-all group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-700">
          View Architecture <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 font-medium">Loading management view...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <NavBar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 text-white px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                Management View
              </h1>
              <p className="text-white/60 text-sm mt-1 ml-[52px]">
                Executive architecture overview with resource counts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-lg"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="grid grid-cols-6 gap-6">
            {[
              { value: stats.total, label: 'Total Resources', color: 'text-gray-800' },
              { value: stats.accounts.length, label: 'AWS Accounts', color: 'text-orange-600' },
              { value: stats.vpcCount || stats.vpcs.length, label: 'VPCs', color: 'text-purple-600' },
              { value: stats.regions.length, label: 'Regions', color: 'text-blue-600' },
              { value: stats.types.length, label: 'Service Types', color: 'text-green-600' },
              { value: stats.relationships, label: 'Relationships', color: 'text-pink-600' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* View Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'accounts', label: `By Account (${stats.accounts.length})` },
              { id: 'services', label: 'All Services' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setViewMode(tab.id); setSelectedAccount(null); }}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === tab.id || (tab.id === 'accounts' && viewMode === 'account')
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Main Components Summary Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Resource Summary - Main Components
                </h3>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Service</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Icon</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Count</th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'ec2', name: 'EC2 Instances', category: 'Compute', desc: 'Virtual servers for running applications', color: '#FF9900' },
                      { key: 'rds', name: 'RDS Databases', category: 'Database', desc: 'Managed relational database service', color: '#3B48CC' },
                      { key: 'mq', name: 'Messaging (SQS/SNS/MQ)', category: 'Messaging', desc: 'Message queues and notification services', color: '#FF4F8B' },
                      { key: 's3', name: 'S3 Buckets', category: 'Storage', desc: 'Object storage for files and data', color: '#3F8624' },
                      { key: 'pipelines', name: 'CI/CD Pipelines', category: 'DevOps', desc: 'Code deployment and build automation', color: '#00A1C9' },
                      { key: 'lambda', name: 'Lambda Functions', category: 'Compute', desc: 'Serverless compute functions', color: '#FF9900' },
                      { key: 'elb', name: 'Load Balancers', category: 'Networking', desc: 'Traffic distribution across instances', color: '#8C4FFF' },
                      { key: 'vpc', name: 'VPCs', category: 'Networking', desc: 'Virtual private cloud networks', color: '#8C4FFF' },
                    ].map((item, idx) => (
                      <tr key={item.key} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-gray-800">{item.name}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center">
                            <AWSServiceIcon type={item.key} count={0} size="sm" label={false} />
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span 
                            className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-xl font-bold text-white shadow-lg"
                            style={{ backgroundColor: item.color }}
                          >
                            {stats.mainComponents[item.key] || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">{item.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <td className="py-4 px-4 font-bold text-gray-800">Total Main Components</td>
                      <td></td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl text-2xl font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
                          {Object.values(stats.mainComponents).reduce((a, b) => a + b, 0)}
                        </span>
                      </td>
                      <td colSpan="2" className="py-4 px-4 text-sm text-gray-600">
                        Across {stats.accounts.length} account(s) and {stats.vpcCount} VPC(s)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <ArchitectureDiagram />
            
            {/* Quick Stats by Category */}
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.byCategory)
                .filter(([cat]) => cat !== 'other')
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([category, count]) => {
                  const colors = CATEGORY_SECTION_COLORS[category] || CATEGORY_SECTION_COLORS.monitoring;
                  return (
                    <div 
                      key={category}
                      className="bg-white rounded-xl shadow-lg p-4 border-l-4"
                      style={{ borderLeftColor: colors.border }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold capitalize" style={{ color: colors.header }}>{category}</span>
                        <span className="text-2xl font-bold text-gray-800">{count}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {viewMode === 'accounts' && (
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(stats.byAccount).map(([accountId, data]) => (
              <AccountCard key={accountId} accountId={accountId} data={data} />
            ))}
          </div>
        )}
        
        {viewMode === 'account' && selectedAccount && (
          <div className="space-y-6">
            <button
              onClick={() => setViewMode('accounts')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
            >
              ← Back to Accounts
            </button>
            <ArchitectureDiagram accountId={selectedAccount} />
          </div>
        )}
        
        {viewMode === 'services' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">All Services</h2>
            <div className="flex flex-wrap gap-6">
              {Object.entries(stats.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <AWSServiceIcon key={type} type={type} count={count} size="lg" />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagementView;
