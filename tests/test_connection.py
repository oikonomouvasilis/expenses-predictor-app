import sys
import os

# Ensure script can access Database package from root
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_path not in sys.path:
    sys.path.append(root_path)

from Database.db_connection import get_connection

def run_test():
    """Connectivity test script to verify environment variables and DB access."""
    try:
        conn = get_connection()
        if conn:
            print("Status: Database connection successful.")
            conn.close()
        else:
            print("Error: Database connection failed.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_test()