import pandas as pd
from prophet import Prophet
import os
import sys

# --- PATH CONFIGURATION ---
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from Database.db_connection import get_connection

class ExpenseForecaster:
    """
    Handles time-series forecasting for expenses and income using the Prophet model.
    """
    def __init__(self):
        self.model = None 

    def fetch_data(self, user_id, category=None, bank="All", transaction_type="Expenses"):
        """Retrieves and prepares time-series data from the database."""
        conn = get_connection()
        if not conn: return pd.DataFrame()

        # Dynamic query selection: Income (>0) or Expenses (<0)
        if transaction_type == "Income":
            query = """
                SELECT payment_date as ds, amount as y 
                FROM payments 
                WHERE amount > 0 AND user_id = %s
            """
        else:
            query = """
                SELECT payment_date as ds, ABS(amount) as y 
                FROM payments 
                WHERE amount < 0 AND user_id = %s
            """
            
        params = [user_id]
        
        # Apply filters if specific categories or banks are selected
        if category and category != "All":
            query += " AND category = %s"
            params.append(category)
            
        if bank and bank != "All":
            query += " AND bank_name = %s"
            params.append(bank)
            
        query += " ORDER BY payment_date ASC"

        try:
            df = pd.read_sql(query, conn, params=params)
            conn.close()
            
            if not df.empty:
                # Group data by day to sum multiple transactions on the same date
                df = df.groupby('ds').sum().reset_index()
            
            return df
        except Exception as e:
            print(f"Error fetching forecasting data: {e}")
            return pd.DataFrame()

    def get_breakdown_ratios(self, user_id, bank="All", transaction_type="Expenses"):
        """Calculates the percentage of total spending per category to distribute forecasted totals."""
        conn = get_connection()
        if not conn: return []
        
        if transaction_type == "Income":
            query = "SELECT category, SUM(amount) as total FROM payments WHERE user_id = %s AND amount > 0"
        else:
            query = "SELECT category, SUM(ABS(amount)) as total FROM payments WHERE user_id = %s AND amount < 0"
            
        params = [user_id]
        if bank and bank != "All":
            query += " AND bank_name = %s"
            params.append(bank)
        query += " GROUP BY category"
        
        try:
            df = pd.read_sql(query, conn, params=params)
            conn.close()
            if df.empty: return []
            
            total_sum = df['total'].sum()
            df['ratio'] = df['total'] / total_sum # Calculate ratio for each category
            return df.to_dict(orient='records')
        except:
            return []

    def generate_forecast(self, user_id, days_ahead=30, category=None, bank="All", transaction_type="Expenses"):
        """
        Main forecasting logic: Fits a Prophet model to historical data and
        projects spending trends into the future.
        """
        try:
            df = self.fetch_data(user_id, category, bank, transaction_type)
            
            # Prophet requires at least 2 historical points to function
            if len(df) < 2:
                return {"error": "No data"}

            # Initialize and fit the Prophet model (Meta's forecasting library)
            m = Prophet(daily_seasonality=True, yearly_seasonality=False)
            m.fit(df)

            # Create future dates and predict amounts
            future = m.make_future_dataframe(periods=int(days_ahead))
            forecast = m.predict(future)

            # Extract the relevant future data points
            result = forecast[['ds', 'yhat']].tail(int(days_ahead))
            result['date'] = result['ds'].dt.strftime('%Y-%m-%d')
            
            total_predicted = result['yhat'].sum()

            # Determine spending trend: increasing, decreasing or stable
            trend = "stable"
            if len(result) > 1:
                last_val = result.iloc[-1]['yhat']
                first_val = result.iloc[0]['yhat']
                if last_val > first_val: trend = "increasing"
                elif last_val < first_val: trend = "decreasing"

            # Create a forecasted breakdown per category based on historical ratios
            breakdown_list = []
            if category is None or category == "All":
                ratios = self.get_breakdown_ratios(user_id, bank, transaction_type)
                for item in ratios:
                    amount = total_predicted * item['ratio']
                    if amount > 1:
                        breakdown_list.append({
                            "category": item['category'],
                            "amount": round(amount, 2),
                            "trend": "stable" 
                        })
                breakdown_list.sort(key=lambda x: x['amount'], reverse=True)
            else:
                breakdown_list.append({
                    "category": category,
                    "amount": round(total_predicted, 2),
                    "trend": trend
                })

            return {
                "forecast": result.to_dict(orient="records"),
                "total_predicted": round(total_predicted, 2),
                "trend": trend,
                "breakdown": breakdown_list
            }

        except Exception as e:
            print(f"Forecasting logic error: {e}")
            return {"error": str(e)}

# Export forecaster instance
forecaster = ExpenseForecaster()