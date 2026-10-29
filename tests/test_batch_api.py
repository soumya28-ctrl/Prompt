import asyncio
from io import BytesIO

from fastapi import HTTPException, UploadFile

from backend.main import RecommendationRequest, batch_analyze, models, recommend


def test_batch_analyze_route_accepts_csv_upload():
    report = asyncio.run(
        batch_analyze(
            file=UploadFile(
                filename="prompts.csv",
                file=BytesIO(b"prompt\nSummarize this article.\n"),
            ),
            model="GPT-4.1",
        )
    )

    assert report["summary"]["prompt_count"] == 1
    assert "instruction_density" in report["results"][0]


def test_batch_analyze_route_rejects_unsupported_file():
    try:
        asyncio.run(
            batch_analyze(
                file=UploadFile(
                    filename="prompts.txt",
                    file=BytesIO(b"Summarize this article."),
                ),
                model="GPT-4.1",
            )
        )
    except HTTPException as error:
        assert error.status_code == 400
        assert "xlsx" in error.detail
    else:
        raise AssertionError("Expected unsupported file to be rejected")


def test_model_list_and_recommendation_accept_registered_selection():
    available_models = models()["models"]
    assert available_models == ["GPT-4.1", "GPT-4o", "Claude", "Llama-3", "Mistral"]

    recommendation = recommend(
        RecommendationRequest(prompt="Summarize this article.", model="Claude")
    )
    assert recommendation["recommended_model"] == "Claude"
