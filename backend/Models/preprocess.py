import re

def clean_description(text):
    """
    Cleans raw transaction descriptions by removing card numbers, dates, and special symbols.
    Example: 'SKLAVENITIS 4305********0006' -> 'sklavenitis'
    This ensures the AI doesn't get confused by unique numbers and focuses on keywords.
    """
    if not text:
        return ""
    
    # 1. Convert to lowercase for uniformity
    text = text.lower()
    
    # 2. Regex: Remove card patterns (4 or more digits/asterisks)
    text = re.sub(r'[\d\*]{4,}', '', text)
    
    # 3. Regex: Remove special characters and punctuation
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # 4. Remove extra whitespace and trim
    text = " ".join(text.split())
    
    return text