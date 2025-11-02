# 🔧 AWS Resources Management Guide

## Overview

The AWS Resources feature allows authenticated users to manage their AWS infrastructure resources with full CRUD (Create, Read, Update, Delete) operations. All resources are linked to the authenticated user and stored in PostgreSQL.

## Features

✅ **Complete CRUD Operations**
- Create new AWS resources
- View all user resources in a table
- Edit existing resources
- Delete resources with confirmation

✅ **Resource Properties**
- **Name**: Unique identifier for the resource
- **Type**: AWS service type (EC2, S3, RDS, Lambda, etc.)
- **Region**: AWS region where the resource is deployed
- **Dependencies**: Array of resource dependencies
- **Description**: Optional detailed description
- **Created By**: Automatically linked to authenticated user
- **Timestamps**: Auto-generated creation and update times

✅ **Security**
- JWT token-based authentication required
- Users can only access their own resources
- Token validation on every API call

✅ **Bilingual Support**
- Full English and Arabic translations
- RTL layout support for Arabic
- Localized resource types and regions

## Backend API Endpoints

### Base URL
```
http://localhost:8000/resources
```

### Authentication
All endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### 1. Get All Resources
```http
GET /resources/
```

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100)

**Response:** Array of resources
```json
[
  {
    "id": 1,
    "name": "my-web-server",
    "type": "ec2",
    "region": "us-east-1",
    "dependencies": ["vpc-123", "sg-456"],
    "description": "Production web server",
    "created_by": 1,
    "created_at": "2024-10-28T12:00:00Z",
    "updated_at": null
  }
]
```

#### 2. Get Single Resource
```http
GET /resources/{resource_id}
```

**Response:** Single resource object

#### 3. Create Resource
```http
POST /resources/
```

**Request Body:**
```json
{
  "name": "my-database",
  "type": "rds",
  "region": "us-east-1",
  "dependencies": ["vpc-123"],
  "description": "MySQL production database"
}
```

**Response:** Created resource with ID

#### 4. Update Resource
```http
PUT /resources/{resource_id}
```

**Request Body:** (all fields optional)
```json
{
  "name": "updated-name",
  "description": "Updated description"
}
```

**Response:** Updated resource

#### 5. Delete Resource
```http
DELETE /resources/{resource_id}
```

**Response:** 204 No Content

## Frontend Components

### Pages

#### Resources Page (`/resources`)
Main page displaying all user resources in a responsive table.

**Features:**
- Table view with sorting
- Add Resource button
- Edit and Delete actions per row
- Empty state with call-to-action
- Loading states
- Success/Error notifications

#### Resource Modal
Modal dialog for adding and editing resources.

**Features:**
- Dynamic form (Add/Edit mode)
- Input validation
- Dependencies management (add/remove tags)
- Resource type dropdown
- Region dropdown
- Bilingual labels

### Navigation

Access Resources page from:
1. **Dashboard**: Click "Resources" button in header
2. **Dashboard**: Click "Resources" card in main content
3. **Direct URL**: Navigate to `/resources`

## Supported AWS Resource Types

| Type | English | Arabic |
|------|---------|--------|
| `ec2` | EC2 Instance | مثيل EC2 |
| `s3` | S3 Bucket | حاوية S3 |
| `rds` | RDS Database | قاعدة بيانات RDS |
| `lambda` | Lambda Function | دالة Lambda |
| `vpc` | VPC | VPC |
| `elb` | Load Balancer | موازن التحميل |
| `cloudfront` | CloudFront Distribution | توزيع CloudFront |
| `route53` | Route 53 Zone | منطقة Route 53 |
| `dynamodb` | DynamoDB Table | جدول DynamoDB |
| `sns` | SNS Topic | موضوع SNS |
| `sqs` | SQS Queue | قائمة انتظار SQS |

## Supported AWS Regions

| Region Code | English | Arabic |
|-------------|---------|--------|
| `us-east-1` | US East (N. Virginia) | شرق الولايات المتحدة (فيرجينيا) |
| `us-east-2` | US East (Ohio) | شرق الولايات المتحدة (أوهايو) |
| `us-west-1` | US West (N. California) | غرب الولايات المتحدة (كاليفورنيا) |
| `us-west-2` | US West (Oregon) | غرب الولايات المتحدة (أوريغون) |
| `eu-west-1` | EU (Ireland) | أوروبا (أيرلندا) |
| `eu-central-1` | EU (Frankfurt) | أوروبا (فرانكفورت) |
| `ap-southeast-1` | Asia Pacific (Singapore) | آسيا والمحيط الهادئ (سنغافورة) |
| `ap-northeast-1` | Asia Pacific (Tokyo) | آسيا والمحيط الهادئ (طوكيو) |

## Database Schema

### Resources Table

```sql
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    region VARCHAR NOT NULL,
    dependencies JSON DEFAULT '[]',
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_resources_created_by ON resources(created_by);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_name ON resources(name);
```

### Relationships
- **One-to-Many**: User → Resources
- **Cascade Delete**: Deleting a user deletes all their resources

## Usage Examples

### Create a Resource via API

**PowerShell:**
```powershell
$token = "your_access_token_here"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    name = "prod-web-server"
    type = "ec2"
    region = "us-east-1"
    dependencies = @("vpc-prod", "sg-web")
    description = "Production web server instance"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/resources/" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

**cURL:**
```bash
curl -X POST http://localhost:8000/resources/ \
  -H "Authorization: Bearer your_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prod-web-server",
    "type": "ec2",
    "region": "us-east-1",
    "dependencies": ["vpc-prod", "sg-web"],
    "description": "Production web server instance"
  }'
```

### Get All Resources

```bash
curl -X GET http://localhost:8000/resources/ \
  -H "Authorization: Bearer your_access_token_here"
```

### Update a Resource

```bash
curl -X PUT http://localhost:8000/resources/1 \
  -H "Authorization: Bearer your_access_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

### Delete a Resource

```bash
curl -X DELETE http://localhost:8000/resources/1 \
  -H "Authorization: Bearer your_access_token_here"
```

## Frontend Usage

### 1. Access Resources Page
Login → Dashboard → Click "Resources" button

### 2. Add New Resource
1. Click "Add Resource" button
2. Fill in the form:
   - Enter resource name
   - Select resource type
   - Select AWS region
   - Add dependencies (optional)
   - Add description (optional)
3. Click "Save"

### 3. Edit Resource
1. Click edit icon (pencil) in the Actions column
2. Modify fields in the modal
3. Click "Save"

### 4. Delete Resource
1. Click delete icon (trash) in the Actions column
2. Confirm deletion in the dialog
3. Resource is permanently deleted

### 5. Change Language
Click the globe icon (🌐) to toggle between English and Arabic

## Error Handling

### Backend Errors
- **401 Unauthorized**: Token missing or invalid → Redirects to login
- **404 Not Found**: Resource doesn't exist or user doesn't own it
- **400 Bad Request**: Invalid data format or validation error

### Frontend Error Messages
- `resourceCreated`: "Resource created successfully!"
- `resourceUpdated`: "Resource updated successfully!"
- `resourceDeleted`: "Resource deleted successfully!"
- `resourceError`: "Failed to process resource"

## Best Practices

### Dependencies Management
Dependencies should reference other resource IDs or names:
```json
{
  "dependencies": [
    "vpc-prod-001",
    "subnet-private-a",
    "security-group-web"
  ]
}
```

### Naming Convention
Use descriptive, unique names:
- ✅ Good: `prod-web-server-01`, `staging-db-mysql`
- ❌ Bad: `server1`, `db`

### Resource Types
Always use lowercase values from the supported types list.

### Regions
Use official AWS region codes (e.g., `us-east-1`, not `US East`).

## Adding New Resource Types

### Backend
No changes needed - the type field accepts any string.

### Frontend
1. Edit `frontend/src/i18n.js`
2. Add new type to translations:

```javascript
// English
ebs: 'EBS Volume',

// Arabic
ebs: 'وحدة تخزين EBS',
```

3. Add to ResourceModal dropdown:

```javascript
const resourceTypes = [
  // ... existing types
  { value: 'ebs', label: t('ebs') },
];
```

## Adding New Regions

Follow the same pattern as adding resource types in both translation files and the regions dropdown.

## Security Considerations

✅ **Implemented:**
- JWT authentication on all endpoints
- User-resource ownership validation
- SQL injection protection via ORM
- CORS configuration

⚠️ **Recommendations:**
- Implement rate limiting
- Add input sanitization for descriptions
- Log all resource operations
- Add resource quota per user
- Implement soft delete (archive)

## Testing

### Manual Testing

1. **Create Resource**
   - Login → Resources → Add Resource
   - Fill form and submit
   - Verify resource appears in table

2. **Edit Resource**
   - Click edit icon on a resource
   - Modify fields and save
   - Verify changes in table

3. **Delete Resource**
   - Click delete icon
   - Confirm deletion
   - Verify resource removed from table

4. **Language Toggle**
   - Switch to Arabic
   - Verify all text is translated
   - Verify RTL layout

### API Testing Script

Create a file `test-resources.ps1`:

```powershell
# Login first
$login = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"test@example.com","password":"password123"}'

$token = $login.access_token
$headers = @{ "Authorization" = "Bearer $token" }

# Create resource
$resource = Invoke-RestMethod -Uri "http://localhost:8000/resources/" `
    -Method POST `
    -Headers $headers `
    -ContentType "application/json" `
    -Body '{"name":"test-server","type":"ec2","region":"us-east-1","dependencies":[]}'

Write-Host "Created resource: $($resource.id)"

# Get all resources
$resources = Invoke-RestMethod -Uri "http://localhost:8000/resources/" `
    -Method GET `
    -Headers $headers

Write-Host "Total resources: $($resources.Count)"

# Update resource
$updated = Invoke-RestMethod -Uri "http://localhost:8000/resources/$($resource.id)" `
    -Method PUT `
    -Headers $headers `
    -ContentType "application/json" `
    -Body '{"description":"Updated via API"}'

Write-Host "Updated resource: $($updated.description)"

# Delete resource
Invoke-RestMethod -Uri "http://localhost:8000/resources/$($resource.id)" `
    -Method DELETE `
    -Headers $headers

Write-Host "Deleted resource"
```

## Troubleshooting

### Resource Not Appearing
- Check authentication token is valid
- Verify resource was created successfully (check response)
- Refresh the page
- Check browser console for errors

### Cannot Delete Resource
- Ensure you own the resource
- Check for database constraints
- Verify token hasn't expired

### Dependencies Not Saving
- Check JSON format is valid
- Ensure dependencies is an array
- Verify no special characters

### Modal Not Closing
- Check for validation errors
- Ensure all required fields are filled
- Check browser console for errors

---

**Happy Resource Management! 🚀**

For more information, check the main README.md or API documentation at http://localhost:8000/docs
