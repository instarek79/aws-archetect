import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai-layout"])


class LayoutResource(BaseModel):
    id: str
    name: str
    type: str
    parent: str = None


class LayoutRelationship(BaseModel):
    source: str
    target: str
    type: str


class LayoutAnalysisRequest(BaseModel):
    resources: List[LayoutResource]
    relationships: List[LayoutRelationship]


class LayoutAnalysisResponse(BaseModel):
    layout_config: Dict[str, Any]
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    groups: List[Dict[str, Any]]


async def call_ollama_for_layout(resources: List[LayoutResource], relationships: List[LayoutRelationship]) -> Dict[str, Any]:
    """Call Ollama qwen2.5 to analyze architecture and suggest intelligent layout"""
    try:
        import httpx
        
        # Filter to only resources with relationships
        connected_resource_ids = set()
        for rel in relationships:
            connected_resource_ids.add(rel.source)
            connected_resource_ids.add(rel.target)
        
        connected_resources = [r for r in resources if r.id in connected_resource_ids]
        
        if not connected_resources:
            return generate_default_layout(resources, relationships)
        
        # Prepare architecture analysis prompt
        prompt = f"""Analyze this AWS architecture and create an optimal diagram layout.

CONNECTED RESOURCES ({len(connected_resources)} with relationships):
{json.dumps([{'id': r.id, 'name': r.name, 'type': r.type} for r in connected_resources], indent=2)}

RELATIONSHIPS ({len(relationships)} total):
{json.dumps([{'source': r.source, 'target': r.target, 'type': r.type} for r in relationships], indent=2)}

TASK: Create a clear, organized layout that shows relationships visually.

ANALYZE PATTERNS:
1. **Entry Points**: Resources with no incoming connections (rank=0)
2. **Workflows**: Follow deploy_to, depends_on chains (rank increases downstream)
3. **Clusters**: Group resources by shared connections
4. **Direction**: LR for pipelines/workflows, TB for hierarchies

ASSIGN:
- **Ranks**: 0 for sources, increment for each hop downstream
- **Weights**: deploy_to=10, depends_on=8, uses=5, connects_to=3, routes_to=4
- **Groups**: Cluster by connection patterns (e.g., "ci-cd", "api-layer", "data-tier")
- **Spacing**: Tight for clusters (40-60px), wider between groups (80-120px)

EXAMPLES:
- CodePipeline(rank=0) → CodeBuild(rank=1) → S3/EC2(rank=2)
- API Gateway(rank=0) → Lambda(rank=1) → DynamoDB(rank=2)
- ALB(rank=0) → EC2(rank=1) → RDS(rank=2)

Return ONLY valid JSON:
{{
  "layout_config": {{
    "direction": "LR",
    "node_spacing": 50,
    "rank_spacing": 100
  }},
  "nodes": [
    {{"id": "resource_id", "rank": 0, "group": "entry-points"}},
    {{"id": "resource_id2", "rank": 1, "group": "processing"}}
  ],
  "edges": [
    {{"source": "id1", "target": "id2", "weight": 10}}
  ],
  "groups": [
    {{"name": "ci-cd-pipeline", "resources": ["id1", "id2"], "color": "#FF9900"}}
  ]
}}"""

        ollama_base = settings.OLLAMA_BASE_URL.replace("/v1", "")
        
        print(f"🤖 Calling Ollama qwen2.5 for layout analysis...")
        print(f"📊 Analyzing {len(resources)} resources and {len(relationships)} relationships")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{ollama_base}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Lower temperature for more consistent JSON
                        "num_predict": 2000
                    }
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Ollama service error: {response.status_code}"
                )
            
            result = response.json()
            response_text = result.get("response", "")
            
            print(f"✅ Ollama responded")
            print(f"📝 Response preview: {response_text[:200]}...")
            
            # Extract JSON from response (handle markdown code blocks)
            json_text = response_text.strip()
            if "```json" in json_text:
                json_text = json_text.split("```json")[1].split("```")[0].strip()
            elif "```" in json_text:
                json_text = json_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            try:
                layout_data = json.loads(json_text)
                print(f"✅ Successfully parsed AI layout suggestions")
                return layout_data
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parse error: {e}")
                print(f"Raw response: {json_text[:500]}")
                # Return default layout
                return generate_default_layout(resources, relationships)
            
    except Exception as e:
        print(f"❌ Ollama layout analysis error: {e}")
        return generate_default_layout(resources, relationships)


def generate_default_layout(resources: List[LayoutResource], relationships: List[LayoutRelationship]) -> Dict[str, Any]:
    """Generate a sensible default layout using connected components analysis"""
    
    # Find connected components
    connected_ids = set()
    for rel in relationships:
        connected_ids.add(rel.source)
        connected_ids.add(rel.target)
    
    connected_resources = [r for r in resources if r.id in connected_ids]
    isolated_resources = [r for r in resources if r.id not in connected_ids]
    
    print(f"📊 Layout analysis: {len(connected_resources)} connected, {len(isolated_resources)} isolated")
    
    if not connected_resources:
        # No relationships - return minimal layout
        return {
            "layout_config": {
                "direction": "LR",
                "node_spacing": 60,
                "rank_spacing": 80
            },
            "nodes": [],
            "edges": [],
            "groups": []
        }
    
    # Analyze relationship patterns
    relationship_types = [r.type for r in relationships]
    has_deploy = any('deploy' in rt.lower() for rt in relationship_types)
    has_pipeline = any('pipeline' in r.type.lower() or 'codebuild' in r.type.lower() for r in connected_resources)
    
    # Determine layout direction based on patterns
    direction = "LR" if (has_deploy or has_pipeline) else "TB"
    
    # Build adjacency for rank calculation
    incoming = {r.id: [] for r in connected_resources}
    outgoing = {r.id: [] for r in connected_resources}
    
    for rel in relationships:
        if rel.source in outgoing:
            outgoing[rel.source].append(rel.target)
        if rel.target in incoming:
            incoming[rel.target].append(rel.source)
    
    # Calculate ranks using BFS from sources
    node_ranks = {}
    sources = [r.id for r in connected_resources if not incoming[r.id]]
    
    if not sources:
        # Circular dependencies - pick nodes with most outgoing
        sources = [max(connected_resources, key=lambda r: len(outgoing[r.id])).id]
    
    # BFS to assign ranks
    queue = [(src, 0) for src in sources]
    visited = set()
    
    while queue:
        node_id, rank = queue.pop(0)
        if node_id in visited:
            continue
        visited.add(node_id)
        node_ranks[node_id] = rank
        
        for target in outgoing.get(node_id, []):
            if target not in visited:
                queue.append((target, rank + 1))
    
    # Assign rank 0 to any unvisited nodes
    for r in connected_resources:
        if r.id not in node_ranks:
            node_ranks[r.id] = 0
    
    # Build edge weights based on relationship types
    edges = []
    for rel in relationships:
        weight = 1
        rel_type_lower = rel.type.lower()
        if 'deploy' in rel_type_lower:
            weight = 10
        elif 'depend' in rel_type_lower:
            weight = 8
        elif 'use' in rel_type_lower:
            weight = 5
        elif 'connect' in rel_type_lower or 'route' in rel_type_lower:
            weight = 4
        elif 'attach' in rel_type_lower:
            weight = 6
        
        edges.append({
            "source": rel.source,
            "target": rel.target,
            "weight": weight
        })
    
    # Group by connection clusters
    clusters = {}
    for resource in connected_resources:
        # Group by rank and type
        rank = node_ranks.get(resource.id, 0)
        group_key = f"rank-{rank}-{resource.type}"
        if group_key not in clusters:
            clusters[group_key] = []
        clusters[group_key].append(resource.id)
    
    group_list = [
        {"name": f"tier-{i}", "resources": ids, "color": "#FF9900"}
        for i, ids in enumerate(clusters.values())
    ]
    
    # Tighter spacing for better clustering
    return {
        "layout_config": {
            "direction": direction,
            "node_spacing": 50,  # Tighter
            "rank_spacing": 100  # More separation between ranks
        },
        "nodes": [
            {"id": r.id, "rank": node_ranks.get(r.id, 0), "group": f"rank-{node_ranks.get(r.id, 0)}"}
            for r in connected_resources
        ],
        "edges": edges,
        "groups": group_list
    }


@router.post("/analyze-layout", response_model=LayoutAnalysisResponse)
async def analyze_layout(
    request: LayoutAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze architecture and suggest intelligent layout using Ollama qwen2.5"""
    
    if not request.resources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No resources provided for layout analysis"
        )
    
    try:
        # Call Ollama for AI-powered layout analysis
        if settings.LLM_PROVIDER == "ollama":
            layout_data = await call_ollama_for_layout(request.resources, request.relationships)
        else:
            # Fallback to default layout if not using Ollama
            layout_data = generate_default_layout(request.resources, request.relationships)
        
        return LayoutAnalysisResponse(**layout_data)
        
    except Exception as e:
        print(f"❌ Layout analysis error: {e}")
        # Return default layout on error
        layout_data = generate_default_layout(request.resources, request.relationships)
        return LayoutAnalysisResponse(**layout_data)
