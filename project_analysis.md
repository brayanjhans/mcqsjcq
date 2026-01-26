# Análisis Integral del Proyecto: MQS Garantías - Sistema SEACE

Este documento detalla la arquitectura, componentes y flujos de datos del proyecto `proyecto_garantias`, una plataforma avanzada para el análisis de licitaciones y garantías del SEACE (Sistema Electrónico de Contrataciones del Estado).

## 1. Visión General
El sistema es una solución *"End-to-End"* que combina un motor de extracción de datos masivo (ETL), una API robusta en Python (FastAPI) y una interfaz moderna en Next.js. Su objetivo principal es monitorear, descargar y analizar contrataciones públicas, con un enfoque específico en **Garantías Financieras (Cartas Fianza)** y conformación de **Consorcios**.

**Características Clave:**
- **Motor ETL Autónomo:** Descarga masiva de JSONs oficiales y *scraping* complementario para datos no estructurados.
- **Chatbot AI "AURA":** Asistente conversacional integrado que traduce lenguaje natural a SQL para consultar la base de datos en tiempo real.
- **Dashboard Ejecutivo:** Visualización de tendencias, montos adjudicados y alertas.

---

## 2. Arquitectura Tecnológica

### 2.1 Backend (API & Lógica)
- **Framework:** FastAPI (Python).
- **Base de Datos:** MySQL (con SQLAlchemy ORM).
- **AI/LLM:** Integración con **Groq SDK** (Modelo `llama-3.1-8b-instant`) para el chatbot AURA. También existen referencias a OpenAI y Gemini.
- **Seguridad:** Autenticación JWT, control de CORS, y validación estricta de queries SQL generadas por AI (Modo SOLO LECTURA).

**Estructura de Directorios Clave (`/app`):**
- `main.py`: Punto de entrada, configuración de CORS y registro de routers.
- `routers/`:
    - `chatbot.py`: Cerebro del asistente AI. Convierte preguntas en SQL, ejecuta y formatea respuestas + gráficos.
    - `mqs.py`, `licitaciones_raw.py`: Endpoints de negocio.
- `models/seace.py`: Definición de tablas core (`LicitacionesCabecera`, `LicitacionesAdjudicaciones`, `DetalleConsorcios`).
- `services/`: Lógica de negocio encapsulada.

### 2.2 Frontend (Interfaz de Usuario)
- **Framework:** Next.js 14 (App Router).
- **Estilos:** Tailwind CSS + Shadcn/UI (se infiere por `components/ui`).
- **Visualización:** Recharts / ApexCharts.
- **Estructura:**
    - `/app`: Rutas del sistema (`dashboard`, `seace`, `mqs`, `support`).
    - `/components`: Componentes reutilizables.

### 2.3 Motor ETL (`/1_motor_etl`)
El corazón de la ingesta de datos. No es solo un importador, es un sistema inteligente de recuperación.
- **`descargador.py`**:
    - Descarga archivos masivos JSON mensuales del SEACE.
    - Verifica integridad con SHA.
    - Maneja descargas paralelas (ThreadPoolExecutor).
- **`spider_garantias.py`**:
    - "Araña" especializada que rellena los huecos del dataset oficial.
    - Busca contratos que tienen `Entidad Financiera = NULL`.
    - Consulta APIs internas del SEACE y **descarga PDFs de contratos** para extraer evidencia de consorcios y bancos garantes.
    - Almacena resultados en `Licitaciones_Adjudicaciones` y `Detalle_Consorcios`.

---

## 3. Modelo de Datos (Core)

El esquema relacional se centra en tres tablas principales (definidas en `app/models/seace.py`):

1.  **`licitaciones_cabecera`**:
    -   *PK*: `id_convocatoria`
    -   Datos: Objeto de contratación, montos estimados, entidad compradora, ubicación (Dep/Prov/Dist).

2.  **`licitaciones_adjudicaciones`**:
    -   *PK*: `id_adjudicacion`
    -   *FK*: `id_convocatoria`
    -   Datos: Ganador (RUC/Nombre), Monto Adjudicado, **Entidad Financiera** (Banco), Tipo de Garantía.

3.  **`detalle_consorcios`**:
    -   *FK*: `id_contrato` (enlace lógico con adjudicaciones).
    -   Datos: Miembros del consorcio y sus porcentajes de participación.

---

## 4. Flujo de Inteligencia Artificial (AURA)

El módulo `chatbot.py` es particularmente avanzado. Su flujo es:
1.  **Recepción:** Usuario pregunta (ej: "¿Cuántas licitaciones ganó el BCP en Lima?").
2.  **Generación SQL (LLM):** LLM (Groq/Llama3) recibe el esquema de la BD y la pregunta. Genera una query SQL segura.
3.  **Sanitización:** El sistema valida que la query sea solo `SELECT` y no toque tablas sensibles.
4.  **Ejecución:** Se corre la query en MySQL.
5.  **Interpretación:** El LLM recibe los datos crudos y genera una respuesta natural ("El BCP ganó 15 licitaciones...").
6.  **Visualización:** Si los datos lo permiten, el backend genera metadatos para renderizar gráficos en el frontend.

## 5. Conclusión
El proyecto está altamente estructurado y listo para producción, con scripts de despliegue (`deploy_production.py`) y documentación clara. Combina ingeniería de datos tradicional (ETL/Scraping) con ingeniería de software moderna (FastAPI/React) y capas de IA generativa (RAG sobre SQL).
