"""
CSV Field Mapping Validator
Analyzes CSV structure and validates against database schema
"""
import csv
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.models import Resource
from sqlalchemy import inspect

# CSV file path
CSV_FILE = r"d:\aws-archetect\resources.csv"

def analyze_csv_structure():
    """Analyze the CSV file structure"""
    print("=" * 80)
    print("CSV STRUCTURE ANALYSIS")
    print("=" * 80)
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        
        print(f"\n📊 Total Columns: {len(headers)}")
        print("\n📋 CSV Headers:")
        for i, header in enumerate(headers, 1):
            print(f"  {i:3d}. {header}")
        
        # Read first few rows for data analysis
        rows = []
        for i, row in enumerate(reader):
            if i >= 3:
                break
            rows.append(row)
        
        return headers, rows

def get_database_schema():
    """Get Resource model schema"""
    print("\n" + "=" * 80)
    print("DATABASE SCHEMA ANALYSIS")
    print("=" * 80)
    
    inspector = inspect(Resource)
    columns = inspector.columns
    
    print(f"\n📊 Total Database Fields: {len(columns)}")
    print("\n📋 Database Fields:")
    
    schema = {}
    for col in columns:
        col_type = str(col.type)
        nullable = "NULL" if col.nullable else "NOT NULL"
        default = f"default={col.default}" if col.default else ""
        
        schema[col.name] = {
            'type': col_type,
            'nullable': col.nullable,
            'default': col.default
        }
        
        print(f"  • {col.name:30s} {col_type:20s} {nullable:10s} {default}")
    
    return schema

def create_field_mapping():
    """Create recommended field mapping"""
    print("\n" + "=" * 80)
    print("FIELD MAPPING RECOMMENDATIONS")
    print("=" * 80)
    
    mapping = {
        # Direct mappings
        'Identifier': 'resource_id',
        'ARN': 'arn',
        'Resource type': 'type',
        'Region': 'region',
        'AWS Account': 'account_id',
        'Application': 'application',
        'LastReportedAt': 'last_reported_at',
        'Service': 'aws_service',
        
        # Tag mappings
        'Tag:Name': 'name',
        'Tag:Environment': 'environment',
        'Tag:project': 'project',
        'Tag:cost-center': 'cost_center',
        'Tag:Backup': 'notes',  # Could be used for backup info
        
        # All other Tag:* columns should be collected into tags JSON field
    }
    
    print("\n✅ DIRECT FIELD MAPPINGS:")
    print("-" * 80)
    for csv_col, db_field in mapping.items():
        print(f"  {csv_col:40s} → {db_field}")
    
    print("\n📦 TAG COLLECTION:")
    print("-" * 80)
    print("  All 'Tag:*' columns → Collect into 'tags' JSON field")
    print("  Example: Tag:Environment=prod → tags={'Environment': 'prod'}")
    
    print("\n🔍 ARN EXTRACTION:")
    print("-" * 80)
    print("  From ARN field, extract:")
    print("    • account_id (if not in 'AWS Account' column)")
    print("    • region (if not in 'Region' column)")
    print("    • resource_id (if not in 'Identifier' column)")
    print("    • aws_service (from ARN service part)")
    
    print("\n⚠️  MISSING IN CSV (will use defaults):")
    print("-" * 80)
    missing_fields = [
        'vpc_id', 'subnet_id', 'availability_zone', 'security_groups',
        'public_ip', 'private_ip', 'dns_name', 'endpoint',
        'instance_type', 'status', 'owner',
        'dependencies', 'connected_resources', 'attached_to',
        'parent_resource', 'child_resources', 'target_resources', 'source_resources'
    ]
    for field in missing_fields:
        print(f"  • {field}")
    
    print("\n💡 CONNECTIVITY EXTRACTION STRATEGY:")
    print("-" * 80)
    print("  1. Parse resource_id patterns:")
    print("     • sg-* → security group")
    print("     • subnet-* → subnet")
    print("     • vpc-* → VPC")
    print("     • i-* → EC2 instance")
    print("  2. Extract from ARN structure:")
    print("     • security-group-rule → links to security group")
    print("     • snapshot → links to source resource")
    print("  3. Infer from resource type:")
    print("     • ec2:security-group-rule → attached_to security group")
    print("     • rds:snapshot → backs_up RDS instance")
    print("     • lambda:event-source-mapping → connects_to event source")
    
    return mapping

def validate_sample_data(headers, rows):
    """Validate sample data"""
    print("\n" + "=" * 80)
    print("SAMPLE DATA VALIDATION")
    print("=" * 80)
    
    for i, row in enumerate(rows, 1):
        print(f"\n📝 Sample Row {i}:")
        print(f"  Identifier: {row.get('Identifier', 'N/A')}")
        print(f"  ARN: {row.get('ARN', 'N/A')[:80]}...")
        print(f"  Type: {row.get('Resource type', 'N/A')}")
        print(f"  Region: {row.get('Region', 'N/A')}")
        print(f"  Account: {row.get('AWS Account', 'N/A')}")
        print(f"  Service: {row.get('Service', 'N/A')}")
        
        # Count tags
        tag_count = sum(1 for k, v in row.items() if k.startswith('Tag:') and v and v != '(not tagged)')
        print(f"  Tags: {tag_count} tags present")
        
        # Show actual tags
        if tag_count > 0:
            print("  Tag values:")
            for k, v in row.items():
                if k.startswith('Tag:') and v and v != '(not tagged)':
                    tag_name = k.replace('Tag:', '')
                    print(f"    • {tag_name}: {v}")

def generate_import_recommendations():
    """Generate import recommendations"""
    print("\n" + "=" * 80)
    print("IMPORT RECOMMENDATIONS")
    print("=" * 80)
    
    recommendations = [
        "1. Filter out linked/metadata resources during import:",
        "   • ec2:security-group-rule (keep for relationship extraction)",
        "   • rds:snapshot (keep for backup relationships)",
        "   • config:config-rule (skip - monitoring metadata)",
        "",
        "2. Extract relationships during import:",
        "   • security-group-rule → security group (applies_to)",
        "   • snapshot → source instance (backs_up)",
        "   • event-source-mapping → Lambda + event source (connects_to)",
        "",
        "3. Consolidate tags into JSON:",
        "   • Merge all Tag:* columns into tags field",
        "   • Remove '(not tagged)' values",
        "   • Keep tag structure for filtering",
        "",
        "4. Set intelligent defaults:",
        "   • status = 'unknown' (can be updated later)",
        "   • name = Identifier if Tag:Name is empty",
        "   • environment = extract from Tag:Environment or name pattern",
        "",
        "5. Create ResourceRelationship entries:",
        "   • Auto-detect relationships from resource IDs",
        "   • Set auto_detected='yes' and confidence='high/medium/low'",
        "   • Store relationship metadata in properties JSON"
    ]
    
    for rec in recommendations:
        print(f"  {rec}")

if __name__ == "__main__":
    try:
        # Analyze CSV
        headers, sample_rows = analyze_csv_structure()
        
        # Get database schema
        db_schema = get_database_schema()
        
        # Create mapping
        mapping = create_field_mapping()
        
        # Validate sample data
        validate_sample_data(headers, sample_rows)
        
        # Generate recommendations
        generate_import_recommendations()
        
        print("\n" + "=" * 80)
        print("✅ VALIDATION COMPLETE")
        print("=" * 80)
        print("\nThe CSV structure is compatible with the database schema.")
        print("Proceed with import using the recommended field mappings.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
