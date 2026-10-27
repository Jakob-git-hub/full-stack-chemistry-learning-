"""
ChemVibe Backend – Gamified Organic Chemistry Learning Platform
FastAPI + Appwrite + Zyte + LangChain (LLM)

Endpoints:
  POST /generate-lesson  – Scrape via Zyte, generate lesson via LLM, save as draft to Appwrite
  POST /request-lesson   – Admin requests a new specific topic (queues generation)
  GET  /lessons          – List published lessons (status == "published")
  GET  /lessons/drafts   – List draft lessons for admin review
  POST /lessons/{id}/publish – Publish a draft lesson
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query as AppwriteQuery

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------
APPWRITE_ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
APPWRITE_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID", "")
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY", "")
APPWRITE_DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID", "chemvibe")
APPWRITE_COLLECTION_ID = os.getenv("APPWRITE_COLLECTION_ID", "lessons")

ZYTE_API_KEY = os.getenv("ZYTE_API_KEY", "")
ZYTE_API_URL = os.getenv("ZYTE_API_URL", "https://api.zyte.com/v1/extract")

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="ChemVibe Backend", version="1.0.0")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class LessonGenerateRequest(BaseModel):
    topic: Optional[str] = Field(None, description="Optional topic to generate a lesson about")
    source_url: Optional[str] = Field(None, description="Optional URL to scrape content from")


class LessonRequest(BaseModel):
    topic: str = Field(..., description="Topic requested by admin")
    priority: int = Field(1, ge=1, le=5, description="Priority of the request")


class LessonResponse(BaseModel):
    id: str
    title: str
    status: str
    created_at: str


# ---------------------------------------------------------------------------
# Appwrite client helper
# ---------------------------------------------------------------------------
def get_appwrite_client() -> Client:
    client = Client()
    client.set_endpoint(APPWRITE_ENDPOINT)
    client.set_project(APPWRITE_PROJECT_ID)
    client.set_key(APPWRITE_API_KEY)
    return client


def get_databases() -> Databases:
    return Databases(get_appwrite_client())


# ---------------------------------------------------------------------------
# Zyte scraping
# ---------------------------------------------------------------------------
async def scrape_with_zyte(url: str) -> Dict[str, Any]:
    """
    Scrape a URL using Zyte API and return extracted content.
    """
    if not ZYTE_API_KEY:
        raise HTTPException(status_code=500, detail="Zyte API key not configured")

    import httpx

    payload = {
        "url": url,
        "browserHtml": True,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            ZYTE_API_URL,
            auth=(ZYTE_API_KEY, ""),
            json=payload,
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Zyte API error: {response.status_code} {response.text}",
            )
        return response.json()


# ---------------------------------------------------------------------------
# LLM lesson generation
# ---------------------------------------------------------------------------
async def generate_lesson_with_llm(
    topic: str, source_content: Optional[str] = None
) -> Dict[str, Any]:
    """
    Use an LLM (via LangChain-compatible chat API) to generate a structured
    organic chemistry lesson with flexible task types.
    """
    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    import httpx

    system_prompt = """
Du bist ein erfahrener Chemie-Didaktik-Experte. Erstelle eine didaktisch wertvolle,
gamifizierte Lektion über Organische Chemie für Schüler.

Die Lektion muss im folgenden JSON-Format zurückgegeben werden (kein Markdown, nur reines JSON):

{
  "title": "Titel der Lektion",
  "category": "Organische Chemie",
  "icon": "🧪",
  "order": 1,
  "reading_time": 8,
  "description": "Kurze Beschreibung der Lektion",
  "content": "Ausführlicher Lektionstext in HTML",
  "steps": [
    {
      "type": "info",
      "info": {
        "title": "Wusstest du?",
        "content": "Interessanter Fakt oder Einführung"
      }
    },
    {
      "type": "multiple_choice",
      "question": "Frage?",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0
    },
    {
      "type": "drag_drop",
      "question": "Ordne zu:",
      "items": [
        {"label": "Begriff 1", "value": "wert1"},
        {"label": "Begriff 2", "value": "wert2"}
      ],
      "targets": [
        {"id": "t1", "label": "Ziel 1", "correctValue": "wert1"},
        {"id": "t2", "label": "Ziel 2", "correctValue": "wert2"}
      ]
    },
    {
      "type": "matching",
      "question": "Ordne die Paare:",
      "pairs": [
        {"left": "Ethanol", "right": "C₂H₅OH"},
        {"left": "Methanol", "right": "CH₃OH"}
      ]
    },
    {
      "type": "molecule",
      "question": "Welches Molekül ist das?",
      "atoms": [
        {"type": "carbon", "symbol": "C"},
        {"type": "hydrogen", "symbol": "H"}
      ],
      "options": ["CH₄", "C₂H₆", "C₃H₈"],
      "correctAnswerIndex": 0
    }
  ]
}

Wichtige Regeln:
- Die Schritte müssen abwechselnd Info-Häppchen und interaktive Challenges sein.
- Nutze verschiedene Aufgabentypen (multiple_choice, drag_drop, matching, molecule).
- Der Inhalt muss didaktisch wertvoll und schülerfreundlich sein.
- Gib NUR reines JSON zurück, keine Erklärungen drumherum.
"""

    user_prompt = f"Thema: {topic}"
    if source_content:
        user_prompt += f"\n\nQuelleninhalt:\n{source_content[:4000]}"

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 3000,
    }

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(LLM_API_URL, json=payload, headers=headers)
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"LLM API error: {response.status_code} {response.text}",
            )
        result = response.json()
        content = result["choices"][0]["message"]["content"]

    # Parse JSON from LLM response
    try:
        # Try to extract JSON if wrapped in markdown
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        lesson_data = json.loads(content.strip())
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse LLM response as JSON: {str(e)}",
        )

    return lesson_data


# ---------------------------------------------------------------------------
# Appwrite helpers
# ---------------------------------------------------------------------------
def save_lesson_to_appwrite(lesson_data: Dict[str, Any], status: str = "draft") -> str:
    """
    Save a lesson to Appwrite with the given status. Returns the document ID.
    """
    databases = get_databases()

    document = {
        "title": lesson_data.get("title", "Unbenannte Lektion"),
        "category": lesson_data.get("category", "Organische Chemie"),
        "icon": lesson_data.get("icon", "🧪"),
        "order": lesson_data.get("order", 1),
        "reading_time": lesson_data.get("reading_time", 5),
        "description": lesson_data.get("description", ""),
        "content": lesson_data.get("content", ""),
        "steps": lesson_data.get("steps", []),
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = databases.create_document(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        document_id=ID.unique(),
        data=document,
    )
    return result["$id"]


def list_lessons(status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List lessons from Appwrite, optionally filtered by status.
    """
    databases = get_databases()

    queries = [AppwriteQuery.orderAsc("order")]
    if status:
        queries.append(AppwriteQuery.equal("status", status))

    result = databases.list_documents(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        queries=queries,
    )
    return result["documents"]


def publish_lesson(lesson_id: str) -> Dict[str, Any]:
    """
    Publish a draft lesson by setting status to "published".
    """
    databases = get_databases()
    result = databases.update_document(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        document_id=lesson_id,
        data={
            "status": "published",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return result


# ---------------------------------------------------------------------------
# Background task: full generation pipeline
# ---------------------------------------------------------------------------
async def generate_and_save_lesson(topic: str, source_url: Optional[str] = None):
    """
    Full pipeline: scrape (if URL), generate via LLM, save as draft to Appwrite.
    """
    source_content = None
    if source_url:
        try:
            scraped = await scrape_with_zyte(source_url)
            source_content = scraped.get("browserHtml", "") or scraped.get("content", "")
        except Exception as e:
            # Log but continue – we can still generate from topic alone
            print(f"Zyte scrape failed: {e}")

    lesson_data = await generate_lesson_with_llm(topic, source_content)
    doc_id = save_lesson_to_appwrite(lesson_data, status="draft")
    print(f"Lesson saved as draft: {doc_id}")


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"service": "ChemVibe Backend", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/generate-lesson", response_model=LessonResponse)
async def generate_lesson(
    request: LessonGenerateRequest, background_tasks: BackgroundTasks
):
    """
    Generate a new chemistry lesson.
    - Optionally scrapes a URL via Zyte
    - Generates lesson content via LLM
    - Saves as 'draft' in Appwrite (not visible to students yet)
    """
    topic = request.topic or "Allgemeine Organische Chemie"

    # Run generation in background to avoid timeout
    background_tasks.add_task(generate_and_save_lesson, topic, request.source_url)

    # Return a placeholder; the actual document is created in the background
    # We create a minimal record immediately so the client can poll
    databases = get_databases()
    placeholder = {
        "title": f"Generierung: {topic}",
        "category": "Organische Chemie",
        "icon": "⏳",
        "order": 9999,
        "reading_time": 0,
        "description": "Lektion wird generiert…",
        "content": "",
        "steps": [],
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = databases.create_document(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        document_id=ID.unique(),
        data=placeholder,
    )

    return LessonResponse(
        id=result["$id"],
        title=placeholder["title"],
        status="draft",
        created_at=placeholder["created_at"],
    )


@app.post("/request-lesson")
async def request_lesson(request: LessonRequest, background_tasks: BackgroundTasks):
    """
    Admin requests a new specific topic. Queues lesson generation as draft.
    """
    background_tasks.add_task(generate_and_save_lesson, request.topic, None)
    return {
        "message": f"Lektionsanfrage für '{request.topic}' wurde in die Warteschlange gestellt.",
        "priority": request.priority,
        "status": "queued",
    }


@app.get("/lessons", response_model=List[LessonResponse])
async def get_lessons():
    """
    List all published lessons (visible to students).
    """
    docs = list_lessons(status="published")
    return [
        LessonResponse(
            id=d["$id"],
            title=d.get("title", ""),
            status=d.get("status", "draft"),
            created_at=d.get("created_at", ""),
        )
        for d in docs
    ]


@app.get("/lessons/drafts", response_model=List[LessonResponse])
async def get_drafts():
    """
    List all draft lessons (for admin review).
    """
    docs = list_lessons(status="draft")
    return [
        LessonResponse(
            id=d["$id"],
            title=d.get("title", ""),
            status=d.get("status", "draft"),
            created_at=d.get("created_at", ""),
        )
        for d in docs
    ]


@app.post("/lessons/{lesson_id}/publish")
async def publish_lesson_endpoint(lesson_id: str):
    """
    Publish a draft lesson, making it visible to students.
    """
    try:
        result = publish_lesson(lesson_id)
        return {"message": "Lesson published", "id": lesson_id}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    """
    Get a single lesson by ID (full content including steps).
    """
    databases = get_databases()
    try:
        result = databases.get_document(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=APPWRITE_COLLECTION_ID,
            document_id=lesson_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
