"""Make the flat app modules (scenario, fusion) importable in tests regardless
of the directory pytest is invoked from."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
