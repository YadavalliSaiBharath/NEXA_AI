"""
Graph Builder - Aggregates multiple transactions into weighted edges.
One sender→receiver pair = ONE edge. Duplicate edges break cycle detection.
"""

import networkx as nx
import pandas as pd


def build_transaction_graph(df: pd.DataFrame) -> nx.DiGraph:
    G = nx.DiGraph()

    grouped = (
        df.groupby(['sender_id', 'receiver_id'])
        .agg(
            amount    =('amount', 'sum'),
            txn_count =('amount', 'count'),
            avg_amount=('amount', 'mean'),
            first_txn =('timestamp', 'min'),
            last_txn  =('timestamp', 'max'),
        )
        .reset_index()
    )

    grouped['duration_days'] = (
        (grouped['last_txn'] - grouped['first_txn'])
        .dt.total_seconds() / 86_400
    ).clip(lower=0)

    for _, row in grouped.iterrows():
        G.add_edge(
            row['sender_id'],
            row['receiver_id'],
            amount       = float(row['amount']),
            txn_count    = int(row['txn_count']),
            avg_amount   = float(row['avg_amount']),
            first_txn    = row['first_txn'],
            last_txn     = row['last_txn'],
            duration_days= float(row['duration_days']),
        )

    print(f"✅ Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges "
          f"(from {len(df)} raw transactions)")
    return G