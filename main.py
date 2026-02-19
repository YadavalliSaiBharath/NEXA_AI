import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'modules', 'backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'modules'))
from modules.backend.main import app