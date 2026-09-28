import os
import joblib
import numpy as np
import sys
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder

# Set stdout encoding to UTF-8 to handle Greek characters in terminal output
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# --- PATH CONFIGURATIONS ---
# Define directory paths for saving and loading the AI models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "Models", "expense_nn_model.pkl")
VEC_PATH = os.path.join(BASE_DIR, "Models", "tfidf_vectorizer.pkl")
LE_PATH = os.path.join(BASE_DIR, "Models", "label_encoder.pkl")
# Path for the permanent base memory (CSV) used in hybrid training
BASE_CSV_PATH = os.path.join(BASE_DIR, "Models", "base_data.csv") 

class ExpensePredictor:
    """
    Handles the lifecycle of the Neural Network model: loading, prediction, and retraining.
    """
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.le = None
        self.load_model()

    def load_model(self):
        """Attempts to load the pre-trained model files from disk."""
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(VEC_PATH) and os.path.exists(LE_PATH):
                self.model = joblib.load(MODEL_PATH)
                self.vectorizer = joblib.load(VEC_PATH)
                self.le = joblib.load(LE_PATH)
                print("[OK] AI Model loaded.") 
            else:
                print("[WARNING] Model files not found. Ready for first train.")
        except Exception as e:
            print(f"[ERROR] Loading model: {e}")

    def predict_category(self, description):
        """
        Takes a raw transaction description and returns the predicted category.
        If confidence is too low (max_prob < 0.3), it flags the transaction for review.
        """
        if not self.model or not self.vectorizer or not self.le:
            return "Uncategorized"
        try:
            # Transform description to uppercase and vectorize it
            desc_vec = self.vectorizer.transform([str(description).upper()])
            
            # Get probability scores for all possible categories
            probs = self.model.predict_proba(desc_vec)[0]
            max_prob = np.max(probs)
            
            # Confidence Threshold: If the AI is unsure, mark it for manual review
            if max_prob < 0.3:
                return "Review Needed"
                
            # Find the index of the highest probability and decode it to a category name
            pred_idx = np.argmax(probs)
            return self.le.inverse_transform([pred_idx])[0]
        except:
            return "Uncategorized"

    def retrain_from_db(self):
        """
        Implements Hybrid Training: Combines static CSV knowledge with dynamic user corrections
        from the Supabase database to retrain the neural network.
        """
        print("[INFO] Starting Hybrid AI Training...")
        from Database.db_connection import get_connection
        
        # 1. Load Static Memory (Base CSV data)
        base_df = pd.DataFrame()
        if os.path.exists(BASE_CSV_PATH):
            try:
                base_df = pd.read_csv(BASE_CSV_PATH)
                base_df.columns = [col.lower().strip() for col in base_df.columns]
                print(f"[INFO] Loaded {len(base_df)} base transactions from CSV.")
            except Exception as e:
                print(f"[WARNING] Issue with base_data.csv: {e}")

        # 2. Load User-Corrected Memory (Supabase Database)
        db_df = pd.DataFrame()
        conn = get_connection()
        if conn:
            try:
                # Only fetch manual corrections (negative amounts that have valid categories)
                query = """
                    SELECT description, category FROM payments 
                    WHERE amount < 0 
                    AND category NOT IN ('Pending', 'Review Needed', 'Uncategorized', 'Income', 'Error')
                """
                db_df = pd.read_sql(query, conn)
                print(f"[INFO] Loaded {len(db_df)} new transactions from Supabase.")
            except Exception as e:
                print(f"[WARNING] DB Read Error: {e}")
            finally:
                conn.close()

        # 3. Merge Datasets and Clean duplicates
        # We keep the last record (Supabase) so user corrections override static CSV data
        final_df = pd.concat([base_df, db_df], ignore_index=True)
        final_df = final_df.dropna(subset=['description', 'category'])
        
        if len(final_df) < 5: 
            print("[INFO] Not enough data for training.")
            return False

        final_df['description'] = final_df['description'].astype(str).str.upper()
        final_df['category'] = final_df['category'].astype(str).str.upper()
        final_df = final_df.drop_duplicates(subset=['description'], keep='last')
        
        print(f"[INFO] Training with {len(final_df)} unique transactions...")

        # 4. Neural Network Training (MLP Classifier)
        X = final_df['description']
        y = final_df['category']

        # Vectorization using TF-IDF (Term Frequency-Inverse Document Frequency)
        vec = TfidfVectorizer(ngram_range=(1,2))
        X_vec = vec.fit_transform(X)
        
        # Encode category labels to numerical values
        le = LabelEncoder()
        y_enc = le.fit_transform(y)

        # Multi-Layer Perceptron (Neural Network) configuration
        model = MLPClassifier(hidden_layer_sizes=(50,), max_iter=1000, random_state=42)
        model.fit(X_vec, y_enc)

        # 5. Save the updated model and encoders to disk
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(vec, VEC_PATH)
        joblib.dump(le, LE_PATH)

        self.model, self.vectorizer, self.le = model, vec, le
        print("[INFO] 🧠 AI Hybrid Model Trained & Saved Successfully!")
        return True

# Initialize a global predictor instance for the API to use
predictor = ExpensePredictor()