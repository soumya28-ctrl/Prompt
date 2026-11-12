# Prompt Bench

A lightweight prompt-analysis web app. Upload an Excel workbook or UTF-8 CSV
containing up to 500 prompts to receive transparent complexity indicators,
conservative text compression, approximate token/cost comparisons, and a
downloadable CSV report.

The app does not send prompts to an AI model. Consequently it does not measure
answer accuracy or semantic quality; reference answers and model outputs would
be required for those evaluations.

## Run and deploy

The project is configured for a single Vercel deployment:

1. Import the repository in Vercel and set the project root to the repository
   root.
2. Deploy the `main` branch.
3. Check `/api/health` for `{"status":"ok"}` and `/api/models` for the available
   model names.
4. Open `/` and confirm the page reports that the analysis service is connected.

The status banner includes the API version so you can verify that the browser
is talking to the newly deployed service rather than a stale page or function.

The root `requirements.txt` intentionally contains only the Excel workbook
reader. API endpoints are implemented with Python's standard-library HTTP
handler. The static frontend and API are same-origin, so no CORS configuration
or API URL setting is required.

## Input format

- `.xlsx` Excel workbook or UTF-8 `.csv` file
- Up to 4 MB and 500 non-empty prompts
- Up to 50,000 characters per prompt and 1,000,000 combined prompt characters
- Prompts in a column named `prompt`, `prompts`, `prompt_text`, `text`, or
  `input`; otherwise the first column is used

## Report fields

Each prompt includes six complexity signals: word count, sentence count,
instruction density, keyword complexity, word entropy, and reasoning-indicator
count. It also includes approximate token counts, token reduction, estimated
cost before and after compression for the selected pricing model, the
compressed prompt, and an explicit accuracy-not-evaluated label.

Token counts use a local text heuristic rather than an official provider
tokenizer. Model prices are configured in `engines/batch_analyzer.py`; confirm
those estimates against your provider before making budget decisions.

## Project layout

- `frontend/`: static interface
- `api/index.py`: Vercel HTTP function entrypoint
- `engines/batch_analyzer.py`: file parsing, prompt metrics, optimization, and
  estimates
- `tests/`: parser, analysis, and HTTP route tests
