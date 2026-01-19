from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import logging

router = APIRouter(tags=["Icon Proxy"])
logger = logging.getLogger(__name__)

@router.get("/icons/proxy")
async def proxy_icon(url: str):
    """
    Proxy AWS icons from external sources to avoid CORS issues in exports.
    This allows html-to-image to capture icons properly.
    """
    try:
        # Validate URL is from allowed sources
        allowed_domains = ['icon.icepanel.io', 'raw.githubusercontent.com']
        if not any(domain in url for domain in allowed_domains):
            raise HTTPException(status_code=400, detail="Invalid icon source")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            
            # Return the image with appropriate content type
            content_type = response.headers.get('content-type', 'image/svg+xml')
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                }
            )
    except httpx.HTTPError as e:
        logger.error(f"Failed to proxy icon from {url}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch icon: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error proxying icon: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
