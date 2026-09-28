import os
import sys
import pandas as pd

# Προσθήκη φακέλων στο path
root_path = os.path.abspath(os.path.dirname(__file__))
if root_path not in sys.path:
    sys.path.append(root_path)

from Ingestion.payment_file_data_extraction import extract_piraeus_data_fixed
from Database.payment_data_upload_to_db import upload_transactions_to_db
from Models.classifier import ExpenseClassifier
from Models.preprocess import clean_description

def run_automation():
    # Ρυθμίσεις
    file_name = "TRANSACTIONS.xlsx" # Το νέο σου αρχείο
    user_id = 1
    model_path = os.path.join("Models", "expense_model.pkl")

    print("1. Εξαγωγή δεδομένων από το Excel...")
    df = extract_piraeus_data_fixed(file_name)
    
    if df is None or df.empty:
        print("Δεν βρέθηκαν νέα δεδομένα.")
        return

    print("2. Φόρτωση του εκπαιδευμένου μοντέλου AI...")
    clf = ExpenseClassifier()
    
    if clf.load(model_path):
        print("Το μοντέλο φορτώθηκε. Κατηγοριοποίηση νέων συναλλαγών...")
        # Καθαρίζουμε τις περιγραφές για το AI
        df['clean_desc'] = df['description'].apply(clean_description)
        # Το AI προβλέπει την κατηγορία βάσει των όσων έμαθε από τις 518 παλιές
        df['category'] = clf.predict(df['clean_desc'])
    else:
        print("Προειδοποίηση: Δεν βρέθηκε εκπαιδευμένο μοντέλο. Οι κατηγορίες θα παραμείνουν 'Pending'.")

    print("3. Εισαγωγή στη βάση δεδομένων...")
    upload_transactions_to_db(df, user_id)
    
    print("--- Η διαδικασία ολοκληρώθηκε επιτυχώς! ---")

if __name__ == "__main__":
    run_automation()