import mysql.connector

def create_tables():
    print("Conectando a MySQL local...")
    c = mysql.connector.connect(
        host='localhost',
        user='root',
        password='123456789',
        database='mcqs-jcq'
    )
    cur = c.cursor()
    
    # Tabla infobras_obras
    print("Creando tabla infobras_obras...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS infobras_obras (
            cui VARCHAR(15) PRIMARY KEY,
            obra_id_infobras VARCHAR(15),
            entidad VARCHAR(255),
            estado_ejecucion VARCHAR(100),
            contratista VARCHAR(255),
            modalidad VARCHAR(100),
            contrato_desc VARCHAR(255),
            fecha_contrato VARCHAR(50),
            fecha_inicio VARCHAR(50),
            fecha_fin VARCHAR(50),
            costo_viable VARCHAR(50),
            costo_actualizado VARCHAR(50),
            alerta_situacional TEXT,
            pdf_resolucion VARCHAR(500),
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
    """)

    # Tabla infobras_valorizaciones
    print("Creando tabla infobras_valorizaciones...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS infobras_valorizaciones (
            cui VARCHAR(15),
            periodo VARCHAR(50),
            avance_fisico_prog VARCHAR(20),
            avance_fisico_real VARCHAR(20),
            avance_val_prog VARCHAR(100),
            avance_val_real VARCHAR(100),
            pct_ejecucion_fin VARCHAR(20),
            monto_ejecucion_fin VARCHAR(100),
            estado VARCHAR(100),
            causal_paralizacion VARCHAR(255),
            url_imagen VARCHAR(500),
            PRIMARY KEY (cui, periodo),
            FOREIGN KEY (cui) REFERENCES infobras_obras(cui) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
    """)
    
    c.commit()
    c.close()
    print("Tablas de Infobras creadas correctamente!")

if __name__ == "__main__":
    create_tables()
