# 🤖 AI Integration Guide - Architecture Analysis

## Overview

The AI Integration feature provides intelligent analysis of your AWS architecture using either **OpenAI's GPT models** or **local LLMs via Ollama**. Get instant insights on cost optimization, security, and best practices.

## 🌟 Features

### Backend AI Capabilities
- ✅ **Dual Provider Support**: OpenAI (GPT-3.5/GPT-4) or Ollama (Llama2, Mistral, etc.)
- ✅ **Async API Calls**: Non-blocking architecture analysis
- ✅ **Context-Aware Analysis**: Uses your actual resources for insights
- ✅ **Auto-Summary Generation**: Comprehensive architecture breakdown
- ✅ **Custom Prompts**: Ask specific questions about your infrastructure

### Frontend Features
- ✅ **AI Insights Page**: Dedicated interface for AI interactions
- ✅ **Auto-Generate Summary**: One-click architecture analysis
- ✅ **Custom Prompts**: Ask anything about your AWS setup
- ✅ **Quick Prompts**: Pre-defined questions for common scenarios
- ✅ **PDF Download**: Export analysis reports
- ✅ **Bilingual Support**: Full English & Arabic translations
- ✅ **Real-time Analysis**: Loading states and error handling

## 📊 API Endpoints

### Base URL
```
http://localhost:8000/ai
```

### Endpoints

#### 1. Custom Analysis
```http
POST /ai/analyze
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "prompt": "How can I improve security?",
  "include_resources": true
}
```

**Response:**
```json
{
  "analysis": "Based on your architecture...",
  "summary": "Analyzed 5 resources"
}
```

#### 2. Architecture Summary
```http
GET /ai/summary
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "total_resources": 5,
  "resource_breakdown": {"ec2": 2, "s3": 3},
  "regions_used": ["us-east-1", "us-west-2"],
  "architecture_summary": "Your AWS architecture consists of...",
  "cost_optimization_tips": [
    "Consider Reserved Instances...",
    "Implement auto-scaling...",
    "Use S3 lifecycle policies..."
  ],
  "security_recommendations": [
    "Enable encryption at rest...",
    "Implement least-privilege IAM...",
    "Enable CloudTrail logging..."
  ],
  "best_practices": [
    "Implement multi-region failover...",
    "Use Infrastructure as Code...",
    "Set up comprehensive monitoring..."
  ]
}
```

## 🔧 Setup Instructions

### Option 1: OpenAI (Recommended for Production)

#### Step 1: Get API Key
1. Visit https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key

#### Step 2: Configure Backend
Edit `backend/.env`:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
LLM_PROVIDER=openai
```

**Available Models:**
- `gpt-3.5-turbo` - Fast, cost-effective (Recommended)
- `gpt-4` - More intelligent, higher cost
- `gpt-4-turbo-preview` - Latest GPT-4 variant

#### Step 3: Install Dependencies
```bash
cd backend
pip install openai==1.3.0 httpx==0.25.2
```

Or rebuild Docker:
```bash
docker-compose down
docker-compose up -d --build
```

#### Step 4: Test the Integration
```powershell
# Get access token first
$login = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
    -Method POST -ContentType "application/json" `
    -Body '{"email":"test@example.com","password":"password123"}'

# Test AI analysis
Invoke-RestMethod -Uri "http://localhost:8000/ai/summary" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $($login.access_token)"}
```

### Option 2: Ollama (Local LLM - Free!)

#### Step 1: Install Ollama
**Windows:**
```powershell
# Download from https://ollama.ai/download
# Or use winget:
winget install Ollama.Ollama
```

**Linux/Mac:**
```bash
curl https://ollama.ai/install.sh | sh
```

#### Step 2: Pull a Model
```bash
# Recommended models:
ollama pull llama2          # Good balance (7B params)
ollama pull mistral         # Fast and accurate (7B params)
ollama pull codellama       # Code-focused (7B params)
ollama pull llama2:13b      # More intelligent (13B params)
```

#### Step 3: Configure Backend
Edit `backend/.env`:
```env
# Ollama Configuration
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

#### Step 4: Start Ollama Service
```bash
ollama serve
```

#### Step 5: Test the Integration
```bash
# Test Ollama directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Analyze this AWS architecture",
  "stream": false
}'

# Test via your API
curl -X GET http://localhost:8000/ai/summary \
  -H "Authorization: Bearer your-token-here"
```

## 💡 Usage Guide

### Frontend Access

1. **Navigate to AI Insights**
   - Login → Dashboard → Click "AI Insights" button
   - Or directly: http://localhost:3000/ai-insights

2. **Auto-Generate Summary**
   - Click "Generate Summary" button
   - Wait for AI analysis (5-15 seconds)
   - View comprehensive breakdown

3. **Custom Analysis**
   - Type your question in the prompt box
   - Use quick prompts or write custom questions
   - Click "Analyze"
   - View AI response

4. **Download PDF**
   - Generate summary or custom analysis first
   - Click "Download as PDF"
   - PDF includes all generated content

### Quick Prompts Examples

**English:**
- "Explain my architecture"
- "Suggest improvements"
- "Cost optimization tips"
- "Security audit"
- "How can I improve reliability?"
- "What are my single points of failure?"
- "Recommend disaster recovery strategies"

**Arabic:**
- "اشرح بنيتي التحتية"
- "اقترح تحسينات"
- "نصائح لتحسين التكلفة"
- "تدقيق أمني"

## 📝 Sample Responses

### Auto-Summary Example

```
Architecture Summary:
Your AWS architecture consists of 5 resources across 2 regions (us-east-1, us-west-2). 
The infrastructure includes 2 EC2 instances, 2 S3 buckets, and 1 RDS database, indicating 
a web application setup with data storage and database layers.

Cost Optimization:
1. Consider Reserved Instances for your EC2 instances to save up to 72%
2. Implement S3 lifecycle policies to move old data to Glacier
3. Right-size your RDS instance based on actual usage metrics

Security Recommendations:
1. Enable encryption at rest for all S3 buckets and RDS database
2. Implement VPC security groups with least-privilege access
3. Enable AWS CloudTrail for comprehensive audit logging

Best Practices:
1. Implement multi-region deployment for critical resources
2. Use Auto Scaling Groups for EC2 instances
3. Set up CloudWatch alarms for monitoring and alerting
```

### Custom Prompt Example

**Prompt:** "How can I improve disaster recovery?"

**Response:**
```
Based on your current architecture, here are recommendations for improving disaster recovery:

1. Multi-Region Deployment:
   - Deploy critical resources in at least 2 regions
   - Use Route 53 for DNS failover

2. Database Backups:
   - Enable automated RDS snapshots (daily minimum)
   - Configure cross-region replication for RDS
   - Test restore procedures monthly

3. S3 Replication:
   - Enable Cross-Region Replication (CRR) for critical data
   - Use S3 versioning to protect against accidental deletions

4. Infrastructure as Code:
   - Document your infrastructure using Terraform or CloudFormation
   - Version control all IaC templates

5. Testing:
   - Conduct quarterly DR drills
   - Document and update runbooks
```

## 🎯 Best Practices

### For Accurate Analysis

1. **Add Detailed Descriptions**: Include meaningful descriptions for resources
2. **Specify Dependencies**: Accurately track resource dependencies
3. **Keep Resources Updated**: Regularly update your resource inventory
4. **Use Specific Prompts**: Ask focused questions for better results

### Prompt Engineering Tips

**Good Prompts:**
✅ "Analyze my architecture and suggest cost optimizations for EC2 instances"
✅ "What security improvements should I prioritize based on my current setup?"
✅ "How can I improve high availability for my database?"

**Poor Prompts:**
❌ "Help"
❌ "Analyze"
❌ "What should I do?"

### Cost Considerations

#### OpenAI Pricing (as of 2024)
- **GPT-3.5-Turbo**: ~$0.002/1K tokens (very affordable)
- **GPT-4**: ~$0.03-0.06/1K tokens (more expensive)

Average analysis costs:
- Auto-summary: ~$0.005-0.01 per request
- Custom prompt: ~$0.002-0.01 per request

#### Ollama (Local)
- **Cost**: FREE (runs locally)
- **Requirements**: 
  - RAM: 8GB minimum, 16GB recommended
  - Storage: 5-10GB per model
  - CPU: Modern multi-core processor

## 🔒 Security & Privacy

### Data Handling

**OpenAI:**
- Your resources are sent to OpenAI for analysis
- Data is encrypted in transit (HTTPS)
- OpenAI's data usage policy applies
- Not recommended for highly sensitive data

**Ollama:**
- All processing happens locally
- No data leaves your infrastructure
- Perfect for sensitive/confidential data
- Full control over the LLM

### Recommendations

1. **Don't include** sensitive data in resource descriptions
2. **Avoid** mentioning specific IPs, passwords, or credentials
3. **Use** generic names for resources when possible
4. **Review** generated reports before sharing

## 🐛 Troubleshooting

### OpenAI Issues

**Error: "OpenAI API key not configured"**
```bash
# Check .env file
cat backend/.env | grep OPENAI_API_KEY

# Set the key
echo "OPENAI_API_KEY=sk-your-key-here" >> backend/.env

# Restart backend
docker-compose restart backend
```

**Error: "OpenAI API error: Insufficient quota"**
- Your OpenAI account has run out of credits
- Add payment method at https://platform.openai.com/account/billing

**Error: "Rate limit exceeded"**
- Too many requests in short time
- Wait a few minutes and try again
- Consider upgrading OpenAI plan

### Ollama Issues

**Error: "Ollama service unavailable"**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Check model is pulled
ollama list
```

**Error: "Model not found"**
```bash
# Pull the model
ollama pull llama2

# Verify it's available
ollama list
```

**Slow Performance**
- Ollama requires significant RAM
- Close other applications
- Use smaller models (llama2 vs llama2:13b)
- Consider using OpenAI instead

### Frontend Issues

**AI Insights page not loading**
- Check browser console for errors
- Verify backend is running
- Check authentication token is valid

**PDF download fails**
- Ensure jsPDF is installed: `npm install jspdf`
- Check browser allows downloads
- Try generating summary first

**Analysis takes too long**
- OpenAI: Usually 5-15 seconds
- Ollama: Can take 30-60 seconds for first request
- Check network connectivity
- Verify LLM provider is working

## 🔄 Switching Between Providers

### From OpenAI to Ollama
```env
# backend/.env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

### From Ollama to OpenAI
```env
# backend/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

Restart backend after changes:
```bash
docker-compose restart backend
```

## 📊 Performance Comparison

| Feature | OpenAI (GPT-3.5) | Ollama (Llama2) |
|---------|------------------|-----------------|
| **Response Time** | 5-15 seconds | 15-60 seconds |
| **Quality** | Excellent | Good |
| **Cost** | ~$0.005/request | Free |
| **Privacy** | Cloud-based | Local |
| **Setup** | Easy | Moderate |
| **Requirements** | API key | 8GB+ RAM |
| **Offline** | ❌ No | ✅ Yes |

## 🚀 Advanced Configuration

### Custom System Prompts

Edit `backend/app/routers/ai.py`:

```python
system_message = """You are an AWS Solutions Architect Expert.
Focus on:
1. Cost optimization
2. Security hardening
3. High availability
4. Performance optimization
5. Compliance (SOC2, HIPAA, etc.)

Provide specific, actionable recommendations with AWS service names."""
```

### Adjust Response Length

```python
# For OpenAI
response = openai.ChatCompletion.create(
    model=settings.OPENAI_MODEL,
    messages=messages,
    temperature=0.7,
    max_tokens=2000  # Increase for longer responses
)

# For Ollama
response = await client.post(
    f"{settings.OLLAMA_BASE_URL}/api/generate",
    json={
        "model": settings.OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "num_predict": 1000  # Max tokens
        }
    }
)
```

## 📈 Future Enhancements

Planned features:
- [ ] Streaming responses (real-time)
- [ ] Architecture diagrams generation
- [ ] Historical analysis tracking
- [ ] Cost estimation integration
- [ ] Multi-cloud support (Azure, GCP)
- [ ] Terraform/CloudFormation code generation
- [ ] Voice input support
- [ ] Scheduled automated reports

## 💡 Example Use Cases

### 1. Pre-Production Review
- Generate summary before deploying
- Identify security gaps
- Validate architecture decisions

### 2. Cost Audit
- Ask "How can I reduce costs by 30%?"
- Review Reserved Instance opportunities
- Identify unused resources

### 3. Security Audit
- Run monthly security analysis
- Track compliance improvements
- Generate audit reports (PDF)

### 4. Onboarding
- Help new team members understand architecture
- Document complex setups
- Create training materials

### 5. Disaster Recovery Planning
- Analyze single points of failure
- Plan multi-region strategy
- Test failover scenarios

---

## 📚 Additional Resources

- **OpenAI API Docs**: https://platform.openai.com/docs
- **Ollama Docs**: https://github.com/jmorganca/ollama
- **AWS Well-Architected**: https://aws.amazon.com/architecture/well-architected/
- **FinOps Best Practices**: https://www.finops.org/

---

**Ready to get AI-powered insights on your AWS architecture! 🚀**

For support, check the main README.md or visit http://localhost:8000/docs
