import pytest

from engines.token_engine.token_counter import count_tokens, calculate_cost, compare_models
from engines.complexity_engine.complexity import calculate_complexity
from engines.optimizer.prompt_optimizer import optimize_prompt
from engines.simulator.cost_predictor import simulate_costs


def test_token_counting_and_cost():
    prompt = "Summarize the benefits of renewable energy for a business audience."
    token_count = count_tokens(prompt, "GPT-4.1")
    assert token_count > 0

    cost = calculate_cost(token_count, max(10, token_count // 3), "GPT-4.1")
    assert cost >= 0

    comparison = compare_models(prompt)
    assert "GPT-4.1" in comparison and "Claude" in comparison


def test_complexity_scoring():
    prompt = "You must carefully analyze the trade-offs, compare the constraints, and provide a detailed rationale for each option before making a final recommendation."
    result = calculate_complexity(prompt)
    assert 0 <= result["score"] <= 100
    assert result["category"] in {"Low", "Medium", "High"}
    assert "explanation" in result


def test_optimization_reduces_tokens():
    prompt = "Please carefully and thoroughly summarize the article in a concise and clear way while preserving the important points and key details."
    result = optimize_prompt(prompt)
    assert result["optimized_prompt"] != prompt
    assert result["new_tokens"] <= result["original_tokens"]
    assert result["percentage_saved"] >= 40
    assert "summarize" in result["optimized_prompt"]
    assert "key points" in result["optimized_prompt"]


def test_simulation_values():
    projection = simulate_costs(users_per_day=100, requests_per_user=3, avg_tokens_per_request=800, model="GPT-4.1")
    assert projection["daily_cost"] >= 0
    assert projection["monthly_cost"] >= projection["daily_cost"]
    assert projection["yearly_cost"] >= projection["monthly_cost"]
