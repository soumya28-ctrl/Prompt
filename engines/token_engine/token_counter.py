import re

import tiktoken

from engines.token_engine.model_registry import ModelRegistry


registry = ModelRegistry()


def count_tokens(prompt, model):
    if not prompt:
        return 0
    tokenizer_name = registry.get_model(model).get("tokenizer", "cl100k_base")
    try:
        encoding = tiktoken.get_encoding(tokenizer_name)
    except Exception:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(prompt))


def calculate_cost(input_tokens, output_tokens, model):
    model_config = registry.get_model(model)
    input_rate = model_config.get("input_cost_per_million", 0.0)
    output_rate = model_config.get("output_cost_per_million", 0.0)
    input_cost = input_tokens / 1_000_000 * input_rate
    output_cost = output_tokens / 1_000_000 * output_rate
    return round(input_cost + output_cost, 6)


def compare_models(prompt):
    results = []
    for model_name in registry.list_models():
        tokens = count_tokens(prompt, model_name)
        cost = calculate_cost(tokens, max(8, tokens // 3), model_name)
        results.append({
            "model": model_name,
            "tokens": tokens,
            "estimated_cost": round(cost, 6),
        })
    return results
