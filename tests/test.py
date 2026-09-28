import sys
import os

# Root directory configuration for cross-module imports
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_path not in sys.path:
    sys.path.append(root_path)

from Ingestion.payment_file_data_extraction import extract_piraeus_data_fixed
from Database.payment_data_upload_to_db import upload_transactions_to_db

def run_process():
    """Main execution flow: Extracts data from Excel and uploads to DB."""
    print("Initiating data extraction...")
    # Assume file is located in the root directory
    df = extract_piraeus_data_fixed("TRANSACTIONS.xlsx")

    if df is not None:
        print(f"Status: File read successful ({len(df)} rows).")
        # Start upload process for User ID 1
        upload_transactions_to_db(df, user_id=1)
    else:
        print("Error: Extraction failed or file missing.")

if __name__ == "__main__":
    run_process()