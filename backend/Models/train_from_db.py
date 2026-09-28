import sys
import os
import pandas as pd
from psycopg2.extras import execute_batch

# --- PATH SETUP ---
# Manually configure paths to ensure local imports work correctly outside the API.
# Derived from this file's location, so the script runs from any checkout.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_PATH = os.path.join(BASE_DIR, "backend")
if BACKEND_PATH not in sys.path:
    sys.path.append(BACKEND_PATH)

from Database.db_connection import get_connection
from Models.preprocess import clean_description
from backend.Models.dl_predictor import ExpenseClassifier

def train_from_piraeus_and_update_all():
    """
    Powerful utility script that uses high-quality Piraeus bank categories as 'Ground Truth'
    to train the AI model and then applies predictions to ALL other bank records in the DB.
    """
    conn = get_connection()
    if not conn: return
    
    # Define labels that are considered noise and should not be used for training
    INVALID_LABELS = ['GENERAL', 'ΛΟΙΠΑ', '042 ΑΓΟΡΑ', 'ΠΛΗΡΩΜΗ', 'ΑΛΛΕΣ ΣΥΝΑΛΛΑΓΕΣ', 'UNCATEGORIZED']

    try:
        # 1. Load the entire database for processing
        query = "SELECT id, description, category, bank_category, bank_name FROM payments"
        df = pd.read_sql(query, conn)
        
        # Clean descriptions (remove noise like card numbers)
        df['clean_desc'] = df['description'].apply(clean_description)

        # 2. TRAINING PHASE (Piraeus as Teacher)
        # Select Piraeus records that have a valid bank_category assigned by the bank's portal
        train_mask = (
            (df['bank_name'] == 'PIRAEUS') & 
            (df['bank_category'].notnull()) & 
            (~df['bank_category'].str.upper().isin(INVALID_LABELS))
        )
        train_df = df[train_mask].copy()

        if len(train_df) < 5:
            print(f"⚠️ Only {len(train_df)} valid Piraeus rows found. Need more data to start training.")
            return

        # Initialize the AI Classifier and start training
        clf = ExpenseClassifier()
        print(f"Training AI using Piraeus as 'Teacher' ({len(train_df)} records)...")
        clf.train(train_df['clean_desc'], train_df['bank_category'])

        # 3. PREDICTION PHASE (Apply to all)
        # The AI now predicts categories for EVERY transaction (Alpha, NBG, Eurobank, etc.)
        print(f"Applying predictions to all transactions ({len(df)} rows)...")
        predictions = clf.predict(df['clean_desc'])
        df['category'] = predictions

        # 4. DATABASE UPDATE PHASE (Batch sync)
        cursor = conn.cursor()
        update_query = "UPDATE payments SET category = %s WHERE id = %s"
        
        # Prepare data for efficient batch update using execute_batch
        update_data = [(row['category'], int(row['id'])) for _, row in df.iterrows()]
        
        execute_batch(cursor, update_query, update_data)
        conn.commit()
        
        print(f"🚀 Success! All transactions categorized based on Piraeus logic.")
        
        # Save the finalized model to disk
        model_path = os.path.join(BACKEND_PATH, "Models", "expense_model.pkl")
        clf.save(model_path)

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    train_from_piraeus_and_update_all()