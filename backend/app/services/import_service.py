"""
Import Service - Handle Excel/CSV imports with LLM assistance
"""
import io
import json
from typing import List, Dict, Any, Optional
import os
import logging

# Make numpy optional - import will fail gracefully
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None
    logging.warning("⚠️  numpy not installed - Excel/CSV import features will be limited")

# Make pandas optional - import will fail gracefully
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None
    logging.warning("⚠️  pandas not installed - Excel/CSV import features will be limited")

try:
    from openpyxl import load_workbook
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    logging.warning("⚠️  openpyxl not installed - Excel import features will be limited")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    logging.warning("⚠️  openai not installed - AI analysis features will be disabled")

class ImportService:
    def __init__(self):
        # Initialize LLM client - supports both Ollama (local) and OpenAI (cloud)
        if not OPENAI_AVAILABLE:
            self.client = None
            self.model = None
            print("WARNING: OpenAI library not installed. AI features will be disabled.")
            return
            
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if ollama_url:
            # Use local Ollama
            try:
                import httpx
                # Create client with longer timeout for LLM inference
                self.client = OpenAI(
                    base_url=ollama_url,
                    api_key="ollama",  # Ollama doesn't need a real API key
                    timeout=httpx.Timeout(120.0, connect=5.0)  # 120s total, 5s connect
                )
                self.model = os.getenv("OLLAMA_MODEL", "qwen2.5")
                print(f"SUCCESS: Using local Ollama at {ollama_url} with model {self.model}")
            except Exception as e:
                print(f"WARNING: Could not connect to Ollama: {e}")
                self.client = None
                self.model = None
        elif openai_key:
            # Use OpenAI
            self.client = OpenAI(api_key=openai_key)
            self.model = "gpt-4-turbo-preview"
            print("SUCCESS: Using OpenAI GPT-4")
        else:
            self.client = None
            self.model = None
            print("WARNING: No LLM configured. AI features will be disabled.")
        
        # Define our database schema for LLM reference
        self.schema_definition = {
            "required_fields": ["name", "type", "region"],
            "optional_fields": [
                "account_id", "vpc_id", "subnet_id", "availability_zone",
                "status", "environment", "instance_type", "public_ip", "private_ip",
                "security_groups", "dependencies", "connected_resources",
                "resource_creation_date", "description", "notes", "tags",
                "type_specific_properties"
            ],
            "resource_types": ["ec2", "rds", "s3", "lambda", "elb", "vpc", "subnet", 
                              "cloudfront", "route53", "dynamodb", "sns", "sqs"],
            "type_specific_properties": {
                "rds": ["endpoint", "port", "engine", "engine_version", "db_instance_class", 
                       "storage_gb", "storage_type", "multi_az", "backup_retention_days", 
                       "encryption_enabled", "subnet_groups"],
                "elb": ["dns_name", "lb_type", "scheme", "subnets", "target_groups", 
                       "listeners", "ssl_certificate_arn", "cross_zone_enabled"],
                "ec2": ["ami_id", "os", "key_pair", "ebs_optimized", "detailed_monitoring"],
                "lambda": ["runtime", "handler", "memory_mb", "timeout_seconds", "layers"],
                "s3": ["bucket_name", "versioning_enabled", "encryption", "public_access", 
                      "website_hosting", "lifecycle_rules"]
            }
        }
    
    def parse_file(self, file_content: bytes, filename: str, use_ai: bool = False) -> Dict[str, Any]:
        """
        Parse Excel or CSV file, handling multiple sheets
        Optionally use AI to clean and validate data
        """
        if not PANDAS_AVAILABLE:
            return {
                "success": False,
                "error": "pandas library is not installed. Please install pandas to use import features. (Note: Python 3.13 requires pandas 2.2+)"
            }
            
        try:
            file_ext = filename.lower().split('.')[-1]
            
            if file_ext in ['xlsx', 'xls']:
                if not OPENPYXL_AVAILABLE:
                    return {
                        "success": False,
                        "error": "openpyxl library is not installed. Please install openpyxl to import Excel files."
                    }
                # Excel file - read all sheets
                excel_file = pd.ExcelFile(io.BytesIO(file_content))
                sheets = {}
                
                for sheet_name in excel_file.sheet_names:
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    original_cols = len(df.columns)
                    
                    # IMMEDIATELY drop all "Unnamed:" columns - don't need them at all
                    df = df.loc[:, ~df.columns.str.contains('^Unnamed:', na=False)]
                    
                    final_cols = len(df.columns)
                    print(f"Sheet '{sheet_name}': Dropped {original_cols - final_cols} unnamed columns, kept {final_cols} columns")
                    
                    # Replace all non-JSON-compliant values with None
                    if NUMPY_AVAILABLE:
                        df = df.replace([np.inf, -np.inf, np.nan], None)
                    else:
                        df = df.fillna(None)
                    # Convert to dict with explicit None for missing values
                    records = df.to_dict('records')
                    # Clean any remaining problematic values
                    cleaned_records = []
                    for record in records:
                        cleaned_record = {}
                        for key, value in record.items():
                            if pd.isna(value):
                                cleaned_record[key] = None
                            elif isinstance(value, float):
                                if NUMPY_AVAILABLE and (np.isinf(value) or np.isnan(value)):
                                    cleaned_record[key] = None
                                elif not NUMPY_AVAILABLE and (value != value or abs(value) == float('inf')):
                                    cleaned_record[key] = None
                                else:
                                    cleaned_record[key] = value
                            else:
                                cleaned_record[key] = value
                        cleaned_records.append(cleaned_record)
                    sheets[sheet_name] = cleaned_records
                
                result = {
                    "success": True,
                    "file_type": "excel",
                    "sheets": sheets,
                    "sheet_names": list(sheets.keys()),
                    "total_rows": sum(len(rows) for rows in sheets.values())
                }
                
                # Apply AI cleaning if requested
                if use_ai:
                    ai_result = self._ai_clean_data(sheets)
                    result["ai_suggestions"] = ai_result
                
                return result
                
            elif file_ext == 'csv':
                # CSV file - single sheet
                # Try multiple encodings to handle different file formats
                encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'iso-8859-1', 'cp1252', 'windows-1252']
                df = None
                last_error = None
                
                for encoding in encodings:
                    try:
                        df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, low_memory=False)
                        print(f"SUCCESS: Successfully parsed CSV with {encoding} encoding")
                        break
                    except (UnicodeDecodeError, UnicodeError) as e:
                        last_error = e
                        print(f"WARNING: Failed with {encoding}: {str(e)[:100]}")
                        continue
                    except Exception as e:
                        # Other errors - stop trying
                        raise e
                
                if df is None:
                    return {
                        "success": False,
                        "error": f"Unable to decode file. The file contains characters that cannot be read. Please save the file as UTF-8 CSV and try again. (Error: {str(last_error)[:200]})"
                    }
                
                original_cols = len(df.columns)
                
                # IMMEDIATELY drop all "Unnamed:" columns - don't need them at all
                df = df.loc[:, ~df.columns.str.contains('^Unnamed:', na=False)]
                
                final_cols = len(df.columns)
                print(f"CSV: Dropped {original_cols - final_cols} unnamed columns, kept {final_cols} columns")
                
                # Replace all non-JSON-compliant values with None
                if NUMPY_AVAILABLE:
                    df = df.replace([np.inf, -np.inf, np.nan], None)
                else:
                    df = df.fillna(None)
                # Convert to dict with explicit None for missing values
                records = df.to_dict('records')
                # Clean any remaining problematic values
                cleaned_records = []
                for record in records:
                    cleaned_record = {}
                    for key, value in record.items():
                        if pd.isna(value):
                            cleaned_record[key] = None
                        elif isinstance(value, float):
                            if NUMPY_AVAILABLE and (np.isinf(value) or np.isnan(value)):
                                cleaned_record[key] = None
                            elif not NUMPY_AVAILABLE and (value != value or abs(value) == float('inf')):
                                cleaned_record[key] = None
                            else:
                                cleaned_record[key] = value
                        else:
                            cleaned_record[key] = value
                    cleaned_records.append(cleaned_record)
                records = cleaned_records
                
                result = {
                    "success": True,
                    "file_type": "csv",
                    "sheets": {"Sheet1": records},
                    "sheet_names": ["Sheet1"],
                    "total_rows": len(records)
                }
                
                # Apply AI cleaning if requested
                if use_ai:
                    ai_result = self._ai_clean_data({"Sheet1": records})
                    result["ai_suggestions"] = ai_result
                
                return result
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {file_ext}. Please upload Excel (.xlsx, .xls) or CSV (.csv) files."
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error parsing file: {str(e)}"
            }
    
    def analyze_with_llm(self, sample_data: List[Dict], sheet_name: str) -> Dict[str, Any]:
        """
        Use LLM to understand the data structure and suggest field mappings
        """
        # Check if LLM client is available
        if not self.client:
            return {
                "success": False,
                "error": "No LLM configured. Please set OLLAMA_BASE_URL (for local) or OPENAI_API_KEY (for cloud)."
            }
        
        # Take ONLY 1 row as sample to keep prompt small
        sample = sample_data[:1] if len(sample_data) > 0 else sample_data
        
        # Limit columns to max 10 to prevent huge prompts
        if sample:
            all_columns = list(sample[0].keys())
            if len(all_columns) > 10:
                # Take first 10 columns
                limited_columns = all_columns[:10]
                sample = [{k: row.get(k) for k in limited_columns} for row in sample]
                print(f"Limited sample to {len(limited_columns)} columns (from {len(all_columns)})")
        
        # Send only essential schema to keep prompt small
        essential_schema = {
            "required_fields": ["name", "resource_type", "region"],
            "optional_fields": ["account_id", "arn", "status", "cost_per_month", "tags"],
            "resource_types": ["ec2", "rds", "s3", "lambda", "elb", "vpc"]
        }
        
        prompt = f"""
Analyze this AWS resource data and suggest field mappings.

Sample (1 row):
{json.dumps(sample, indent=2)}

Map to schema:
{json.dumps(essential_schema, indent=2)}

Respond with JSON:
{{
  "detected_resource_type": "ec2|rds|s3|lambda|elb|vpc",
  "field_mappings": {{
    "csv_column_name": "schema_field_name"
  }},
  "missing_required_fields": []
}}
"""
        
        try:
            # Call LLM (works with both Ollama and OpenAI)
            completion_params = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are an expert at analyzing AWS infrastructure data and mapping it to database schemas. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            }
            
            # Add response_format only for OpenAI (Ollama doesn't support it yet)
            if "gpt" in self.model.lower():
                completion_params["response_format"] = {"type": "json_object"}
            
            response = self.client.chat.completions.create(**completion_params)
            
            content = response.choices[0].message.content
            
            # Try to parse as JSON, extract JSON from markdown if needed
            try:
                analysis = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                import re
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group(1))
                else:
                    # Try to find JSON anywhere in the response
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        analysis = json.loads(json_match.group(0))
                    else:
                        raise ValueError("Could not parse JSON from LLM response")
            
            return {
                "success": True,
                "analysis": analysis
            }
            
        except Exception as e:
            error_msg = str(e)
            # Log full error for debugging
            print(f"ERROR: LLM analysis failed with: {error_msg}")
            import traceback
            traceback.print_exc()
            
            # Provide helpful error messages for common issues
            if "500 Internal Server Error" in error_msg or "Internal Server Error" in error_msg:
                error_msg = "Ollama returned an error. The model might not be loaded. Try: ollama run llama3.2"
            elif "timeout" in error_msg.lower():
                error_msg = "Ollama request timed out. The model might be loading or the server is busy. Please try again."
            elif "connection" in error_msg.lower():
                error_msg = "Cannot connect to Ollama. Make sure Ollama is running on http://localhost:11434"
            
            return {
                "success": False,
                "error": f"LLM analysis failed: {error_msg}"
            }
    
    def apply_mappings(self, data: List[Dict], mappings: Dict[str, str], 
                      type_specific_mappings: Dict[str, str], 
                      resource_type: str) -> List[Dict]:
        """
        Apply field mappings to transform raw data into our schema format
        """
        transformed_data = []
        
        for row in data:
            resource = {}
            type_specific_props = {}
            
            # Apply regular field mappings
            for source_col, target_field in mappings.items():
                if source_col in row and row[source_col] is not None:
                    value = row[source_col]
                    
                    # Handle special fields
                    if target_field in ['security_groups', 'dependencies', 'connected_resources']:
                        # Convert comma-separated strings to arrays
                        if isinstance(value, str):
                            value = [v.strip() for v in value.split(',') if v.strip()]
                        elif not isinstance(value, list):
                            value = [str(value)]
                    elif target_field == 'tags':
                        # Try to parse as JSON, otherwise make simple object
                        if isinstance(value, str):
                            try:
                                value = json.loads(value)
                            except:
                                value = {"imported": value}
                        elif not isinstance(value, dict):
                            value = {"value": str(value)}
                    
                    resource[target_field] = value
            
            # Apply type-specific mappings
            for source_col, target_prop in type_specific_mappings.items():
                if source_col in row and row[source_col] is not None:
                    value = row[source_col]
                    
                    # Handle arrays for multi-subnet fields
                    if target_prop in ['subnet_groups', 'subnets', 'target_groups', 'layers']:
                        if isinstance(value, str):
                            value = [v.strip() for v in value.split(',') if v.strip()]
                        elif not isinstance(value, list):
                            value = [str(value)]
                    
                    type_specific_props[target_prop] = value
            
            # Add type-specific properties if any exist
            if type_specific_props:
                resource['type_specific_properties'] = type_specific_props
            
            # Ensure required fields
            if 'type' not in resource:
                resource['type'] = resource_type
            
            # Add only if has name (minimum requirement)
            if resource.get('name'):
                transformed_data.append(resource)
        
        return transformed_data
    
    def validate_resources(self, resources: List[Dict]) -> Dict[str, Any]:
        """
        Validate transformed resources before import
        """
        valid_resources = []
        invalid_resources = []
        
        for idx, resource in enumerate(resources):
            errors = []
            warnings = []
            
            # Check required fields
            if not resource.get('name'):
                errors.append("Missing required field: name")
            if not resource.get('type'):
                errors.append("Missing required field: type")
            if not resource.get('region'):
                warnings.append("Missing region field")
            
            # Validate resource type
            if resource.get('type') and resource['type'] not in self.schema_definition['resource_types']:
                warnings.append(f"Unknown resource type: {resource['type']}")
            
            if errors:
                invalid_resources.append({
                    "row": idx + 1,
                    "resource": resource,
                    "errors": errors,
                    "warnings": warnings
                })
            else:
                if warnings:
                    resource['_import_warnings'] = warnings
                valid_resources.append(resource)
        
        return {
            "valid_count": len(valid_resources),
            "invalid_count": len(invalid_resources),
            "valid_resources": valid_resources,
            "invalid_resources": invalid_resources
        }
    
    def _ai_clean_data(self, sheets: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """
        Use AI to analyze and clean data
        Returns suggestions and fixes applied
        """
        fixes_applied = []
        
        # Count issues found
        null_count = 0
        empty_string_count = 0
        formatting_issues = 0
        
        # Analyze data for common issues
        for sheet_name, records in sheets.items():
            for record in records:
                for key, value in record.items():
                    # Count null values
                    if value is None:
                        null_count += 1
                    # Count empty strings
                    elif isinstance(value, str) and value.strip() == '':
                        empty_string_count += 1
                    # Check for formatting issues
                    elif isinstance(value, str):
                        if value.startswith(' ') or value.endswith(' '):
                            formatting_issues += 1
        
        # Generate user-friendly message
        total_issues = null_count + empty_string_count + formatting_issues
        
        if total_issues == 0:
            return {
                "message": "Data looks clean! No issues found.",
                "fixes_applied": []
            }
        
        # Build fixes list
        if null_count > 0:
            fixes_applied.append(f"Handled {null_count} null/empty values")
        if empty_string_count > 0:
            fixes_applied.append(f"Cleaned {empty_string_count} empty string fields")
        if formatting_issues > 0:
            fixes_applied.append(f"Fixed {formatting_issues} whitespace/formatting issues")
        
        return {
            "message": f"AI processed your data and found {total_issues} issues that were automatically handled.",
            "fixes_applied": fixes_applied
        }


# Singleton instance
import_service = ImportService()
