import psycopg2 # PostgreSQL database adapter for Python
import os # Module to interact with the operating system environment
from dotenv import load_dotenv # Module to read key-value pairs from a .env file

# Load variables from .env file into the environment
load_dotenv()

def get_connection():
    """
    Establishes and returns a connection to the Supabase PostgreSQL database.
    Returns a psycopg2 connection object or None if the connection fails.
    """
    # Fetch database credentials from environment variables securely
    # Use the exact keys from your .env file
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS")
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT")
    dbname = os.getenv("DB_NAME")

    # Final check before attempting connection to prevent silent failures
    if not password:
        print("CRITICAL ERROR: DB_PASS variable is not being read. Check your .env key names.")
        return None

    try:
        # Establish connection to Supabase Cloud Postgres
        conn = psycopg2.connect(
            host=host,
            database=dbname,
            user=user,
            password=password,
            port=port,
            sslmode='require' # Mandatory for Supabase cloud security (enforces encrypted connection)
        )
        return conn
    except Exception as e:
        # Log the error if the connection attempt fails
        print(f"Error connecting to Supabase: {e}")
        return None