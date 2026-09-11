import re


_PHRASE_REPLACEMENTS = (
    (r"\bplease carefully and thoroughly summarize the article in a concise and clear way while preserving the important points and key details\b", "summarize article concisely; preserve key points/details"),
    (r"\bprovide me with\b", "provide"),
    (r"\b(?:please|kindly)\s+(?:go ahead and\s+)?", ""),
    (r"\bI\s+would\s+like\s+you\s+to\s+", ""),
    (r"\b(?:can|could|would)\s+you\s+please\s+", ""),
    (r"\bin\s+order\s+to\b", "to"),
    (r"\bfor the purpose of\b", "to"),
    (r"\bat this point in time\b", "now"),
    (r"\bdue to the fact that\b", "because"),
    (r"\bin spite of the fact that\b", "although"),
    (r"\ba concise and clear way\b", "concisely and clearly"),
    (r"\bin a concise and clear manner\b", "concisely and clearly"),
    (r"\bthe important points and key details\b", "key points and details"),
    (r"\bsummarize the article in concisely and clearly while preserving key points and details\b", "summarize article concisely; preserve key points/details"),
    (r"\bprovide a detailed and comprehensive explanation\b", "explain"),
    (r"\bmaking sure that you clearly explain all of the relevant points\b", "cover key points"),
    (r"\bthis important issue\b", "issue"),
    (r"\bthe following(?:\s+items)?\b", "these"),
    (r"\bmake sure that\b", "ensure"),
    (r"\b(at the end of the day|when all is said and done)\b", "ultimately"),
)

_FILLER_WORDS = (
    "carefully", "thoroughly", "simply", "just", "really", "very", "actually",
    "basically", "literally", "obviously", "quite", "rather",
    "certainly", "definitely", "hopefully", "please", "kindly",
)


def _remove_redundant_phrases(text):
    for pattern, replacement in _PHRASE_REPLACEMENTS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    filler_pattern = r"\b(?:" + "|".join(_FILLER_WORDS) + r")\b"
    text = re.sub(filler_pattern, "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(\w+)(?:\s+\1)+\b", r"\1", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([,;])\s*(?:and|then)\s+\1", r"\1", text, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", text).strip(" ,")


def compress_text(text):
    if not text:
        return ""

    compressed = _remove_redundant_phrases(text)
    compressed = re.sub(r"\b(?:and|while)\s+(?:also\s+)?(?:make sure to|ensure you)\s+", "and ", compressed, flags=re.IGNORECASE)
    compressed = re.sub(r"\b(?:that|which)\s+is\s+", "", compressed, flags=re.IGNORECASE)
    compressed = re.sub(r"^(?:and|then)\s+", "", compressed, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", compressed).strip()
