from engines.token_engine.token_counter import calculate_cost


def estimate_cost(prompt, model, output_tokens=None):
    input_tokens = len(prompt.split())
    output_tokens = output_tokens or max(20, input_tokens // 2)
    return calculate_cost(input_tokens, output_tokens, model)
