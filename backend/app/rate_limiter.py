"""
Rate limiting configuration for API endpoints.
Uses slowapi (token bucket algorithm) for rate limiting based on IP address.
Compatible with Render.com and other proxy-based hosting.
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

def get_real_client_ip(request: Request) -> str:
    """
    Get the real client IP address, accounting for proxies.
    
    When deployed on Render.com or behind other proxies, the real client IP
    is in the X-Forwarded-For header. This function checks for that header
    and falls back to the direct connection IP if not found.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    return request.client.host if request.client else "127.0.0.1"

limiter = Limiter(key_func=get_real_client_ip, default_limits=["100/minute"])

async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors.
    Returns a clear error message without exposing internals.
    """
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": exc.detail
        }
    )

RATE_LIMITS = {
    "general": "100/minute",  
    "compute_intensive": "10/minute",  
    "data_fetch": "30/minute",  
}
