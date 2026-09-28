import sys
import os

# 1. Εντοπισμός του φακέλου backend
# Παίρνουμε το path του τρέχοντος αρχείου και προσθέτουμε το "backend"
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, "backend")

# 2. Εισαγωγή του backend στο σύστημα αναζήτησης της Python
if backend_path not in sys.path:
    sys.path.append(backend_path)

# 3. Τώρα κάνουμε το import (τώρα η Python βλέπει το φάκελο Models)
try:
    from Models.dl_predictor import predictor
except ImportError as e:
    print(f"❌ Σφάλμα Import: {e}")
    print("Βεβαιώσου ότι το αρχείο 'backend/Models/dl_predictor.py' υπάρχει.")
    sys.exit(1)

# --- ΤΕΣΤ ---
examples = [
    "SKLAVENITIS ARGOS POS",      
    "SHELL STATION ATTIKI ODOS",  
    "NETFLIX MONTHLY SUBSCR",     
    "WOLT* BURGER HOUSE",        
    "AGNOSTOS XRESTIS 123",       
]

print("\n--- 🤖 AI PREDICTION TEST ---")
for text in examples:
    cat, conf = predictor.predict(text)
    print(f"📝 '{text}'")
    print(f"   ↳ Κατηγορία: {cat} (Βεβαιότητα: {conf:.1f}%)")
    print("-" * 30)