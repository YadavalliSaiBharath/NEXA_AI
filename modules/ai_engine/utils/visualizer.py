"""
Graph Visualization Utilities
Tools for visualizing transaction networks and detected patterns
"""

import json
from typing import Dict, List
import networkx as nx


def visualize_graph(G: nx.DiGraph, output_path: str = None) -> Dict:
    """
    Convert NetworkX graph to visualization format
    
    Args:
        G: DirectedGraph object
        output_path: Optional path to save visualization data
    
    Returns:
        Dictionary with nodes and links for D3.js visualization
    """
    nodes = []
    links = []
    
    # Create nodes
    for node in G.nodes():
        nodes.append({
            'id': str(node),
            'label': str(node),
            'in_degree': G.in_degree(node),
            'out_degree': G.out_degree(node)
        })
    
    # Create links
    for source, target, data in G.edges(data=True):
        links.append({
            'source': str(source),
            'target': str(target),
            'value': data.get('amount', 0),
            'weight': 1
        })
    
    result = {
        'nodes': nodes,
        'links': links,
        'stats': {
            'total_nodes': len(nodes),
            'total_links': len(links),
            'density': nx.density(G) if len(nodes) > 1 else 0
        }
    }
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2, default=str)
    
    return result


def get_graph_statistics(G: nx.DiGraph) -> Dict:
    """
    Calculate various statistics about the graph
    """
    stats = {
        'nodes': G.number_of_nodes(),
        'edges': G.number_of_edges(),
        'density': nx.density(G) if G.number_of_nodes() > 1 else 0,
        'avg_clustering': nx.average_clustering(G.to_undirected()) if G.number_of_nodes() > 1 else 0,
        'components': nx.number_weakly_connected_components(G),
        'avg_degree': 2 * G.number_of_edges() / G.number_of_nodes() if G.number_of_nodes() > 0 else 0
    }
    return stats


def highlight_suspicious_nodes(G: nx.DiGraph, suspicious_accounts: List[str]) -> Dict:
    """
    Create visualization highlighting suspicious nodes
    """
    nodes = []
    links = []
    
    # Color map
    color_map = {}
    for node in G.nodes():
        if node in suspicious_accounts:
            color_map[node] = '#ef4444'  # Red for suspicious
        else:
            color_map[node] = '#10b981'  # Green for normal
    
    # Create nodes with colors
    for node in G.nodes():
        nodes.append({
            'id': str(node),
            'label': str(node),
            'color': color_map[node],
            'suspicious': node in suspicious_accounts
        })
    
    # Create links
    for source, target in G.edges():
        links.append({
            'source': str(source),
            'target': str(target)
        })
    
    return {
        'nodes': nodes,
        'links': links,
        'suspicious_count': len(suspicious_accounts)
    }
