def classify_task(prompt):
    text = prompt.lower()
    if any(word in text for word in ["summarize", "summary", "brief", "overview"]):
        return "Summarization"
    if any(word in text for word in ["extract", "classify", "label", "tag"]):
        return "Classification"
    if any(word in text for word in ["analyze", "compare", "trade", "decision", "recommend"]):
        return "Analysis"
    if any(word in text for word in ["code", "python", "debug", "refactor"]):
        return "Coding"
    return "General"
