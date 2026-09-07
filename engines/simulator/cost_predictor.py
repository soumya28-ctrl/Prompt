from engines.token_engine.token_counter import calculate_cost


def simulate_costs(users_per_day, requests_per_user, avg_tokens_per_request, model="GPT-4.1"):
    requests_per_day = users_per_day * requests_per_user
    daily_tokens = requests_per_day * avg_tokens_per_request
    daily_cost = calculate_cost(daily_tokens, daily_tokens // 2, model)
    monthly_cost = daily_cost * 30
    yearly_cost = monthly_cost * 12

    return {
        "users_per_day": users_per_day,
        "requests_per_day": requests_per_day,
        "daily_tokens": daily_tokens,
        "daily_cost": round(daily_cost, 6),
        "monthly_cost": round(monthly_cost, 6),
        "yearly_cost": round(yearly_cost, 6),
    }


def simulate_optimized_costs(users_per_day, requests_per_user, avg_tokens_per_request, model="GPT-4.1", savings_ratio=0.25):
    base = simulate_costs(users_per_day, requests_per_user, avg_tokens_per_request, model)
    optimized_daily = base["daily_cost"] * (1 - savings_ratio)
    optimized_monthly = optimized_daily * 30
    optimized_yearly = optimized_monthly * 12
    return {
        **base,
        "optimized_daily_cost": round(optimized_daily, 6),
        "optimized_monthly_cost": round(optimized_monthly, 6),
        "optimized_yearly_cost": round(optimized_yearly, 6),
        "savings": round(base["daily_cost"] - optimized_daily, 6),
    }
