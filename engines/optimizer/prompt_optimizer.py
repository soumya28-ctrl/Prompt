import re
from difflib import SequenceMatcher

from engines.optimizer.compression import compress_text
from engines.token_engine.token_counter import count_tokens


def _estimate_similarity(original, compressed):
    try:
        from sentence_transformers import SentenceTransformer, util
    except Exception:
        return SequenceMatcher(None, original.lower(), compressed.lower()).ratio()

    try:
        model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        embedding_a = model.encode([original], convert_to_tensor=False)
        embedding_b = model.encode([compressed], convert_to_tensor=False)
        similarity = util.pytorch_cos_sim(embedding_a, embedding_b).item()
        return float(similarity)
    except Exception:
        return SequenceMatcher(None, original.lower(), compressed.lower()).ratio()


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

    similarity = _estimate_similarity(original, compressed)
    if similarity < 0.75:
        optimized = original
        new_tokens = original_tokens
    else:
        optimized = compressed

    percentage_saved = round(max(0.0, ((original_tokens - new_tokens) / original_tokens) * 100), 2) if original_tokens else 0.0
    return {
        "original_prompt": original,
        "optimized_prompt": optimized,
        "original_tokens": original_tokens,
        "new_tokens": new_tokens,
        "percentage_saved": percentage_saved,
    }
