"""
Ring Assembler - Groups related detections into fraud rings.
Uses Union-Find to cluster accounts that share detection events.
"""

from typing import Dict, List, Any


class UnionFind:
    def __init__(self):
        self._parent: Dict[str, str] = {}

    def find(self, x: str) -> str:
        self._parent.setdefault(x, x)
        if self._parent[x] != x:
            self._parent[x] = self.find(self._parent[x])
        return self._parent[x]

    def union(self, x: str, y: str):
        self._parent[self.find(x)] = self.find(y)

    def groups(self) -> Dict[str, List[str]]:
        result: Dict[str, List[str]] = {}
        for node in self._parent:
            root = self.find(node)
            result.setdefault(root, []).append(node)
        return result


class RingAssembler:
    def __init__(self, detections: Dict[str, Any], scored_accounts: List[Dict]):
        self.detections = detections
        self.score_map: Dict[str, Dict] = {a['account_id']: a for a in scored_accounts}

    def assemble(self) -> List[Dict]:
        uf = UnionFind()

        # Cycles → all accounts in same cycle = same ring
        for cycle in self.detections.get('cycles', []):
            for i in range(len(cycle) - 1):
                uf.union(cycle[i], cycle[i + 1])

        # Shell chains → accounts in same chain = same ring
        for chain in self.detections.get('chains', []):
            path = chain.get('chain', [])
            for i in range(len(path) - 1):
                uf.union(path[i], path[i + 1])

        # Fan / smurf hubs — register them so they appear in groups
        for fan in self.detections.get('fan_out', []):
            uf.find(fan['account'])
        for fan in self.detections.get('fan_in', []):
            uf.find(fan['account'])
        for smurf in self.detections.get('temporal_smurfing', []):
            uf.find(smurf['account'])

        # Build rings — only clusters with 2+ flagged members
        groups = uf.groups()
        rings: List[Dict] = []
        ring_num = 1

        for _, members in sorted(groups.items()):
            flagged = [m for m in members if m in self.score_map]
            if len(flagged) < 2:
                continue

            ring_id = f"RING_{ring_num:03d}"
            ring_num += 1

            member_scores = [self.score_map[m]['risk_score'] for m in flagged]
            ring_risk = round(
                0.6 * max(member_scores) + 0.4 * (sum(member_scores) / len(member_scores)),
                2,
            )

            rings.append({
                'ring_id':         ring_id,
                'member_accounts': flagged,
                'pattern_type':    self._dominant_pattern(flagged),
                'risk_score':      ring_risk,
            })

        # Sort by risk score, re-number so RING_001 = highest risk
        rings.sort(key=lambda r: r['risk_score'], reverse=True)
        for i, ring in enumerate(rings, 1):
            ring['ring_id'] = f"RING_{i:03d}"

        print(f"✅ Fraud rings: {len(rings)}")
        return rings

    def _dominant_pattern(self, members: List[str]) -> str:
        counts: Dict[str, int] = {}
        for m in members:
            for factor in self.score_map.get(m, {}).get('risk_factors', []):
                if 'cycle' in factor:
                    counts['cycle'] = counts.get('cycle', 0) + 1
                elif 'smurfing' in factor:
                    counts['smurfing'] = counts.get('smurfing', 0) + 1
                elif 'shell' in factor:
                    counts['shell_chain'] = counts.get('shell_chain', 0) + 1
                elif 'fan' in factor:
                    counts['fan'] = counts.get('fan', 0) + 1
        return max(counts, key=counts.get) if counts else 'unknown'