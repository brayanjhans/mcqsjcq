"""
FastAPI main application for MQS Garantías - SEACE monitoring system.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models # Ensure all models are registered
from app.routers import auth, mqs, admin, scraping, tendencias, etl, formatos, users, support, test, notifications, reportes, chatbot, exports
from app.routers import dashboard_raw as dashboard
from app.routers import licitaciones_raw as licitaciones
from app.services.notification_scheduler import start_scheduler, stop_scheduler

# Create FastAPI app
app = FastAPI(
    title="MQS Garantías - Sistema Integral",
    description="Sistema completo para gestión de garantías y análisis SEACE",
    version="3.0.0"
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
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Allow frontend to read Content-Disposition header
)

# Include routers - New system
app.include_router(test.router)  # Test router first
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(mqs.router)
app.include_router(admin.router)
app.include_router(notifications.router)  # Notifications system
app.include_router(formatos.router)
app.include_router(support.router)
app.include_router(chatbot.router) # Integrated Chatbot

# Include routers - Existing SEACE system
app.include_router(dashboard.router)
app.include_router(licitaciones.router)
app.include_router(tendencias.router)
app.include_router(reportes.router)
app.include_router(scraping.router)
app.include_router(etl.router)
app.include_router(exports.router)


# ====== Startup/Shutdown Events ======

@app.on_event("startup")
def startup_event():
    """Iniciar scheduler de notificaciones al arranque"""
    start_scheduler()

@app.on_event("shutdown")
def shutdown_event():
    """Detener scheduler al apagar"""
    stop_scheduler()


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
