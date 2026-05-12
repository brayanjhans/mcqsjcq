"""
FastAPI main application for MQS Garantías - SEACE monitoring system.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os

# Load environment variables dynamically based on file location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
print(f"DEBUG_STARTUP: GROQ_API_KEY present? {'Yes' if os.getenv('GROQ_API_KEY') else 'No'}")
print(f"DEBUG_STARTUP: DATABASE_URL present? {'Yes' if os.getenv('DATABASE_URL') else 'No'}")

import app.models  # Ensure all models are registered
from app.routers import auth, mqs, admin, scraping, tendencias, etl, formatos, users, support, notifications, reportes, exports, chatbot
from app.routers import dashboard_raw as dashboard
from app.routers import licitaciones_raw as licitaciones
from app.routers import integraciones
from app.routers.integraciones import start_mef_scheduler, stop_mef_scheduler
from app.services.notification_scheduler import start_scheduler, stop_scheduler
from app.utils.rate_limit import limiter

# Create FastAPI app
app = FastAPI(
    title="MQS Garantías - Sistema Integral",
    description="Sistema completo para gestión de garantías y análisis SEACE",
    version="3.0.0"
)

# ====== Rate Limiting Setup ======
# Attach limiter state to the app so slowapi middleware can access it
app.state.limiter = limiter

# Custom 429 response handler: devuelve JSON claro en lugar de error HTML
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Demasiadas solicitudes",
            "detail": f"Has superado el límite permitido. Intenta en unos segundos.",
            "retry_after": str(exc.retry_after) if hasattr(exc, 'retry_after') else "60"
        },
        headers={"Retry-After": "60"}
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.mcqs-jcq.cloud",
        "https://mcqs-jcq.cloud",
        "https://mcqs-jcq.com",
        "https://www.mcqs-jcq.com",
        "https://api.mcqs-jcq.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token"],
    expose_headers=["Content-Disposition"],
)

# Include routers - New system
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(mqs.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(formatos.router)
app.include_router(support.router)
app.include_router(chatbot.router)

# Include routers - Existing SEACE system
app.include_router(dashboard.router)
app.include_router(licitaciones.router)
app.include_router(tendencias.router)
app.include_router(reportes.router)
app.include_router(scraping.router)
app.include_router(etl.router)
app.include_router(exports.router)
app.include_router(integraciones.router)


# ====== Startup/Shutdown Events ======

@app.on_event("startup")
async def startup_event():
    """Iniciar scheduler de notificaciones al arranque"""
    print("DEBUG: Force reload due to route missing")
    start_scheduler()  # Scheduler de notificaciones + Pipeline OSCE (1 AM diario)

    # Iniciar scheduler de actulización automática del MEF (cada 8hs)
    start_mef_scheduler()

    # Capture Main Event Loop for Sync-to-Async Bridge (Notifications -> Chatbot)
    try:
        import asyncio
        from app.services.chatbot import websocket
        websocket.global_loop = asyncio.get_running_loop()
        print(f"DEBUG: Main Event Loop captured for Chatbot Bridge: {websocket.global_loop}")
    except Exception as e:
        print(f"ERROR: Failed to capture event loop: {e}")

@app.on_event("shutdown")
def shutdown_event():
    """Detener scheduler al apagar"""
    stop_scheduler()
    stop_mef_scheduler()


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "MQS Garantías - Sistema Integral de Gestión",
        "version": "3.0.0",
        "docs": "/docs",
        "modules": ["MQS Operations", "Admin Financial", "SEACE Analytics", "AI Assistant (AURA)"]
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "MQS Garantías API"}
