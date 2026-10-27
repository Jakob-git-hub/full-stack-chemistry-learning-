"""
ChemVibe Backend – Gamified Organic Chemistry Learning Platform
FastAPI + Appwrite + Zyte + LLM

Architecture:
- FastAPI application with async endpoints
- Zyte API for web scraping educational chemistry content
- LLM (OpenAI-compatible) for generating structured lessons
- Appwrite Python SDK for database persistence with draft/publish workflow

All API keys and endpoints are loaded from environment variables via os.getenv.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query as AppwriteQuery
import httpx

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
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ChemVibe Backend",
    description="Gamified organic chemistry learning platform backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class LessonGenerateRequest(BaseModel):
    topic: Optional[str] = Field(None, description="Optional topic to generate a lesson about")
    source_url: Optional[str] = Field(None, description="Optional URL to scrape content from")


class LessonRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200, description="Topic requested by admin")
    priority: int = Field(1, ge=1, le=5, description="Priority of the request (1=lowest, 5=highest)")


class LessonResponse(BaseModel):
    id: str
    title: str
    status: str
    created_at: str


class LessonDetailResponse(BaseModel):
    id: str
    title: str
    category: str
    icon: str
    order: int
    reading_time: int
    description: str
    content: str
    steps: List[Dict[str, Any]]
    status: str
    created_at: str
    updated_at: str


class PublishResponse(BaseModel):
    message: str
    id: str
    status: str


# ---------------------------------------------------------------------------
# Appwrite client helper
# ---------------------------------------------------------------------------
def get_appwrite_client() -> Client:
    """Initialize and return an authenticated Appwrite client."""
    client = Client()
    client.set_endpoint(APPWRITE_ENDPOINT)
    client.set_project(APPWRITE_PROJECT_ID)
    client.set_key(APPWRITE_API_KEY)
    return client


def get_databases() -> Databases:
    """Return an authenticated Databases service instance."""
    return Databases(get_appwrite_client())


# ---------------------------------------------------------------------------
# Zyte scraping
# ---------------------------------------------------------------------------
async def scrape_with_zyte(url: str) -> Dict[str, Any]:
    """
    Scrape a URL using Zyte API and return extracted content.

    Raises HTTPException if Zyte API key is missing or the request fails.
    """
    if not ZYTE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Zyte API key not configured. Set ZYTE_API_KEY environment variable.",
        )

    payload = {
        "url": url,
        "browserHtml": True,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                ZYTE_API_URL,
                auth=(ZYTE_API_KEY, ""),
                json=payload,
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Zyte API request failed: {str(exc)}",
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
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
    Use an LLM (OpenAI-compatible chat API) to generate a structured organic
    chemistry lesson with flexible task types.

    Returns a dictionary matching the lesson JSON schema.
    """
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LLM API key not configured. Set LLM_API_KEY environment variable.",
        )

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
        try:
            response = await client.post(LLM_API_URL, json=payload, headers=headers)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"LLM API request failed: {str(exc)}",
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM API error: {response.status_code} {response.text}",
        )

    result = response.json()
    content = result["choices"][0]["message"]["content"]

    # Parse JSON from LLM response (handle markdown code fences)
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        lesson_data = json.loads(content.strip())
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse LLM response as JSON: {str(exc)}",
        )

    # Validate required fields
    required_fields = ["title", "steps"]
    for field in required_fields:
        if field not in lesson_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LLM response missing required field: {field}",
            )

    return lesson_data


# ---------------------------------------------------------------------------
# Appwrite helpers
# ---------------------------------------------------------------------------
def save_lesson_to_appwrite(lesson_data: Dict[str, Any], status_value: str = "draft") -> str:
    """
    Save a lesson to Appwrite with the given status. Returns the document ID.

    The lesson is stored with status='draft' by default, meaning it will not
    appear in the public learning path until an admin publishes it.
    """
    databases = get_databases()

    now = datetime.now(timezone.utc).isoformat()

    document = {
        "title": lesson_data.get("title", "Unbenannte Lektion"),
        "category": lesson_data.get("category", "Organische Chemie"),
        "icon": lesson_data.get("icon", "🧪"),
        "order": lesson_data.get("order", 1),
        "reading_time": lesson_data.get("reading_time", 5),
        "description": lesson_data.get("description", ""),
        "content": lesson_data.get("content", ""),
        "steps": lesson_data.get("steps", []),
        "status": status_value,
        "created_at": now,
        "updated_at": now,
    }

    result = databases.create_document(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        document_id=ID.unique(),
        data=document,
    )
    return result["$id"]


def list_lessons(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List lessons from Appwrite, optionally filtered by status.
    Results are ordered by the 'order' field ascending.
    """
    databases = get_databases()

    queries: List[Any] = [AppwriteQuery.orderAsc("order")]
    if status_filter:
        queries.append(AppwriteQuery.equal("status", status_filter))

    result = databases.list_documents(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        queries=queries,
    )
    return result["documents"]


def get_lesson_by_id(lesson_id: str) -> Dict[str, Any]:
    """
    Retrieve a single lesson document from Appwrite by its ID.
    Raises HTTPException 404 if not found.
    """
    databases = get_databases()
    try:
        result = databases.get_document(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=APPWRITE_COLLECTION_ID,
            document_id=lesson_id,
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson not found: {str(exc)}",
        )


def publish_lesson(lesson_id: str) -> Dict[str, Any]:
    """
    Publish a draft lesson by setting status to 'published'.
    Returns the updated document.
    """
    databases = get_databases()
    try:
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
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to publish lesson: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# Background task: full generation pipeline
# ---------------------------------------------------------------------------
async def generate_and_save_lesson(topic: str, source_url: Optional[str] = None) -> str:
    """
    Full pipeline: scrape (if URL provided), generate via LLM, save as draft to Appwrite.

    Returns the Appwrite document ID of the created draft lesson.
    """
    source_content: Optional[str] = None

    if source_url:
        try:
            scraped = await scrape_with_zyte(source_url)
            source_content = (
                scraped.get("browserHtml")
                or scraped.get("content")
                or scraped.get("text")
                or ""
            )
        except Exception as exc:
            # Log the error but continue – we can still generate from topic alone
            print(f"[WARN] Zyte scrape failed for {source_url}: {exc}")

    lesson_data = await generate_lesson_with_llm(topic, source_content)
    doc_id = save_lesson_to_appwrite(lesson_data, status_value="draft")
    print(f"[INFO] Lesson saved as draft: {doc_id} – topic: {topic}")
    return doc_id


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["General"])
async def root():
    """Health check and service information."""
    return {
        "service": "ChemVibe Backend",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "generate_lesson": "POST /generate-lesson",
            "request_lesson": "POST /request-lesson",
            "list_published": "GET /lessons",
            "list_drafts": "GET /lessons/drafts",
            "publish": "POST /lessons/{lesson_id}/publish",
            "get_lesson": "GET /lessons/{lesson_id}",
        },
    }


@app.get("/health", tags=["General"])
async def health():
    """Simple health check endpoint."""
    return {"status": "healthy"}


@app.post(
    "/generate-lesson",
    response_model=LessonResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Lessons"],
)
async def generate_lesson(
    request: LessonGenerateRequest, background_tasks: BackgroundTasks
):
    """
    Generate a new chemistry lesson.

    Workflow:
    1. Optionally scrape a URL via Zyte API
    2. Generate lesson content via LLM
    3. Save as 'draft' in Appwrite (not visible to students yet)

    The generation runs in the background. A placeholder document is created
    immediately so the client can poll for completion.
    """
    topic = request.topic or "Allgemeine Organische Chemie"

    # Create a placeholder document immediately
    databases = get_databases()
    now = datetime.now(timezone.utc).isoformat()
    placeholder = {
        "title": f"Generierung: {topic}",
        "category": "Organische Chemie",
        "icon": "⏳",
        "order": 9999,
        "reading_time": 0,
        "description": "Lektion wird im Hintergrund generiert…",
        "content": "",
        "steps": [],
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    result = databases.create_document(
        database_id=APPWRITE_DATABASE_ID,
        collection_id=APPWRITE_COLLECTION_ID,
        document_id=ID.unique(),
        data=placeholder,
    )

    # Start the actual generation in the background
    background_tasks.add_task(generate_and_save_lesson, topic, request.source_url)

    return LessonResponse(
        id=result["$id"],
        title=placeholder["title"],
        status="draft",
        created_at=now,
    )


@app.post("/request-lesson", tags=["Lessons"])
async def request_lesson(
    request: LessonRequest, background_tasks: BackgroundTasks
):
    """
    Admin requests a new specific topic.

    The lesson is generated as a draft and queued for admin review.
    Priority is stored as metadata (currently logged; can be extended
    with a dedicated requests collection).
    """
    background_tasks.add_task(generate_and_save_lesson, request.topic, None)

    return {
        "message": f"Lektionsanfrage für '{request.topic}' wurde in die Warteschlange gestellt.",
        "topic": request.topic,
        "priority": request.priority,
        "status": "queued",
    }


@app.get(
    "/lessons",
    response_model=List[LessonResponse],
    tags=["Lessons"],
)
async def get_lessons():
    """
    List all published lessons (visible to students in the learning path).
    Ordered by the 'order' field.
    """
    docs = list_lessons(status_filter="published")
    return [
        LessonResponse(
            id=d["$id"],
            title=d.get("title", ""),
            status=d.get("status", "draft"),
            created_at=d.get("created_at", ""),
        )
        for d in docs
    ]


@app.get(
    "/lessons/drafts",
    response_model=List[LessonResponse],
    tags=["Lessons"],
)
async def get_drafts():
    """
    List all draft lessons (for admin review before publishing).
    Ordered by the 'order' field.
    """
    docs = list_lessons(status_filter="draft")
    return [
        LessonResponse(
            id=d["$id"],
            title=d.get("title", ""),
            status=d.get("status", "draft"),
            created_at=d.get("created_at", ""),
        )
        for d in docs
    ]


@app.post(
    "/lessons/{lesson_id}/publish",
    response_model=PublishResponse,
    tags=["Lessons"],
)
async def publish_lesson_endpoint(lesson_id: str):
    """
    Publish a draft lesson, making it visible to students.

    Sets status to 'published' in Appwrite.
    """
    result = publish_lesson(lesson_id)
    return PublishResponse(
        message="Lesson published successfully",
        id=lesson_id,
        status="published",
    )


@app.get(
    "/lessons/{lesson_id}",
    response_model=LessonDetailResponse,
    tags=["Lessons"],
)
async def get_lesson(lesson_id: str):
    """
    Get a single lesson by ID, including full content and steps.

    Returns the complete lesson document from Appwrite.
    """
    doc = get_lesson_by_id(lesson_id)

    return LessonDetailResponse(
        id=doc["$id"],
        title=doc.get("title", ""),
        category=doc.get("category", "Organische Chemie"),
        icon=doc.get("icon", "🧪"),
        order=doc.get("order", 1),
        reading_time=doc.get("reading_time", 5),
        description=doc.get("description", ""),
        content=doc.get("content", ""),
        steps=doc.get("steps", []),
        status=doc.get("status", "draft"),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
    )


# ---------------------------------------------------------------------------
# Application startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    """Validate configuration on startup."""
    missing = []
    if not APPWRITE_PROJECT_ID:
        missing.append("APPWRITE_PROJECT_ID")
    if not APPWRITE_API_KEY:
        missing.append("APPWRITE_API_KEY")
    if not ZYTE_API_KEY:
        missing.append("ZYTE_API_KEY")
    if not LLM_API_KEY:
        missing.append("LLM_API_KEY")

    if missing:
        print(
            f"[WARN] Missing environment variables: {', '.join(missing)}. "
            "Some features will be unavailable until configured."
        )
    else:
        print("[INFO] All required environment variables are configured.")
