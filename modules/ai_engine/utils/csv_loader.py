import pandas as pd


def load_transactions(csv_path):
    """Load and validate transaction CSV file.

    RIFT 2026 Specification:
    Accepts CSV with the following required columns (variant names supported):
    - transaction_id: Unique transaction identifier
    - sender_id: Account ID of sender (becomes a node)
    - receiver_id: Account ID of receiver (becomes a node)  
    - amount: Transaction amount (Float, in currency units)
    - timestamp: Transaction time (DateTime, YYYY-MM-DD HH:MM:SS)
    
    This function is tolerant of common column-name variants and will
    automatically normalize them to the required canonical schema.
    
    Args:
        csv_path (str): Path to CSV file
        
    Returns:
        pd.DataFrame: Validated and normalized transaction data
        
    Raises:
        ValueError: If required columns are missing or data is invalid
    """
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        raise ValueError(f"Failed to read CSV file: {e}")

    if df.empty:
        raise ValueError("CSV file is empty")

    # Normalize column names (strip whitespace, lower-case)
    df.columns = [c.strip() for c in df.columns]

    # Candidate name mapping for required fields (case-insensitive)
    candidates = {
        'transaction_id': ['transaction_id', 'transactionid', 'tx_id', 'txid', 'tx', 'id', 'transaction'],
        'sender_id': ['sender_id', 'sender', 'from', 'source', 'payer', 'from_account', 'sender_account'],
        'receiver_id': ['receiver_id', 'receiver', 'to', 'target', 'recipient', 'to_account', 'receiver_account'],
        'amount': ['amount', 'amt', 'value', 'transaction_amount', 'volume', 'sum'],
        'timestamp': ['timestamp', 'time', 'datetime', 'date', 'transaction_date', 'transaction_time']
    }

    found = {}
    cols_lower = {c.lower(): c for c in df.columns}

    for req, opts in candidates.items():
        for opt in opts:
            if opt in cols_lower:
                found[req] = cols_lower[opt]
                break

    missing = [r for r in candidates.keys() if r not in found]
    if missing:
        raise ValueError(
            f"Invalid CSV structure: Missing required columns {missing}.\n"
            f"Required: transaction_id, sender_id, receiver_id, amount, timestamp\n"
            f"Found columns: {list(df.columns)}\n"
            f"Accepted variants: {candidates}"
        )

    # Rename to canonical names
    rename_map = {found[k]: k for k in found}
    df = df.rename(columns=rename_map)

    # Convert types with validation
    try:
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    except Exception as e:
        raise ValueError(f"Failed to convert data types: {e}")

    # Validate data integrity
    invalid_amounts = df['amount'].isna().sum()
    invalid_times = df['timestamp'].isna().sum()
    
    if invalid_amounts > 0:
        print(f"⚠️  Warning: {invalid_amounts} rows with invalid amounts (will be excluded)")
    if invalid_times > 0:
        print(f"⚠️  Warning: {invalid_times} rows with invalid timestamps (will be excluded)")

    # Drop rows that lack critical fields after coercion
    original_count = len(df)
    df = df.dropna(subset=['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp'])
    dropped_count = original_count - len(df)
    
    if dropped_count > 0:
        print(f"⚠️  Dropped {dropped_count} invalid rows from {original_count} total")

    if df.empty:
        raise ValueError("No valid transactions after data cleansing")

    # Validation checks
    if (df['amount'] <= 0).any():
        print(f"⚠️  Warning: {(df['amount'] <= 0).sum()} transactions with zero or negative amount")

    # Sort by timestamp for temporal analysis
    df = df.sort_values('timestamp').reset_index(drop=True)

    # Print summary
    print(f"✅ CSV Validation Successful")
    print(f"   Loaded: {len(df)} valid transactions")
    print(f"   Period: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"   Unique accounts: {len(set(df['sender_id']).union(set(df['receiver_id'])))}")
    print(f"   Total volume: ${df['amount'].sum():,.2f}")
    
    return df