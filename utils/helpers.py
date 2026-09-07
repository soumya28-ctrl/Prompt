import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODELS_PATH = ROOT / "models" / "model_pricing.json"


def load_model_registry():
    with MODELS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0
