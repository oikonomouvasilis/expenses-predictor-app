import hashlib # Library for generating secure hashes (SHA-256)
import pandas as pd # Data manipulation library
import sys # System-specific parameters and functions
import os # Operating system interface

# --- PATH CONFIGURATION ---
# Dynamically calculate the root path of the project to ensure modules are importable
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_path not in sys.path:
    sys.path.append(root_path)

# Import the connection utility from the Database package
from Database.db_connection import get_connection

def generate_transaction_hash(row, bank_name, user_id, index):
    """
    Creates a unique SHA-256 hash for each transaction row.
    Including the 'index' ensures that even identical transactions appearing
    in the same statement result in unique hashes.
    """
    # Combine key transaction details into a single string for hashing
    combined = f"{row['payment_date']}-{row['description']}-{row['amount']}-{bank_name}-{user_id}-{index}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()

def upload_transactions_to_db(df, user_id):
    """
    Iterates through a DataFrame and inserts transactions into the 'payments' table.
    Uses conflict handling to prevent duplicate records based on the transaction hash.
    """
    # Define and validate supported bank entities
    valid_banks = ["PIRAEUS", "NBG", "EUROBANK", "ALPHABANK"]
    print("Available Banks: " + ", ".join(valid_banks))
    bank_name = input("Enter Bank Name: ").strip().upper()

    if bank_name not in valid_banks:
        print(f"Error: {bank_name} is not valid.")
        return

    # Initialize the database connection
    conn = get_connection()
    if conn is None: return

    cursor = conn.cursor()
    inserted_count = 0

    try:
        # Iterate through every row of the provided DataFrame
        for index, row in df.iterrows():
            # Generate a unique hash for the current record
            t_hash = generate_transaction_hash(row, bank_name, user_id, index)
            
            # SQL Query: Insert data into 'payments' table.
            # 'ON CONFLICT (transaction_hash) DO NOTHING' prevents duplicate entries.
            query = """
                INSERT INTO payments (
                    payment_date, description, amount, 
                    bank_name, user_id, transaction_hash, category, bank_category
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (transaction_hash) DO NOTHING;
            """
            
            # Map DataFrame values to table columns
            # Includes the AI prediction stored in the 'category' column of the DF
            values = (
                row['payment_date'], 
                row['description'], 
                row['amount'], 
                bank_name, 
                user_id, 
                t_hash,
                row['category'],  # AI-predicted category
                row['bank_category']
            )
            
            cursor.execute(query, values)
            # Increment counter only if a new record was actually inserted
            if cursor.rowcount > 0:
                inserted_count += 1
        
        # Save changes to the database
        conn.commit()
        print(f"Success: {inserted_count} records inserted.")
        
    except Exception as e:
        # Undo changes if an error occurs during the batch upload
        conn.rollback()
        print(f"Error: {e}")
    finally:
        # Safely close database resources
        cursor.close()
        conn.close()