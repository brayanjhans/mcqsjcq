# 🏛️ MQS Garantías - Sistema SEACE

Sistema integral para análisis de garantías y licitaciones públicas del SEACE (Sistema Electrónico de Contrataciones del Estado de Perú).

## 🎯 Características

- **Backend FastAPI** con API RESTful completa
- **Frontend Next.js** con dashboard ejecutivo y visualizaciones
- **ETL Automatizado** para procesamiento de datos SEACE
- **Chatbot AI** con integración de Gemini
- **Análisis de Tendencias** y reportes personalizados

## 📁 Estructura del Proyecto

```
proyecto_garantias/
├── app/                    # Backend FastAPI
│   ├── routers/           # API endpoints
│   ├── models/            # Modelos de base de datos
│   ├── services/          # Lógica de negocio
│   └── utils/             # Utilidades
│
├── frontend/              # Frontend Next.js
│   ├── app/              # Pages (App Router)
│   ├── components/       # Componentes React
│   ├── lib/              # Utilidades
│   └── hooks/            # Custom hooks
│
├── 1_motor_etl/          # Motor ETL
│   ├── descargador.py    # Descarga datos SEACE
│   ├── cargador.py       # Carga a base de datos
│   └── spider_garantias.py
│
├── scripts/              # Scripts de utilidad
├── data/                 # Datos locales (gitignored)
└── formatosc/            # Plantillas y formatos
```

## 🚀 Instalación

### Requisitos

- Python 3.8+
- Node.js 18+
- MySQL 5.7+

### Backend

```bash
# Crear entorno virtual
python -m venv venv
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales MySQL
```

### Frontend

```bash
cd frontend
npm install
```

### Base de Datos

```bash
# Crear base de datos
    mysql -u root -p
    CREATE DATABASE garantias_seace;
    ```

## ▶️ Ejecución

### Desarrollo

```bash
start-all.bat
```

Esto inicia:
- Backend en `http://localhost:8000`
- Frontend en `http://localhost:3000`

### Producción

```bash
# Primero compilar el frontend
cd frontend
npm run build

# Luego iniciar en producción
start-prod.bat
```

## 📊 Funcionalidades

- **Dashboard Ejecutivo**: KPIs y métricas en tiempo real
- **Búsqueda de Licitaciones**: Filtros avanzados
- **Análisis de Tendencias**: Visualizaciones interactivas
- **Chatbot AI (AURA)**: Asistente inteligente con voz profesional (ElevenLabs)
- **Gestión de Usuarios**: Roles y permisos
- **Reportes**: Exportación a Excel/PDF

## 🔧 Tecnologías

**Backend:**
- FastAPI
- SQLAlchemy (MySQL)
- Google Gemini AI

**Frontend:**
- Next.js 14
- React
- TypeScript
- Recharts

**ETL:**
- Python
- Selenium
- ijson

## 📝 Variables de Entorno

Ver `.env.example` para todas las variables requeridas.

Principales:
- `DATABASE_URL`: Conexión a MySQL
- `GEMINI_API_KEY`: API key de Google Gemini
- `GROQ_API_KEY`: API key de Groq (para chatbot)
- `ELEVENLABS_API_KEY`: API key de ElevenLabs (para voz del chatbot)
- `NEXT_PUBLIC_API_URL`: URL del backend (opcional)

### Configuración de ElevenLabs (Voz del Chatbot)

El chatbot AURA usa ElevenLabs para generar voz natural y profesional:

1. Obtén tu API key gratuita en https://elevenlabs.io/sign-up
2. Agrégala al archivo `.env`:
   ```
   ELEVENLABS_API_KEY="tu_api_key_aqui"
   ```
3. Plan gratuito: 10,000 caracteres/mes (~50 mensajes con voz)

**Nota:** Si no configuras ElevenLabs, el chatbot usará la voz nativa del navegador como fallback.

## 🗄️ Base de Datos

El proyecto usa MySQL con las siguientes tablas principales:
- `Licitaciones_Cabecera`
- `Licitaciones_Adjudicaciones`
- `Contratos`
- `Detalle_Consorcios`

## 📖 Documentación Adicional

- [GUIA_ACCESO.md](GUIA_ACCESO.md) - Guía de acceso al sistema
- [CREDENCIALES.md](CREDENCIALES.md) - Gestión de credenciales

## 👥 Contribuir

Este proyecto está en desarrollo activo. Para contribuir, contacta al equipo de desarrollo.

## 📄 Licencia

Proyecto de análisis de datos públicos del Estado Peruano.
