from engines.simulator.cost_predictor import simulate_optimized_costs


def build_projection(users, requests, tokens, model="GPT-4.1"):
    return simulate_optimized_costs(users, requests, tokens, model=model)
