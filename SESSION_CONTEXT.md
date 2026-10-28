# ChemVibe – Projekt-Kontext für zukünftige Sessions

Dieses Dokument fasst den aktuellen Stand des Projekts zusammen, damit zukünftige Sessions nahtlos anknüpfen können.

---

## 1. Repository

- **GitHub:** `Jakob-git-hub/full-stack-chemistry-learning-`
- **Branches:** `main` (stabil), `feat/fix-white-screen-and-appwrite-demo-mode` (PR #1), `feat/zyte-spider` (PR #2)
- **Lokaler Pfad:** `/Users/jakobpaul/.copilot/repos/full-stack-chemistry-learning-`
- **Letzter Commit auf main:** `7f7a6b6` – Admin Dashboard für Draft-Management

---

## 2. Offene Pull Requests

| PR | Branch | Beschreibung | Status |
|----|--------|--------------|--------|
| #1 | `feat/fix-white-screen-and-appwrite-demo-mode` | Fix: Weißer Bildschirm beim App-Start + Appwrite Demo-Mode | Offen |
| #2 | `feat/zyte-spider` | feat: Zyte Scrapy Spider für Chemie-Inhalte | Offen |

**Empfehlung:** PR #1 zuerst mergen (behebt den weißen Bildschirm), dann PR #2 (Spider-Projekt).

---

## 3. Ordnerstruktur (aktuell)

```
full-stack-chemistry-learning-/
├── .github/workflows/ci-cd.yml      # GitHub Actions CI/CD (Lint + Test + Pages Deploy)
├── .gitignore
├── .eslintrc.json                   # ESLint-Konfiguration (Frontend)
├── .htmlhintrc                      # HTML-Lint-Konfiguration
├── .stylelintrc.json                # CSS-Lint-Konfiguration
├── .vscode/mcp.json                 # MCP Server Konfiguration (Appwrite)
├── .env.spider.example              # Zyte Spider Env-Variablen
├── README.md                        # Projektübersicht
├── SESSION_CONTEXT.md               # Diese Datei (Kontext für zukünftige Sessions)
├── tech-stack.md                    # Tech-Stack, Architektur, Coding-Richtlinien
├── SPIDER_README.md                 # Zyte Spider Dokumentation
├── scrapy.cfg                       # Scrapy Projekt-Konfig (Zyte Deploy, root-level)
├── spider-requirements.txt          # Python Deps für Zyte Spider
│
├── frontend/                        # React 18 + Vite + Tailwind CSS
│   ├── index.html                   # Einstiegspunkt mit <div id="root"></div>
│   ├── package.json                 # npm dependencies (react, vite, tailwind, appwrite, vitest, eslint)
│   ├── vite.config.js               # Vite Konfig (Port 5173, React Plugin)
│   ├── tailwind.config.js           # Tailwind CSS Konfig
│   ├── postcss.config.js            # PostCSS Konfig
│   ├── .env                         # Appwrite Config (PROJECT_ID, ENDPOINT hardcoded)
│   ├── .env.example                 # Env-Vorlage
│   ├── index.css                    # Tailwind Imports + Base Styles
│   ├── styles.css                   # Zusätzliche Custom Styles
│   ├── src/
│   │   ├── main.jsx                 # React 18 createRoot, Appwrite ping nach Mount
│   │   ├── App.jsx                  # Hauptkomponente: AuthProvider, UserProfileProvider, Views
│   │   ├── App.test.jsx             # Vitest Tests für App
│   │   ├── setupTests.js            # Test-Setup
│   │   ├── index.css                # (falls vorhanden)
│   │   ├── components/
│   │   │   ├── MoleculeBuilder.jsx  # SVG Molekül-Baukasten (Drag&Drop, Bonds, Validation)
│   │   │   ├── AdminDashboard.jsx   # Draft-Management (List, Detail, Publish, Delete)
│   │   │   ├── AuthForm.jsx         # Login/Register Modal
│   │   │   └── UserMenu.jsx         # Header User-Dropdown mit Stats
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Appwrite Account Auth (Session, Register, Login, Logout)
│   │   │   └── UserProfileContext.jsx # User Progress (XP, Streak, Hearts, Level)
│   │   └── services/
│   │       └── appwrite.js          # Appwrite Web SDK v10 Client + Fetch-Funktionen
│   └── public/                      # (falls vorhanden)
│
├── backend/                         # FastAPI + LangChain + Zyte + Appwrite (Heroku)
│   ├── main.py                      # FastAPI: Agent-Workflow (Plan→Scrape→Structure→Save Draft)
│   ├── requirements.txt             # fastapi, uvicorn, httpx, pydantic, appwrite, langchain
│   ├── Procfile                     # Heroku: uvicorn main:app
│   ├── .env.example                 # Env-Vorlage
│   └── test_main.py                 # Pytest Tests
│
└── chem_spider/                     # Scrapy Spider (Zyte Scrapy Cloud Deploy)
    ├── __init__.py
    ├── items.py                     # ChemistryPageItem, ChemistryTopicItem
    ├── middlewares.py               # Spider/Downloader Middlewares
    ├── pipelines.py                 # JSON-Save + POST zu Backend API
    ├── settings.py                  # Scrapy Settings (Throttling, Retry, Zyte-Config)
    ├── spiders/
    │   ├── __init__.py
    │   └── chemistry.py             # Haupt-Spider (URLs, Topic, Category, Difficulty)
    └── (scrapy.cfg ist im Repo-Root für Zyte Deploy)
```

---

## 4. Frontend (React 18 + Vite + Tailwind)

### Design
- Duolingo-Ästhetik: Pastellfarben (Amber, Rose, Indigo, Emerald), Glassmorphism, Inter Font
- Status-Leiste: ❤️ Leben (3), 🔥 Streak, ⚡ XP, Level
- Responsive Grid für Lektionen

### Views
1. **Skill Tree** (`view="skilltree"`) – Lernpfad mit Lektions-Karten, XP/Streak/Hearts-Anzeige
2. **Lesson View** (`view="lesson"`) – Theorie + Molekül-Baukasten Challenge
3. **Result View** (`view="result"`) – Abschluss-Feier mit XP-Belohnung
4. **Auth View** (`view="auth"`) – Login/Register Modal (AuthForm)
5. **Admin Dashboard** (`showAdmin=true`) – Draft-Listing, Detail-Modal, Publish/Delete (Strg+Shift+A)

### Komponenten
| Komponente | Pfad | Beschreibung |
|------------|------|--------------|
| MoleculeBuilder | `src/components/MoleculeBuilder.jsx` | SVG Canvas 700x500, Atom-Nodes (C/H/O/N), Bond-Linien, Drag&Drop, Validierung gegen target_smiles |
| AdminDashboard | `src/components/AdminDashboard.jsx` | Draft-Liste, Detail-Modal, Publish/Delete Buttons |
| AuthForm | `src/components/AuthForm.jsx` | Login/Register Modal mit Validierung |
| UserMenu | `src/components/UserMenu.jsx` | Header-Dropdown mit User-Stats |

### Kontexte
| Kontext | Pfad | Beschreibung |
|---------|------|--------------|
| AuthContext | `src/context/AuthContext.jsx` | Appwrite Account: session, register, login, logout, recovery. Demo-Mode wenn nicht konfiguriert. |
| UserProfileContext | `src/context/UserProfileContext.jsx` | User Progress: XP, Streak, Hearts, Level, completed_lessons. Persistiert in Appwrite `user_profiles`. |

### Appwrite Service
- **Pfad:** `src/services/appwrite.js`
- **SDK:** Appwrite Web SDK v10
- **Config:** Endpoint `https://fra.cloud.appwrite.io/v1`, Project `6ae104eb001d990f63e6` (ChemLeaner)
- **Funktion:** `testAppwriteConnection()` – wird nach React-Mount in `main.jsx` aufgerufen (non-blocking)
- **Collections:** `lessons`, `user_profiles`

### Demo-Mode
Wenn Appwrite nicht konfiguriert ist (keine Project ID), läuft die App im Demo-Mode mit:
- 3 Demo-Lektionen (Methan, Methanol, Ethen)
- Lokaler State für XP/Streak/Hearts (nicht persistiert)

---

## 5. Backend (FastAPI + LangChain + Zyte + Appwrite)

### Architektur (Agent-Workflow)
1. **Plan:** LangChain LLM entscheidet welche URLs für ein Thema gescrapt werden sollen
2. **Scrape:** Zyte Extraktions-API holt Rohdaten von den URLs
3. **Structure:** LangChain LLM strukturiert Rohdaten in JSON-Lektion (title, category, theory, challenge)
4. **Save:** Appwrite Python SDK speichert Lektion als `status: "draft"`

### Endpunkte (in `backend/main.py`)
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `POST /generate-agent-lesson` | Voller Agent-Workflow: Plan → Scrape → Structure → Save Draft |
| `GET /lessons` | Listet veröffentlichte Lektionen |
| `GET /lessons/drafts` | Listet Entwürfe für Admin |
| `POST /lessons/{id}/publish` | Setzt Lektion auf `published` |
| `GET /lessons/{id}` | Einzelne Lektion |

### Zyte Spider (`chem_spider/`)
- **Spider:** `chemistry.py` – scrapet Chemie-Bildungsseiten
- **Argumente:** `urls` (komma-getrennt), `topic`, `category`, `difficulty`
- **Deploy:** Zyte Scrapy Cloud via `scrapy.cfg` im Repo-Root, `project = chem`
- **API Trigger:** `POST https://app.zyte.com/api/runspider.json` (Auth: API Key)
- **Pipeline:** Speichert JSON + POSTet an Backend API (`/api/scraped-data`)

### Umgebungsvariablen
```
# Frontend (.env)
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6ae104eb001d990f63e6

# Backend (.env / Heroku Config Vars)
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6ae104eb001d990f63e6
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=chemvibe
APPWRITE_COLLECTION_ID=lessons
ZYTE_API_KEY=...
ZYTE_API_URL=https://api.zyte.com/v1/extract
LLM_API_KEY=...
LLM_API_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

---

## 6. Appwrite-Datenbank

### Collection `lessons`
Erforderliche Attribute:
- `title` (string), `category` (string), `theory` (string)
- `challenge` (string, JSON), `status` (string: "draft" | "published")
- `topic` (string), `created_at` (datetime), `updated_at` (datetime)

### Collection `user_profiles`
Erforderliche Attribute:
- `user_id` (string), `xp` (integer), `streak` (integer)
- `hearts` (integer), `level` (integer)
- `last_heart_regen` (datetime), `completed_lessons` (array)

---

## 7. CI/CD (GitHub Actions)

### Workflow (`.github/workflows/ci-cd.yml`)
- **frontend:** ESLint + Vitest + Vite Build
- **backend:** Ruff + Pytest
- **deploy:** GitHub Pages (Source: GitHub Actions)

### Noch zu erledigen
- GitHub Pages in Repo-Einstellungen aktivieren: Settings → Pages → Source: **GitHub Actions**
- Appwrite Collections `lessons` und `user_profiles` erstellen
- Appwrite-Credentials in Frontend (`.env`) und Backend (Heroku Config Vars) eintragen
- Zyte API Key und LLM Credentials setzen
- Backend auf Heroku deployen

---

## 8. Wichtige Hinweise für zukünftige Sessions

- **Nie API-Keys hardcoden** – immer über `os.getenv()` (Backend) oder Vite Env-Variablen (Frontend)
- **Frontend und Backend strikt trennen** – kein Python-Code im `frontend/`-Ordner
- **Warmes Design beibehalten** – keine sterilen Bootstrap-Elemente (siehe `tech-stack.md`)
- **Lektionen standardmäßig als `draft` speichern** – erst nach Admin-Freigabe sichtbar
- **Demo-Fallback im Frontend** funktioniert ohne Appwrite für schnelles Testen
- **Zyte Spider:** `scrapy.cfg` muss im Repo-Root bleiben für Zyte Deploy
- **Weißer Bildschirm-Fix:** `client.ping()` nicht auf Module-Level aufrufen, sondern nach React-Mount

---

Erstellt: 2026-10-28
Projekt: ChemVibe – Gamified Organic Chemistry Learning Platform
Stack: React 18 + Vite + Tailwind + Appwrite (Frontend) | FastAPI + LangChain + Zyte + Appwrite (Backend) | Scrapy (Spider)
