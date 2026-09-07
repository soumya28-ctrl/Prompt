import re


def compress_text(text):
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    compressed_sentences = []
    for sentence in sentences:
        cleaned = re.sub(r"\b(please|carefully|thoroughly|very|really|simply|just)\b", "", sentence, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        compressed_sentences.append(cleaned)
    return " ".join(compressed_sentences)
