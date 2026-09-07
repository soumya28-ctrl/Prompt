from pathlib import Path
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from engines.complexity_engine.complexity import calculate_complexity
from engines.optimizer.prompt_optimizer import optimize_prompt
from engines.recommendation.model_router import recommend_model
from engines.simulator.usage_simulator import build_projection
from engines.token_engine.model_registry import ModelRegistry
from engines.token_engine.token_counter import calculate_cost, compare_models, count_tokens


app = FastAPI(title="LLM Cost Twin API", version="1.0.0")
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials="*" not in allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

registry = ModelRegistry()
ModelName = str


class PromptRequest(BaseModel):
    prompt: str = Field(default="", max_length=100_000)


class CostRequest(PromptRequest):
    model: ModelName = "GPT-4.1"


class RecommendationRequest(PromptRequest):
    model: ModelName | None = None


class SimulationRequest(BaseModel):
    users_per_day: int = Field(default=1000, ge=1, le=10_000_000)
    requests_per_user: int = Field(default=3, ge=1, le=100_000)
    avg_tokens_per_request: int = Field(default=800, ge=1, le=10_000_000)
    model: ModelName = "GPT-4.1"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/models")
def models():
    return {"models": registry.list_models()}


@app.post("/cost")
def cost(request: CostRequest):
    input_tokens = count_tokens(request.prompt, request.model)
    output_tokens = max(20, input_tokens // 3)
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "estimated_cost": calculate_cost(input_tokens, output_tokens, request.model),
        "model": request.model,
        "comparison": compare_models(request.prompt),
    }


@app.post("/complexity")
def complexity(request: PromptRequest):
    return calculate_complexity(request.prompt)


@app.post("/optimize")
def optimize(request: PromptRequest):
    return optimize_prompt(request.prompt)


@app.post("/recommend")
def recommend(request: RecommendationRequest):
    return recommend_model(request.prompt, request.model)


@app.post("/simulate")
def simulate(request: SimulationRequest):
    return build_projection(
        request.users_per_day,
        request.requests_per_user,
        request.avg_tokens_per_request,
        model=request.model,
    )
