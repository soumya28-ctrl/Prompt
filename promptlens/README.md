# PromptLens

PromptLens is a privacy-first Next.js workbench for structuring individual
prompts, estimating provider costs, comparing model fit, and analyzing a CSV
containing up to 500 prompts.

## Run locally

Requirements: Node.js 20.9 or later and npm.

```powershell
cd D:\project\promptlens
npm install
npm run dev
```

Open `http://localhost:3000`. To verify before deployment:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Features

- **Single prompt:** analyzes six text signals, classifies the task, formats
  the original request in a Role–Task–Context–Constraints–Output structure,
  and explains each addition. The full source prompt is preserved.
- **Token and cost explorer:** displays clearly marked local token estimates,
  indicative input/output pricing for OpenAI, Anthropic, and Google models,
  and monthly request/output-length simulations.
- **Model recommendations:** ranks three candidate models using task fit,
  prompt complexity, relative speed, estimated cost, and context limits.
- **CSV audit:** parses CSV in a web worker, validates the 500-prompt and 4 MB
  limits, analyzes results in yielding chunks with progress, and provides
  aggregate cost/recommendation summaries, search, pagination, and CSV export.

All analysis runs locally without provider calls or API keys. The `.env.example`
documents server-only keys reserved for a future provider adapter; this version
does not consume them. Accuracy and semantic quality are not evaluated because
there are no model outputs or reference answers.

## Estimates and pricing

Token counts use a lightweight text heuristic and are not exact provider
tokenizer counts. Prices in `src/lib/models.ts` are illustrative reference
rates, not a live feed or quote; confirm current prices and provider billing
rules before making budget decisions. Cost estimates omit cached input,
discounts, tools, taxes, and provider-specific tiers.

The local optimizer reorganizes the supplied text and adds explicit guardrails;
it does not use a language model to invent context. Review optimized text before
using it.

## Deploy to Vercel

Import the repository, set the project root/directory to `promptlens`, and
deploy. Vercel detects the Next.js App Router project. No environment
variables are required for local analysis. The API routes
`/api/models` and `/api/analyze` provide typed server-side analysis endpoints;
bulk CSV processing stays in the browser so progress is responsive.

## Structure

```text
src/
  app/                 App Router pages and API handlers
  components/          Single-prompt and CSV analysis UI
  lib/                 Optimization, token estimates, pricing, recommendations, batch
  types/               Shared analysis types
public/                Downloadable CSV template
tests/                 Utility and batch tests
```
