// Infrastructure as Code Export Utilities

// CloudFormation Template Generator
export function generateCloudFormation(resources, relationships) {
  const template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Auto-generated CloudFormation template from Architecture Diagram',
    Parameters: {},
    Resources: {},
    Outputs: {},
  };

  // Add parameters
  template.Parameters.Environment = {
    Type: 'String',
    Default: 'development',
    AllowedValues: ['development', 'staging', 'production'],
    Description: 'Environment name',
  };

  // Generate resources
  resources.forEach(resource => {
    const logicalId = sanitizeLogicalId(resource.name || `Resource${resource.id}`);
    const cfnResource = convertToCFNResource(resource);
    
    if (cfnResource) {
      template.Resources[logicalId] = cfnResource;
      
      // Add outputs for important resources
      if (['alb', 'apigateway', 'cloudfront', 'rds', 's3'].includes(resource.type?.toLowerCase())) {
        template.Outputs[`${logicalId}Output`] = {
          Description: `${resource.type} ${resource.name}`,
          Value: { Ref: logicalId },
          Export: {
            Name: { 'Fn::Sub': `\${AWS::StackName}-${logicalId}` },
          },
        };
      }
    }
  });

  return JSON.stringify(template, null, 2);
}

function convertToCFNResource(resource) {
  const type = resource.type?.toLowerCase();
  const props = resource.type_specific_properties || {};

  switch (type) {
    case 'ec2':
      return {
        Type: 'AWS::EC2::Instance',
        Properties: {
          InstanceType: props.instance_type || 't3.micro',
          ImageId: props.ami_id || { Ref: 'LatestAmiId' },
          KeyName: props.key_pair,
          SubnetId: props.subnet_id,
          SecurityGroupIds: Array.isArray(props.security_groups) ? props.security_groups : [],
          Monitoring: props.monitoring || false,
          EbsOptimized: props.ebs_optimized || false,
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 'lambda':
      return {
        Type: 'AWS::Lambda::Function',
        Properties: {
          FunctionName: resource.name,
          Runtime: props.runtime || 'python3.11',
          Handler: props.handler || 'index.handler',
          Role: { 'Fn::GetAtt': [`${sanitizeLogicalId(resource.name)}Role`, 'Arn'] },
          Code: {
            ZipFile: '# Lambda function code here',
          },
          MemorySize: parseInt(props.memory) || 128,
          Timeout: parseInt(props.timeout) || 30,
          Environment: {
            Variables: props.environment || {},
          },
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 'rds':
      return {
        Type: 'AWS::RDS::DBInstance',
        Properties: {
          DBInstanceIdentifier: resource.name,
          Engine: props.engine || 'mysql',
          DBInstanceClass: props.instance_class || 'db.t3.micro',
          AllocatedStorage: props.allocated_storage || '20',
          MasterUsername: { Ref: 'DBUsername' },
          MasterUserPassword: { Ref: 'DBPassword' },
          MultiAZ: props.multi_az || false,
          BackupRetentionPeriod: props.backup_retention || 7,
          DBSubnetGroupName: props.subnet_group,
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 's3':
      return {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: resource.name,
          VersioningConfiguration: {
            Status: props.versioning ? 'Enabled' : 'Suspended',
          },
          BucketEncryption: props.encryption ? {
            ServerSideEncryptionConfiguration: [{
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            }],
          } : undefined,
          PublicAccessBlockConfiguration: props.public_access ? {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
          } : undefined,
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 'dynamodb':
      return {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: resource.name,
          AttributeDefinitions: [
            {
              AttributeName: props.partition_key || 'id',
              AttributeType: 'S',
            },
            ...(props.sort_key ? [{
              AttributeName: props.sort_key,
              AttributeType: 'S',
            }] : []),
          ],
          KeySchema: [
            {
              AttributeName: props.partition_key || 'id',
              KeyType: 'HASH',
            },
            ...(props.sort_key ? [{
              AttributeName: props.sort_key,
              KeyType: 'RANGE',
            }] : []),
          ],
          BillingMode: props.billing_mode || 'PAY_PER_REQUEST',
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 'alb':
      return {
        Type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
        Properties: {
          Name: resource.name,
          Type: 'application',
          Scheme: props.scheme || 'internet-facing',
          Subnets: Array.isArray(props.subnets) ? props.subnets : [],
          SecurityGroups: Array.isArray(props.security_groups) ? props.security_groups : [],
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 'vpc':
      return {
        Type: 'AWS::EC2::VPC',
        Properties: {
          CidrBlock: props.cidr_block || '10.0.0.0/16',
          EnableDnsHostnames: props.enable_dns !== false,
          EnableDnsSupport: props.enable_dns_support !== false,
          Tags: convertTags(resource.tags, resource.name),
        },
      };

    case 'apigateway':
      return {
        Type: 'AWS::ApiGatewayV2::Api',
        Properties: {
          Name: resource.name,
          ProtocolType: props.protocol_type || 'HTTP',
          Tags: resource.tags || {},
        },
      };

    default:
      return null;
  }
}

// Terraform HCL Generator
export function generateTerraform(resources, relationships) {
  let terraform = `terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

`;

  resources.forEach(resource => {
    const tfResource = convertToTerraformResource(resource);
    if (tfResource) {
      terraform += tfResource + '\n\n';
    }
  });

  // Add outputs
  terraform += '# Outputs\n';
  resources.forEach(resource => {
    if (['alb', 'apigateway', 'rds', 's3'].includes(resource.type?.toLowerCase())) {
      const resourceName = sanitizeTerraformName(resource.name);
      terraform += `output "${resourceName}_id" {
  description = "${resource.type} ${resource.name} ID"
  value       = aws_${getTerraformResourceType(resource.type)}.${resourceName}.id
}

`;
    }
  });

  return terraform;
}

function convertToTerraformResource(resource) {
  const type = resource.type?.toLowerCase();
  const props = resource.type_specific_properties || {};
  const resourceName = sanitizeTerraformName(resource.name);
  const tfType = getTerraformResourceType(type);

  if (!tfType) return null;

  let tf = `resource "aws_${tfType}" "${resourceName}" {\n`;

  switch (type) {
    case 'ec2':
      tf += `  ami           = "${props.ami_id || 'ami-xxxxx'}"\n`;
      tf += `  instance_type = "${props.instance_type || 't3.micro'}"\n`;
      if (props.key_pair) tf += `  key_name      = "${props.key_pair}"\n`;
      if (props.subnet_id) tf += `  subnet_id     = "${props.subnet_id}"\n`;
      if (props.monitoring) tf += `  monitoring    = true\n`;
      break;

    case 'lambda':
      tf += `  function_name = "${resource.name}"\n`;
      tf += `  runtime       = "${props.runtime || 'python3.11'}"\n`;
      tf += `  handler       = "${props.handler || 'index.handler'}"\n`;
      tf += `  role          = aws_iam_role.${resourceName}_role.arn\n`;
      tf += `  memory_size   = ${props.memory || 128}\n`;
      tf += `  timeout       = ${props.timeout || 30}\n`;
      tf += `\n  filename      = "lambda.zip"\n`;
      if (props.environment) {
        tf += `\n  environment {\n    variables = ${JSON.stringify(props.environment, null, 4).replace(/"/g, '"')}\n  }\n`;
      }
      break;

    case 'rds':
      tf += `  identifier        = "${resource.name}"\n`;
      tf += `  engine            = "${props.engine || 'mysql'}"\n`;
      tf += `  instance_class    = "${props.instance_class || 'db.t3.micro'}"\n`;
      tf += `  allocated_storage = ${props.allocated_storage || 20}\n`;
      tf += `  username          = var.db_username\n`;
      tf += `  password          = var.db_password\n`;
      tf += `  multi_az          = ${props.multi_az || false}\n`;
      tf += `  skip_final_snapshot = true\n`;
      break;

    case 's3':
      tf += `  bucket = "${resource.name}"\n`;
      if (props.versioning) {
        tf += `\n  versioning {\n    enabled = true\n  }\n`;
      }
      if (props.encryption) {
        tf += `\n  server_side_encryption_configuration {\n    rule {\n      apply_server_side_encryption_by_default {\n        sse_algorithm = "AES256"\n      }\n    }\n  }\n`;
      }
      break;

    case 'dynamodb':
      tf += `  name         = "${resource.name}"\n`;
      tf += `  billing_mode = "${props.billing_mode || 'PAY_PER_REQUEST'}"\n`;
      tf += `  hash_key     = "${props.partition_key || 'id'}"\n`;
      if (props.sort_key) tf += `  range_key    = "${props.sort_key}"\n`;
      tf += `\n  attribute {\n    name = "${props.partition_key || 'id'}"\n    type = "S"\n  }\n`;
      break;

    case 'alb':
      tf += `  name               = "${resource.name}"\n`;
      tf += `  load_balancer_type = "application"\n`;
      tf += `  subnets            = ${JSON.stringify(props.subnets || [])}\n`;
      tf += `  security_groups    = ${JSON.stringify(props.security_groups || [])}\n`;
      break;

    case 'vpc':
      tf += `  cidr_block           = "${props.cidr_block || '10.0.0.0/16'}"\n`;
      tf += `  enable_dns_hostnames = ${props.enable_dns !== false}\n`;
      tf += `  enable_dns_support   = ${props.enable_dns_support !== false}\n`;
      break;

    case 'apigateway':
      tf += `  name          = "${resource.name}"\n`;
      tf += `  protocol_type = "${props.protocol_type || 'HTTP'}"\n`;
      break;
  }

  // Add tags
  if (resource.tags && Object.keys(resource.tags).length > 0) {
    tf += `\n  tags = {\n`;
    Object.entries(resource.tags).forEach(([key, value]) => {
      tf += `    ${key} = "${value}"\n`;
    });
    tf += `  }\n`;
  } else {
    tf += `\n  tags = {\n    Name        = "${resource.name}"\n    Environment = var.environment\n  }\n`;
  }

  tf += `}`;
  return tf;
}

function getTerraformResourceType(awsType) {
  const typeMap = {
    ec2: 'instance',
    lambda: 'lambda_function',
    rds: 'db_instance',
    s3: 's3_bucket',
    dynamodb: 'dynamodb_table',
    alb: 'lb',
    nlb: 'lb',
    vpc: 'vpc',
    apigateway: 'apigatewayv2_api',
    ecs: 'ecs_service',
    eks: 'eks_cluster',
    sqs: 'sqs_queue',
    sns: 'sns_topic',
    kinesis: 'kinesis_stream',
    cloudwatch: 'cloudwatch_log_group',
  };
  return typeMap[awsType?.toLowerCase()];
}

function sanitizeLogicalId(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '');
}

function sanitizeTerraformName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function convertTags(tags, name) {
  const tagArray = [];
  if (tags && typeof tags === 'object') {
    Object.entries(tags).forEach(([key, value]) => {
      tagArray.push({ Key: key, Value: value });
    });
  }
  if (!tagArray.find(t => t.Key === 'Name')) {
    tagArray.push({ Key: 'Name', Value: name });
  }
  return tagArray;
}
