import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Import models
from app.models.user import User, UserRole
from app.models.session import UserSession
from app.database import Base
from app.utils.security import get_password_hash

# Load env
load_dotenv(".env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("[ERROR] DATABASE_URL not found")
    sys.exit(1)

print(f"[INFO] Connecting to {db_url.split('@')[1]}...")
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    print("[INFO] Creating tables (if not exist)...")
    # This will create 'usuarios' and 'user_sessions'
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.id_corporativo == "admin").first()
        if not admin:
            print("[INFO] Creating default admin user...")
            hashed_pw = get_password_hash("admin123") # Default password
            
            new_admin = User(
                id_corporativo="admin",
                nombre="Administrador",
                email="admin@example.com",
                password_hash=hashed_pw,
                perfil="DIRECTOR", # Using string as defined in Enum
                activo=True,
                job_title="System Administrator"
            )
            db.add(new_admin)
            db.commit()
            print("[OK] Admin user created (user: admin, pass: admin123)")
        else:
            print("[INFO] Admin user already exists.")
            
    except Exception as e:
        print(f"[ERROR] Failed to init DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
