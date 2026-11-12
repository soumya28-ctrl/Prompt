import csv
import math
import re
import zipfile
from io import BytesIO, StringIO

from openpyxl import load_workbook


MODELS = {
    "GPT-4.1": {"input_cost_per_million": 2.0, "output_cost_per_million": 8.0},
    "GPT-4o": {"input_cost_per_million": 2.5, "output_cost_per_million": 10.0},
    "Claude": {"input_cost_per_million": 3.0, "output_cost_per_million": 15.0},
    "Llama-3": {"input_cost_per_million": 0.2, "output_cost_per_million": 0.6},
    "Mistral": {"input_cost_per_million": 0.15, "output_cost_per_million": 0.4},
}
MAX_PROMPTS = 500
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
MAX_WORKBOOK_BYTES = 25 * 1024 * 1024
MAX_WORKSHEET_ROWS = 10_000
MAX_PROMPT_CHARS = 50_000
MAX_TOTAL_PROMPT_CHARS = 1_000_000
PROMPT_HEADERS = {"prompt", "prompts", "prompt_text", "text", "input"}
INSTRUCTION_WORDS = {
    "please", "must", "should", "ensure", "provide", "analyze", "compare",
    "evaluate", "recommend", "summarize", "explain", "write", "create",
    "describe", "list", "include", "avoid", "return",
}
REASONING_MARKERS = {
    "analyze", "compare", "evaluate", "reason", "trade-off", "constraint",
    "recommendation", "detailed", "strategy", "decision", "rationale",
}
WORD_PATTERN = re.compile(r"\b[\w'-]+\b", re.UNICODE)
TOKEN_PATTERN = re.compile(r"\w+|[^\w\s]", re.UNICODE)
SENTENCE_PATTERN = re.compile(r"(?<=[.!?])\s+")


def load_models():
    return MODELS.copy()


def _read_csv(contents):
    try:
        text = contents.decode("utf-8-sig")
        rows = []
        for row_number, row in enumerate(csv.reader(StringIO(text)), start=1):
            if any(value.strip() for value in row):
                rows.append(row)
            if row_number > MAX_WORKSHEET_ROWS:
                raise ValueError(
                    f"The CSV exceeds the {MAX_WORKSHEET_ROWS:,}-row processing limit."
                )
        return rows
    except UnicodeDecodeError as error:
        raise ValueError("CSV files must use UTF-8 encoding.") from error
    except csv.Error as error:
        raise ValueError("Could not read the CSV file. Check its formatting.") from error


def _read_xlsx(contents):
    try:
        with zipfile.ZipFile(BytesIO(contents)) as archive:
            uncompressed_size = sum(entry.file_size for entry in archive.infolist())
            if uncompressed_size > MAX_WORKBOOK_BYTES:
                raise ValueError("The Excel workbook expands beyond the 25 MB safety limit.")
        workbook = load_workbook(BytesIO(contents), read_only=True, data_only=True)
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("Could not read the Excel file. Please upload a valid .xlsx workbook.") from error

    try:
        rows = []
        for row_number, row in enumerate(workbook.active.iter_rows(values_only=True), start=1):
            values = list(row)
            if any(value is not None and str(value).strip() for value in values):
                rows.append(values)
            if row_number > MAX_WORKSHEET_ROWS:
                raise ValueError(
                    f"The worksheet exceeds the {MAX_WORKSHEET_ROWS:,}-row processing limit."
                )
        return rows
    finally:
        workbook.close()


def parse_prompt_file(contents, filename):
    if len(contents) > MAX_UPLOAD_BYTES:
        raise ValueError("The uploaded file exceeds the 4 MB limit.")

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension == "csv":
        rows = _read_csv(contents)
    elif extension == "xlsx":
        rows = _read_xlsx(contents)
    else:
        raise ValueError("Upload an .xlsx Excel workbook or a .csv file.")

    if not rows:
        raise ValueError("The uploaded file contains no prompts.")

    first_row = rows[0]
    normalized_headers = [str(value or "").strip().lower() for value in first_row]
    prompt_column = next(
        (index for index, value in enumerate(normalized_headers) if value in PROMPT_HEADERS),
        0,
    )
    has_header = any(value in PROMPT_HEADERS for value in normalized_headers)
    prompt_rows = rows[1:] if has_header else rows
    prompts = []
    total_prompt_chars = 0
    for row in prompt_rows:
        if prompt_column >= len(row) or row[prompt_column] is None:
            continue
        prompt = str(row[prompt_column]).strip()
        if prompt:
            if len(prompt) > MAX_PROMPT_CHARS:
                raise ValueError(
                    f"Each prompt must be {MAX_PROMPT_CHARS:,} characters or fewer."
                )
            prompts.append(prompt)
            if len(prompts) > MAX_PROMPTS:
                raise ValueError(f"The spreadsheet may contain at most {MAX_PROMPTS} prompts.")
            total_prompt_chars += len(prompt)
            if total_prompt_chars > MAX_TOTAL_PROMPT_CHARS:
                raise ValueError("The combined prompts exceed the 1,000,000-character processing limit.")

    if not prompts:
        raise ValueError("No prompts found. Add a 'prompt' column or put prompts in the first column.")
    return prompts


def _estimate_tokens(text):
    return len(TOKEN_PATTERN.findall(text))


def _complexity(prompt):
    words = WORD_PATTERN.findall(prompt)
    word_count = len(words)
    sentences = [sentence for sentence in SENTENCE_PATTERN.split(prompt.strip()) if sentence.strip()]
    lower_words = [word.lower() for word in words]
    instruction_count = sum(word in INSTRUCTION_WORDS for word in lower_words)
    instruction_density = round(instruction_count / max(1, word_count) * 100, 2)
    long_word_count = sum(len(word) >= 6 for word in words)
    keyword_complexity = round(long_word_count / max(1, word_count) * 100, 2)

    frequencies = {}
    for word in lower_words:
        frequencies[word] = frequencies.get(word, 0) + 1
    entropy = round(
        -sum((count / max(1, word_count)) * math.log2(count / max(1, word_count))
             for count in frequencies.values()),
        3,
    )
    reasoning_count = sum(
        marker in prompt.lower() for marker in REASONING_MARKERS
    )
    score = min(100, round(
        (word_count / 20) * 0.35
        + len(sentences) * 6
        + instruction_density * 0.35
        + keyword_complexity * 0.25
        + entropy * 4
        + reasoning_count * 3
    ))
    category = "High" if score >= 70 else "Medium" if score >= 35 else "Low"
    return {
        "complexity_score": score,
        "complexity_category": category,
        "word_count": word_count,
        "sentence_count": len(sentences),
        "instruction_density": instruction_density,
        "keyword_complexity": keyword_complexity,
        "entropy": entropy,
        "reasoning_indicators": reasoning_count,
    }


def _optimize_prompt(prompt):
    optimized = re.sub(r"\s+", " ", prompt).strip()
    optimized = re.sub(
        r"^(?:(?:please|kindly)\b[,:]?\s+)+",
        "",
        optimized,
        flags=re.IGNORECASE,
    )

    original_tokens = _estimate_tokens(prompt)
    optimized_tokens = _estimate_tokens(optimized)
    if optimized_tokens >= original_tokens:
        optimized = prompt
        optimized_tokens = original_tokens

    saved = round(
        (original_tokens - optimized_tokens) / original_tokens * 100, 2
    ) if original_tokens else 0.0
    return optimized, original_tokens, optimized_tokens, saved


def _cost(input_tokens, output_tokens, model_config):
    return round(
        input_tokens / 1_000_000 * model_config["input_cost_per_million"]
        + output_tokens / 1_000_000 * model_config["output_cost_per_million"],
        8,
    )


def analyze_prompts(prompts, model):
    models = load_models()
    if model not in models:
        raise ValueError("Select one of the available models.")
    if not prompts:
        raise ValueError("Provide at least one prompt.")
    if len(prompts) > MAX_PROMPTS:
        raise ValueError(f"Analyze at most {MAX_PROMPTS} prompts at a time.")
    if any(not isinstance(prompt, str) or len(prompt) > MAX_PROMPT_CHARS for prompt in prompts):
        raise ValueError(f"Each prompt must be text with at most {MAX_PROMPT_CHARS:,} characters.")
    if sum(map(len, prompts)) > MAX_TOTAL_PROMPT_CHARS:
        raise ValueError("The combined prompts exceed the 1,000,000-character processing limit.")

    rows = []
    for number, prompt in enumerate(prompts, start=1):
        complexity = _complexity(prompt)
        optimized, original_tokens, optimized_tokens, saved = _optimize_prompt(prompt)
        original_cost = _cost(
            original_tokens, max(20, original_tokens // 3), models[model]
        )
        optimized_cost = _cost(
            optimized_tokens, max(20, optimized_tokens // 3), models[model]
        )
        rows.append({
            "prompt_number": number,
            "prompt": prompt,
            "optimized_prompt": optimized,
            **complexity,
            "original_tokens_estimate": original_tokens,
            "optimized_tokens_estimate": optimized_tokens,
            "tokens_saved_estimate": original_tokens - optimized_tokens,
            "percentage_saved": saved,
            "estimated_cost_before": original_cost,
            "estimated_cost_after": optimized_cost,
            "estimated_cost_savings": round(original_cost - optimized_cost, 8),
            "accuracy_evaluation": "Not evaluated: no model outputs or reference answers supplied.",
        })

    original_tokens = sum(row["original_tokens_estimate"] for row in rows)
    optimized_tokens = sum(row["optimized_tokens_estimate"] for row in rows)
    cost_before = round(sum(row["estimated_cost_before"] for row in rows), 8)
    cost_after = round(sum(row["estimated_cost_after"] for row in rows), 8)
    count = len(rows)
    summary = {
        "prompt_count": count,
        "model": model,
        "average_complexity_score": round(
            sum(row["complexity_score"] for row in rows) / count, 2
        ),
        "high_complexity_prompts": sum(row["complexity_category"] == "High" for row in rows),
        "prompts_reduced": sum(row["tokens_saved_estimate"] > 0 for row in rows),
        "original_tokens_estimate": original_tokens,
        "optimized_tokens_estimate": optimized_tokens,
        "tokens_saved_estimate": original_tokens - optimized_tokens,
        "percentage_saved": round(
            (original_tokens - optimized_tokens) / original_tokens * 100, 2
        ) if original_tokens else 0.0,
        "estimated_cost_before": cost_before,
        "estimated_cost_after": cost_after,
        "estimated_cost_savings": round(cost_before - cost_after, 8),
        "accuracy_evaluation": "Not evaluated: no model outputs or reference answers supplied.",
    }
    return {"summary": summary, "results": rows}


def results_csv(rows):
    if not rows:
        raise ValueError("There are no prompt results to export.")
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    for row in rows:
        safe_row = {
            key: "'" + value if isinstance(value, str) and value.startswith(("=", "+", "-", "@")) else value
            for key, value in row.items()
        }
        writer.writerow(safe_row)
    return output.getvalue()
