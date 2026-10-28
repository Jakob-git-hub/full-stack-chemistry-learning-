"""
ChemVibe Backend Tests
"""
import os
import sys
import json
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

# Set env vars before importing app
os.environ.setdefault("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
os.environ.setdefault("APPWRITE_PROJECT_ID", "test-project")
os.environ.setdefault("APPWRITE_API_KEY", "test-key")
os.environ.setdefault("APPWRITE_DATABASE_ID", "chemvibe")
os.environ.setdefault("APPWRITE_COLLECTION_ID", "lessons")
os.environ.setdefault("ZYTE_API_KEY", "test-zyte-key")
os.environ.setdefault("LLM_API_KEY", "test-llm-key")
os.environ.setdefault("LLM_MODEL", "gpt-4o-mini")

from main import app  # noqa: E402

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ChemVibe Backend"
    assert "endpoints" in data


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_generate_agent_lesson_missing_topic():
    response = client.post("/generate-agent-lesson", json={"topic": ""})
    assert response.status_code == 400


def test_list_lessons_without_appwrite():
    # Appwrite not configured in test env, should return 500
    response = client.get("/lessons")
    assert response.status_code == 500


def test_publish_lesson_not_found():
    response = client.post("/lessons/nonexistent-id/publish")
    assert response.status_code == 404


def test_scraped_data_endpoint():
    response = client.post(
        "/api/scraped-data",
        json={
            "spider": "chemistry",
            "items": [{"title": "Nukleophile Substitution", "url": "https://example.com"}],
            "scraped_at": "2026-10-28T19:32:25Z",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"
    assert data["items_received"] == 1


def test_scraped_data_alias_endpoint():
    response = client.post(
        "/scraped-data",
        json={"spider": "chemistry", "items": [], "scraped_at": None},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"
    assert data["items_received"] == 0