import csv
import json
import threading
from contextlib import contextmanager
from http.server import ThreadingHTTPServer
from io import BytesIO, StringIO
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from openpyxl import Workbook

from api.index import handler
from engines.batch_analyzer import (
    MAX_PROMPTS,
    analyze_prompts,
    parse_prompt_file,
    results_csv,
)


@contextmanager
def api_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        thread.join()
        server.server_close()


def test_csv_prompt_column():
    contents = b"category,prompt\nsummary,Summarize the article.\n"
    assert parse_prompt_file(contents, "prompts.csv") == ["Summarize the article."]


def test_excel_prompt_column():
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["category", "prompt"])
    sheet.append(["summary", "Summarize the article."])
    output = BytesIO()
    workbook.save(output)
    assert parse_prompt_file(output.getvalue(), "prompts.xlsx") == ["Summarize the article."]


def test_report_has_six_signals_and_consistent_savings():
    report = analyze_prompts(
        ["Please carefully summarize the article and preserve the key points."],
        "GPT-4.1",
    )
    row = report["results"][0]
    signal_fields = {
        "word_count", "sentence_count", "instruction_density",
        "keyword_complexity", "entropy", "reasoning_indicators",
    }

    assert signal_fields.issubset(row)
    assert report["summary"]["prompt_count"] == 1
    assert row["tokens_saved_estimate"] == (
        row["original_tokens_estimate"] - row["optimized_tokens_estimate"]
    )
    assert row["accuracy_evaluation"].startswith("Not evaluated")
    assert "summarize the article" in row["optimized_prompt"].lower()


def test_analysis_accepts_exactly_500_prompts():
    report = analyze_prompts(["Summarize this text."] * MAX_PROMPTS, "GPT-4o")
    assert report["summary"]["prompt_count"] == MAX_PROMPTS
    assert report["results"][-1]["prompt_number"] == MAX_PROMPTS


def test_optimizer_only_removes_leading_politeness():
    prompt = "Repeat this exact phrase: please keep the word kindly."
    report = analyze_prompts([prompt], "GPT-4.1")
    assert report["results"][0]["optimized_prompt"] == prompt


def test_csv_export_escapes_spreadsheet_formulas():
    report = analyze_prompts(["=1+1"], "GPT-4.1")
    exported = results_csv(report["results"])
    row = next(csv.DictReader(StringIO(exported)))
    assert row["prompt"] == "'=1+1"


def test_csv_prompt_limit_is_enforced():
    contents = "\n".join(["prompt"] + [f"prompt {index}" for index in range(MAX_PROMPTS + 1)])
    try:
        parse_prompt_file(contents.encode(), "prompts.csv")
    except ValueError as error:
        assert str(MAX_PROMPTS) in str(error)
    else:
        raise AssertionError("Expected the prompt limit to be enforced")


def test_upload_size_limit_is_enforced():
    try:
        parse_prompt_file(b"x" * (4 * 1024 * 1024 + 1), "prompts.csv")
    except ValueError as error:
        assert "4 MB" in str(error)
    else:
        raise AssertionError("Expected the upload limit to be enforced")


def test_unknown_model_is_rejected():
    try:
        analyze_prompts(["Summarize this."], "Unlisted")
    except ValueError as error:
        assert "available models" in str(error)
    else:
        raise AssertionError("Expected an unknown model to be rejected")


def test_api_health_and_model_routes():
    with api_server() as base:
        with urlopen(f"{base}/api/health") as response:
            assert json.load(response)["status"] == "ok"
        with urlopen(f"{base}/api/models") as response:
            models = json.load(response)["models"]
        with urlopen(f"{base}/api/index.py?route=models") as response:
            rewritten_models = json.load(response)["models"]
    assert models == ["GPT-4.1", "GPT-4o", "Claude", "Llama-3", "Mistral"]
    assert rewritten_models == models


def test_api_analyze_route_accepts_uploaded_csv_and_model():
    with api_server() as base:
        request = Request(
            f"{base}/api/batch-analyze",
            data=b"prompt\nSummarize the article.\n",
            headers={
                "Content-Type": "application/octet-stream",
                "X-Filename": "prompts.csv",
                "X-Model": "Claude",
            },
            method="POST",
        )
        with urlopen(request) as response:
            report = json.load(response)
    assert report["summary"]["model"] == "Claude"
    assert report["summary"]["prompt_count"] == 1


def test_api_accepts_vercel_rewrite_query_route():
    with api_server() as base:
        request = Request(
            f"{base}/api/index.py?route=analyze",
            data=b"prompt\nSummarize the article.\n",
            headers={
                "Content-Type": "application/octet-stream",
                "X-Filename": "prompts.csv",
                "X-Model": "Mistral",
            },
            method="POST",
        )
        with urlopen(request) as response:
            report = json.load(response)
    assert report["summary"]["model"] == "Mistral"


def test_api_rejects_bad_file_with_actionable_message():
    with api_server() as base:
        request = Request(
            f"{base}/api/batch-analyze",
            data=b"not a spreadsheet",
            headers={
                "Content-Type": "application/octet-stream",
                "X-Filename": "prompts.txt",
            },
            method="POST",
        )
        try:
            urlopen(request)
        except HTTPError as error:
            assert error.code == 400
            assert "xlsx" in json.load(error)["detail"]
        else:
            raise AssertionError("Expected the unsupported file to be rejected")
