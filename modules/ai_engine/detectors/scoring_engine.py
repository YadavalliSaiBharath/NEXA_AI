"""
Scoring Engine - 7-signal weighted risk scoring.
Constructor signature changed: now takes (G, df, detections) — not just detections.
"""

import networkx as nx
import pandas as pd
from typing import Dict, List, Any
from config import RISK_WEIGHTS, RISK_THRESHOLDS


class ScoringEngine:
    def __init__(self, G: nx.DiGraph, df: pd.DataFrame, detections: Dict[str, Any]):
        self.G = G
        self.df = df
        self.detections = detections

        # Pre-compute once
        self._pagerank: Dict[str, float] = nx.pagerank(G, alpha=0.85) if G.number_of_edges() > 0 else {}
        self._pr_max = max(self._pagerank.values(), default=1.0)
        self._velocity = self._compute_velocity()

        # Index detections for O(1) lookup
        self._cycle_accounts: set = set()
        for cycle in detections.get('cycles', []):
            self._cycle_accounts.update(cycle)

        self._fan_out_accounts: set = {d['account'] for d in detections.get('fan_out', [])}
        self._fan_in_accounts:  set = {d['account'] for d in detections.get('fan_in', [])}
        self._temporal_smurf_accounts: set = {d['account'] for d in detections.get('temporal_smurfing', [])}

        self._chain_accounts: set = set()
        for chain in detections.get('chains', []):
            self._chain_accounts.update(chain.get('chain', []))

    def score_all_accounts(self) -> List[Dict]:
        results = []
        for account in self.G.nodes():
            result = self.score_account_risk(account)
            if result['risk_score'] > 0:
                results.append(result)
        results.sort(key=lambda x: x['risk_score'], reverse=True)
        return results

    def score_account_risk(self, account: str) -> Dict:
        scores: Dict[str, float] = {}
        factors: List[str] = []

        if account in self._cycle_accounts:
            scores['cycle'] = RISK_WEIGHTS['cycle']
            factors.append('cycle_participant')

        if account in self._fan_out_accounts:
            out_deg = self.G.out_degree(account)
            scores['fan_out'] = min(RISK_WEIGHTS['fan_out'], RISK_WEIGHTS['fan_out'] * (out_deg / 20))
            factors.append('fan_out_structuring')

        if account in self._fan_in_accounts:
            in_deg = self.G.in_degree(account)
            scores['fan_in'] = min(RISK_WEIGHTS['fan_in'], RISK_WEIGHTS['fan_in'] * (in_deg / 20))
            factors.append('fan_in_aggregation')

        if account in self._temporal_smurf_accounts:
            scores['temporal_smurfing'] = RISK_WEIGHTS['temporal_smurfing']
            factors.append('temporal_smurfing')

        if account in self._chain_accounts:
            scores['shell_chain'] = RISK_WEIGHTS['shell_chain']
            factors.append('shell_chain_participant')

        vel = self._velocity.get(account, 0)
        if vel > 5:
            scores['high_velocity'] = min(RISK_WEIGHTS['high_velocity'], RISK_WEIGHTS['high_velocity'] * (vel / 20))
            factors.append(f'high_velocity_{vel:.1f}_txn_per_day')

        pr = self._pagerank.get(account, 0)
        if pr > 0:
            pr_score = RISK_WEIGHTS['pagerank_centrality'] * (pr / self._pr_max)
            if pr_score >= 2:
                scores['pagerank_centrality'] = pr_score
                factors.append('high_network_centrality')

        total = min(100.0, sum(scores.values()))
        return {
            'account_id':       account,
            'risk_score':       round(total, 2),
            'risk_level':       self._get_risk_level(total),
            'risk_factors':     factors,
            'component_scores': {k: round(v, 2) for k, v in scores.items()},
        }

    def _compute_velocity(self) -> Dict[str, float]:
        if self.df.empty:
            return {}
        total_days = max(
            (self.df['timestamp'].max() - self.df['timestamp'].min()).days, 1
        )
        counts = pd.concat([self.df['sender_id'], self.df['receiver_id']]).value_counts()
        return {acc: count / total_days for acc, count in counts.items()}

    def _get_risk_level(self, score: float) -> str:
        if score >= RISK_THRESHOLDS['critical']: return 'critical'
        if score >= RISK_THRESHOLDS['high']:     return 'high'
        if score >= RISK_THRESHOLDS['medium']:   return 'medium'
        return 'low'