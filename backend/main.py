from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import sys
import shutil
import hashlib
from psycopg2.extras import execute_batch
from typing import Optional

# Ensure the terminal handles Greek characters correctly
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Path setup to ensure local modules (Database, Models, Ingestion) are discoverable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from Database.db_connection import get_connection
from Models.dl_predictor import predictor
from Ingestion.payment_file_data_extraction import (
    extract_eurobank, 
    extract_piraeus, 
    extract_nbg, 
    extract_alpha,
    assign_category
)
from Models.forecaster import forecaster

# Initialize the FastAPI application
app = FastAPI(title="AI Expense Tracker API")

# --- AI MEMORY RESTORATION ON STARTUP ---
@app.on_event("startup")
def load_memory_on_startup():
    """
    Every time the server starts (or wakes from sleep on Render), 
    this event triggers the AI to retrain using the latest data from Supabase.
    This ensures the AI is always up-to-date with user corrections.
    """
    print("[AI MEMORY] Waking up... Checking if AI needs retraining from DB.")
    try:
        predictor.retrain_from_db()
        print("[AI MEMORY] AI successfully restored from database!")
    except Exception as e:
        print(f"[AI MEMORY ERROR] Could not retrain on startup: {e}")

# --- CORS CONFIGURATION ---
# Defines which frontend URLs are allowed to interact with this API
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://expenses-predictor-app.vercel.app", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API ENDPOINTS ---

@app.get("/api/ping")
def ping_server():
    """Ελαφρύ endpoint για το UptimeRobot ώστε να κρατάει τον server ξύπνιο."""
    return {"status": "alive", "message": "Server is awake!"}

@app.put("/api/transactions/{transaction_id}")
async def update_category(transaction_id: int, data: dict = Body(...)):
    """
    Updates the category of a specific transaction in the DB and 
    immediately triggers AI retraining so the model learns from this manual correction.
    """
    new_cat = data.get("category")
    if not new_cat:
        raise HTTPException(status_code=400, detail="Category is required")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE payments SET category = %s WHERE id = %s", (new_cat, transaction_id))
        conn.commit()
        conn.close()
        # Trigger retraining to incorporate the new manual label into the neural network
        predictor.retrain_from_db()
        return {"message": "Success"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transactions")
def get_transactions(user_id: str):
    """Retrieves all transaction records for a specific user, sorted by date."""
    conn = get_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Connection Failed")
    query = "SELECT id, payment_date, description, amount, category, bank_name, transaction_hash FROM payments WHERE user_id = %s ORDER BY payment_date DESC"
    try:
        df = pd.read_sql(query, conn, params=(user_id,))
        conn.close()
        df['payment_date'] = df['payment_date'].astype(str)
        df = df.fillna("")
        return df.to_dict(orient="records")
    except Exception as e:
        if conn: conn.close()
        return []

@app.get("/api/forecast")
def get_forecast(user_id: str, days: int = 30, category: Optional[str] = None, bank: str = "All", type: str = "Expenses"):
    """
    Generates financial forecasts. Returns a 'No data' error if the user has 
    insufficient history for time-series modeling.
    """
    try:
        conn = get_connection()
        if not conn: raise HTTPException(status_code=500, detail="DB Connection Failed")
        cursor = conn.cursor()
        
        # Check for sufficient data before starting the Prophet model
        if type == "Income":
            cursor.execute("SELECT COUNT(*) FROM payments WHERE user_id = %s AND amount > 0", (user_id,))
        else:
            cursor.execute("SELECT COUNT(*) FROM payments WHERE user_id = %s AND amount < 0", (user_id,))
            
        count = cursor.fetchone()[0]
        conn.close()
        
        if count == 0:
            return {"forecast": [], "total_predicted": 0, "breakdown": [], "trend": "flat", "error": "No data"}

        cat_filter = category if category != "All" else None
        
        # Invoke the forecasting engine
        data = forecaster.generate_forecast(user_id=user_id, days_ahead=days, category=cat_filter, bank=bank, transaction_type=type)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(bank: str = Form(...), user_id: str = Form(...), file: UploadFile = File(...)):
    """
    Handles file uploads, performs data extraction per bank, uses the AI 
    to predict categories for new rows, and syncs to Supabase.
    """
    if not file.filename.lower().endswith(('.csv', '.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Wrong file format. Only CSV or Excel files are accepted.")

    # Temporarily save the file to process it
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        detected_bank = bank.upper()
        transactions = []
        
        # Route to the correct bank extractor
        if detected_bank == "EUROBANK": transactions, _ = extract_eurobank(temp_filename)
        elif detected_bank == "PIRAEUS": transactions, _ = extract_piraeus(temp_filename)
        elif detected_bank == "NBG": transactions, _ = extract_nbg(temp_filename)
        elif detected_bank == "ALPHA": transactions, _ = extract_alpha(temp_filename) 
        else: raise ValueError("Unknown bank")

        if not transactions:
            raise HTTPException(status_code=400, detail="The file is empty or does not contain valid transactions.")

        processed_data = []
        occurrence_tracker = {}

        for t in transactions:
            amount = t['amount']
            try: date_str = t['date'].strftime('%Y-%m-%d')
            except: continue
            
            desc = t['description']
            
            # Predict category: Priority 1 - Hardcoded Rules, Priority 2 - AI Neural Net
            category = assign_category(desc, amount) 
            if category == 'Pending' and amount < 0:
                pred_cat = predictor.predict_category(desc)
                if pred_cat != "Review Needed": category = pred_cat
            
            # Unique Hash Generation with occurrence tracking to support identical transactions
            # Unique Hash Generation with occurrence tracking to support identical transactions
            clean_amt = "{:.2f}".format(round(float(amount), 2))
            # ΠΡΟΣΘΗΚΗ: Βάζουμε το user_id στο κλειδί για να μην μπλοκάρονται τα νέα accounts!
            base_key = f"{date_str}-{desc}-{clean_amt}-{user_id}"
            occurrence_tracker[base_key] = occurrence_tracker.get(base_key, 0) + 1
            t_hash = hashlib.md5(f"{base_key}-{occurrence_tracker[base_key]}".encode('utf-8')).hexdigest()
            
            processed_data.append((date_str, desc, amount, category, detected_bank, t_hash, user_id))

        # Check for duplicates already present in the database to avoid redundant inserts
        conn = get_connection()
        cursor = conn.cursor()
        t_hashes = [t[5] for t in processed_data]
        cursor.execute("SELECT transaction_hash FROM payments WHERE user_id = %s AND transaction_hash = ANY(%s)", (user_id, t_hashes))
        existing_hashes = {row[0] for row in cursor.fetchall()}
        
        new_data = [t for t in processed_data if t[5] not in existing_hashes]

        if not new_data:
            conn.close()
            # ΑΛΛΑΓΗ 1: Μήνυμα για Duplicates
            raise HTTPException(
                status_code=400, 
                detail="These transactions already exist in the database. No new records found."
            )

        # Bulk insert new records
        insert_query = "INSERT INTO payments (payment_date, description, amount, category, bank_name, transaction_hash, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (transaction_hash) DO NOTHING"
        execute_batch(cursor, insert_query, new_data)
        conn.commit()
        conn.close()

        # Incremental learning: Train AI on the newly added data points
        predictor.retrain_from_db()

        return {"message": "Success", "count": len(new_data)}

    # ΑΛΛΑΓΗ 2: Μήνυμα για Λάθος Αρχείο (πιάνει το ValueError από το αρχείο extraction)
    except ValueError as ve:
        print(f"[FORMAT ERROR] {ve}")
        raise HTTPException(
            status_code=400, 
            detail="Wrong bank file or invalid format. Please ensure the file matches the selected bank."
        )
    # ΑΛΛΑΓΗ 3: Πιάνει τα δικά μας HTTPException (π.χ. Duplicates) για να μην γίνουν 500
    except HTTPException as http_exc:
        raise http_exc
    # ΑΛΛΑΓΗ 4: Το Γενικό σφάλμα έγινε στα Αγγλικά
    except Exception as e:
        print(f"[UPLOAD ERROR] {e}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected internal server error occurred during file processing."
        )
    finally:
        if os.path.exists(temp_filename): os.remove(temp_filename)

@app.delete("/api/clear_bank")
def clear_bank(user_id: str, bank_name: str):
    """Deletes all records associated with a specific bank for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM payments WHERE user_id = %s AND bank_name = %s;", (user_id, bank_name))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

if __name__ == "__main__":
    import uvicorn
    # Use the PORT environment variable provided by Render, or default to 8000 locally
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)