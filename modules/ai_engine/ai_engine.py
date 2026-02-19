"""
NEXA AI Engine - Orchestrator
Single entry point: run_detection_pipeline(csv_path) → PS-format dict
"""

import os
import sys
import json
import time
from typing import Dict, Any

import networkx as nx

_dir = os.path.dirname(os.path.abspath(__file__))
if _dir not in sys.path:
    sys.path.insert(0, _dir)

from utils.csv_loader import load_transactions
from utils.graph_builder import build_transaction_graph
from detectors.cycle_detector import CycleDetector
from detectors.fan_detector import FanDetector
from detectors.chain_detector import ChainDetector
from detectors.scoring_engine import ScoringEngine
from ring_assembler import RingAssembler
from config import (
    CYCLE_DETECTION_MIN_LENGTH,
    CYCLE_DETECTION_MAX_LENGTH,
    FAN_PATTERN_THRESHOLD,
    CHAIN_DETECTION_MIN_LENGTH,
)


class AIEngine:
    """Thin wrapper kept for backward-compat with backend."""

    def __init__(self):
        self.G = None
        self.df = None
        self.results: Dict[str, Any] = {}

    def load_data(self, csv_path: str) -> "AIEngine":
        if not os.path.isabs(csv_path):
            csv_path = os.path.join(_dir, csv_path)
        print(f"📂 Loading: {csv_path}")
        self.df = load_transactions(csv_path)
        return self

    def build_graph(self) -> "AIEngine":
        self.G = build_transaction_graph(self.df)
        return self

    def export_for_integration(self, output_path: str = "integration/data/") -> "AIEngine":
        os.makedirs(output_path, exist_ok=True)
        out_file = os.path.join(output_path, "ai_engine_results.json")
        with open(out_file, "w") as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"✅ Exported → {out_file}")
        return self

    def get_results(self) -> Dict:
        return self.results


def run_detection_pipeline(csv_path: str) -> Dict[str, Any]:
    pipeline_start = time.time()

    # ── 1. Load & build graph ─────────────────────────────────────────────────
    t = time.time()
    engine = AIEngine()
    engine.load_data(csv_path).build_graph()
    G, df = engine.G, engine.df
    print(f"⏱️  Load + Graph: {time.time()-t:.1f}s | "
          f"nodes={G.number_of_nodes()} edges={G.number_of_edges()}")

    # ── 2. Cycle detection ────────────────────────────────────────────────────
    t = time.time()
    cycles = CycleDetector(
        G, CYCLE_DETECTION_MIN_LENGTH, CYCLE_DETECTION_MAX_LENGTH
    ).find_cycles_johnson()
    print(f"⏱️  Cycles: {time.time()-t:.1f}s | found={len(cycles)}")

    # ── 3. Fan / smurfing detection ───────────────────────────────────────────
    t = time.time()
    fans = FanDetector(G, df).detect_all_patterns(threshold=FAN_PATTERN_THRESHOLD)
    print(f"⏱️  Fans: {time.time()-t:.1f}s | "
          f"fan_out={len(fans['fan_out'])} "
          f"fan_in={len(fans['fan_in'])} "
          f"smurfs={len(fans['temporal_smurfing'])}")

    # ── 4. Shell chain detection ──────────────────────────────────────────────
    t = time.time()
    chains = ChainDetector(G, df).detect_shell_chains(
        min_length=CHAIN_DETECTION_MIN_LENGTH
    )
    print(f"⏱️  Chains: {time.time()-t:.1f}s | found={len(chains)}")

    # ── 5. Score accounts ─────────────────────────────────────────────────────
    t = time.time()
    detections = {
        'cycles':            cycles,
        'fan_out':           fans['fan_out'],
        'fan_in':            fans['fan_in'],
        'temporal_smurfing': fans['temporal_smurfing'],
        'chains':            chains,
    }
    scored_accounts = ScoringEngine(G, df, detections).score_all_accounts()
    print(f"⏱️  Scoring: {time.time()-t:.1f}s | scored={len(scored_accounts)}")

    # ── 6. Assemble fraud rings ───────────────────────────────────────────────
    t = time.time()
    fraud_rings = RingAssembler(detections, scored_accounts).assemble()
    print(f"⏱️  Rings: {time.time()-t:.1f}s | rings={len(fraud_rings)}")

    # ── 7. Build output ───────────────────────────────────────────────────────
    account_ring_map: Dict[str, str] = {}
    for ring in fraud_rings:
        for acct in ring['member_accounts']:
            account_ring_map[acct] = ring['ring_id']

    suspicious_accounts = [
        {
            'account_id':        s['account_id'],
            'suspicion_score':   s['risk_score'],
            'risk_level':        s['risk_level'],
            'detected_patterns': s['risk_factors'],
            'ring_id':           account_ring_map.get(s['account_id']),
        }
        for s in scored_accounts
    ]

    elapsed = round(time.time() - pipeline_start, 2)
    print(f"✅ Total pipeline: {elapsed}s")

    summary = {
        'total_accounts_analyzed':     G.number_of_nodes(),
        'total_transactions':          len(df),
        'total_amount':                float(df['amount'].sum()),
        'suspicious_accounts_flagged': len(suspicious_accounts),
        'fraud_rings_detected':        len(fraud_rings),
        'cycles_found':                len(cycles),
        'fan_out_accounts':            len(fans['fan_out']),
        'fan_in_accounts':             len(fans['fan_in']),
        'temporal_smurfs':             len(fans['temporal_smurfing']),
        'shell_chains':                len(chains),
        'critical_risk': sum(1 for s in suspicious_accounts if s['suspicion_score'] >= 70),
        'high_risk':     sum(1 for s in suspicious_accounts if 50 <= s['suspicion_score'] < 70),
        'medium_risk':   sum(1 for s in suspicious_accounts if 30 <= s['suspicion_score'] < 50),
        'low_risk':      sum(1 for s in suspicious_accounts if s['suspicion_score'] < 30),
        # frontend compat
        'unique_accounts':      G.number_of_nodes(),
        'fan_patterns_found':   len(fans['fan_out']) + len(fans['fan_in']),
        'chains_found':         len(chains),
        'processing_time_seconds': elapsed,
    }

    suspicious_set = {s['account_id'] for s in suspicious_accounts}
    nodes = [
        {
            'id':        n,
            'suspicious': n in suspicious_set,
            'ring_id':   account_ring_map.get(n),
            'in_degree': G.in_degree(n),
            'out_degree':G.out_degree(n),
        }
        for n in G.nodes()
    ]
    links = [
        {
            'source':    src,
            'target':    dst,
            'amount':    data.get('amount', 0),
            'txn_count': data.get('txn_count', 1),
            'suspicious': src in suspicious_set or dst in suspicious_set,
        }
        for src, dst, data in G.edges(data=True)
    ]

    network_stats = {
        'density':        nx.density(G),
        'avg_clustering': nx.average_clustering(G.to_undirected()),
        'num_components': nx.number_weakly_connected_components(G),
        'avg_in_degree':  sum(d for _, d in G.in_degree()) / max(G.number_of_nodes(), 1),
        'avg_out_degree': sum(d for _, d in G.out_degree()) / max(G.number_of_nodes(), 1),
    }

    return {
        # PS required
        'suspicious_accounts': suspicious_accounts,
        'fraud_rings':         fraud_rings,
        'summary':             summary,
        # frontend compat
        'network_stats':       network_stats,
        'graph_data':          {'nodes': nodes, 'links': links},
        'cycles':              cycles,
        'fan_patterns':        fans,
        'chains':              chains[:20],
        'risk_scores':         scored_accounts[:50],
    }


if __name__ == "__main__":
    csv = sys.argv[1] if len(sys.argv) > 1 else "sample_data/transactions.csv"
    result = run_detection_pipeline(csv)
    out = "integration/data/ai_engine_results.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n📊 Summary:")
    for k, v in result['summary'].items():
        print(f"   {k}: {v}")
    print(f"\n✅ Saved → {out}")