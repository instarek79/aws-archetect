"""
Additional AWS Resource Scanner Methods
Route53, CloudFront, and Amazon MQ scanning
"""
import boto3
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


def scan_route53_hosted_zones(session: boto3.Session, region: str, account_id: str) -> List[Dict[str, Any]]:
    """Scan Route53 Hosted Zones and their individual DNS records"""
    route53 = session.client('route53')
    resources = []
    
    try:
        hosted_zones = route53.list_hosted_zones()['HostedZones']
        for zone in hosted_zones:
            zone_id = zone['Id'].split('/')[-1]
            
            try:
                zone_details = route53.get_hosted_zone(Id=zone_id)
                zone_info = zone_details['HostedZone']
                zone_name = zone_info['Name'].rstrip('.')
                is_private = zone_info.get('Config', {}).get('PrivateZone', False)
                
                # Get tags
                try:
                    tags_response = route53.list_tags_for_resource(
                        ResourceType='hostedzone',
                        ResourceId=zone_id
                    )
                    tags = {tag['Key']: tag['Value'] for tag in tags_response.get('Tags', [])}
                except:
                    tags = {}
                
                # Fetch ALL DNS records for this zone (paginated)
                all_records = []
                try:
                    paginator = route53.get_paginator('list_resource_record_sets')
                    for page in paginator.paginate(HostedZoneId=zone_id):
                        all_records.extend(page.get('ResourceRecordSets', []))
                except:
                    try:
                        resp = route53.list_resource_record_sets(HostedZoneId=zone_id)
                        all_records = resp.get('ResourceRecordSets', [])
                    except:
                        all_records = []
                
                # Save the hosted zone itself
                resource = {
                    'name': zone_name,
                    'resource_id': zone_id,
                    'type': 'route53',
                    'status': 'active' if not is_private else 'private',
                    'region': 'global',
                    'account_id': account_id,
                    'tags': tags,
                    'type_specific_properties': {
                        'zone_id': zone_id,
                        'private_zone': is_private,
                        'record_count': len(all_records),
                        'caller_reference': zone_info.get('CallerReference'),
                        'comment': zone_info.get('Config', {}).get('Comment', '')
                    }
                }
                resources.append(resource)
                
                # Save each DNS record as a separate route53_record resource
                for record in all_records:
                    rec_name = record.get('Name', '').rstrip('.')
                    rec_type = record.get('Type', '')
                    
                    # Skip NS and SOA records for the zone apex (infrastructure records)
                    if rec_type in ('NS', 'SOA') and rec_name == zone_name:
                        continue
                    
                    # Skip TXT, MX, SRV, CAA records (not URL-related)
                    if rec_type in ('TXT', 'MX', 'SRV', 'CAA', 'NS', 'SOA', 'SPF', 'NAPTR'):
                        continue
                    
                    # Get record values
                    record_values = []
                    alias_target = None
                    
                    if 'AliasTarget' in record:
                        alias_target = record['AliasTarget']
                        record_values = [alias_target.get('DNSName', '').rstrip('.')]
                    elif 'ResourceRecords' in record:
                        record_values = [rr.get('Value', '') for rr in record['ResourceRecords']]
                    
                    if not record_values:
                        continue
                    
                    rec_resource = {
                        'name': rec_name,
                        'resource_id': f"{zone_id}:{rec_name}:{rec_type}",
                        'type': 'route53_record',
                        'status': 'active',
                        'region': 'global',
                        'account_id': account_id,
                        'dns_name': rec_name,
                        'tags': {},
                        'type_specific_properties': {
                            'zone_id': zone_id,
                            'zone_name': zone_name,
                            'record_type': rec_type,
                            'record_values': record_values,
                            'alias_target': {
                                'dns_name': alias_target.get('DNSName', '').rstrip('.'),
                                'hosted_zone_id': alias_target.get('HostedZoneId', ''),
                                'evaluate_target_health': alias_target.get('EvaluateTargetHealth', False),
                            } if alias_target else None,
                            'ttl': record.get('TTL'),
                            'set_identifier': record.get('SetIdentifier'),
                            'weight': record.get('Weight'),
                            'failover': record.get('Failover'),
                        }
                    }
                    resources.append(rec_resource)
                
                logger.info(f"Zone {zone_name}: {len(all_records)} records scanned")
                
            except Exception as e:
                logger.error(f"Error getting details for hosted zone {zone_id}: {e}")
                
        zones_count = sum(1 for r in resources if r['type'] == 'route53')
        records_count = sum(1 for r in resources if r['type'] == 'route53_record')
        logger.info(f"Found {zones_count} Route53 hosted zones with {records_count} DNS records")
    except Exception as e:
        logger.error(f"Error scanning Route53: {e}")
        
    return resources


def scan_cloudfront_distributions(session: boto3.Session, region: str, account_id: str) -> List[Dict[str, Any]]:
    """Scan CloudFront Distributions"""
    cloudfront = session.client('cloudfront')
    resources = []
    
    try:
        distributions = cloudfront.list_distributions()
        if 'DistributionList' in distributions and 'Items' in distributions['DistributionList']:
            for dist in distributions['DistributionList']['Items']:
                dist_id = dist['Id']
                
                # Get distribution tags
                try:
                    tags_response = cloudfront.list_tags_for_resource(
                        Resource=f"arn:aws:cloudfront::{account_id}:distribution/{dist_id}"
                    )
                    tags = {tag['Key']: tag['Value'] for tag in tags_response.get('Tags', {}).get('Items', [])}
                except:
                    tags = {}
                
                # Get origins
                origins = []
                if 'Origins' in dist and 'Items' in dist['Origins']:
                    origins = [origin.get('DomainName', '') for origin in dist['Origins']['Items']]
                
                resource = {
                    'name': dist.get('Aliases', {}).get('Items', [dist_id])[0] if dist.get('Aliases', {}).get('Items') else dist_id,
                    'resource_id': dist_id,
                    'type': 'cloudfront',
                    'status': dist['Status'].lower(),
                    'region': 'global',  # CloudFront is global
                    'account_id': account_id,
                    'tags': tags,
                    'type_specific_properties': {
                        'domain_name': dist['DomainName'],
                        'enabled': dist.get('Enabled', False),
                        'price_class': dist.get('PriceClass', 'Unknown'),
                        'origins': origins,
                        'origin_count': len(origins),
                        'aliases': dist.get('Aliases', {}).get('Items', []),
                        'default_root_object': dist.get('DefaultRootObject', ''),
                        'http_version': dist.get('HttpVersion', 'http2'),
                        'is_ipv6_enabled': dist.get('IsIPV6Enabled', False),
                        'comment': dist.get('Comment', '')
                    }
                }
                resources.append(resource)
                
        logger.info(f"Found {len(resources)} CloudFront distributions")
    except Exception as e:
        logger.error(f"Error scanning CloudFront: {e}")
        
    return resources


def scan_amazon_mq_brokers(session: boto3.Session, region: str, account_id: str) -> List[Dict[str, Any]]:
    """Scan Amazon MQ Brokers"""
    mq = session.client('mq')
    resources = []
    
    try:
        brokers = mq.list_brokers()['BrokerSummaries']
        for broker_summary in brokers:
            broker_id = broker_summary['BrokerId']
            
            # Get detailed broker info
            try:
                broker = mq.describe_broker(BrokerId=broker_id)
                
                # Get tags
                tags = broker.get('Tags', {})
                
                # Get users
                try:
                    users_response = mq.list_users(BrokerId=broker_id)
                    user_count = len(users_response.get('Users', []))
                except:
                    user_count = 0
                
                resource = {
                    'name': broker.get('BrokerName', broker_id),
                    'resource_id': broker_id,
                    'type': 'amazonmq',
                    'status': broker.get('BrokerState', 'unknown').lower(),
                    'region': region,
                    'account_id': account_id,
                    'vpc_id': broker.get('SubnetIds', [None])[0].split('-')[0] if broker.get('SubnetIds') else None,  # Approximate VPC from subnet
                    'tags': tags,
                    'type_specific_properties': {
                        'broker_id': broker_id,
                        'broker_arn': broker.get('BrokerArn'),
                        'engine_type': broker.get('EngineType', 'Unknown'),
                        'engine_version': broker.get('EngineVersion', 'Unknown'),
                        'deployment_mode': broker.get('DeploymentMode', 'Unknown'),
                        'instance_type': broker.get('HostInstanceType', 'Unknown'),
                        'publicly_accessible': broker.get('PubliclyAccessible', False),
                        'auto_minor_version_upgrade': broker.get('AutoMinorVersionUpgrade', False),
                        'user_count': user_count,
                        'subnet_ids': broker.get('SubnetIds', []),
                        'security_groups': broker.get('SecurityGroups', []),
                        'endpoints': broker.get('BrokerInstances', [{}])[0].get('Endpoints', []) if broker.get('BrokerInstances') else [],
                        'maintenance_window': broker.get('MaintenanceWindowStartTime', {})
                    }
                }
                resources.append(resource)
            except Exception as e:
                logger.error(f"Error getting details for MQ broker {broker_id}: {e}")
                
        logger.info(f"Found {len(resources)} Amazon MQ brokers")
    except Exception as e:
        logger.error(f"Error scanning Amazon MQ: {e}")
        
    return resources
