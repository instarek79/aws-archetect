// AWS Architecture Icons - SVG Components
// Based on official AWS Architecture Icons

export const AWSIcon = ({ type, size = 48, className = '' }) => {
  const iconSize = size;
  const Icon = AWS_ICONS[type?.toLowerCase()] || AWS_ICONS.default;
  return <Icon size={iconSize} className={className} />;
};

// Color palette matching AWS official colors
export const AWS_SERVICE_COLORS = {
  // Compute - Orange
  ec2: '#FF9900',
  lambda: '#FF9900',
  ecs: '#FF9900',
  eks: '#FF9900',
  fargate: '#FF9900',
  lightsail: '#FF9900',
  batch: '#FF9900',
  
  // Database - Blue
  rds: '#3B48CC',
  aurora: '#3B48CC',
  dynamodb: '#3B48CC',
  elasticache: '#3B48CC',
  redshift: '#3B48CC',
  neptune: '#3B48CC',
  documentdb: '#3B48CC',
  
  // Storage - Green
  s3: '#3F8624',
  ebs: '#3F8624',
  efs: '#3F8624',
  glacier: '#3F8624',
  backup: '#3F8624',
  
  // Networking - Purple
  vpc: '#8C4FFF',
  cloudfront: '#8C4FFF',
  route53: '#8C4FFF',
  apigateway: '#8C4FFF',
  elb: '#8C4FFF',
  elasticloadbalancing: '#8C4FFF',
  directconnect: '#8C4FFF',
  
  // Security - Red
  iam: '#DD344C',
  cognito: '#DD344C',
  shield: '#DD344C',
  waf: '#DD344C',
  kms: '#DD344C',
  secretsmanager: '#DD344C',
  security_group: '#DD344C',
  
  // Integration - Pink
  sqs: '#E7157B',
  sns: '#E7157B',
  eventbridge: '#E7157B',
  stepfunctions: '#E7157B',
  
  // Management - Teal
  cloudwatch: '#759C3E',
  cloudformation: '#759C3E',
  cloudtrail: '#759C3E',
  config: '#759C3E',
  
  // Default
  default: '#232F3E',
};

export const getServiceColor = (type) => AWS_SERVICE_COLORS[type?.toLowerCase()] || AWS_SERVICE_COLORS.default;

// EC2 Icon
const EC2Icon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="ec2-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF9900" />
        <stop offset="100%" stopColor="#FF6600" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#ec2-grad)" />
    <path d="M20 25h40v30H20z" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M25 35h30M25 40h30M25 45h30" stroke="#fff" strokeWidth="1.5" />
    <circle cx="55" cy="30" r="3" fill="#fff" />
  </svg>
);

// Lambda Icon
const LambdaIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="lambda-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF9900" />
        <stop offset="100%" stopColor="#FF6600" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#lambda-grad)" />
    <text x="40" y="52" textAnchor="middle" fill="#fff" fontSize="36" fontWeight="bold">λ</text>
  </svg>
);

// RDS Icon
const RDSIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="rds-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B48CC" />
        <stop offset="100%" stopColor="#2B38BC" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#rds-grad)" />
    <ellipse cx="40" cy="25" rx="20" ry="8" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M20 25v30c0 4.4 8.95 8 20 8s20-3.6 20-8V25" fill="none" stroke="#fff" strokeWidth="2" />
    <ellipse cx="40" cy="40" rx="20" ry="8" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
    <ellipse cx="40" cy="55" rx="20" ry="8" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
  </svg>
);

// DynamoDB Icon
const DynamoDBIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="dynamo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B48CC" />
        <stop offset="100%" stopColor="#2B38BC" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#dynamo-grad)" />
    <path d="M25 20h30l-5 40H30z" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M30 30h20M32 40h16M34 50h12" stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// S3 Icon
const S3Icon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="s3-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3F8624" />
        <stop offset="100%" stopColor="#2F7614" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#s3-grad)" />
    <path d="M40 15c-12 0-22 5-22 12v26c0 7 10 12 22 12s22-5 22-12V27c0-7-10-12-22-12z" fill="none" stroke="#fff" strokeWidth="2" />
    <ellipse cx="40" cy="27" rx="22" ry="12" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M18 40c0 7 10 12 22 12s22-5 22-12" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
  </svg>
);

// VPC Icon
const VPCIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="vpc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#vpc-grad)" />
    <rect x="18" y="18" width="44" height="44" rx="4" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 2" />
    <circle cx="30" cy="30" r="6" fill="#fff" opacity="0.8" />
    <circle cx="50" cy="30" r="6" fill="#fff" opacity="0.8" />
    <circle cx="40" cy="50" r="6" fill="#fff" opacity="0.8" />
    <path d="M30 36v8l10 6 10-6v-8" fill="none" stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// ELB Icon
const ELBIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="elb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#elb-grad)" />
    <circle cx="40" cy="25" r="10" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="25" cy="55" r="8" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="55" cy="55" r="8" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M40 35v10M33 45l-8 10M47 45l8 10" stroke="#fff" strokeWidth="2" />
  </svg>
);

// CloudFront Icon
const CloudFrontIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="cf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#cf-grad)" />
    <circle cx="40" cy="40" r="20" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="40" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="1.5" />
    <circle cx="40" cy="40" r="4" fill="#fff" />
    <path d="M40 20v-5M40 65v-5M60 40h5M15 40h5" stroke="#fff" strokeWidth="2" />
  </svg>
);

// IAM Icon
const IAMIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="iam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DD344C" />
        <stop offset="100%" stopColor="#CD243C" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#iam-grad)" />
    <circle cx="40" cy="30" r="10" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M25 60c0-10 6.7-18 15-18s15 8 15 18" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M40 45v10M35 50h10" stroke="#fff" strokeWidth="2" />
  </svg>
);

// Security Group Icon
const SecurityGroupIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="sg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DD344C" />
        <stop offset="100%" stopColor="#CD243C" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#sg-grad)" />
    <path d="M40 15l-20 10v20c0 12 20 20 20 20s20-8 20-20V25z" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M35 40l5 5 10-10" stroke="#fff" strokeWidth="2" fill="none" />
  </svg>
);

// SQS Icon
const SQSIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="sqs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E7157B" />
        <stop offset="100%" stopColor="#D7056B" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#sqs-grad)" />
    <rect x="20" y="25" width="15" height="30" rx="2" fill="none" stroke="#fff" strokeWidth="2" />
    <rect x="45" y="25" width="15" height="30" rx="2" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M35 40h10" stroke="#fff" strokeWidth="2" markerEnd="url(#arrow)" />
    <path d="M38 37l3 3-3 3" stroke="#fff" strokeWidth="1.5" fill="none" />
  </svg>
);

// SNS Icon
const SNSIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="sns-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E7157B" />
        <stop offset="100%" stopColor="#D7056B" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#sns-grad)" />
    <circle cx="40" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="20" cy="25" r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
    <circle cx="60" cy="25" r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
    <circle cx="20" cy="55" r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
    <circle cx="60" cy="55" r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
    <path d="M30 34l-6-6M50 34l6-6M30 46l-6 6M50 46l6 6" stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// NAT Gateway Icon
const NATGatewayIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="nat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#nat-grad)" />
    <rect x="25" y="30" width="30" height="20" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M40 20v10M40 50v10M30 40h-10M60 40h-10" stroke="#fff" strokeWidth="2" />
    <path d="M37 17l3 3 3-3M37 63l3-3 3 3M17 37l3 3-3 3M63 37l-3 3 3 3" stroke="#fff" strokeWidth="1.5" fill="none" />
  </svg>
);

// Internet Gateway Icon
const IGWIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="igw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#igw-grad)" />
    <circle cx="40" cy="40" r="18" fill="none" stroke="#fff" strokeWidth="2" />
    <ellipse cx="40" cy="40" rx="18" ry="8" fill="none" stroke="#fff" strokeWidth="1.5" />
    <ellipse cx="40" cy="40" rx="8" ry="18" fill="none" stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// Subnet Icon
const SubnetIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="subnet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#subnet-grad)" />
    <rect x="18" y="18" width="44" height="44" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M18 40h44M40 18v44" stroke="#fff" strokeWidth="1" opacity="0.5" />
    <circle cx="29" cy="29" r="4" fill="#fff" />
    <circle cx="51" cy="29" r="4" fill="#fff" />
    <circle cx="29" cy="51" r="4" fill="#fff" />
    <circle cx="51" cy="51" r="4" fill="#fff" />
  </svg>
);

// EBS Icon
const EBSIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="ebs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3F8624" />
        <stop offset="100%" stopColor="#2F7614" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#ebs-grad)" />
    <rect x="20" y="20" width="40" height="40" rx="4" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="40" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="40" cy="40" r="4" fill="#fff" />
  </svg>
);

// ECS Icon
const ECSIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="ecs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF9900" />
        <stop offset="100%" stopColor="#FF6600" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#ecs-grad)" />
    <circle cx="28" cy="28" r="10" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="52" cy="28" r="10" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="40" cy="52" r="10" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M28 38v4l12 6 12-6v-4" fill="none" stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// API Gateway Icon
const APIGatewayIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="apig-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E7157B" />
        <stop offset="100%" stopColor="#D7056B" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#apig-grad)" />
    <rect x="30" y="20" width="20" height="40" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M15 30h15M15 40h15M15 50h15M50 30h15M50 40h15M50 50h15" stroke="#fff" strokeWidth="1.5" />
    <circle cx="40" cy="40" r="5" fill="#fff" />
  </svg>
);

// KMS Icon
const KMSIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="kms-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DD344C" />
        <stop offset="100%" stopColor="#CD243C" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#kms-grad)" />
    <circle cx="40" cy="35" r="12" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M40 47v15M35 55h10M35 60h10" stroke="#fff" strokeWidth="2" />
  </svg>
);

// Route53 Icon
const Route53Icon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <defs>
      <linearGradient id="r53-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C4FFF" />
        <stop offset="100%" stopColor="#7C3FEF" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="url(#r53-grad)" />
    <circle cx="40" cy="40" r="22" fill="none" stroke="#fff" strokeWidth="2" />
    <path d="M40 18v44M18 40h44" stroke="#fff" strokeWidth="1" opacity="0.5" />
    <text x="40" y="46" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">53</text>
  </svg>
);

// Default/Unknown Icon
const DefaultIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
    <rect x="4" y="4" width="72" height="72" rx="4" fill="#232F3E" />
    <rect x="20" y="20" width="40" height="40" rx="4" fill="none" stroke="#fff" strokeWidth="2" />
    <text x="40" y="46" textAnchor="middle" fill="#fff" fontSize="20">?</text>
  </svg>
);

// Icon mapping
export const AWS_ICONS = {
  ec2: EC2Icon,
  instance: EC2Icon,
  lambda: LambdaIcon,
  rds: RDSIcon,
  aurora: RDSIcon,
  dynamodb: DynamoDBIcon,
  s3: S3Icon,
  ebs: EBSIcon,
  vpc: VPCIcon,
  subnet: SubnetIcon,
  elb: ELBIcon,
  elasticloadbalancing: ELBIcon,
  alb: ELBIcon,
  nlb: ELBIcon,
  cloudfront: CloudFrontIcon,
  route53: Route53Icon,
  apigateway: APIGatewayIcon,
  sqs: SQSIcon,
  sns: SNSIcon,
  iam: IAMIcon,
  iam_role: IAMIcon,
  iam_policy: IAMIcon,
  security_group: SecurityGroupIcon,
  nat_gateway: NATGatewayIcon,
  igw: IGWIcon,
  ecs: ECSIcon,
  eks: ECSIcon,
  kms: KMSIcon,
  default: DefaultIcon,
};

export default AWSIcon;
