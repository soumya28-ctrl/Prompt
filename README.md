# LLM Cost Twin

LLM Cost Twin is a local research prototype for predicting and optimizing AI application costs without sending prompts to any external API. The framework models token usage, prompt complexity, optimizer behavior, model selection, and long-horizon FinOps simulation as a mathematical digital twin of LLM application cost behavior.

## Research Idea

Predictive LLM Cost Digital Twin without API execution.

## Features

- Local token counting and cost estimation
- Prompt complexity scoring
- Prompt compression and optimization
- Model recommendation based on task and complexity
- FinOps simulation for daily, monthly, and yearly budgets

## Installation

```bash
python -m pip install -r requirements.txt
```

## Running

```bash
streamlit run app.py
```

## Netlify + API deployment

The Streamlit app remains available for local use, but Netlify should host the
new static frontend and a separate Python API should host the calculation
engines.

### 1. Deploy the backend

Create a Render, Railway, or Fly.io web service from this repository with:

```bash
# Build command
pip install -r backend/requirements.txt

# Start command
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

After deployment, verify `https://YOUR-BACKEND-DOMAIN/health` returns
`{"status":"ok"}`. Set the backend environment variable `ALLOWED_ORIGINS` to
the Netlify site URL, for example `https://your-site.netlify.app`.

### 2. Deploy the frontend to Netlify

Set the Netlify publish directory to `frontend` (the included
`netlify.toml` does this automatically). Before deploying, edit
`frontend/config.js` and replace the local URL with the public backend URL:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://YOUR-BACKEND-DOMAIN"
};
```

The frontend calls `/api/models`, `/api/cost`, `/api/complexity`,
`/api/optimize`, `/api/recommend`, and `/api/simulate`. These endpoints use the
same existing Python engines and model registry as the Streamlit interface.

## One-project Vercel deployment

Vercel can host both parts under one URL using the included `vercel.json`:

1. Push the complete repository to GitHub.
2. Import the repository in Vercel.
3. Keep the project root as the repository root.
4. Deploy with the default settings.

The `api/index.py` serverless entrypoint exposes the FastAPI backend at `/api`,
while the `frontend` directory is served as the website. The frontend already
uses the same-origin API URL, so no backend URL needs to be configured after
deployment. Check `https://YOUR-VERCEL-DOMAIN/api/health` after deployment.

Open `https://YOUR-VERCEL-DOMAIN/` to use the website. The `/api/health` URL is
only a backend diagnostic and intentionally displays `{"status":"ok"}`.

## Architecture

- Token cost engine: token counting, pricing, and model registry
- Complexity engine: prompt complexity and entropy scoring
- Optimizer: prompt compression and redundancy reduction
- Recommendation engine: task-to-model routing
- Simulator: forecast of costs under expected traffic

## Mathematical Explanation

The system estimates cost using:

$$
\text{Cost} = \frac{\text{input tokens}}{10^6} \times \text{input rate} + \frac{\text{output tokens}}{10^6} \times \text{output rate}
$$

Prompt complexity combines token count, sentence count, instruction density, keyword complexity, entropy, and reasoning indicators into a normalized score in the range 0 to 100.

## Contribution

This prototype demonstrates how a local digital twin can support AI cost planning before any model request is made.
