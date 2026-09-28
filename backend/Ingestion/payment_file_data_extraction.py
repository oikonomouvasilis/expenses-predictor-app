import pandas as pd
import os
import sys

# --- 1. Main Categorization Logic ---
def assign_category(description, amount=0, predictor=None):
    """
    Assigns a category based on the transaction description.
    First, it checks for positive amounts (Income).
    Then, it uses keyword matching for common expense types.
    Finally, if available, it uses an AI predictor for advanced classification.
    """
    # 1. Direct check for income (positive amounts)
    try:
        if float(amount) > 0:
            return "INCOME"
    except:
        pass

    desc = str(description).upper()
    
    # 2. Hardcoded Keyword Rules for common Greek vendors/services
    categories = {
        'SUPERMARKET': ['SKLAVENITIS', 'ΣΚΛΑΒΕΝΙΤΗΣ', 'AB_PETRALONA', 'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ', 'GALAXIAS', 'ΓΑΛΑΞΙΑΣ', 'MARKET IN', 'LIDL', 'BAZAAR', 'MY MARKET'],
        'DELIVERY': ['EFOOΔ', 'BOX FOOD', 'WOLT', 'E-FOOD'],
        'DINING_COFFEE': ['EL GRECO', 'FOOD', 'COFFEE', 'EVEREST', 'GRIGORIS', 'PSITOPOLIO', 'MIKEL', 'STARBUCKS'],
        'TELECOMS': ['COSMOTE', 'VODAFONE', 'NOVA', 'WIND'],
        'SUBSCRIPTIONS': ['NETFLIX', 'SPOTIFY', 'CHATGPT', 'YOUTUBE', 'APPLE.COM'],
        'TECHNOLOGY': ['GOOGLE', 'APPLE', 'MICROSOFT', 'PLAISIO', 'PUBLIC'],
        'TRANSPORT': ['FREE NOW', 'TAXI', 'AEGEAN', 'ATTICA ODOS', 'METRO', 'UBER', 'BEAT'],
        'FUEL': ['PETROL', 'SHELL', 'AVIN', 'EKO', 'REVOIL', 'KAUSIMA', 'KAFSIMA'],
        'UTILITIES': ['DEI', 'EYDAP', 'PPC', 'ΔΕΗ', 'ΕΥΔΑΠ', 'WATT', 'ZENITH'],
        'RENT': ['RENT', 'ΕΝΟΙΚΙΟ', 'ENOIKIO'],
        'SHOPPING': ['ZARA', 'H&M', 'AMAZON', 'TEMU', 'JUMBO', 'IKEA', 'OYSHO', 'INTERSPORT'],
        'BANK_FEES': ['ΠΡΟΜΗΘΕΙΑ', 'ΕΞΟΔΑ', 'KOMISIA', 'COMMISSION']
    }
    
    # 3. Check for keywords in the description
    for cat, keywords in categories.items():
        if any(k in desc for k in keywords):
            return cat
            
    # 4. Fallback to AI Predictor if no keyword is matched
    if predictor:
        category = predictor.predict_category(desc)
        return category

    return 'UNCATEGORIZED'

# --- 2. Helper function for Currency/Number Parsing ---
def parse_amount(val):
    """
    Cleans and converts string currency values (e.g., '1.250,50€') 
    into standard Python floats (e.g., 1250.50).
    """
    if pd.isna(val): return 0.0
    if isinstance(val, (float, int)): return float(val)
    
    # Remove currency symbols and handle Greek decimal/thousand separators
    s = str(val).replace('€', '').strip()
    if ',' in s:
        # Piraeus/Alpha often use '.' for thousands and ',' for decimals
        s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except:
        return 0.0

# --- 3. DYNAMIC FILE LOADER (Flexible CSV/Excel Detection) ---
def load_file_flexible(filepath, **kwargs):
    """
    Attempts to read bank statements in various formats (CSV, Excel, or HTML masquerading as Excel).
    Iterates through common separators and encodings used by Greek banks.
    """
    ext = str(filepath).lower()
    
    # HANDLING CSV FILES
    if ext.endswith('.csv'):
        for sep in [';', ',', '\t']:
            for enc in ['utf-8', 'windows-1253', 'iso-8859-7', 'utf-8-sig']:
                try:
                    df = pd.read_csv(filepath, sep=sep, encoding=enc, on_bad_lines='skip', **kwargs)
                    if len(df.columns) >= 2: return df
                except Exception:
                    continue
        return None

    # HANDLING EXCEL FILES (.xls, .xlsx)
    else:
        # Try 1: Standard Excel parsing
        try:
            return pd.read_excel(filepath, **kwargs)
        except Exception:
            pass
        
        # Try 2: HTML-to-Excel (Common in Piraeus Bank exports)
        try:
            dfs = pd.read_html(filepath, encoding='utf-8')
            if dfs: return dfs[0]
        except Exception:
            pass
            
        # Try 3: CSV disguised as Excel (Common in Alpha/Eurobank)
        for sep in [';', ',', '\t']:
            for enc in ['utf-8', 'windows-1253', 'iso-8859-7']:
                try:
                    df = pd.read_csv(filepath, sep=sep, encoding=enc, on_bad_lines='skip', **kwargs)
                    if len(df.columns) >= 2: return df
                except Exception:
                    continue
                    
    return None

# --- 4. BANK-SPECIFIC EXTRACTION FUNCTIONS ---

def extract_alpha(filepath):
    """Parses statement exports from Alpha Bank."""
    print(f"🟣 Processing Alpha Bank: {os.path.basename(filepath)}")
    
    df = load_file_flexible(filepath)
    if df is None:
        raise ValueError("Cannot read Alpha file as Excel or CSV")

    # Locate the header index dynamically if it's not on the first row
    cols_str = " ".join([str(c) for c in df.columns])
    if 'Αιτιολογία' not in cols_str and 'Ημ/νία' not in cols_str:
        df = load_file_flexible(filepath, header=None)
        header_idx = -1
        for idx, row in df.iterrows():
            row_str = row.astype(str).str.cat(sep=' ')
            if "Αιτιολογία" in row_str or "Ημ/νία" in row_str or "Ποσό" in row_str:
                header_idx = idx
                break
        if header_idx != -1:
            df = load_file_flexible(filepath, header=header_idx)

    # Map Greek headers to standardized internal keys
    df.columns = [str(c).strip() for c in df.columns]
    cols = list(df.columns)
    
    date_col = next((c for c in cols if 'Ημ/νία' in c or 'Ημερομηνία' in c or 'Date' in c), None)
    desc_col = next((c for c in cols if 'Αιτιολογία' in c or 'Λεπτομέρειες' in c or 'Description' in c), None)
    amt_col = next((c for c in cols if 'Ποσό' in c or 'Amount' in c), None)
    
    if not date_col or not desc_col or not amt_col:
        raise ValueError("File content mismatch. Required Alpha columns missing.")
        
    transactions = []
    for _, row in df.iterrows():
        if pd.isna(row[date_col]): continue
        d_val = str(row[date_col]).strip()
        if not d_val or d_val == 'nan': continue
        
        # Alpha amounts often need cleaning (thousands dots vs decimal commas)
        a_val = str(row[amt_col]).strip()
        a_val = a_val.replace('.', '').replace(',', '.')
        try: amt = float(a_val)
        except ValueError: continue
        
        # Flexible date parsing
        try:
            dt = pd.to_datetime(d_val, format="%d/%m/%Y %H:%M", errors='coerce')
            if pd.isna(dt): dt = pd.to_datetime(d_val, format="%d/%m/%Y", errors='coerce')
        except:
            dt = pd.to_datetime(d_val, errors='coerce')
            
        if pd.isna(dt): continue
        
        transactions.append({
            'date': dt,
            'description': str(row[desc_col]).strip(),
            'amount': amt
        })
        
    return transactions, "ALPHA"


def extract_eurobank(file_path):
    """Parses statement exports from Eurobank."""
    print(f"🔴 Processing Eurobank: {os.path.basename(file_path)}")
    df = load_file_flexible(file_path)
    
    # Eurobank Excel files often start with metadata (skip first 8 rows)
    if df is not None and ('ΠΕΡΙΓΡΑΦΗ' not in df.columns and 'ΠΟΣΟ' not in df.columns):
        df = load_file_flexible(file_path, skiprows=8)

    if df is None:
        raise ValueError("File is completely empty or invalid.")

    # Standardize Column Names
    col_map = {}
    for col in df.columns:
        c_str = str(col).strip().upper()
        if 'ΗΜ/ΝΙΑ ΚΙΝΗΣΗΣ' in c_str or 'DATE' in c_str: col_map[col] = 'date'
        elif 'ΠΕΡΙΓΡΑΦΗ' in c_str or 'DESCRIPTION' in c_str: col_map[col] = 'description'
        elif 'ΠΟΣΟ' in c_str or 'AMOUNT' in c_str: col_map[col] = 'amount'

    df = df.rename(columns=col_map)

    if 'amount' not in df.columns or 'date' not in df.columns:
        raise ValueError("File content mismatch. Eurobank columns not found.")

    df['amount'] = df['amount'].apply(parse_amount)
    df['date'] = pd.to_datetime(df['date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['date', 'amount'])
    
    return df[['date', 'description', 'amount']].to_dict('records'), "EUROBANK"


def extract_piraeus(file_path):
    """Parses statement exports from Piraeus Bank (Winbank)."""
    print(f"🟡 Processing Piraeus Bank: {os.path.basename(file_path)}")
    
    # Locate the start of the transaction table (header skipping)
    df_temp = load_file_flexible(file_path, header=None)
    if df_temp is None:
        raise ValueError("Cannot read file as Excel or CSV")

    header_idx = -1
    for idx, row in df_temp.iterrows():
        if idx > 30: break 
        row_str = row.astype(str).str.cat(sep=' ')
        if "Ποσό" in row_str and "Ημερομηνία" in row_str:
            header_idx = idx
            break
    
    if header_idx == -1: 
        raise ValueError("File content mismatch. Expected Piraeus columns not found.")

    df = load_file_flexible(file_path, header=header_idx)
    
    col_map = {}
    for col in df.columns:
        c_str = str(col).strip()
        if 'Ημερομηνία' in c_str: col_map[col] = 'date'
        elif 'Περιγραφή' in c_str or 'Αιτιολογία' in c_str: col_map[col] = 'description'
        elif 'Ποσό' in c_str and 'Νόμισμα' not in c_str: col_map[col] = 'amount'
        
    df = df.rename(columns=col_map)
    
    if 'amount' not in df.columns or 'date' not in df.columns:
         raise ValueError("File content mismatch. Expected Piraeus columns not found.")

    df['amount'] = df['amount'].apply(parse_amount)
    df['date'] = pd.to_datetime(df['date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['date', 'amount'])
    
    return df[['date', 'description', 'amount']].to_dict('records'), "PIRAEUS"


def extract_nbg(file_path):
    """Parses statement exports from National Bank of Greece (NBG)."""
    print(f"🟢 Processing NBG: {os.path.basename(file_path)}")
    import pandas as pd
    
    df = None
    
    # ΒΗΜΑ 1: Η Εθνική βάζει 2 sheets (info και data). Ψάχνουμε το σωστό φύλλο!
    try:
       with pd.ExcelFile(file_path) as xls:
            for sheet in xls.sheet_names:
                temp_df = pd.read_excel(xls, sheet_name=sheet)
                if 'Ημερομηνία' in temp_df.columns and 'Περιγραφή' in temp_df.columns:
                    df = temp_df
                    break
    except Exception:
        pass # Αν το αρχείο δεν είναι Excel (π.χ. CSV), προχωράει στο Βήμα 2

    # ΒΗΜΑ 2: Αν δεν βρέθηκε μέσω της παραπάνω διαδικασίας, τρέχουμε την κανονική ρουτίνα
    if df is None:
        df = load_file_flexible(file_path)

    if df is None:
        raise ValueError("Cannot read file as Excel or CSV")

    possible_cols = ['Ημερομηνία', 'Περιγραφή', 'Ποσό εντολής', 'Ποσό συναλλαγής']
    if not any(col in df.columns for col in possible_cols):
         raise ValueError("File content mismatch. This does not look like an NBG statement.")

    # ΒΗΜΑ 3: Μετονομασία στηλών (NBG specific)
    df = df.rename(columns={'Ημερομηνία': 'date', 'Περιγραφή': 'description', 'Ποσό εντολής': 'amount'})
    
    # ΒΗΜΑ 4: Σε περίπτωση που η στήλη του ποσού λέγεται "Ποσό συναλλαγής" αντί για "Ποσό εντολής"
    if 'amount' not in df.columns and 'Ποσό συναλλαγής' in df.columns:
        # Χρησιμοποιούμε τη στήλη "Χρέωση / Πίστωση" για να βάλουμε σωστό πρόσημο (μείον στα έξοδα)
        if 'Χρέωση / Πίστωση' in df.columns:
            def get_signed_amount(row):
                val = str(row['Ποσό συναλλαγής']).replace('.', '').replace(',', '.')
                try: val = float(val)
                except: val = 0.0
                return -abs(val) if str(row['Χρέωση / Πίστωση']).strip().upper() == 'Χ' else abs(val)
            df['amount'] = df.apply(get_signed_amount, axis=1)
        else:
            df['amount'] = df['Ποσό συναλλαγής']

    if 'amount' not in df.columns:
         raise ValueError("Could not find the amount column in NBG file.")

    # Τελικός καθαρισμός ημερομηνίας και ποσού
    df['amount'] = df['amount'].apply(parse_amount)
    df['date'] = pd.to_datetime(df['date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['date', 'amount'])
    
    return df[['date', 'description', 'amount']].to_dict('records'), "NBG"