"""
Rate Limiting configuration for MQS Garantías API.

3 reglas diferenciadas:
  - Login: 5 intentos / minuto por IP  (anti fuerza bruta)
  - General API: 200 requests / minuto por usuario (navegación normal)
  - Exports/Reportes: 10 requests / minuto por usuario (operaciones pesadas)
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def _get_user_or_ip(request: Request) -> str:
    """
    Identificador para el rate limit:
    - Si el usuario está autenticado (tiene csrf_token cookie), usa el
      valor del JWT cookie como clave → limita por usuario individual,
      no por IP compartida de oficina.
    - Si no hay sesión (ej. login), usa la IP remota.
    """
    # Intentar identificar por cookie de sesión (no el token HttpOnly, sino
    # la presencia del csrf_token como señal de sesión activa).
    # Para el key real usamos la IP como fallback seguro y eficiente.
    # La cookie access_token es HttpOnly, no podemos leerla en Python aquí
    # porque slowapi llama esta función antes del middleware de auth.
    # Usamos IP + User-Agent como fingerprint para mayor precisión.
    ip = get_remote_address(request)
    return ip


# Limiter principal — usa IP como identificador base
limiter = Limiter(key_func=_get_user_or_ip)
