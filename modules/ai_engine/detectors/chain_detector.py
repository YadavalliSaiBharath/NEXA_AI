"""
Chain Detector - Shell account layering chains.
PS Requirement: 3+ hops where intermediaries have ≤ 3 total transactions.
Includes MAX_RESULTS cap to prevent explosion on dense graphs.
"""

import networkx as nx
import pandas as pd
from typing import Dict, List
from config import (
    CHAIN_DETECTION_MIN_LENGTH,
    SHELL_ACCOUNT_MAX_TRANSACTIONS,
    MAX_CHAIN_DEPTH,
)


class ChainDetector:
    def __init__(self, G: nx.DiGraph, df: pd.DataFrame):
        self.G = G
        self.df = df
        all_accounts = pd.concat([df['sender_id'], df['receiver_id']])
        self.txn_count: Dict[str, int] = all_accounts.value_counts().to_dict()

    def detect_shell_chains(self, min_length: int = CHAIN_DETECTION_MIN_LENGTH) -> List[Dict]:
        shell_chains: List[Dict] = []
        visited_chains: set = set()
        MAX_RESULTS = 200  # cap to prevent explosion on dense graphs

        # Only start DFS from non-shell, active nodes
        source_nodes = [
            n for n in self.G.nodes()
            if not self._is_shell(n) and self.G.out_degree(n) > 0
        ]

        def dfs(path: List[str], depth: int):
            # Early exits
            if len(shell_chains) >= MAX_RESULTS:
                return
            if depth > MAX_CHAIN_DEPTH:
                return

            current = path[-1]
            for neighbor in self.G.successors(current):
                if neighbor in path:
                    continue

                new_path = path + [neighbor]
                intermediaries = new_path[1:-1]  # exclude source and destination

                if len(new_path) >= min_length and intermediaries:
                    if all(self._is_shell(n) for n in intermediaries):
                        key = tuple(new_path)
                        if key not in visited_chains:
                            visited_chains.add(key)
                            total_amount = sum(
                                self.G.edges[new_path[i], new_path[i + 1]].get('amount', 0)
                                for i in range(len(new_path) - 1)
                            )
                            shell_chains.append({
                                'chain':                new_path,
                                'length':               len(new_path),
                                'total_amount':         total_amount,
                                'shell_intermediaries': intermediaries,
                                'hop_count':            len(new_path) - 1,
                                'pattern':              f'shell_chain_{len(new_path)}hop',
                            })

                # Only recurse if we haven't hit the cap
                if len(shell_chains) < MAX_RESULTS:
                    dfs(new_path, depth + 1)

        for source in source_nodes:
            if len(shell_chains) >= MAX_RESULTS:
                break
            dfs([source], 1)

        shell_chains.sort(key=lambda x: x['length'], reverse=True)
        print(f"✅ Shell chains: {len(shell_chains)}")
        return shell_chains

    def get_chains_summary(self) -> Dict:
        chains = self.detect_shell_chains()
        return {'total': len(chains), 'chains': chains[:10]}

    def _is_shell(self, node: str) -> bool:
        return self.txn_count.get(node, 0) <= SHELL_ACCOUNT_MAX_TRANSACTIONS