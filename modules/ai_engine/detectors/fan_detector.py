"""
Fan Detector - Detects smurfing (fan-in / fan-out) patterns.
PS Requirements:
  - Threshold: 10+ unique counterparties
  - Temporal smurfing: 10+ transactions within 72-hour sliding window
  - Must NOT flag legitimate merchants or payroll accounts
"""

import pandas as pd
import networkx as nx
from typing import Dict, List
from config import FAN_PATTERN_THRESHOLD, TEMPORAL_WINDOW_HOURS, LEGIT_LONG_WINDOW_DAYS


class FanDetector:
    def __init__(self, G: nx.DiGraph, df: pd.DataFrame):
        self.G = G
        self.df = df

    def detect_all_patterns(self, threshold: int = FAN_PATTERN_THRESHOLD) -> Dict:
        return {
            'fan_out':           self.detect_fan_out(threshold),
            'fan_in':            self.detect_fan_in(threshold),
            'temporal_smurfing': self.detect_temporal_smurfing(threshold),
        }

    def detect_fan_out(self, threshold: int = FAN_PATTERN_THRESHOLD) -> List[Dict]:
        results = []
        for node in self.G.nodes():
            recipients = list(self.G.successors(node))
            if len(recipients) >= threshold and not self._is_legit_merchant(node):
                total_sent = sum(
                    self.G.edges[node, r].get('amount', 0) for r in recipients
                )
                results.append({
                    'account':         node,
                    'recipient_count': len(recipients),
                    'total_amount':    total_sent,
                    'pattern':         'fan_out',
                })
        print(f"✅ Fan-out: {len(results)}")
        return results

    def detect_fan_in(self, threshold: int = FAN_PATTERN_THRESHOLD) -> List[Dict]:
        results = []
        for node in self.G.nodes():
            senders = list(self.G.predecessors(node))
            if len(senders) >= threshold and not self._is_legit_merchant(node):
                total_received = sum(
                    self.G.edges[s, node].get('amount', 0) for s in senders
                )
                results.append({
                    'account':      node,
                    'sender_count': len(senders),
                    'total_amount': total_received,
                    'pattern':      'fan_in',
                })
        print(f"✅ Fan-in: {len(results)}")
        return results

    def detect_temporal_smurfing(self, threshold: int = FAN_PATTERN_THRESHOLD) -> List[Dict]:
        """
        Two-pointer sliding window — O(n) per account instead of O(n²).
        Finds accounts with 10+ unique counterparties within any 72-hour window.
        """
        smurfs = []
        window_td = pd.Timedelta(hours=TEMPORAL_WINDOW_HOURS)

        df = self.df[['sender_id', 'receiver_id', 'timestamp']].copy()
        all_accounts = pd.concat([df['sender_id'], df['receiver_id']]).unique()

        for account in all_accounts:
            mask = (df['sender_id'] == account) | (df['receiver_id'] == account)
            involved = df[mask].sort_values('timestamp').reset_index(drop=True)

            if len(involved) < threshold or self._is_legit_merchant(account):
                continue

            timestamps = involved['timestamp'].values
            senders    = involved['sender_id'].values
            receivers  = involved['receiver_id'].values

            max_count = 0
            best_start = None
            left = 0
            counterparties: Dict[str, int] = {}

            for right in range(len(timestamps)):
                # Add incoming counterparty
                cp = receivers[right] if senders[right] == account else senders[right]
                counterparties[cp] = counterparties.get(cp, 0) + 1

                # Shrink window from left until within 72h
                while (timestamps[right] - timestamps[left]) > window_td.value:
                    cp_left = receivers[left] if senders[left] == account else senders[left]
                    counterparties[cp_left] -= 1
                    if counterparties[cp_left] == 0:
                        del counterparties[cp_left]
                    left += 1

                unique_count = len(counterparties)
                if unique_count >= threshold and unique_count > max_count:
                    max_count = unique_count
                    best_start = timestamps[left]

            if max_count >= threshold:
                smurfs.append({
                    'account':            account,
                    'max_counterparties': max_count,
                    'window_start':       str(best_start),
                    'window_hours':       TEMPORAL_WINDOW_HOURS,
                    'pattern':            'temporal_smurfing',
                })

        print(f"✅ Temporal smurfs: {len(smurfs)}")
        return smurfs

    def _is_legit_merchant(self, account: str) -> bool:
        """Transactions spread over >30 days = likely merchant/payroll, skip."""
        acct_txns = self.df[
            (self.df['sender_id'] == account) | (self.df['receiver_id'] == account)
        ]
        if acct_txns.empty:
            return False
        span_days = (
            acct_txns['timestamp'].max() - acct_txns['timestamp'].min()
        ).total_seconds() / 86_400
        return span_days > LEGIT_LONG_WINDOW_DAYS