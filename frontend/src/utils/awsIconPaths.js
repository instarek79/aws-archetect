// AWS Official Icon Path Mappings
// Maps service types to their official AWS icon paths

const ICON_BASE_PATH = '/aws icons/Architecture-Service-Icons_07312025';

// Icon size to use (32px is good for canvas)
export const ICON_SIZE = '32';

// Service to icon path mapping
export const AWS_ICON_PATHS = {
  // Compute
  ec2: `${ICON_BASE_PATH}/Arch_Compute/${ICON_SIZE}/Arch_Amazon-EC2_${ICON_SIZE}.png`,
  instance: `${ICON_BASE_PATH}/Arch_Compute/${ICON_SIZE}/Arch_Amazon-EC2_${ICON_SIZE}.png`,
  lambda: `${ICON_BASE_PATH}/Arch_Compute/${ICON_SIZE}/Arch_AWS-Lambda_${ICON_SIZE}.png`,
  ecs: `${ICON_BASE_PATH}/Arch_Containers/${ICON_SIZE}/Arch_Amazon-Elastic-Container-Service_${ICON_SIZE}.png`,
  eks: `${ICON_BASE_PATH}/Arch_Containers/${ICON_SIZE}/Arch_Amazon-Elastic-Kubernetes-Service_${ICON_SIZE}.png`,
  fargate: `${ICON_BASE_PATH}/Arch_Containers/${ICON_SIZE}/Arch_AWS-Fargate_${ICON_SIZE}.png`,
  batch: `${ICON_BASE_PATH}/Arch_Compute/${ICON_SIZE}/Arch_AWS-Batch_${ICON_SIZE}.png`,
  lightsail: `${ICON_BASE_PATH}/Arch_Compute/${ICON_SIZE}/Arch_Amazon-Lightsail_${ICON_SIZE}.png`,
  
  // Database
  rds: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-RDS_${ICON_SIZE}.png`,
  aurora: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-Aurora_${ICON_SIZE}.png`,
  dynamodb: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-DynamoDB_${ICON_SIZE}.png`,
  elasticache: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-ElastiCache_${ICON_SIZE}.png`,
  documentdb: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-DocumentDB_${ICON_SIZE}.png`,
  neptune: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-Neptune_${ICON_SIZE}.png`,
  memorydb: `${ICON_BASE_PATH}/Arch_Database/${ICON_SIZE}/Arch_Amazon-MemoryDB_${ICON_SIZE}.png`,
  
  // Storage
  s3: `${ICON_BASE_PATH}/Arch_Storage/${ICON_SIZE}/Arch_Amazon-Simple-Storage-Service_${ICON_SIZE}.png`,
  ebs: `${ICON_BASE_PATH}/Arch_Storage/${ICON_SIZE}/Arch_Amazon-Elastic-Block-Store_${ICON_SIZE}.png`,
  efs: `${ICON_BASE_PATH}/Arch_Storage/${ICON_SIZE}/Arch_Amazon-Elastic-File-System_${ICON_SIZE}.png`,
  glacier: `${ICON_BASE_PATH}/Arch_Storage/${ICON_SIZE}/Arch_Amazon-Simple-Storage-Service-Glacier_${ICON_SIZE}.png`,
  backup: `${ICON_BASE_PATH}/Arch_Storage/${ICON_SIZE}/Arch_AWS-Backup_${ICON_SIZE}.png`,
  fsx: `${ICON_BASE_PATH}/Arch_Storage/${ICON_SIZE}/Arch_Amazon-FSx_${ICON_SIZE}.png`,
  
  // Networking
  vpc: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Amazon-Virtual-Private-Cloud_${ICON_SIZE}.png`,
  elb: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Elastic-Load-Balancing_${ICON_SIZE}.png`,
  elasticloadbalancing: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Elastic-Load-Balancing_${ICON_SIZE}.png`,
  alb: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Elastic-Load-Balancing_${ICON_SIZE}.png`,
  nlb: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Elastic-Load-Balancing_${ICON_SIZE}.png`,
  cloudfront: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Amazon-CloudFront_${ICON_SIZE}.png`,
  route53: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Amazon-Route-53_${ICON_SIZE}.png`,
  apigateway: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_Amazon-API-Gateway_${ICON_SIZE}.png`,
  directconnect: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_AWS-Direct-Connect_${ICON_SIZE}.png`,
  
  // Security
  iam: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Identity-and-Access-Management_${ICON_SIZE}.png`,
  iam_role: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Identity-and-Access-Management_${ICON_SIZE}.png`,
  iam_policy: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Identity-and-Access-Management_${ICON_SIZE}.png`,
  cognito: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_Amazon-Cognito_${ICON_SIZE}.png`,
  kms: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Key-Management-Service_${ICON_SIZE}.png`,
  waf: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-WAF_${ICON_SIZE}.png`,
  shield: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Shield_${ICON_SIZE}.png`,
  secretsmanager: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Secrets-Manager_${ICON_SIZE}.png`,
  security_group: `${ICON_BASE_PATH}/Arch_Security-Identity-Compliance/${ICON_SIZE}/Arch_AWS-Identity-and-Access-Management_${ICON_SIZE}.png`,
  
  // Integration
  sqs: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_Amazon-Simple-Queue-Service_${ICON_SIZE}.png`,
  sns: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_Amazon-Simple-Notification-Service_${ICON_SIZE}.png`,
  eventbridge: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_Amazon-EventBridge_${ICON_SIZE}.png`,
  stepfunctions: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_AWS-Step-Functions_${ICON_SIZE}.png`,
  
  // Management
  cloudwatch: `${ICON_BASE_PATH}/Arch_Management-Governance/${ICON_SIZE}/Arch_Amazon-CloudWatch_${ICON_SIZE}.png`,
  cloudformation: `${ICON_BASE_PATH}/Arch_Management-Governance/${ICON_SIZE}/Arch_AWS-CloudFormation_${ICON_SIZE}.png`,
  cloudtrail: `${ICON_BASE_PATH}/Arch_Management-Governance/${ICON_SIZE}/Arch_AWS-CloudTrail_${ICON_SIZE}.png`,
  config: `${ICON_BASE_PATH}/Arch_Management-Governance/${ICON_SIZE}/Arch_AWS-Config_${ICON_SIZE}.png`,
  
  // Developer Tools
  codepipeline: `${ICON_BASE_PATH}/Arch_Developer-Tools/${ICON_SIZE}/Arch_AWS-CodePipeline_${ICON_SIZE}.png`,
  codebuild: `${ICON_BASE_PATH}/Arch_Developer-Tools/${ICON_SIZE}/Arch_AWS-CodeBuild_${ICON_SIZE}.png`,
  codecommit: `${ICON_BASE_PATH}/Arch_Developer-Tools/${ICON_SIZE}/Arch_AWS-CodeCommit_${ICON_SIZE}.png`,
  codedeploy: `${ICON_BASE_PATH}/Arch_Developer-Tools/${ICON_SIZE}/Arch_AWS-CodeDeploy_${ICON_SIZE}.png`,
  
  // Other Services
  rabbitmq: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_Amazon-MQ_${ICON_SIZE}.png`,
  mq: `${ICON_BASE_PATH}/Arch_App-Integration/${ICON_SIZE}/Arch_Amazon-MQ_${ICON_SIZE}.png`,
  subnet: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Amazon-Virtual-Private-Cloud_${ICON_SIZE}.png`,
  nat_gateway: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Amazon-Virtual-Private-Cloud_${ICON_SIZE}.png`,
  igw: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Amazon-Virtual-Private-Cloud_${ICON_SIZE}.png`,
  target_group: `${ICON_BASE_PATH}/Arch_Networking-Content-Delivery/${ICON_SIZE}/Arch_Elastic-Load-Balancing_${ICON_SIZE}.png`,
};

// Get icon path for a service type
export const getAWSIconPath = (type) => {
  const normalizedType = type?.toLowerCase();
  return AWS_ICON_PATHS[normalizedType] || null;
};

// Preload icons for better performance
export const preloadAWSIcons = () => {
  const iconPaths = Object.values(AWS_ICON_PATHS);
  const uniquePaths = [...new Set(iconPaths)];
  
  uniquePaths.forEach(path => {
    const img = new Image();
    img.src = path;
  });
};

export default { AWS_ICON_PATHS, getAWSIconPath, preloadAWSIcons, ICON_SIZE };
