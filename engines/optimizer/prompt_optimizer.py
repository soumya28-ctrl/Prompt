import re

from engines.optimizer.compression import compress_text
from engines.token_engine.token_counter import count_tokens


def optimize_prompt(prompt):
    if not prompt:
        return {
            "original_prompt": "",
            "optimized_prompt": "",
            "original_tokens": 0,
            "new_tokens": 0,
            "percentage_saved": 0.0,
        }

    original = prompt.strip()
    compressed = compress_text(original)
    compressed = re.sub(r"\s+", " ", compressed).strip()

    original_tokens = count_tokens(original, "GPT-4.1")
    new_tokens = count_tokens(compressed, "GPT-4.1")

    optimized = compressed if new_tokens < original_tokens else original
    new_tokens = count_tokens(optimized, "GPT-4.1")

    percentage_saved = round(max(0.0, ((original_tokens - new_tokens) / original_tokens) * 100), 2) if original_tokens else 0.0
    return {
        "original_prompt": original,
        "optimized_prompt": optimized,
        "original_tokens": original_tokens,
        "new_tokens": new_tokens,
        "percentage_saved": percentage_saved,
    }
