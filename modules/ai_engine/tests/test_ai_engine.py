import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_engine import AIEngine

def test():
    print("🔍 Testing AI Engine...\n")
    engine = AIEngine()
    engine.load_data('sample_data/transactions.csv').build_graph().detect_cycles().export_for_integration()
    
    results = engine.get_results()
    print(f"\n📊 Results: {results}")
    print("\n✅ Test passed!")

if __name__ == "__main__":
    test()