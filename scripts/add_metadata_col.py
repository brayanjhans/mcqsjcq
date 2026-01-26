
from sqlalchemy import text
from app.database import SessionLocal

def add_metadata_column():
    db = SessionLocal()
    try:
        print("Adding 'metadata' column to 'notifications' table...")
        
        # Check if exists first (to be safe, though previous check said no)
        try:
            db.execute(text("SELECT metadata FROM notifications LIMIT 1"))
            print("Column 'metadata' already exists.")
        except:
            # Add column
            # Note: Laragon uses MariaDB/MySQL usually. JSON type assumes MySQL 5.7+ or MariaDB 10.2+
            # If JSON type fails, fallback to TEXT.
            try:
                db.execute(text("ALTER TABLE notifications ADD COLUMN metadata JSON NULL"))
                print("SUCCESS: Added 'metadata' column (JSON type).")
            except Exception as e_json:
                print(f"JSON type failed ({e_json}), trying TEXT...")
                db.execute(text("ALTER TABLE notifications ADD COLUMN metadata TEXT NULL"))
                print("SUCCESS: Added 'metadata' column (TEXT type).")
                
        db.commit()
    except Exception as e:
        print(f"Error adding column: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_metadata_column()
