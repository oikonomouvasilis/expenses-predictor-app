# 🚀 AI Expenses Predictor

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=flat-square&logo=tailwind-css)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/AI_Engine-Python-3776AB?style=flat-square&logo=python)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)

## 📌 Project Overview
**AI Expenses Predictor** is a full-stack, AI-driven personal finance application designed to automate the ingestion, categorization, and forecasting of bank transactions. 

Instead of manually tagging expenses, users can upload raw bank statements (CSV/Excel) from multiple Greek Banks (Piraeus, Alpha, Eurobank, NBG). The system's **Neural Engine** automatically categorizes them, while a **Time-Series Forecasting AI** projects future financial trends.

---

## ✨ Key Features
* **🧠 Deep Learning Categorization:** Utilizes a Multi-Layer Perceptron (MLP) Neural Network with TF-IDF vectorization to accurately predict transaction categories based on Greek and English descriptions.
* **🔮 Financial Forecasting:** Integrates Meta's `Prophet` time-series forecasting library to predict future income and expense trajectories up to 6 months ahead.
* **🏦 Multi-Bank Ingestion Engine:** Custom parsers capable of normalizing messy, inconsistently formatted exports from 4 major banks into a unified schema.
* **🔄 Continuous Learning (Hybrid AI):** The AI model retrains itself continuously based on user corrections saved in the database, becoming smarter over time.
* **📊 Interactive Analytics:** Highly performant, memoized dashboards utilizing `Recharts` for Cash Flow comparison and category breakdowns.
* **🔐 Secure Architecture:** Authentication and secure database management powered by Supabase.

---

## 🏗️ System Architecture & Component Relationships

The application is split into a highly responsive **React Frontend** and a heavy-lifting **Python/FastAPI Backend**.

### 1. The Frontend (Client-Side)
* **`App.jsx`:** The core controller. Manages global state, routing, and heavy data filtering using `useMemo` for high performance.
* **`api.js`:** The Axios API client. Acts as the bridge, sending files and fetching forecasts from the backend.
* **`Transactions.jsx`:** Displays the data table and handles manual category corrections, immediately notifying the backend to retrain the AI.
* **`Forecasting.jsx` & `Statistics.jsx`:** Consumes processed data from the backend to render dynamic charts (Area/Pie/Bar).
* **`Auth.jsx`:** Handles secure Login, Registration, and OAuth via Supabase.

### 2. The Backend (Server-Side)
* **`main.py`:** The FastAPI entry point. Exposes endpoints for data retrieval, file uploads, and forecasting. It triggers the AI to wake up and retrain on server startup.
* **`payment_file_data_extraction.py`:** The Ingestion Engine. Detects the bank format and standardizes the columns (Date, Description, Amount).
* **`dl_predictor.py`:** The Neural Engine. Contains the `MLPClassifier`. It vectorizes raw text, predicts the category, and handles the "Hybrid Training" (mixing static CSV memory with dynamic user corrections from Supabase).
* **`forecaster.py`:** Fetches historical data from the database and runs it through the `Prophet` model to return future financial projections.
* **`db_connection.py`:** Manages secure PostgreSQL connections to Supabase.

### 🔄 Data Flow Example (File Upload)
1. User uploads a `.csv` via **`UploadSection.jsx`**.
2. **`api.js`** sends it to `POST /api/upload` on **`main.py`**.
3. **`payment_file_data_extraction.py`** parses the file and normalizes the data.
4. For every row, **`dl_predictor.py`** predicts the category (e.g., "SUPERMARKET").
5. Data is securely hashed (to prevent duplicates) and saved via **`db_connection.py`** to Supabase.
6. The AI triggers a background retraining sequence.
7. Frontend fetches the updated data and renders the charts.

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Python, FastAPI, Pandas |
| **Machine Learning** | Scikit-Learn (MLP, TF-IDF), Prophet (Meta) |
| **Database & Auth** | Supabase (PostgreSQL), psycopg2 |
| **Deployment** | Vercel (frontend), Render (API) |

---

## 🔐 What is not in this repository, and why

This application runs on **real personal bank transactions**. Three categories of
file are deliberately excluded, and `.gitignore` keeps them out:

- **Statement exports** (`*.xlsx`, `*.csv`) — the actual transactions.
- **Trained model artifacts** (`*.pkl`) — the TF-IDF vectoriser holds a
  vocabulary built from real transaction descriptions: merchant names, place
  names, people. The model is an artifact, not source. Regenerate it locally
  with `backend/Models/train_from_db.py` once your database has data.
- **Screen recordings** (`*.mp4`) — they show real sessions.

Credentials live in the environment, never in the source. Copy `.env.example`
to `.env` for the backend, and `frontend/.env.example` to `frontend/.env.local`
for the client.

The case study, with the measured accuracy and the reasoning behind the
architecture:
[Πρόβλεψη Εξόδων με AI](https://portfolio-oiko4.vercel.app/el/projects/expenses-predictor)

---

## ▶️ Running it

```bash
# Backend
python -m venv .venv
.venv\Scripts\activate       # source .venv/bin/activate on Unix
pip install -r requirements.txt
cp .env.example .env                              # fill in the database credentials
uvicorn backend.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local                        # fill in the Supabase values
npm run dev
```

The first run has no trained model. Upload statements, correct a few categories,
then run the training script — the classifier improves from the corrections
rather than from a fixed snapshot.

---

## 🔮 Future Roadmap
- [ ] Transition from static file uploads to Live Data syncing via Open Banking APIs.
- [ ] Upgrade the predictive model with NLP Transformers.
- [ ] Add PDF generation for printable financial reports.
- [ ] Implement multi-currency support.

---
*Developed with modern web standards and machine learning best practices.*