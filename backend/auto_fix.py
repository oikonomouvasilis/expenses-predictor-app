import os
import sys

# Βοηθάει να βρίσκει τους φακέλους Database και Models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from Database.db_connection import get_connection
from Models.dl_predictor import ExpensePredictor

def restore_categories():
    print("🧠 Φόρτωση παλιού AI από τα αρχεία .pkl...")
    predictor = ExpensePredictor()
    
    conn = get_connection()
    if not conn:
        print("❌ Αποτυχία σύνδεσης στη βάση δεδομένων.")
        return
        
    cursor = conn.cursor()
    
    print("📥 Λήψη 'Uncategorized' συναλλαγών από τη βάση...")
    # ΑΛΛΑΓΗ: Τώρα ψάχνουμε για 'Uncategorized'
    cursor.execute("SELECT id, description FROM payments WHERE category = 'Uncategorized' OR category = 'Pending'")
    transactions = cursor.fetchall()
    
    if not transactions:
        print("✅ Δεν βρέθηκαν Uncategorized/Pending συναλλαγές!")
        conn.close()
        return

    print(f"🔍 Βρέθηκαν {len(transactions)} συναλλαγές. Ξεκινάει η αυτόματη συμπλήρωση...\n")
    
    updated_count = 0
    for tx in transactions:
        tx_id = tx[0]
        desc = tx[1]
        
        # Ρωτάμε το παλιό μοντέλο
        predicted_category, confidence = predictor.predict(desc)
        
        # Ελέγχουμε να μας δώσει μια έγκυρη κατηγορία (όχι Float, όχι Uncategorized)
        if predicted_category not in ['Pending', 'Uncategorized', 'Review Needed'] and confidence > 0.4 and 'Float' not in predicted_category:
            print(f"Διόρθωση: {desc[:20]}...  ->  {predicted_category} (Σιγουριά: {confidence:.2f}%)")
            
            # Ενημέρωση στη Βάση
            cursor.execute("UPDATE payments SET category = %s WHERE id = %s", (predicted_category, tx_id))
            updated_count += 1
            
    conn.commit()
    conn.close()
    print(f"\n🎉 Τέλος! Διορθώθηκαν αυτόματα {updated_count} συναλλαγές στη βάση δεδομένων.")

if __name__ == "__main__":
    restore_categories()