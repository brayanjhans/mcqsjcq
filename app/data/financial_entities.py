
from app.utils.normalization import NORMALIZATION_MAP

# Generamos la lista única de valores canónicos (Clean Names)
# Esto asegura que el filtro final solo muestre "BBVA", "BCP", etc. y no duplicados.
ENTIDADES_FINANCIERAS = sorted([
    v for v in set(NORMALIZATION_MAP.values()) 
    if v not in ["ERROR EN DATA", "SIN GARANTIA"]
])

# Listas categorizadas (Opcional, si se necesitan para UI agrupada en el futuro)
# Se derivan de los valores canónicos
BANCOS = [e for e in ENTIDADES_FINANCIERAS if "BANCO" in e or e in ["BCP", "BBVA", "SCOTIABANK", "INTERBANK", "CITIBANK"]]

# Excluir explícitamente fondos y cooperativas de la lista de "Aseguradoras" puras
NO_ASEGURADORAS = ["FOGAPI", "COFIDE", "CORFID", "ACRES", "EFIDE"]
ASEGURADORAS = [e for e in ENTIDADES_FINANCIERAS if e not in BANCOS and "CAJA" not in e and "FINANCIERA" not in e and "COOPERATIVA" not in e and e not in NO_ASEGURADORAS]

CAJAS_Y_OTROS = [e for e in ENTIDADES_FINANCIERAS if e not in BANCOS and e not in ASEGURADORAS]
