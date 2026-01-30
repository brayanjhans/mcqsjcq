
"""
Utility for normalizing data across the application.
Centralizes the logic for mapping inconsistent insurer names (and potentially others) to canonical values.
"""


# Mapa maestro de normalización para Aseguradoras / Entidades Financieras
# Las llaves deben ser lo más específicas posible para evitar falsos positivos.
# El orden importa: Se iterará y la primera coincidencia ganará.
NORMALIZATION_MAP = {
    # --- BANCOS PRINCIPALES ---
    "BANCO DE CREDITO": "BCP",
    "DE CREDITO DEL PERU": "BCP",
    "DE CREDITO DEL PERÚ": "BCP",
    "BCP": "BCP",
    "CONTINENTAL": "BBVA",
    "BBVA": "BBVA",
    "INTERBANK": "INTERBANK",
    "INTERNACIONAL DEL PER": "INTERBANK", # Match "PERU" or "PERÚ"
    "CREDISCOTIA": "FINANCIERA CREDISCOTIA", # Specific before generic SCOTIA
    "SCOTIABANK": "SCOTIABANK",
    "SCOTIA": "SCOTIABANK",
    "BIF": "BANBIF",
    "BANBIF": "BANBIF",
    "BANBIIF": "BANBIF",
    "PICHINCHA": "PICHINCHA",
    "FINANCIERO": "PICHINCHA", # Banco Financiero es ahora Pichincha
    "GNB": "BANCO GNB",
    "COMERCIO": "BANCO DE COMERCIO",
    "SANTANDER": "SANTANDER",
    "DE LA NACION": "BANCO DE LA NACION",
    "CITI": "CITIBANK",
    "ALFIN": "ALFIN",
    "AZTECA": "ALFIN",
    "MI BANCO": "MIBANCO",
    "MIBANCO": "MIBANCO",
    "CHINA": "BANK OF CHINA",
    "ICBC": "ICBC",
    "FALABELLA": "BANCO FALABELLA",
    "RIPLEY": "BANCO RIPLEY",
    "BCI": "BCI",

    # --- ASEGURADORAS ---
    "AVLA": "AVLA",
    "CESCE": "CESCE", # Cuidado: contiene 'CREDITO' en su nombre largo, debe ir antes de reglas genéricas si las hubiera
    "SECREX": "CESCE", # Merged into CESCE per user request
    "INSUR": "INSUR",
    "CRECER": "CRECER SEGUROS",
    "MAPFRE": "MAPFRE",
    "POSITIVA": "LA POSITIVA",
    "RIMAC": "RIMAC",
    "LIBERTY": "LIBERTY SEGUROS",
    "CHUBB": "CHUBB",
    "CARDIF": "CARDIF",
    "OH": "FINANCIERA OH",
    "CONFIANZA": "FINANCIERA CONFIANZA",
    "CREDINKA": "FINANCIERA CREDINKA",
    "EFECTIVA": "FINANCIERA EFECTIVA",
    "QAPAQ": "FINANCIERA QAPAQ",
    "PROEMPRESA": "FINANCIERA PROEMPRESA",
    "FOGAPI": "FOGAPI",
    "CORFID": "CORFID",
    "COFIDE": "COFIDE",
    "CORPORACION FINANCIERA DE DESARROLLO": "COFIDE",
    "CENTRAL DE RESERVA": "CENTRAL DE RESERVA DEL PERU",
    "COMPAÑÍA ESPAÑOLA DE SEGUROS": "CESCE", # Full name of CESCE
    "CAT PERU": "CAJA RURAL CAT PERU",
    
    # --- CAJAS ---
    "AREQUIPA": "CAJA AREQUIPA",
    "CUSCO": "CAJA CUSCO",
    "PIURA": "CAJA PIURA",
    "HUANCAYO": "CAJA HUANCAYO",
    "TRUJILLO": "CAJA TRUJILLO",
    "ICA": "CAJA ICA",
    "SULLANA": "CAJA SULLANA",
    "TACNA": "CAJA TACNA",
    "MAYNAS": "CAJA MAYNAS",
    "PAITA": "CAJA PAITA",
    "SANTA": "CAJA DEL SANTA",
    "CENTRO": "CAJA CENTRO",
    "METROPOLITANA": "CAJA METROPOLITANA",
    "LOS ANDES": "COOPAC LOS ANDES",
    "PARROQUIA SAN LORENZO": "COOPAC SAN LORENZO",
    "EMPRENDER": "COOPAC EMPRENDER",
    "NIÑO REY": "COOPAC NIÑO REY",
    "SAN FRANCISCO": "COOPAC SAN FRANCISCO",
    "15 DE SETIEMBRE": "COOPAC 15 DE SETIEMBRE",
    "FINANCOOP": "COOPAC FINANCOOP",
    
    # --- OTROS ---
    "GMG SERVICIOS": "GMG SERVICIOS",
    "ACRES": "ACRES",
    "EFIDE": "EFIDE",
    "EDPYME": "EDPYME ALTERNATIVA",
    "SIN_GARANTIA": "SIN GARANTIA",
    "ERROR": "ERROR EN DATA",
    "BANCOM": "BANCOM", # Recovered from 'M'
    "OTROS": "OTROS",
    "OTRO": "OTROS",
}

def normalize_insurer_name(name: str) -> str:
    """
    Normalizes a financial entity/insurer name using the central map.
    Returns the canonical name if a match is found.
    """
    if not name:
        return ""
    
    upper_name = name.upper().strip()
    
    # Iterate through the map. Python 3.7+ guarantees insertion order.
    # We placed specific keys first.
    for key, canonical in NORMALIZATION_MAP.items():
        if key in upper_name:
            return canonical
            
    # If no match, return formatted original (Title Case for better looks?)
    # Or keep UPPER to match standard
    return upper_name

