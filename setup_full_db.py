import pymysql
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load env before importing app modules potentially using env
load_dotenv(".env")

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import Base
from app.utils.security import get_password_hash

# Import ALL models to ensure they are registered with Base
from app.models.user import User
from app.models.session import UserSession
from app.models.notification import Notification
from app.models.support import SupportTicket
from app.models.audit import AuditLog
from app.models.chat_history import ChatHistory
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones, DetalleConsorcios
from app.models.contrato import Contrato

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "garantias_seace")

def create_database():
    print(f"Connecting to MySQL at {DB_HOST}...")
    try:
        conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS)
        cursor = conn.cursor()
        print(f"Creating database {DB_NAME} if not exists...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        cursor.close()
        conn.close()
        print("Database created/verified.")
    except Exception as e:
        print(f"Error creating database: {e}")
        sys.exit(1)

def init_tables_and_user():
    print("Initializing tables...")
    # Re-import engine to ensure it picks up the (potentially now existing) DB
    from app.database import engine
    
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created.")
    except Exception as e:
        print(f"Error creating tables: {e}")
        return
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        admin = db.query(User).filter(User.id_corporativo == "admin").first()
        hashed_pw = get_password_hash("123") # Password from GUIA_ACCESO
        hashed_pin = get_password_hash("123456") # PIN from GUIA_ACCESO

        if not admin:
            print("Creating default admin user...")
            
            new_admin = User(
                id_corporativo="admin",
                nombre="Administrador",
                email="admin@example.com",
                password_hash=hashed_pw,
                pin_hash=hashed_pin,
                perfil="DIRECTOR",
                activo=True,
                job_title="System Administrator"
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created (user: admin, pass: 123, pin: 123456)")
        else:
            print("Admin user already exists. Updating credentials...")
            admin.password_hash = hashed_pw
            admin.pin_hash = hashed_pin
            admin.activo = True
            db.commit()
            print("Admin user updated (user: admin, pass: 123, pin: 123456)")
            
    except Exception as e:
        print(f"Error initializing data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_database()
    init_tables_and_user()
