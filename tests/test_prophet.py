import pandas as pd
from prophet import Prophet
import matplotlib.pyplot as plt
from Database.db_connection import get_connection
import os

def run_test_forecast(months=3):
    # 1. Σύνδεση και λήψη δεδομένων
    conn = get_connection()
    if not conn: return
    
    # Παίρνουμε ημερομηνία και το απόλυτο ποσό (για να βλέπουμε το ύψος των εξόδων)
    query = "SELECT payment_date as ds, ABS(amount) as y FROM payments"
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty:
        print("Δεν βρέθηκαν δεδομένα στη βάση.")
        return

    # 2. Ομαδοποίηση ανά ημέρα (Το Prophet χρειάζεται μία τιμή ανά ημερομηνία)
    df = df.groupby('ds').sum().reset_index()
    
    print(f"Εκπαίδευση μοντέλου σε {len(df)} ημέρες με έξοδα...")

    # 3. Ρύθμιση και εκπαίδευση του Prophet
    model = Prophet(yearly_seasonality=True, daily_seasonality=False, weekly_seasonality=True)
    model.fit(df)

    # 4. Δημιουργία μελλοντικών ημερομηνιών
    future = model.make_future_dataframe(periods=months * 30)
    forecast = model.predict(future)

    # 5. Εμφάνιση αποτελεσμάτων
    print(f"\n--- Πρόβλεψη για τους επόμενους {months} μήνες ---")
    print(forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(10))

    # 6. Οπτικοποίηση (Προαιρετικά, αν έχεις matplotlib)
    fig1 = model.plot(forecast)
    plt.title(f"Πρόβλεψη Εξόδων για {months} Μήνες")
    plt.xlabel("Ημερομηνία")
    plt.ylabel("Ποσό Εξόδων")
    plt.show()

if __name__ == "__main__":
    run_test_forecast(months=3) # Δοκιμή για 3 μήνες