"""
ChemVibe Backend Tests

Comprehensive test suite for ``backend/main.py`` covering:

* API endpoints: ``/``, ``/health``, ``/generate-agent-lesson``,
  ``/lessons``, ``/lessons/drafts``, ``/lessons/{id}``,
  ``/lessons/{id}/publish``, ``/api/scraped-data``
* Workflow unit functions (all with mocked externals):
  ``plan_scraping``, ``fetch_with_zyte``, ``structure_lesson``,
  ``save_lesson_to_appwrite``
* Pydantic model validation
* Environment configuration (missing API keys)
* Edge cases: empty / whitespace / long / special-character topics,
  concurrent lesson generation, partial Zyte success

All external calls (LangChain LLM, Zyte via httpx, Appwrite SDK) are
mocked — no real network requests are made.
"""

import json
import os
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from appwrite.query import Query as AppwriteQuery
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette import status

# ---------------------------------------------------------------------------
# Environment variables must be set before importing `main` so that
# ``load_dotenv()`` (which never overrides existing variables) picks up
# the test values below. No real API keys are ever used.
# ---------------------------------------------------------------------------
os.environ.setdefault("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
os.environ.setdefault("APPWRITE_PROJECT_ID", "test-project")
os.environ.setdefault("APPWRITE_API_KEY", "test-key")
os.environ.setdefault("APPWRITE_DATABASE_ID", "chemvibe")
os.environ.setdefault("APPWRITE_COLLECTION_ID", "lessons")
os.environ.setdefault("ZYTE_API_KEY", "test-zyte-key")
os.environ.setdefault("LLM_API_KEY", "test-llm-key")
os.environ.setdefault("LLM_MODEL", "gpt-4o-mini")

import main  # noqa: E402
from main import (  # noqa: E402
    APPWRITE_API_KEY,
    APPWRITE_PROJECT_ID,
    Challenge,
    GenerateLessonRequest,
    LLM_API_KEY,
    LessonResponse,
    LessonStructure,
    ScrapedDataRequest,
    ZYTE_API_KEY,
    app,
    fetch_with_zyte,
    get_databases,
    get_llm,
    plan_scraping,
    save_lesson_to_appwrite,
    structure_lesson,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Test fixtures / helpers
# ---------------------------------------------------------------------------
def _json_response(status_code=200, json_data=None, text=""):
    """Build a MagicMock behaving like an ``httpx.Response``."""
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data if json_data is not None else {}
    response.text = text
    return response


LESSON_JSON = {
    "title": "Nukleophile Substitution (SN2)",
    "category": "Reaktionsmechanismen",
    "theory": "Bei einer SN2-Reaktion greift das Nukleophil das Substrat von der Rueckseite an.",
    "challenge": {
        "type": "molecule_builder",
        "question": "Baue das Produkt der SN2-Reaktion von Chlormethan mit Hydroxid-Ion.",
        "difficulty": "medium",
        "target_smiles": "CO",
        "target_atoms": [
            {"type": "carbon", "x": 200, "y": 200},
            {"type": "oxygen", "x": 280, "y": 200},
        ],
        "target_bonds": 1,
        "preplaced_atoms": [],
        "palette_atoms": [
            {"type": "carbon", "symbol": "C", "name": "Kohlenstoff"},
            {"type": "oxygen", "symbol": "O", "name": "Sauerstoff"},
            {"type": "hydrogen", "symbol": "H", "name": "Wasserstoff"},
        ],
    },
}

LESSON_JSON_STR = json.dumps(LESSON_JSON)
URLS_JSON_STR = json.dumps(["https://en.wikipedia.org/wiki/Test", "https://example.com"])


@pytest.fixture
def mock_llm():
    """Factory returning a mock ChatOpenAI whose chain ``invoke`` returns canned content.

    Usage::

        llm = mock_llm("content")                 # every invoke() returns content
        llm = mock_llm(["content1", "content2"])  # invoke() returns items in order
    """

    def factory(contents):
        llm = MagicMock()
        chain = MagicMock()
        if isinstance(contents, (list, tuple)):
            chain.invoke.side_effect = list(contents)
        else:
            chain.invoke.return_value = contents
        # ``llm | StrOutputParser()`` returns ``chain``
        llm.__or__.return_value = chain
        return llm

    return factory


@pytest.fixture
def zyte_mock():
    """Factory patching ``main.httpx.AsyncClient`` with canned POST responses.

    Usage::

        patcher, _ = zyte_mock([_json_response(200, {...})])
        with patcher:
            ...

    Each entry may be a MagicMock response (returned in order) or an exception
    instance raised by the mocked ``post()``.
    """

    def factory(responses):
        mock_client = AsyncMock()
        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value = mock_client
        mock_cm.__aexit__.return_value = False
        mock_client.post = AsyncMock(side_effect=responses)
        return patch("main.httpx.AsyncClient", return_value=mock_cm), mock_client

    return factory


@pytest.fixture
def appwrite_db():
    """Patch ``main.get_databases`` with a mock Databases instance for the test."""
    db = MagicMock()
    with patch("main.get_databases", return_value=db):
        yield db


# ---------------------------------------------------------------------------
# 1. API endpoint integration tests
# ---------------------------------------------------------------------------
def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["service"] == "ChemVibe Backend"
    assert data["version"] == "2.1.0"
    assert isinstance(data["endpoints"], list)
    assert "/generate-agent-lesson" in str(data["endpoints"])


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "healthy", "service": "chemvibe-backend"}


def test_generate_agent_lesson_happy_path(mock_llm, zyte_mock, appwrite_db):
    """Full workflow with every external call mocked."""
    llm = mock_llm([URLS_JSON_STR, LESSON_JSON_STR])
    appwrite_db.create_document.return_value = {"$id": "lesson-abc-123"}
    zyte_patcher, _ = zyte_mock([_json_response(200, {"extract": "mocked zyte data"})])

    with patch("main.get_llm", return_value=llm), zyte_patcher:
        response = client.post(
            "/generate-agent-lesson",
            json={"topic": "Nukleophile Substitution", "difficulty": "medium"},
        )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["id"] == "lesson-abc-123"
    assert data["title"] == LESSON_JSON["title"]
    assert data["category"] == LESSON_JSON["category"]
    assert data["status"] == "draft"
    assert "created_at" in data

    appwrite_db.create_document.assert_called_once()
    create_kwargs = appwrite_db.create_document.call_args.kwargs
    assert create_kwargs["database_id"] == "chemvibe"
    assert create_kwargs["collection_id"] == "lessons"
    assert create_kwargs["data"]["status"] == "draft"
    assert create_kwargs["data"]["topic"] == "Nukleophile Substitution"


def test_generate_agent_lesson_difficulty_default(mock_llm, zyte_mock, appwrite_db):
    """Missing difficulty defaults to 'medium' and the endpoint still succeeds."""
    llm = mock_llm([URLS_JSON_STR, LESSON_JSON_STR])
    appwrite_db.create_document.return_value = {"$id": "lesson-default"}
    zyte_patcher, _ = zyte_mock([_json_response(200, {})])

    with patch("main.get_llm", return_value=llm), zyte_patcher:
        response = client.post("/generate-agent-lesson", json={"topic": "Säure-Base-Reaktion"})

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["status"] == "draft"


def test_generate_agent_lesson_missing_topic_field():
    """Topic is required -> 422 validation error."""
    response = client.post("/generate-agent-lesson", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_generate_agent_lesson_empty_topic():
    response = client.post("/generate-agent-lesson", json={"topic": ""})
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_agent_lesson_whitespace_only_topic():
    """Whitespace-only topic is rejected after ``.strip()``."""
    response = client.post("/generate-agent-lesson", json={"topic": "   \t  "})
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_agent_llm_failure_returns_502(appwrite_db):
    """LangChain LLM failure during planning -> 502 Bad Gateway."""
    llm = MagicMock()
    llm.__or__.side_effect = Exception("LLM connection refused")
    with patch("main.get_llm", return_value=llm):
        response = client.post("/generate-agent-lesson", json={"topic": "Foo"})
    assert response.status_code == status.HTTP_502_BAD_GATEWAY


def test_generate_agent_zyte_missing_key_returns_500(monkeypatch, appwrite_db):
    """Missing ZYTE_API_KEY -> fetch_with_zyte raises 500 -> endpoint 500."""
    monkeypatch.setattr(main, "ZYTE_API_KEY", "")
    # Build LLM mock inline (fixtures cannot be called directly)
    llm = MagicMock()
    chain = MagicMock()
    chain.invoke.return_value = URLS_JSON_STR
    llm.__or__.return_value = chain
    with patch("main.get_llm", return_value=llm):
        response = client.post("/generate-agent-lesson", json={"topic": "Foo"})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_generate_agent_appwrite_failure_returns_500(mock_llm, zyte_mock, appwrite_db):
    """Appwrite create_document failure -> 500."""
    llm = mock_llm([URLS_JSON_STR, LESSON_JSON_STR])
    appwrite_db.create_document.side_effect = Exception("Appwrite is down")
    zyte_patcher, _ = zyte_mock([_json_response(200, {})])

    with patch("main.get_llm", return_value=llm), zyte_patcher:
        response = client.post("/generate-agent-lesson", json={"topic": "Foo"})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_list_lessons_success(appwrite_db):
    appwrite_db.list_documents.return_value = {
        "documents": [
            {
                "$id": "lesson-1",
                "title": "T1",
                "category": "Cat",
                "status": "draft",
                "$createdAt": "2024-01-01T00:00:00Z",
            },
            {
                "$id": "lesson-2",
                "title": "T2",
                "category": "Cat",
                "status": "published",
                "$createdAt": "2024-01-02T00:00:00Z",
            },
        ]
    }

    response = client.get("/lessons")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == "lesson-1"
    assert data[0]["status"] == "draft"
    assert data[1]["id"] == "lesson-2"

    appwrite_db.list_documents.assert_called_once_with(
        database_id="chemvibe",
        collection_id="lessons",
        queries=[],
    )


def test_list_lessons_with_status_filter(appwrite_db):
    appwrite_db.list_documents.return_value = {"documents": []}

    response = client.get("/lessons?status_filter=draft")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []

    kwargs = appwrite_db.list_documents.call_args.kwargs
    # AppwriteQuery.equal() returns a JSON string; compare by value
    assert kwargs["queries"] == ['{"method":"equal","attribute":"status","values":["draft"]}']


def test_list_lessons_appwrite_not_configured(monkeypatch):
    monkeypatch.setattr(main, "APPWRITE_PROJECT_ID", "")
    response = client.get("/lessons")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_list_lessons_appwrite_error(appwrite_db):
    appwrite_db.list_documents.side_effect = Exception("Appwrite is down")
    response = client.get("/lessons")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_list_drafts_uses_draft_filter(appwrite_db):
    appwrite_db.list_documents.return_value = {"documents": []}

    response = client.get("/lessons/drafts")
    assert response.status_code == status.HTTP_200_OK

    kwargs = appwrite_db.list_documents.call_args.kwargs
    assert kwargs["queries"] == ['{"method":"equal","attribute":"status","values":["draft"]}']


def test_get_lesson_success(appwrite_db):
    doc = {
        "$id": "lesson-1",
        "title": "T",
        "category": "C",
        "status": "draft",
        "theory": "...",
        "challenge": {},
        "topic": "x",
        "$createdAt": "2024-01-01T00:00:00Z",
    }
    appwrite_db.get_document.return_value = doc

    response = client.get("/lessons/lesson-1")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["$id"] == "lesson-1"

    appwrite_db.get_document.assert_called_once_with(
        database_id="chemvibe",
        collection_id="lessons",
        document_id="lesson-1",
    )


def test_get_lesson_not_found(appwrite_db):
    appwrite_db.get_document.side_effect = Exception("not found")
    response = client.get("/lessons/does-not-exist")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_lesson_appwrite_not_configured(monkeypatch):
    monkeypatch.setattr(main, "APPWRITE_API_KEY", "")
    response = client.get("/lessons/lesson-1")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_publish_lesson_success(appwrite_db):
    appwrite_db.update_document.return_value = {"$id": "lesson-1", "status": "published"}

    response = client.post("/lessons/lesson-1/publish")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == "lesson-1"
    assert data["status"] == "published"
    assert data["message"] == "Lektion veröffentlicht"

    appwrite_db.update_document.assert_called_once()
    kwargs = appwrite_db.update_document.call_args.kwargs
    assert kwargs["database_id"] == "chemvibe"
    assert kwargs["collection_id"] == "lessons"
    assert kwargs["document_id"] == "lesson-1"
    assert kwargs["data"]["status"] == "published"
    assert "updated_at" in kwargs["data"]


def test_publish_lesson_not_found(appwrite_db):
    appwrite_db.update_document.side_effect = Exception("not found")
    response = client.post("/lessons/does-not-exist/publish")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_publish_lesson_appwrite_not_configured(monkeypatch):
    monkeypatch.setattr(main, "APPWRITE_PROJECT_ID", "")
    response = client.post("/lessons/lesson-1/publish")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_ingest_scraped_data_endpoint():
    """POST /api/scraped-data accepts spider items and returns success."""
    response = client.post(
        "/api/scraped-data",
        json={
            "spider": "chemistry",
            "items": [{"title": "Nukleophile Substitution", "url": "https://example.com"}],
            "scraped_at": "2026-10-28T19:32:25Z",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "ok"
    assert data["spider"] == "chemistry"
    assert data["items_received"] == 1


# ---------------------------------------------------------------------------
# 2. Workflow unit tests (mocked external calls)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_plan_scraping_valid_json_returns_urls(mock_llm):
    llm = mock_llm(URLS_JSON_STR)
    with patch("main.get_llm", return_value=llm):
        urls = await plan_scraping("Nukleophile Substitution")
    assert urls == ["https://en.wikipedia.org/wiki/Test", "https://example.com"]


@pytest.mark.asyncio
async def test_plan_scraping_invalid_json_falls_back_to_regex(mock_llm):
    llm = mock_llm("Nutze https://en.wikipedia.org/wiki/Foo oder https://example.com/bar")
    with patch("main.get_llm", return_value=llm):
        urls = await plan_scraping("Foo")
    assert "https://en.wikipedia.org/wiki/Foo" in urls
    assert "https://example.com/bar" in urls


@pytest.mark.asyncio
async def test_plan_scraping_empty_list(mock_llm):
    llm = mock_llm("[]")
    with patch("main.get_llm", return_value=llm):
        urls = await plan_scraping("Foo")
    assert urls == []


@pytest.mark.asyncio
async def test_plan_scraping_no_urls_uses_wikipedia_fallback(mock_llm):
    llm = mock_llm("Keine passenden URLs gefunden.")
    with patch("main.get_llm", return_value=llm):
        urls = await plan_scraping("Nukleophile Substitution")
    assert urls == ["https://en.wikipedia.org/wiki/Nukleophile_Substitution"]


@pytest.mark.asyncio
async def test_plan_scraping_llm_failure_raises_502():
    llm = MagicMock()
    llm.__or__.side_effect = Exception("LLM connection refused")
    with patch("main.get_llm", return_value=llm):
        with pytest.raises(HTTPException) as exc:
            await plan_scraping("Foo")
    assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY


@pytest.mark.asyncio
async def test_fetch_with_zyte_success_200(zyte_mock):
    response = _json_response(200, {"extract": "Hydroxid greift an"}, "ok")
    patcher, _ = zyte_mock([response])
    with patcher:
        results = await fetch_with_zyte(["https://example.com"])

    assert len(results) == 1
    assert results[0]["url"] == "https://example.com"
    assert results[0]["status"] == "success"
    assert results[0]["data"] == {"extract": "Hydroxid greift an"}


@pytest.mark.asyncio
async def test_fetch_with_zyte_http_error_status(zyte_mock):
    response = _json_response(502, text="Bad Gateway")
    patcher, _ = zyte_mock([response])
    with patcher:
        results = await fetch_with_zyte(["https://example.com"])

    assert results[0]["status"] == "error"
    assert "502" in results[0]["error"]


@pytest.mark.asyncio
async def test_fetch_with_zyte_network_exception(zyte_mock):
    patcher, _ = zyte_mock([Exception("network unreachable")])
    with patcher:
        results = await fetch_with_zyte(["https://example.com"])

    assert results[0]["status"] == "error"
    assert "network unreachable" in results[0]["error"]


@pytest.mark.asyncio
async def test_fetch_with_zyte_partial_success(zyte_mock):
    """Some URLs succeed, others fail — both are recorded, no exception."""
    r1 = _json_response(200, {"extract": "ok"})
    r2 = _json_response(500, text="fail")
    patcher, _ = zyte_mock([r1, r2])
    with patcher:
        results = await fetch_with_zyte(["https://a.com", "https://b.com"])

    assert results[0]["status"] == "success"
    assert results[0]["url"] == "https://a.com"
    assert results[1]["status"] == "error"
    assert results[1]["url"] == "https://b.com"


@pytest.mark.asyncio
async def test_structure_lesson_valid_json(mock_llm):
    llm = mock_llm(LESSON_JSON_STR)
    raw_data = [
        {"url": "https://example.com", "status": "success", "data": {"text": "content"}}
    ]
    with patch("main.get_llm", return_value=llm):
        lesson = await structure_lesson("Nukleophile Substitution", raw_data, "medium")

    assert isinstance(lesson, LessonStructure)
    assert lesson.title == LESSON_JSON["title"]
    assert lesson.category == LESSON_JSON["category"]
    assert lesson.challenge.question == LESSON_JSON["challenge"]["question"]
    assert lesson.challenge.target_smiles == "CO"


@pytest.mark.asyncio
async def test_structure_lesson_invalid_json_raises_500(mock_llm):
    llm = mock_llm("Dies ist kein gueltiges JSON")
    with patch("main.get_llm", return_value=llm):
        with pytest.raises(HTTPException) as exc:
            await structure_lesson("Foo", [], "medium")
    assert exc.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.asyncio
async def test_structure_lesson_missing_fields_raises_validation_error(mock_llm):
    llm = mock_llm(json.dumps({"title": "Only title"}))
    with patch("main.get_llm", return_value=llm):
        with pytest.raises(ValidationError):
            await structure_lesson("Foo", [], "medium")


@pytest.mark.asyncio
async def test_structure_lesson_llm_failure_raises_502():
    llm = MagicMock()
    llm.__or__.side_effect = Exception("LLM down")
    with patch("main.get_llm", return_value=llm):
        with pytest.raises(HTTPException) as exc:
            await structure_lesson("Foo", [], "medium")
    assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY


def test_save_lesson_to_appwrite_returns_document_id(appwrite_db):
    appwrite_db.create_document.return_value = {"$id": "lesson-42"}
    lesson = LessonStructure(**LESSON_JSON)

    doc_id = save_lesson_to_appwrite(lesson, "Nukleophile Substitution")

    assert doc_id == "lesson-42"
    kwargs = appwrite_db.create_document.call_args.kwargs
    assert kwargs["database_id"] == "chemvibe"
    assert kwargs["collection_id"] == "lessons"
    assert "document_id" in kwargs
    assert kwargs["data"]["title"] == "Nukleophile Substitution (SN2)"
    assert kwargs["data"]["status"] == "draft"
    assert kwargs["data"]["topic"] == "Nukleophile Substitution"
    assert "created_at" in kwargs["data"]


def test_save_lesson_to_appwrite_failure_raises_500(appwrite_db):
    appwrite_db.create_document.side_effect = Exception("Appwrite is down")
    lesson = LessonStructure(**LESSON_JSON)
    with pytest.raises(HTTPException) as exc:
        save_lesson_to_appwrite(lesson, "topic")
    assert exc.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


# ---------------------------------------------------------------------------
# 3. Pydantic model validation
# ---------------------------------------------------------------------------
def test_generate_lesson_request_topic_is_required():
    with pytest.raises(ValidationError):
        GenerateLessonRequest()


def test_generate_lesson_request_difficulty_defaults_to_medium():
    req = GenerateLessonRequest(topic="Säure-Base-Reaktion")
    assert req.difficulty == "medium"


def test_generate_lesson_request_accepted_difficulty_values():
    for difficulty in ("easy", "medium", "hard"):
        req = GenerateLessonRequest(topic="Foo", difficulty=difficulty)
        assert req.difficulty == difficulty


def test_lesson_response_required_fields():
    base = {
        "id": "1",
        "title": "T",
        "category": "C",
        "status": "draft",
        "created_at": "2024-01-01T00:00:00Z",
    }
    LessonResponse(**base)  # all present -> OK
    for field in ("id", "title", "category", "status", "created_at"):
        data = dict(base)
        del data[field]
        with pytest.raises(ValidationError):
            LessonResponse(**data)


def test_challenge_required_and_optional_fields():
    challenge = Challenge(
        question="Baue Methanol.",
        difficulty="medium",
        palette_atoms=[{"type": "carbon", "symbol": "C", "name": "Kohlenstoff"}],
    )
    assert challenge.type == "molecule_builder"
    assert challenge.target_smiles is None
    assert challenge.target_atoms is None
    assert challenge.target_bonds is None

    with pytest.raises(ValidationError):
        Challenge()


def test_lesson_structure_required_fields():
    lesson = LessonStructure(**LESSON_JSON)
    assert lesson.title == LESSON_JSON["title"]
    assert lesson.challenge.question == LESSON_JSON["challenge"]["question"]

    incomplete = {k: v for k, v in LESSON_JSON.items() if k != "challenge"}
    with pytest.raises(ValidationError):
        LessonStructure(**incomplete)


def test_scraped_data_request_model():
    req = ScrapedDataRequest(
        spider="chemistry",
        items=[{"title": "Test", "url": "https://example.com"}],
    )
    assert req.spider == "chemistry"
    assert len(req.items) == 1
    assert req.scraped_at is None


# ---------------------------------------------------------------------------
# 4. Environment configuration
# ---------------------------------------------------------------------------
def test_missing_llm_api_key_get_llm_raises_500(monkeypatch):
    monkeypatch.setattr(main, "LLM_API_KEY", "")
    with pytest.raises(HTTPException) as exc:
        get_llm()
    assert exc.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.asyncio
async def test_missing_zyte_api_key_fetch_with_zyte_raises_500(monkeypatch):
    monkeypatch.setattr(main, "ZYTE_API_KEY", "")
    with pytest.raises(HTTPException) as exc:
        await fetch_with_zyte(["https://example.com"])
    assert exc.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_missing_appwrite_credentials_endpoints_raise_500(monkeypatch):
    monkeypatch.setattr(main, "APPWRITE_PROJECT_ID", "")
    assert client.get("/lessons").status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert client.get("/lessons/1").status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert client.post("/lessons/1/publish").status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


# ---------------------------------------------------------------------------
# 5. Edge cases
# ---------------------------------------------------------------------------
def test_very_long_topic(mock_llm, zyte_mock, appwrite_db):
    """A very long topic is accepted and processed."""
    llm = mock_llm([URLS_JSON_STR, LESSON_JSON_STR])
    appwrite_db.create_document.return_value = {"$id": "lesson-long"}
    zyte_patcher, _ = zyte_mock([_json_response(200, {})])

    with patch("main.get_llm", return_value=llm), zyte_patcher:
        response = client.post("/generate-agent-lesson", json={"topic": "A" * 5000})

    assert response.status_code == status.HTTP_201_CREATED


def test_special_characters_in_topic(mock_llm, zyte_mock, appwrite_db):
    """Special / unicode characters in the topic are accepted."""
    llm = mock_llm([URLS_JSON_STR, LESSON_JSON_STR])
    appwrite_db.create_document.return_value = {"$id": "lesson-special"}
    zyte_patcher, _ = zyte_mock([_json_response(200, {})])

    topic = "C++ (Organische Chemie) & Co.: ÄÖÜ ß €"
    with patch("main.get_llm", return_value=llm), zyte_patcher:
        response = client.post("/generate-agent-lesson", json={"topic": topic})

    assert response.status_code == status.HTTP_201_CREATED


def test_concurrent_lesson_generation(mock_llm, zyte_mock, appwrite_db):
    """Multiple concurrent lesson-generation requests all succeed.

    Uses ``return_value`` (not ``side_effect``) on the LLM mock so every
    concurrent call gets the same canned response without exhausting a list.
    """
    llm = mock_llm(LESSON_JSON_STR)
    appwrite_db.create_document.return_value = {"$id": "lesson-concurrent"}
    # return_value so post() returns the same response for every call
    zyte_patcher, mock_client = zyte_mock([_json_response(200, {})])
    mock_client.post.return_value = _json_response(200, {})

    with patch("main.get_llm", return_value=llm), zyte_patcher:

        def call(index):
            return client.post(
                "/generate-agent-lesson", json={"topic": f"Topic {index}"}
            )

        with ThreadPoolExecutor(max_workers=5) as pool:
            responses = list(pool.map(call, range(5)))

    for response in responses:
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "draft"
