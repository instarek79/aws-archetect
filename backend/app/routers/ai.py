import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resource, User
from app.schemas import AIPromptRequest, AIAnalysisResponse, ArchitectureSummary
from app.routers.auth import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai-analysis"])


async def call_openai(prompt: str, context: str = "") -> str:
    """Call OpenAI API for analysis"""
    try:
        from openai import OpenAI
        
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables."
            )
        
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        system_message = """You are an AWS architecture expert. Analyze the provided AWS resources and give professional insights.
Focus on:
1. Architecture patterns and best practices
2. Cost optimization opportunities
3. Security improvements
4. Scalability considerations
5. High availability recommendations

Be concise, actionable, and professional."""

        messages = [
            {"role": "system", "content": system_message},
        ]
        
        if context:
            messages.append({"role": "system", "content": f"User's AWS Resources:\n{context}"})
        
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1500
        )
        
        return response.choices[0].message.content
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI library not installed. Run: pip install openai"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OpenAI API error: {str(e)}"
        )


async def call_ollama(prompt: str, context: str = "") -> str:
    """Call Ollama local LLM for analysis using native API"""
    try:
        import httpx
        
        system_message = """You are an AWS architecture expert. Analyze the provided AWS resources and give professional insights.
Focus on:
1. Architecture patterns and best practices
2. Cost optimization opportunities
3. Security improvements
4. Scalability considerations
5. High availability recommendations

Be concise, actionable, and professional."""

        # Combine all context into single prompt for Ollama
        full_prompt = f"{system_message}\n\n"
        if context:
            full_prompt += f"User's AWS Resources:\n{context}\n\n"
        full_prompt += f"User Question: {prompt}\n\nProvide detailed analysis:"
        
        # Use native Ollama API (more reliable than OpenAI-compatible)
        ollama_base = settings.OLLAMA_BASE_URL.replace("/v1", "")  # Remove /v1 suffix
        
        print(f"🔄 Sending request to Ollama at {ollama_base}...")
        print(f"📝 Model: {settings.OLLAMA_MODEL}")
        print(f"📏 Prompt length: {len(full_prompt)} chars")
        
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minutes timeout for slow systems
            response = await client.post(
                f"{ollama_base}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 1500
                    }
                }
            )
            
            if response.status_code != 200:
                print(f"❌ Ollama returned status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Ollama service returned {response.status_code}. Make sure Ollama is running."
                )
            
            result = response.json()
            response_text = result.get("response", "No response from Ollama")
            print(f"✅ Ollama responded successfully!")
            print(f"📊 Response length: {len(response_text)} chars")
            print(f"⏱️  Generation took: {result.get('total_duration', 0) / 1e9:.2f}s")
            return response_text
            
    except httpx.ConnectError as e:
        import traceback
        print(f"❌ Ollama connection error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot connect to Ollama at {ollama_base}. Make sure Ollama is running on your host machine."
        )
    except Exception as e:
        import traceback
        print(f"❌ Ollama error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ollama error: {str(e)}"
        )


def format_resources_context(resources: List[Resource]) -> str:
    """Format user resources for AI context"""
    if not resources:
        return "No resources configured yet."
    
    context_parts = [f"Total Resources: {len(resources)}\n"]
    
    # Group by type
    by_type = {}
    by_region = {}
    
    for resource in resources:
        # By type
        if resource.type not in by_type:
            by_type[resource.type] = []
        by_type[resource.type].append(resource)
        
        # By region
        if resource.region not in by_region:
            by_region[resource.region] = 0
        by_region[resource.region] += 1
    
    # Add breakdown
    context_parts.append("\nResource Breakdown:")
    for res_type, items in by_type.items():
        context_parts.append(f"- {res_type.upper()}: {len(items)} resources")
        for item in items:
            deps = f" (depends on: {', '.join(item.dependencies)})" if item.dependencies else ""
            desc = f" - {item.description}" if item.description else ""
            context_parts.append(f"  * {item.name} in {item.region}{deps}{desc}")
    
    context_parts.append("\nRegions Used:")
    for region, count in by_region.items():
        context_parts.append(f"- {region}: {count} resources")
    
    return "\n".join(context_parts)


@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_architecture(
    request: AIPromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze AWS architecture using AI with custom prompt"""
    
    # Get user's resources
    resources = db.query(Resource).filter(
        Resource.created_by == current_user.id
    ).all()
    
    # Format context
    context = ""
    if request.include_resources:
        context = format_resources_context(resources)
    
    # Call appropriate LLM
    try:
        if settings.LLM_PROVIDER == "ollama":
            analysis = await call_ollama(request.prompt, context)
        else:
            analysis = await call_openai(request.prompt, context)
        
        return AIAnalysisResponse(
            analysis=analysis,
            summary=f"Analyzed {len(resources)} resources"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/summary", response_model=ArchitectureSummary)
async def get_architecture_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive architecture summary with AI insights"""
    
    # Get user's resources
    resources = db.query(Resource).filter(
        Resource.created_by == current_user.id
    ).all()
    
    if not resources:
        return ArchitectureSummary(
            total_resources=0,
            resource_breakdown={},
            regions_used=[],
            architecture_summary="No resources configured yet. Start by adding your AWS resources.",
            cost_optimization_tips=["Add resources to get personalized cost optimization recommendations."],
            security_recommendations=["Add resources to get security analysis."],
            best_practices=["Follow AWS Well-Architected Framework principles."]
        )
    
    # Analyze resources
    by_type = {}
    regions = set()
    
    for resource in resources:
        by_type[resource.type] = by_type.get(resource.type, 0) + 1
        regions.add(resource.region)
    
    # Format context for AI
    context = format_resources_context(resources)
    
    # Generate AI summary
    summary_prompt = f"""Analyze this AWS architecture and provide:
1. Brief architecture summary (2-3 sentences)
2. Top 3 cost optimization tips
3. Top 3 security recommendations
4. Top 3 best practices to implement

Keep each point concise and actionable."""

    try:
        if settings.LLM_PROVIDER == "ollama":
            ai_response = await call_ollama(summary_prompt, context)
        else:
            ai_response = await call_openai(summary_prompt, context)
        
        # Parse AI response (basic parsing - can be enhanced)
        lines = [line.strip() for line in ai_response.split('\n') if line.strip()]
        
        # Extract sections (simple heuristic)
        summary_text = ""
        cost_tips = []
        security_recs = []
        best_practices_list = []
        
        current_section = "summary"
        for line in lines:
            lower_line = line.lower()
            if "cost" in lower_line and ("optimization" in lower_line or "saving" in lower_line):
                current_section = "cost"
                continue
            elif "security" in lower_line:
                current_section = "security"
                continue
            elif "best practice" in lower_line or "recommendation" in lower_line:
                current_section = "practices"
                continue
            
            # Skip headers and numbering
            clean_line = line.lstrip('0123456789.-*• ').strip()
            if len(clean_line) < 10:
                continue
            
            if current_section == "summary" and not summary_text:
                summary_text = clean_line
            elif current_section == "cost" and len(cost_tips) < 3:
                cost_tips.append(clean_line)
            elif current_section == "security" and len(security_recs) < 3:
                security_recs.append(clean_line)
            elif current_section == "practices" and len(best_practices_list) < 3:
                best_practices_list.append(clean_line)
        
        # Fallback defaults
        if not summary_text:
            summary_text = f"AWS architecture with {len(resources)} resources across {len(regions)} regions."
        
        if not cost_tips:
            cost_tips = [
                "Review instance types and consider Reserved Instances for long-running workloads",
                "Implement auto-scaling to optimize resource utilization",
                "Use S3 lifecycle policies to move data to cheaper storage tiers"
            ]
        
        if not security_recs:
            security_recs = [
                "Enable encryption at rest for all data stores",
                "Implement least-privilege IAM policies",
                "Enable CloudTrail and AWS Config for compliance monitoring"
            ]
        
        if not best_practices_list:
            best_practices_list = [
                "Implement multi-region failover for critical workloads",
                "Use Infrastructure as Code (Terraform/CloudFormation)",
                "Set up comprehensive monitoring and alerting"
            ]
        
        return ArchitectureSummary(
            total_resources=len(resources),
            resource_breakdown=by_type,
            regions_used=list(regions),
            architecture_summary=summary_text,
            cost_optimization_tips=cost_tips[:3],
            security_recommendations=security_recs[:3],
            best_practices=best_practices_list[:3]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Return basic summary if AI fails
        return ArchitectureSummary(
            total_resources=len(resources),
            resource_breakdown=by_type,
            regions_used=list(regions),
            architecture_summary=f"AWS architecture with {len(resources)} resources across {len(regions)} regions.",
            cost_optimization_tips=[
                "Review instance types for cost optimization",
                "Consider Reserved Instances or Savings Plans",
                "Implement auto-scaling policies"
            ],
            security_recommendations=[
                "Enable encryption for all data stores",
                "Review and tighten IAM policies",
                "Enable security monitoring and logging"
            ],
            best_practices=[
                "Implement Infrastructure as Code",
                "Set up disaster recovery procedures",
                "Use tags for resource management"
            ]
        )
