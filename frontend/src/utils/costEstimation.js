// AWS Cost Estimation Utility
// Simplified pricing data for common AWS services (monthly estimates)

const AWS_PRICING = {
  ec2: {
    't2.micro': 8.47,
    't2.small': 16.79,
    't2.medium': 33.58,
    't3.micro': 7.59,
    't3.small': 15.18,
    't3.medium': 30.37,
    'm5.large': 70.08,
    'm5.xlarge': 140.16,
    'm5.2xlarge': 280.32,
  },
  rds: {
    'db.t3.micro': 12.41,
    'db.t3.small': 24.82,
    'db.t3.medium': 49.64,
    'db.m5.large': 122.47,
    'db.m5.xlarge': 244.94,
  },
  lambda: {
    base: 0, // First 1M requests free
    per_million_requests: 0.20,
    per_gb_second: 0.0000166667,
  },
  s3: {
    storage_per_gb: 0.023,
    requests_per_1000: 0.0004,
  },
  dynamodb: {
    on_demand_write_per_million: 1.25,
    on_demand_read_per_million: 0.25,
    provisioned_write_per_unit: 0.47,
    provisioned_read_per_unit: 0.09,
  },
  alb: {
    base: 16.20,
    lcu_per_hour: 0.008,
  },
  nlb: {
    base: 16.20,
    lcu_per_hour: 0.006,
  },
  apigateway: {
    per_million_requests: 3.50,
  },
  vpc: {
    nat_gateway: 32.40,
    vpc_endpoint: 7.20,
  },
  cloudwatch: {
    metrics_per_month: 0.30,
    logs_per_gb: 0.50,
  },
  kinesis: {
    shard_per_hour: 0.015,
  },
  sqs: {
    per_million_requests: 0.40,
  },
  sns: {
    per_million_notifications: 0.50,
  },
  elasticache: {
    'cache.t3.micro': 11.52,
    'cache.t3.small': 23.04,
    'cache.m5.large': 116.64,
  },
  ecs: {
    fargate_per_vcpu_hour: 0.04048,
    fargate_per_gb_hour: 0.004445,
  },
  eks: {
    cluster_per_hour: 0.10,
  },
  cloudfront: {
    data_transfer_per_gb: 0.085,
  },
  route53: {
    hosted_zone: 0.50,
    queries_per_million: 0.40,
  },
};

export function estimateResourceCost(resource) {
  const type = resource.type?.toLowerCase();
  const props = resource.type_specific_properties || {};
  
  switch (type) {
    case 'ec2':
      const instanceType = props.instance_type || 't3.micro';
      return AWS_PRICING.ec2[instanceType] || 15.0;
    
    case 'rds':
    case 'aurora':
      const dbClass = props.instance_class || 'db.t3.small';
      const multiAz = props.multi_az ? 2 : 1;
      const storage = (parseInt(props.allocated_storage) || 20) * 0.115;
      return ((AWS_PRICING.rds[dbClass] || 25.0) * multiAz) + storage;
    
    case 'lambda':
      const memory = parseInt(props.memory) || 128;
      const estimatedInvocations = 1000000; // 1M per month estimate
      const avgDuration = parseInt(props.timeout) || 3;
      const gbSeconds = (memory / 1024) * avgDuration * estimatedInvocations;
      return (estimatedInvocations / 1000000) * AWS_PRICING.lambda.per_million_requests +
             gbSeconds * AWS_PRICING.lambda.per_gb_second;
    
    case 's3':
      const estimatedStorageGB = 100; // Default estimate
      const estimatedRequests = 100000; // Default estimate
      return (estimatedStorageGB * AWS_PRICING.s3.storage_per_gb) +
             (estimatedRequests / 1000) * AWS_PRICING.s3.requests_per_1000;
    
    case 'dynamodb':
      const billingMode = props.billing_mode || 'PAY_PER_REQUEST';
      if (billingMode === 'PROVISIONED') {
        const readCapacity = parseInt(props.read_capacity) || 5;
        const writeCapacity = parseInt(props.write_capacity) || 5;
        return (readCapacity * AWS_PRICING.dynamodb.provisioned_read_per_unit) +
               (writeCapacity * AWS_PRICING.dynamodb.provisioned_write_per_unit);
      }
      return 5.0; // Estimate for on-demand
    
    case 'alb':
      return AWS_PRICING.alb.base + (AWS_PRICING.alb.lcu_per_hour * 730 * 2); // 2 LCU average
    
    case 'nlb':
      return AWS_PRICING.nlb.base + (AWS_PRICING.nlb.lcu_per_hour * 730 * 2);
    
    case 'apigateway':
      const estimatedApiRequests = 1000000;
      return (estimatedApiRequests / 1000000) * AWS_PRICING.apigateway.per_million_requests;
    
    case 'vpc':
      return 0; // VPC itself is free
    
    case 'nat-gateway':
      return AWS_PRICING.vpc.nat_gateway;
    
    case 'cloudwatch':
      return AWS_PRICING.cloudwatch.metrics_per_month * 10; // 10 metrics estimate
    
    case 'kinesis':
      return AWS_PRICING.kinesis.shard_per_hour * 730; // 1 shard
    
    case 'sqs':
      return 1.0; // Estimate
    
    case 'sns':
      return 1.0; // Estimate
    
    case 'elasticache':
      const cacheType = props.node_type || 'cache.t3.small';
      return AWS_PRICING.elasticache[cacheType] || 23.0;
    
    case 'ecs':
    case 'fargate':
      const vcpu = parseFloat(props.vcpu) || 0.25;
      const memoryGb = parseFloat(props.memory) || 0.5;
      return (vcpu * AWS_PRICING.ecs.fargate_per_vcpu_hour * 730) +
             (memoryGb * AWS_PRICING.ecs.fargate_per_gb_hour * 730);
    
    case 'eks':
      return AWS_PRICING.eks.cluster_per_hour * 730;
    
    case 'cloudfront':
      return 10.0; // Estimate
    
    case 'route53':
      return AWS_PRICING.route53.hosted_zone;
    
    case 'codepipeline':
      return 1.0; // $1 per active pipeline
    
    case 'codebuild':
      return 0; // First 100 build minutes free, then pay per minute
    
    case 'codecommit':
      return 0; // First 5 users free
    
    case 'codedeploy':
      return 0; // Free for EC2/Lambda
    
    case 'ecr':
      return 0.10 * 10; // $0.10 per GB storage, 10GB estimate
    
    case 'eventbridge':
      return 1.0; // Estimate
    
    case 'stepfunctions':
      return 0.025 * 1000; // $0.025 per 1000 state transitions
    
    case 'secretsmanager':
      return 0.40; // $0.40 per secret per month
    
    case 'kms':
      return 1.0; // $1 per key per month
    
    case 'cognito':
      return 0; // First 50,000 MAUs free
    
    case 'iam':
      return 0; // Free
    
    case 'waf':
      return 5.0; // $5 per web ACL
    
    case 'cloudtrail':
      return 0; // First trail free
    
    case 'cloudformation':
      return 0; // Free
    
    case 'redshift':
      return 180.0; // dc2.large estimate
    
    case 'glue':
      return 0.44 * 10; // $0.44 per DPU-hour, 10 hours estimate
    
    case 'athena':
      return 5.0; // $5 per TB scanned estimate
    
    default:
      return 10.0; // Default estimate for unknown services
  }
}

export function calculateTotalCost(resources) {
  if (!resources || resources.length === 0) return 0;
  
  return resources.reduce((total, resource) => {
    return total + estimateResourceCost(resource);
  }, 0);
}

export function formatCost(cost) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
}

export function getCostBreakdown(resources) {
  const breakdown = {};
  
  resources.forEach(resource => {
    const type = resource.type?.toLowerCase() || 'unknown';
    const cost = estimateResourceCost(resource);
    
    if (!breakdown[type]) {
      breakdown[type] = {
        count: 0,
        totalCost: 0,
        resources: [],
      };
    }
    
    breakdown[type].count++;
    breakdown[type].totalCost += cost;
    breakdown[type].resources.push({
      name: resource.name,
      cost: cost,
    });
  });
  
  return Object.entries(breakdown)
    .map(([type, data]) => ({
      type,
      ...data,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}
