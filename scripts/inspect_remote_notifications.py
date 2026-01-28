
from sqlalchemy import create_engine, inspect
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
    inspector = inspect(engine)
    
    table = 'notifications'
    if inspector.has_table(table):
        print(f"\nScanning table: {table}")
        columns = [c['name'] for c in inspector.get_columns(table)]
        print(f"Columns: {columns}")
    else:
        print(f"❌ Table {table} NOT FOUND")

except Exception as e:
    print(f"Error: {e}")
