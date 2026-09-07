from engines.complexity_engine.complexity import calculate_complexity
from engines.recommendation.task_classifier import classify_task
from engines.token_engine.token_counter import calculate_cost, count_tokens


def recommend_model(prompt, model_choice=None):
    complexity = calculate_complexity(prompt)
    task = classify_task(prompt)
    token_count = count_tokens(prompt, "GPT-4.1")

    if complexity["score"] >= 75 or task in {"Analysis", "Coding"}:
        recommended = "GPT-4.1"
        reason = "High complexity or analytical task benefits from a stronger reasoning-capable model."
    elif complexity["score"] >= 40 or task == "Classification":
        recommended = "Claude"
        reason = "Moderate complexity suggests a balanced model is sufficient."
    else:
        recommended = "Llama-3"
        reason = "Low complexity can be handled by a lower-cost model."

    if model_choice:
        recommended = model_choice

    baseline_cost = calculate_cost(token_count, max(20, token_count // 2), "GPT-4.1")
    recommended_cost = calculate_cost(token_count, max(20, token_count // 2), recommended)
    savings = round(max(0.0, baseline_cost - recommended_cost), 6)

    return {
        "recommended_model": recommended,
        "reason": reason,
        "task_type": task,
        "complexity_score": complexity["score"],
        "estimated_savings": savings,
        "cost_estimate": round(recommended_cost, 6),
    }
