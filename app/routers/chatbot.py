import os
import json
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError
from groq import Groq
from app.database import get_db, engine
from app.models.chat_history import ChatHistory
from fastapi import WebSocket, WebSocketDisconnect
from app.services.chatbot import websocket # Import the manager
from elevenlabs import ElevenLabs, VoiceSettings

# Initialize Router
router = APIRouter(
    prefix="/api/chatbot",
    tags=["Chatbot"]
)

# --- Configuration & Constants ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
MODEL_NAME = "llama-3.1-8b-instant"

client = Groq(api_key=GROQ_API_KEY)
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY) if ELEVENLABS_API_KEY else None

# --- Global Cache ---
_SCHEMA_CACHE = None
_LAST_SCHEMA_UPDATE = 0
SCHEMA_CACHE_TTL = 3600  # 1 hour

# --- Rate Limiting (Simple In-Memory) ---
_RATE_LIMIT_STORE = {}
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 20

def check_rate_limit(request: Request):
    client_ip = request.client.host
    current_time = time.time()
    
    # Clean old requests
    if client_ip in _RATE_LIMIT_STORE:
        _RATE_LIMIT_STORE[client_ip] = [t for t in _RATE_LIMIT_STORE[client_ip] if t > current_time - RATE_LIMIT_WINDOW]
    
    # Check limit
    requests = _RATE_LIMIT_STORE.get(client_ip, [])
    if len(requests) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
    
    # Add new request
    requests.append(current_time)
    _RATE_LIMIT_STORE[client_ip] = requests

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    response_markdown: str
    sql_query: Optional[str] = None
    data_source: str = "BD"
    suggested_questions: List[str] = []
    chart_data: Optional[Dict[str, Any]] = None
    audio_base64: Optional[str] = None  # Audio pre-generado

# --- Helper: Schema Loading (Optimized) ---
def get_schema_summary():
    """
    Returns a cached, token-optimized summary of the database schema.
    """
    global _SCHEMA_CACHE, _LAST_SCHEMA_UPDATE
    
    current_time = time.time()
    if _SCHEMA_CACHE and (current_time - _LAST_SCHEMA_UPDATE < SCHEMA_CACHE_TTL):
        return _SCHEMA_CACHE

    try:
        inspector = inspect(engine)
        schema_text = "=== DB SCHEMA (READ-ONLY) ===\n"
        
        all_tables = inspector.get_table_names()
        
        # Priority tables for complex queries
        main_tables = ['licitaciones_cabecera', 'licitaciones_adjudicaciones', 'detalle_consorcios', 'contratos']
        
        for table_name in main_tables:
            if table_name in all_tables:
                columns = inspector.get_columns(table_name)
                # Token Diet: Name only, skip complex types metadata
                col_names = [c['name'] for c in columns]
                schema_text += f"\nTABLE: {table_name}\nCOLUMNS: {', '.join(col_names)}\n"

        # Explicit Relationships (Crucial for joins)
        schema_text += "\nRELATIONSHIPS:\n"
        schema_text += "- licitaciones_cabecera.id_convocatoria = licitaciones_adjudicaciones.id_convocatoria\n"
        schema_text += "- contratos.id_contrato = detalle_consorcios.id_contrato\n"
        schema_text += "- contratos.id_item = licitaciones_adjudicaciones.id_item\n"

        _SCHEMA_CACHE = schema_text
        _LAST_SCHEMA_UPDATE = current_time
        return schema_text
    except Exception as e:
        return f"Error loading schema: {e}"

# --- Core Service Logic ---

class ChatService:
    def __init__(self, db_session):
        self.db = db_session
        self.schema_context = get_schema_summary()

    def _sanitize_sql(self, sql: str) -> str:
        sql = sql.strip().strip(';').replace("```sql", "").replace("```", "").strip()
        forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT"]
        upper_sql = sql.upper()
        for kw in forbidden:
            if kw in upper_sql:
                raise ValueError(f"Security Alert: Operation {kw} is not allowed.")
        return sql

    def _execute_sql(self, sql: str) -> List[Dict[str, Any]]:
        try:
            result = self.db.execute(text(sql))
            keys = result.keys()
            return [dict(zip(keys, row)) for row in result.fetchall()]
        except SQLAlchemyError as e:
            raise ValueError(f"SQL Error: {str(e)}")

    def _truncate_history(self, history: List[Dict], max_chars: int = 2000) -> List[Dict]:
        """Truncate history maintaining last messages completely if possible"""
        truncated = []
        total_chars = 0
        # Keep last 6 messages
        for msg in reversed(history[-6:]):
            content = msg.get("content", "")
            if total_chars + len(content) > max_chars:
                break
            truncated.insert(0, msg)
            total_chars += len(content)
        return truncated

    def _generate_chart_data(self, query_results: List[Dict], sql_query: str) -> Optional[Dict[str, Any]]:
        if not query_results or len(query_results) < 2: return None
        
        # Simple heuristic for charts
        first_row = query_results[0]
        keys = list(first_row.keys())
        if len(keys) < 2: return None
        
        label_key, value_key = keys[0], keys[1]
        
        labels, values = [], []
        for row in query_results[:15]: # Limit chart points
            val = row[value_key]
            try:
                values.append(float(val))
                labels.append(str(row[label_key]))
            except:
                continue
                
        if not values: return None
        
        chart_type = "pie" if len(labels) <= 5 else "bar"
        return {
            "type": chart_type,
            "labels": labels,
            "datasets": [{"label": value_key, "data": values}]
        }

    def _generate_sql(self, user_message: str, history: List[Dict]) -> str:
        system_prompt = f"""You are AURA, an expert MySQL Assistant for SEACE (Sistema Electrónico de Contrataciones del Estado).
Goal: Generate ONE safe, **READ-ONLY** SQL query to answer the user.

SCHEMA:
{self.schema_context}

RULES:
1. Return ONLY the raw SQL query. No markdown.
2. If the user asks for data not in the schema, return: NO_SQL
3. If clarification is needed, return: CLARIFY: <question>
4. Use LIKE '%value%' for text searches (names, cities).
5. LIMIT 10 for lists, NO LIMIT for COUNTs.
6. **CLEANING INPUT**: Remove quotes (" or ') from search terms. Example: `search "ABC"` -> `LIKE '%ABC%'`, NOT `LIKE '%"ABC"%'`.
7. **Complex Queries**: You can join tables using the relationships provided.
7. **Aggregations**: Use GROUP BY for "cuantos" or "distribucion".
8. **CONTEXT ENFORCEMENT**:
   - If the user asks for "count", "quantity", "how many", or "trends" without specifying the object, **ALWAYS assume they mean TENDERS (licitaciones)**.
   - Example: "Cuantas tiene Lima?" -> `SELECT COUNT(*) FROM licitaciones_cabecera WHERE departamento LIKE '%Lima%'`
   - Example: "Resumen de Cusco" -> `SELECT estado, COUNT(*) FROM licitaciones_cabecera WHERE departamento LIKE '%Cusco%' GROUP BY estado`
9. **SPECIFIC SEARCHES & DETAILS**:
   - If the user provides a numeric ID, code, or alphanumeric string, search in `nomenclatura` AND `id_contrato` AND `descripcion_proceso`.
   - **PRIORITY COLUMNS**: You MUST ALWAYS select `lc.tipo_procedimiento` (AS FIRST COLUMN) and `lc.estado_proceso`.
   - **Full Select List**: `lc.tipo_procedimiento`, `lc.nomenclatura`, `lc.descripcion`, `lc.comprador`, `lc.monto_estimado`, `lc.moneda`, `lc.estado_proceso`, `lc.departamento`, `lc.provincia`, `lc.fecha_publicacion`.
   - **FOR WINNERS/CONTRACTS**: If available, JOIN with `licitaciones_adjudicaciones` (la) to get:
     `la.ganador_nombre`, `la.ganador_ruc`, `la.monto_adjudicado`, `la.fecha_adjudicacion`, `la.id_contrato`, `la.tipo_garantia`, `la.entidad_financiera`.
   - Example "Dame detalle de LP-123":
     `SELECT lc.tipo_procedimiento, lc.nomenclatura, lc.ocid, lc.descripcion, lc.comprador, lc.monto_estimado, lc.moneda, lc.estado_proceso, lc.ubicacion_completa, lc.fecha_publicacion,
             la.ganador_nombre, la.ganador_ruc, la.monto_adjudicado, la.fecha_adjudicacion, 
             la.id_contrato, la.tipo_garantia, la.entidad_financiera
      FROM licitaciones_cabecera lc 
      LEFT JOIN licitaciones_adjudicaciones la ON lc.id_convocatoria = la.id_convocatoria 
      WHERE lc.nomenclatura LIKE '%LP-123%' LIMIT 1`
10. **MISSING OR QUALITATIVE DATA**:
    - If the user asks for "requisitos", "bases", "tdr", "expediente", "contactos", "emails" -> Return **NO_SQL** (since this data is NOT in the schema tables).
    - Do NOT re-run the previous query if it doesn't answer the new specific question.
11. **GREETINGS & INVALID REQUESTS**:
    - If the user says "hola", "buenos dias", "gracias", or specific questions not related to the data -> Return **NO_SQL**.
    - If the user provides a nomenclature like `ABR-PROC...`, execute a search even if they say "details".
    - If the user asks for "grafico", "estadisticas", "resumen" WITHOUT specific details -> Execute a default aggregation:
      `SELECT departamento, COUNT(*) as total FROM licitaciones_cabecera GROUP BY departamento ORDER BY total DESC LIMIT 10`

User Request: {user_message}"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(self._truncate_history(history))
        messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            messages=messages,
            model=MODEL_NAME,
            temperature=0.1,
        )
        return response.choices[0].message.content.strip()

    def _generate_final_response(self, user_message: str, sql_query: str, query_results: List[Dict]) -> Any:
        data_str = json.dumps(query_results[:50], default=str) # Limit context
        print(f"[DEBUG] Data context sent to LLM: {data_str}")
        
        if query_results and len(query_results) > 0:
            first = query_results[0]
            print(f"[DEBUG] Result Keys: {list(first.keys())}")
            # Case-insensitive search for keys
            def get_val(key_fragment):
                for k, v in first.items():
                    if key_fragment in k.lower(): return v
                return None
            
            p_type = get_val('tipo_procedimiento') or "Procedimiento"
            p_state = get_val('estado_proceso') or "Estado"
            
            forced_header = f"### 📄 {p_type} - {p_state}"
        
        system_prompt = f"""You are AURA.
User Question: "{user_message}"
Data Found: {data_str}

Instructions:
1. **SINGLE ITEM CARD**: If the data contains details for a specific tender (1-3 results), format it like a card using Markdown.
   
   **CRITICAL REQUIREMENT**:
   You MUST start your response with EXACTLY this header:
   {forced_header}

   **DATA INTEGRITY RULE**:
   - When listing "Tipo de Procedimiento", YOU MUST USE THE EXACT STRING from the database.
   - **DO NOT** summarize "Adjudicación Simplificada" to "Simplificado".
   - **DO NOT** summarize "Licitación Pública" to "Abierto" or "Público".
   - **USE THE FULL OFFICIAL NAME ALWAYS.**
   
   (Do not alter the text in the header above. It is derived directly from the database).

   Then format the rest:
   **[Descripción]**

- 🏢 **Comprador:** [Comprador]
- 📍 **Ubicación:** [Ubicación Completa]
- 📅 **Publicado:** [Fecha]
- 💰 **Monto Estimado:** [Moneda] [Monto]

**Adjudicación / Contrato:**
- 🏆 **Ganador:** [Nombre Ganador] (RUC: [RUC])
- 💵 **Monto Adjudicado:** [Moneda] [Monto Adj.]
- 📝 **ID Contrato:** [ID]
- 🏦 **Garantía:** [Tipo] ([Entidad Financiera])

2. **LISTS**: If there are many results, use a simple summary or bullet points.
3. Suggest 3 follow-up questions at the end with "///Suggested///".
"""
        messages = [{"role": "system", "content": system_prompt}]
        
        response = client.chat.completions.create(
            messages=messages,
            model=MODEL_NAME,
            temperature=0.3, 
        )
        
        full = response.choices[0].message.content.strip()
        parts = full.split("///Suggested///")
        main = parts[0].strip()
        suggestions = [s.strip().replace('- ','') for s in parts[1].split('\n') if s.strip()] if len(parts) > 1 else []
        
        return main, suggestions[:3]

    def _save_history(self, session_id: str, message: str, response: str, sql: str = None):
        """Persist chat to DB"""
        try:
            # Generate a temporary session_id if none (for anonymous users)
            if not session_id: session_id = "anon_" + str(int(time.time()))
            
            # Using a default corporate ID for now since auth logic is separate
            # In production this should come from the verified user token
            user_id = "admin" 
            
            entry = ChatHistory(
                user_id=user_id,
                session_id=session_id,
                message=message,
                response=response,
                # sql_query=sql # Note: Model needs to be updated to support sql_query if it doesn't exist
            )
            self.db.add(entry)
            self.db.commit()
        except Exception as e:
            print(f"Error saving history: {e}")
            self.db.rollback()

    def _generate_general_response(self, user_message: str, history: List[Dict]) -> str:
        messages = [{"role": "system", "content": "You are AURA, an expert consultant in Peruvian Public Procurement (SEACE/OSCE). \n\nRULES:\n1. If the user asks for specific data NOT in the database (like 'bases', 'requisitos', 'TDRs'), **DO NOT apologize**. Instead, provide a GENERIC and EDUCATIONAL answer based on the General Law of Public Procurement.\n2. **OFF-TOPIC REQUESTS**: If the user asks about something completely unrelated (sports, movies, math, life), DO NOT REFUSE. Provide a **VERY SHORT, GENERIC, and POLITE** response (1 sentence). Example: 'The weather varies by region.' or 'Movies are a great form of entertainment.' Do NOT mention you are a bot. Just answer briefly.\n3. KEEP IT BRIEF."}]
        messages.extend(self._truncate_history(history))
        messages.append({"role": "user", "content": user_message})
        
        resp = client.chat.completions.create(
            model=MODEL_NAME, messages=messages, temperature=0.7
        )
        return resp.choices[0].message.content

    def process_message(self, request: ChatRequest, client_ip: str) -> ChatResponse:
        try:
            # 1. Generate SQL
            generated = self._generate_sql(request.message, request.history)
            
            if "NO_SQL" in generated:
                resp = self._generate_general_response(request.message, request.history)
                self._save_history("session_1", request.message, resp)
                return ChatResponse(response_markdown=resp, data_source="WEB")
            
            # Guard Clause: If generated text is NOT SQL (e.g. conversational), treat as General Response
            if not generated.strip().upper().startswith("SELECT"):
                resp = self._generate_general_response(request.message, request.history)
                self._save_history("session_1", request.message, resp)
                return ChatResponse(response_markdown=resp, data_source="WEB")
            
            if "CLARIFY:" in generated:
                q = generated.replace("CLARIFY:", "").strip()
                return ChatResponse(response_markdown=q, data_source="BD")

            # 2. Execute
            sql_query = self._sanitize_sql(generated)
            print(f"[DEBUG] SQL: {sql_query}")
            results = self._execute_sql(sql_query)
            
            # 3. Response
            final_resp, suggestions = self._generate_final_response(request.message, sql_query, results)
            
            # 4. Save History
            # Note: We are using a static session ID for now until frontend sends one
            self._save_history("session_1", request.message, final_resp, sql_query)
            
            chart_data = self._generate_chart_data(results, sql_query)
            
            return ChatResponse(
                response_markdown=final_resp,
                sql_query=sql_query,
                data_source="BD",
                suggested_questions=suggestions,
                chart_data=chart_data
            )
        except Exception as e:
            print(f"Error: {e}")
            return ChatResponse(response_markdown=f"Error: {str(e)}", data_source="ERROR")

# --- Routes ---

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request, db=Depends(get_db)):
    check_rate_limit(req)
    service = ChatService(db)
    response = service.process_message(request, req.client.host)
    
    # Generate audio in parallel for instant playback
    if elevenlabs_client and response.response_markdown:
        try:
            # Clean text for TTS
            clean_text = response.response_markdown.split('|')[0]
            clean_text = ''.join(c for c in clean_text if c.isalnum() or c.isspace() or c in '.,!?;:()-áéíóúÁÉÍÓÚñÑüÜ')
            clean_text = ' '.join(clean_text.split())
            
            if clean_text.strip():
                # Generate audio with ElevenLabs
                audio_generator = elevenlabs_client.text_to_speech.convert(
                    text=clean_text[:500],  # Limit to 500 chars for speed
                    voice_id="hpp4J3VqNfWAUOO0d1Us",  # Bella
                    model_id="eleven_multilingual_v2",
                    voice_settings=VoiceSettings(
                        stability=0.5,
                        similarity_boost=0.75,
                        use_speaker_boost=True
                    )
                )
                
                # Convert to base64 for embedding in JSON
                import base64
                audio_bytes = b"".join(audio_generator)
                response.audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        except Exception as e:
            print(f"Audio generation failed: {e}")
            # Continue without audio
    
    return response

# --- Text-to-Speech Endpoint ---
class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = "hpp4J3VqNfWAUOO0d1Us"  # Bella voice ID (Professional, Bright, Warm)

@router.post("/speak")
async def speak_endpoint(request: SpeakRequest):
    """
    Convert text to speech using ElevenLabs API.
    Returns MP3 audio file.
    
    Available voices (free tier):
    - hpp4J3VqNfWAUOO0d1Us: Bella (female, professional, warm)
    - pNInz6obpgDQGcFmaJgB: Adam (male, dominant, firm)
    - nPczCjzI2devNBz1zQrb: Brian (male, deep, comforting)
    """
    if not elevenlabs_client:
        raise HTTPException(status_code=503, detail="ElevenLabs API not configured")
    
    try:
        # Clean text for better pronunciation
        clean_text = request.text.strip()
        
        # Generate audio using ElevenLabs
        audio_generator = elevenlabs_client.text_to_speech.convert(
            text=clean_text,
            voice_id=request.voice,  # Use the voice ID from request
            model_id="eleven_multilingual_v2",  # Best for Spanish
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                style=0.0,
                use_speaker_boost=True
            )
        )
        
        # Collect audio bytes
        audio_bytes = b"".join(audio_generator)
        
        # Return as MP3
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
        
    except Exception as e:
        print(f"ElevenLabs TTS Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await websocket.manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            # Echo or process if needed, but primarily for pushing alerts
            pass 
    except WebSocketDisconnect:
        websocket.manager.disconnect(ws)

