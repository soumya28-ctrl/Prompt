import json
from pathlib import Path

from utils.helpers import load_model_registry


class ModelRegistry:
    def __init__(self):
        self.models = load_model_registry()

    def get_model(self, model_name):
        return self.models.get(model_name, self.models.get("GPT-4.1"))

    def list_models(self):
        return list(self.models.keys())
