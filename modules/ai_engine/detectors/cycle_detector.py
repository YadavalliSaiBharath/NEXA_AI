"""
Cycle Detector - Johnson's algorithm with false-positive filters.
"""

import networkx as nx
from typing import List, Set
from config import (
    CYCLE_DETECTION_MIN_LENGTH,
    CYCLE_DETECTION_MAX_LENGTH,
    MIN_CYCLE_AMOUNT,
)


class CycleDetector:
    def __init__(
        self,
        G: nx.DiGraph,
        min_length: int = CYCLE_DETECTION_MIN_LENGTH,
        max_length: int = CYCLE_DETECTION_MAX_LENGTH,
        min_cycle_amount: float = MIN_CYCLE_AMOUNT,
    ):
        self.G = G
        self.min_len = min_length
        self.max_len = max_length
        self.min_cycle_amount = min_cycle_amount
        self.cycles: List[List[str]] = []

        # Nodes with very high in AND out degree → likely merchant/payroll
        self._legit_hubs: Set[str] = {
            n for n in G.nodes()
            if G.in_degree(n) > 10 and G.out_degree(n) > 10
        }

    def find_cycles_johnson(self) -> List[List[str]]:
        try:
            raw = list(nx.simple_cycles(self.G))
            self.cycles = [c for c in raw if self._is_suspicious(c)]
            print(f"✅ Cycles: {len(raw)} raw → {len(self.cycles)} suspicious")
            return self.cycles
        except Exception as exc:
            print(f"❌ Cycle error: {exc}")
            return []

    def flag_accounts_in_cycles(self) -> Set[str]:
        flagged: Set[str] = set()
        for cycle in self.cycles:
            flagged.update(cycle)
        return flagged

    def _is_suspicious(self, cycle: List[str]) -> bool:
        if not (self.min_len <= len(cycle) <= self.max_len):
            return False
        if any(n in self._legit_hubs for n in cycle):
            return False
        total = 0.0
        for i in range(len(cycle)):
            src = cycle[i]
            dst = cycle[(i + 1) % len(cycle)]
            edge = self.G.edges.get((src, dst))
            if edge is None:
                return False
            total += edge.get('amount', 0)
        return total >= self.min_cycle_amount