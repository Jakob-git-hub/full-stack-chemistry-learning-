"""
ChemVibe Backend – Agentenbasierter Lektionen- & Aufgaben-Generator
FastAPI + LangChain + Zyte + Appwrite

Architektur (Agenten-Workflow):
1. LangChain LLM plant das Scraping (welche URLs für ein Thema)
2. Zyte API holt die Rohdaten
3. LangChain LLM strukturiert die Rohdaten in eine JSON-Lektion
   (title, category, theory, challenge mit Molekül-Puzzle für den React-Baukasten)
4. Appwrite Python SDK speichert die Lektion als status: "draft"

Alle API-Schlüssel und Konfigurationen über os.getenv().
"""

import os
import json
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query as AppwriteQuery
import httpx

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser

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
LLM_API_URL = os.getenv("LLM_API_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ChemVibe Backend",
    description="Agentenbasierter Lektionen- und Aufgaben-Generator mit LangChain",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# LangChain LLM instance
# ---------------------------------------------------------------------------
def get_llm(temperature: float = 0.7) -> ChatOpenAI:
    """Erstellt eine LangChain ChatOpenAI Instanz."""
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LLM_API_KEY ist nicht konfiguriert",
        )
    return ChatOpenAI(
        model=LLM_MODEL,
        temperature=temperature,
        openai_api_key=LLM_API_KEY,
        base_url=LLM_API_URL,
    )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class GenerateLessonRequest(BaseModel):
    topic: str = Field(..., description="Chemie-Thema, z.B. 'Nukleophile Substitution'")
    difficulty: Optional[str] = Field("medium", description="easy | medium | hard")


class LessonResponse(BaseModel):
    id: str
    title: str
    category: str
    status: str
    created_at: str


class Challenge(BaseModel):
    type: str = "molecule_builder"
    question: str
    difficulty: str
    target_smiles: Optional[str] = None
    target_atoms: Optional[List[Dict[str, Any]]] = None
    target_bonds: Optional[int] = None
    preplaced_atoms: Optional[List[Dict[str, Any]]] = None
    palette_atoms: List[Dict[str, str]]


class LessonStructure(BaseModel):
    title: str
    category: str
    theory: str
    challenge: Challenge


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
# Schritt 1: LangChain LLM plant das Scraping
# ---------------------------------------------------------------------------
async def plan_scraping(topic: str) -> List[str]:
    """
    Das LangChain LLM entscheidet, welche URLs über Zyte abgerufen werden sollen.
    Gibt eine Liste von URLs zurück.
    """
    llm = get_llm(temperature=0.3)

    system_prompt = """
Du bist ein erfahrener Chemie-Rechercheur. Gegeben ein Thema aus der Organischen Chemie,
entscheide du, welche Webseiten (URLs) am besten geeignet sind, um verlässliche,
strukturierte Informationen zu diesem Thema zu sammeln.

Antworte ausschließlich mit einem JSON-Array von URL-Strings, z.B.:
["https://en.wikipedia.org/wiki/Nucleophilic_substitution", "https://www.masterorganicchemistry.com/2017/12/04/sn2-reactions/"]

Wähle seriöse Bildungsquellen (Wikipedia, MasterOrganicChemistry, ChemLibreTexts, university-Webseiten).
Keine Erklärungen, kein Markdown, nur das JSON-Array.
""".strip()

    user_prompt = f"Thema: {topic}"

    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        chain = llm | StrOutputParser()
        content = chain.invoke(messages)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LangChain LLM-Fehler bei der Planung: {str(exc)}",
        )

    # JSON-Array aus der Antwort extrahieren
    try:
        urls = json.loads(content)
        if isinstance(urls, list) and all(isinstance(u, str) for u in urls):
            return urls
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: URLs aus dem Text extrahieren
    urls = re.findall(r'https?://[^\s"\']+', content)
    if urls:
        return urls

    # Letzter Fallback: Wikipedia
    return [f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}"]


# ---------------------------------------------------------------------------
# Schritt 2: Zyte Daten holen (httpx, da LangChain kein natives Zyte-Tool hat)
# ---------------------------------------------------------------------------
async def fetch_with_zyte(urls: List[str]) -> List[Dict[str, Any]]:
    """
    Ruft die Zyte-Extraktions-API für jede URL auf und gibt die Rohdaten zurück.
    """
    if not ZYTE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ZYTE_API_KEY ist nicht konfiguriert",
        )

    results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for url in urls:
            try:
                response = await client.post(
                    ZYTE_API_URL,
                    auth=(ZYTE_API_KEY, ""),
                    json={"url": url},
                )
                if response.status_code == 200:
                    data = response.json()
                    results.append(
                        {
                            "url": url,
                            "status": "success",
                            "data": data,
                        }
                    )
                else:
                    results.append(
                        {
                            "url": url,
                            "status": "error",
                            "error": f"Zyte returned {response.status_code}: {response.text}",
                        }
                    )
            except Exception as exc:
                results.append(
                    {
                        "url": url,
                        "status": "error",
                        "error": str(exc),
                    }
                )

    return results


# ---------------------------------------------------------------------------
# Schritt 3: LangChain LLM strukturiert in JSON-Lektion
# ---------------------------------------------------------------------------
async def structure_lesson(
    topic: str, raw_data: List[Dict[str, Any]], difficulty: str
) -> LessonStructure:
    """
    Das LangChain LLM analysiert die gescrapten Rohdaten und generiert eine
    strukturierte JSON-Lektion mit title, category, theory und challenge
    (Molekül-Puzzle für den React-Baukasten).
    """
    llm = get_llm(temperature=0.7)

    # Rohdaten für den Prompt zusammenfassen (gekürzt)
    raw_summary = ""
    for item in raw_data:
        if item["status"] == "success":
            raw_summary += f"\n--- Quelle: {item['url']} ---\n"
            data = item["data"]
            if isinstance(data, dict):
                for key in ("text", "content", "title", "description", "body"):
                    if key in data and isinstance(data[key], str):
                        raw_summary += f"{key}: {data[key][:1500]}\n"
            raw_summary += "\n"
        else:
            raw_summary += f"\n--- Quelle: {item['url']} (Fehler: {item.get('error', 'unbekannt')}) ---\n"

    system_prompt = """
Du bist ein erfahrener Chemie-Didaktik-Experte und erstellst Lektionen für eine
gamifizierte Lernplattform im Duolingo-Stil.

Gegeben sind gescrapten Rohdaten zu einem Chemie-Thema. Erstelle daraus eine
strukturierte Lektion im folgenden JSON-Format:

{
  "title": "Titel der Lektion",
  "category": "z.B. Reaktionsmechanismen",
  "theory": "Kurze, verständliche Erklärung im Duolingo-Stil (freundlich, motivierend, einfach)",
  "challenge": {
    "type": "molecule_builder",
    "question": "Die konkrete Fragestellung für den Nutzer (z.B. 'Baue das Produkt einer nukleophilen Substitution von Chlormethan mit Hydroxid-Ion')",
    "difficulty": "easy | medium | hard",
    "target_smiles": "SMILES-String der Zielstruktur, z.B. 'CO' für Methanol",
    "target_atoms": [
      {"type": "carbon", "x": 200, "y": 200},
      {"type": "oxygen", "x": 280, "y": 200},
      {"type": "hydrogen", "x": 140, "y": 160}
    ],
    "target_bonds": 5,
    "preplaced_atoms": [],
    "palette_atoms": [
      {"type": "carbon", "symbol": "C", "name": "Kohlenstoff"},
      {"type": "hydrogen", "symbol": "H", "name": "Wasserstoff"},
      {"type": "oxygen", "symbol": "O", "name": "Sauerstoff"}
    ]
  }
}

Wichtige Regeln:
- theory: Maximal 3-4 Sätze, einfach und motivierend geschrieben.
- challenge: Ein konkretes Molekül-Puzzle, das zum Thema passt.
- target_smiles: Ein valider SMILES-String für die Zielmolekül-Struktur.
- target_atoms: Liste von Atomen mit Typ und Position (x, y im Canvas-Koordinatensystem).
- target_bonds: Anzahl der Bindungen in der Zielstruktur.
- preplaced_atoms: Atome, die bereits auf dem Canvas platziert sind (bei easy/medium).
- palette_atoms: Verfügbare Atom-Typen für den Nutzer.
- Antworte AUSSCHLIESSLICH mit dem JSON-Objekt, kein Markdown, kein Erklärtext.
""".strip()

    user_prompt = f"""
Thema: {topic}
Schwierigkeitsgrad: {difficulty}

Gesammelte Rohdaten:
{raw_summary[:6000]}
""".strip()

    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        chain = llm | StrOutputParser()
        content = chain.invoke(messages)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LangChain LLM-Fehler bei der Strukturierung: {str(exc)}",
        )

    # JSON aus der LLM-Antwort extrahieren
    try:
        lesson_data = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                lesson_data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="LangChain LLM hat kein valides JSON zurückgegeben",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LangChain LLM hat kein valides JSON zurückgegeben",
            )

    return LessonStructure(**lesson_data)


# ---------------------------------------------------------------------------
# Schritt 4: In Appwrite speichern (als Draft)
# ---------------------------------------------------------------------------
def save_lesson_to_appwrite(lesson: LessonStructure, topic: str) -> str:
    """
    Speichert die generierte Lektion in der Appwrite-Collection `lessons`
    mit dem Status 'draft'. Gibt die Dokument-ID zurück.
    """
    if not APPWRITE_PROJECT_ID or not APPWRITE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Appwrite-Credentials sind nicht konfiguriert",
        )

    databases = get_databases()

    document = {
        "title": lesson.title,
        "category": lesson.category,
        "theory": lesson.theory,
        "challenge": lesson.challenge.model_dump(),
        "status": "draft",
        "topic": topic,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = databases.create_document(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=APPWRITE_COLLECTION_ID,
            document_id=ID.unique(),
            data=document,
        )
        return result["$id"]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Appwrite-Fehler beim Speichern: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# API-Endpunkte
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "service": "ChemVibe Backend",
        "version": "2.1.0",
        "workflow": "agent-based lesson generator (LangChain plan → Zyte → LangChain structure → Appwrite draft)",
        "endpoints": [
            "POST /generate-agent-lesson",
            "GET /lessons",
            "GET /lessons/drafts",
            "GET /lessons/{lesson_id}",
            "POST /lessons/{lesson_id}/publish",
        ],
    }


@app.post("/generate-agent-lesson", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def generate_agent_lesson(request: GenerateLessonRequest):
    """
    Agentenbasierter Lektions-Generator mit LangChain.

    Workflow:
    1. LangChain LLM plant das Scraping (welche URLs für das Thema?)
    2. Zyte holt die Rohdaten von den URLs
    3. LangChain LLM strukturiert die Rohdaten in eine JSON-Lektion
    4. Speichern in Appwrite als status: "draft"
    """
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Topic darf nicht leer sein",
        )

    # Schritt 1: LangChain LLM plant das Scraping
    urls = await plan_scraping(topic)

    # Schritt 2: Zyte holt die Daten
    raw_data = await fetch_with_zyte(urls)

    # Schritt 3: LangChain LLM strukturiert in JSON-Lektion
    lesson = await structure_lesson(topic, raw_data, request.difficulty)

    # Schritt 4: In Appwrite als Draft speichern
    doc_id = save_lesson_to_appwrite(lesson, topic)

    return LessonResponse(
        id=doc_id,
        title=lesson.title,
        category=lesson.category,
        status="draft",
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/lessons", response_model=List[LessonResponse])
async def list_lessons(status_filter: Optional[str] = None):
    """Listet alle Lektionen auf, optional gefiltert nach Status."""
    if not APPWRITE_PROJECT_ID or not APPWRITE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Appwrite-Credentials sind nicht konfiguriert",
        )

    databases = get_databases()

    queries = []
    if status_filter:
        queries.append(AppwriteQuery.equal("status", status_filter))

    try:
        result = databases.list_documents(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=APPWRITE_COLLECTION_ID,
            queries=queries,
        )
        lessons = []
        for doc in result["documents"]:
            lessons.append(
                LessonResponse(
                    id=doc["$id"],
                    title=doc.get("title", ""),
                    category=doc.get("category", ""),
                    status=doc.get("status", "draft"),
                    created_at=doc.get("$createdAt", ""),
                )
            )
        return lessons
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Appwrite-Fehler: {str(exc)}",
        )


@app.get("/lessons/drafts", response_model=List[LessonResponse])
async def list_drafts():
    """Listet alle Lektionen mit Status 'draft' (für das Admin-Dashboard)."""
    return await list_lessons(status_filter="draft")


@app.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    """Gibt eine einzelne Lektion mit allen Details zurück."""
    if not APPWRITE_PROJECT_ID or not APPWRITE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Appwrite-Credentials sind nicht konfiguriert",
        )

    databases = get_databases()

    try:
        doc = databases.get_document(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=APPWRITE_COLLECTION_ID,
            document_id=lesson_id,
        )
        return doc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lektion nicht gefunden: {str(exc)}",
        )


@app.post("/lessons/{lesson_id}/publish")
async def publish_lesson(lesson_id: str):
    """Setzt eine Lektion von 'draft' auf 'published' (öffentlich im Lernpfad)."""
    if not APPWRITE_PROJECT_ID or not APPWRITE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Appwrite-Credentials sind nicht konfiguriert",
        )

    databases = get_databases()

    try:
        doc = databases.update_document(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=APPWRITE_COLLECTION_ID,
            document_id=lesson_id,
            data={
                "status": "published",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        return {
            "id": doc["$id"],
            "status": doc["status"],
            "message": "Lektion veröffentlicht",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lektion nicht gefunden oder konnte nicht veröffentlicht werden: {str(exc)}",
        )


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "chemvibe-backend"}
