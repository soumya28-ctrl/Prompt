import re

from engines.complexity_engine.entropy import shannon_entropy


REASONING_MARKERS = [
    "analyze", "compare", "evaluate", "reason", "trade-off", "constraint", "recommendation",
    "detailed", "carefully", "strategy", "decision", "rationale"
]


def calculate_complexity(prompt):
    if not prompt:
        return {"score": 0, "category": "Low", "explanation": "No prompt supplied."}

    sentences = [s for s in re.split(r"(?<=[.!?])\s+", prompt.strip()) if s]
    token_count = len(prompt.split())
    instruction_density = min(100, round((len(re.findall(r"\b(you|must|should|please|ensure|provide|analyze|compare|evaluate|recommend)\b", prompt.lower())) / max(1, token_count)) * 100, 2))
    keyword_complexity = min(100, round((len(re.findall(r"[A-Za-z]{6,}", prompt)) / max(1, token_count)) * 100, 2))
    entropy = shannon_entropy(prompt)
    reasoning_indicators = sum(1 for marker in REASONING_MARKERS if marker in prompt.lower())
    numeric_score = min(100, round(
        (token_count / 20) * 0.35
        + len(sentences) * 6
        + instruction_density * 0.35
        + keyword_complexity * 0.25
        + entropy * 4
        + reasoning_indicators * 3
    ))
    category = "High" if numeric_score >= 70 else "Medium" if numeric_score >= 35 else "Low"
    explanation = (
        f"The prompt contains {token_count} words across {len(sentences)} sentence(s), with instruction density {instruction_density:.1f}%, "
        f"keyword density {keyword_complexity:.1f}%, entropy {entropy:.2f}, and {reasoning_indicators} reasoning markers."
    )
    return {"score": int(numeric_score), "category": category, "explanation": explanation}
