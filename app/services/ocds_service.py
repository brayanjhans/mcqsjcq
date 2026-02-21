"""
OCDS Service for OSCE (Peru).
Fetches guarantee data from the Portal de Contrataciones Abiertas.
"""
import requests
from datetime import datetime, date
from app.utils.api_cache import get_cached, set_cached, TTL_OCDS

# OSCE OCDS API base URL
OCDS_API_URL = "https://contratacionesabiertas.osce.gob.pe/api/v1/release"


def get_garantias(ocid: str) -> dict:
    """
    Fetch guarantee information from OCDS API for a given OCID.
    
    Args:
        ocid: Open Contracting ID (e.g. 'ocds-dgv273-seacev3-1173501')
    
    Returns:
        dict with keys: garantias (list), error
    """
    if not ocid:
        return {"garantias": [], "error": "OCID no proporcionado"}

    # Check cache
    cache_key = f"ocds_{ocid}"
    cached = get_cached(cache_key, TTL_OCDS)
    if cached is not None:
        return cached

    try:
        url = f"{OCDS_API_URL}/{ocid}"
        print(f"[OCDS] Fetching: {url}")

        response = requests.get(
            url,
            timeout=30,
            headers={"Accept": "application/json"}
        )

        if response.status_code == 404:
            result = {"garantias": [], "error": "OCID no encontrado en el portal OCDS"}
            set_cached(cache_key, result)
            return result

        if response.status_code != 200:
            return {
                "garantias": [],
                "error": f"API OCDS retornó status {response.status_code}"
            }

        data = response.json()

        # Navigate OCDS structure to find guarantees
        garantias = []
        releases = data.get("releases", [data]) if "releases" in data else [data]

        for release in releases:
            contracts = release.get("contracts", [])
            for contract in contracts:
                contract_guarantees = contract.get("guarantees", [])
                for g in contract_guarantees:
                    garantia = _parse_garantia(g, contract)
                    garantias.append(garantia)

                # Also check in implementation section
                implementation = contract.get("implementation", {})
                impl_guarantees = implementation.get("guarantees", [])
                for g in impl_guarantees:
                    garantia = _parse_garantia(g, contract)
                    garantias.append(garantia)

        result = {"garantias": garantias, "error": None}
        set_cached(cache_key, result)
        return result

    except requests.exceptions.Timeout:
        return {"garantias": [], "error": "Timeout al consultar API OCDS"}
    except Exception as e:
        print(f"[OCDS] Error: {e}")
        return {"garantias": [], "error": str(e)}


def _parse_garantia(guarantee: dict, contract: dict = None) -> dict:
    """Parse a single guarantee object from OCDS format."""
    expiry_str = guarantee.get("expiryDate") or guarantee.get("date")
    monto = guarantee.get("value", {}).get("amount")
    currency = guarantee.get("value", {}).get("currency", "PEN")

    # Calculate semaphore status
    estado_semaforo = "gris"  # Unknown
    dias_restantes = None

    if expiry_str:
        try:
            # Handle various date formats
            expiry_date = None
            for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%d/%m/%Y"]:
                try:
                    expiry_date = datetime.strptime(expiry_str[:19], fmt).date()
                    break
                except ValueError:
                    continue

            if expiry_date:
                today = date.today()
                delta = (expiry_date - today).days
                dias_restantes = delta

                if delta < 0:
                    estado_semaforo = "rojo"      # Expired
                elif delta <= 15:
                    estado_semaforo = "ambar"     # About to expire (< 15 days)
                else:
                    estado_semaforo = "verde"     # Healthy
        except Exception:
            pass

    return {
        "id": guarantee.get("id"),
        "tipo": guarantee.get("type", "unknown"),
        "fecha_vencimiento": expiry_str,
        "monto_garantizado": float(monto) if monto else None,
        "moneda": currency,
        "estado_semaforo": estado_semaforo,
        "dias_restantes": dias_restantes,
        "descripcion": guarantee.get("description"),
        "contrato_id": contract.get("id") if contract else None,
    }
