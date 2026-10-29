import csv
from io import BytesIO, StringIO

from openpyxl import Workbook

from engines.batch_analyzer import (
    COMPLEXITY_METRICS,
    analyze_prompts,
    batch_results_csv,
    parse_prompt_file,
)


def test_parse_prompt_column_from_csv():
    contents = b"category,prompt\nsummary,Summarize this article.\n"
    assert parse_prompt_file(contents, "prompts.csv") == ["Summarize this article."]


def test_parse_prompt_column_from_excel():
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["category", "prompt"])
    sheet.append(["summary", "Summarize this article."])
    output = BytesIO()
    workbook.save(output)

    assert parse_prompt_file(output.getvalue(), "prompts.xlsx") == ["Summarize this article."]


def test_batch_report_contains_six_signals_and_summary():
    report = analyze_prompts([
        "Please carefully summarize the article and preserve the key points."
    ])
    result = report["results"][0]

    assert all(metric in result for metric in COMPLEXITY_METRICS)
    assert report["summary"]["prompt_count"] == 1
    assert report["summary"]["tokens_saved"] == (
        report["summary"]["original_tokens"] - report["summary"]["optimized_tokens"]
    )
    assert report["summary"]["accuracy"].startswith("Not evaluated")
    assert list(csv.DictReader(StringIO(batch_results_csv(report))))[0]["prompt_number"] == "1"


def test_csv_report_escapes_spreadsheet_formulas():
    report = analyze_prompts(["=1+1"])

    assert "'=1+1" in batch_results_csv(report)


def test_prompt_limit_is_enforced():
    contents = "\n".join(["prompt"] + [f"prompt {index}" for index in range(501)])
    try:
        parse_prompt_file(contents.encode(), "prompts.csv")
    except ValueError as error:
        assert "500" in str(error)
    else:
        raise AssertionError("Expected the 500-prompt limit to be enforced")
