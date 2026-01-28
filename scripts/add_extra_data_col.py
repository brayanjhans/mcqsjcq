
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Try to load from project root if running locally
load_dotenv()

# Use VPS URL if available or local
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ No DATABASE_URL found")
    exit(1)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Checking if extra_data column exists...")
        result = conn.execute(text("SHOW COLUMNS FROM notifications LIKE 'extra_data'"))
        if result.fetchone():
            print("✅ Column extra_data already exists.")
        else:
            print("⚠️ Column extra_data MISSING. Adding it now...")
            conn.execute(text("ALTER TABLE notifications ADD COLUMN extra_data JSON NULL"))
            conn.commit()
            print("✅ Column extra_data added successfully!")

except Exception as e:
    print(f"Error: {e}")
