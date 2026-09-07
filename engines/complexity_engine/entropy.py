import math


def shannon_entropy(text):
    if not text:
        return 0.0
    tokens = text.lower().split()
    if not tokens:
        return 0.0
    counts = {}
    for token in tokens:
        counts[token] = counts.get(token, 0) + 1
    total = len(tokens)
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 3)
