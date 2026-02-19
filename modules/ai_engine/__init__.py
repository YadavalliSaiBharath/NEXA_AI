"""
NEXA AI Engine - Money Mule Detection System
Advanced AI algorithms for identifying suspicious transaction patterns
"""

from .ai_engine import AIEngine, run_detection_pipeline
from .detectors import (
    CycleDetector,
    FanDetector,
    ChainDetector,
    ScoringEngine
)

__version__ = "1.0.0"
__all__ = [
    'AIEngine',
    'run_detection_pipeline',
    'CycleDetector',
    'FanDetector',
    'ChainDetector',
    'ScoringEngine'
]
