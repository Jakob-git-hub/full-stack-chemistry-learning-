# Tech Stack & Architecture Guide for AI Agents & Developers

Welcome to the **ChemVibe** project repository! This file serves as the single source of truth for the project's technology stack, architecture, and coding guidelines. Any AI agent (like GitHub Copilot, Cursor, etc.) or human developer working on this codebase must adhere to the specifications outlined below.

---

## 1. Project Overview

**ChemVibe** is a gamified, Duolingo-style learning platform for organic chemistry. It combines a modern React frontend (Vite + Tailwind CSS) with a FastAPI backend (LangChain + Zyte + Appwrite) and a Scrapy spider for content scraping deployed to Zyte Scrapy Cloud.

---

## 2. Tech Stack Components

### Frontend (`/frontend`)
* **Framework:** React 18
* **Build Tool:** Vite (Port 5173)
* **Styling:** Tailwind CSS
* **Database Client:** Appwrite Web SDK v10
* **Testing:** Vitest + ESLint
* **Design Philosophy:** Human-centric, warm pastels (Amber, Rose, Indigo, Emerald), rounded corners, soft shadows, glassmorphism. **No sterile or default Bootstrap UI.**
* **Font:** Inter

### Backend (`/backend` - Hosted on Heroku)
* **Language/Framework:** Python 3.x with **FastAPI**
* **AI Agent:** **LangChain** (ChatOpenAI, StrOutputParser) for lesson generation
* **Data Extraction:** **Zyte API** for web scraping educational chemistry content
* **Database Sync:** Appwrite Python Server SDK v10
* **Testing:** Pytest
* **Process:** `uvicorn main:app` (Procfile)

### Scrapy Spider (`/chem_spider` - Deploy to Zyte Scrapy Cloud)
* **Framework:** Scrapy 2.x
* **Spider:** `chemistry.py` – scrapes chemistry educational pages
- **Deploy:** Zyte Scrapy Cloud via `scrapy.cfg` (project = chem)
- **Pipeline:** Saves JSON + POSTs to FastAPI backend
- **API Trigger:** `POST https://app.zyte.com/api/runspider.json`

### Database (Appwrite Cloud)
* **Service:** Appwrite Cloud (https://fra.cloud.appwrite.io/v1)
* **Project:** ChemLeaner (`6ae104eb001d990f63e6`)
* **Collections:**
  * `lessons`: title, category, theory, challenge (JSON), status ("draft"|"published"), topic, created_at, updated_at
  * `user_profiles`: user_id, xp, streak, hearts, level, last_heart_regen, completed_lessons

---

## 3. Repository Structure (Monorepo)

```text
chem-vibe-project/
│
├── frontend/                 # React 18 + Vite + Tailwind + Appwrite Web SDK
│   ├── src/
│   │   ├── App.jsx           # Main app: AuthProvider, UserProfileProvider, Views
│   │   ├── main.jsx          # React 18 createRoot, Appwrite ping after mount
│   │   ├── components/
│   │   │   ├── MoleculeBuilder.jsx   # SVG molecule builder (drag-drop, bonds, validation)
│   │   │   ├── AdminDashboard.jsx    # Draft management (list, view, publish, delete)
│   │   │   ├── AuthForm.jsx          # Login/register modal
│   │   │   └── UserMenu.jsx          # Header user dropdown with stats
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Appwrite Account auth (session, register, login, logout)
│   │   │   └── UserProfileContext.jsx # User progress (XP, streak, hearts, level, completed lessons)
│   │   └── services/
│   │       └── appwrite.js           # Appwrite client config + fetch functions
│   ├── index.html            # Entry point with <div id="root"></div>
│   ├── package.json, vite.config.js, tailwind.config.js
│   └── .env                  # Appwrite config
│
├── backend/                  # FastAPI + LangChain + Zyte + Appwrite (Heroku)
│   ├── main.py               # Agent workflow: Plan → Scrape → Structure → Save Draft
│   ├── requirements.txt, Procfile, .env.example, test_main.py
│
├── chem_spider/              # Scrapy spider (Zyte Scrapy Cloud deploy)
│   ├── spiders/chemistry.py  # Main spider (URLs, topic, category, difficulty)
│   ├── items.py, middlewares.py, pipelines.py, settings.py
│
├── scrapy.cfg                # Scrapy config (ROOT level for Zyte deploy)
├── spider-requirements.txt   # Python deps for spider
├── .env.spider.example       # Spider env variables
│
├── tech-stack.md             # This file (Agent & Developer guidelines)
├── SESSION_CONTEXT.md        # Session context for future work
├── SPIDER_README.md          # Spider documentation
├── .github/workflows/ci-cd.yml # CI/CD: frontend lint/test/build, backend ruff/pytest, deploy Pages
└── README.md
```

---

## 4. Rules for AI Agents Contributing Code

1. **Maintain the Vibe:** All UI changes must preserve the warm, organic, student-friendly aesthetic. Avoid harsh, default Bootstrap styling.
2. **Keep Separation Clean:** Do not mix Python backend code into the frontend folder or vice versa.
3. **Environment Variables:** Never hardcode API keys, Appwrite endpoints, or Zyte tokens. Always reference them via `.env` or environment configuration.
4. **Appwrite Ping:** Never call `client.ping()` at module level in `appwrite.js`. Call it after React mounts in `main.jsx` (non-blocking) to avoid white screen on startup.
5. **Demo Mode:** When Appwrite is not configured, the frontend should gracefully fall back to demo data (demo lessons, local state for XP/hearts).
6. **Zyte Spider:** `scrapy.cfg` must remain at the repository root for Zyte Scrapy Cloud deployment to work.
7. **Pull Requests:** Create feature branches from `main`, open PRs targeting `main`. Review before merging.

---

## 5. Frontend Views & State

| View | Route/State | Description |
|------|-------------|-------------|
| Skill Tree | `view="skilltree"` | Learning path with lesson cards, XP/Streak/Hearts display |
| Lesson | `view="lesson"` | Theory + Molecule Builder challenge |
| Result | `view="result"` | Completion celebration with XP reward |
| Auth | `view="auth"` | Login/Register modal |
| Admin | `showAdmin=true` | Draft listing, detail modal, publish/delete (Ctrl+Shift+A) |

---

## 6. Backend Agent Workflow

1. **Plan:** LLM decides which URLs to scrape for a chemistry topic
2. **Scrape:** Zyte Extraction API fetches raw data from URLs
3. **Structure:** LLM structures raw data into JSON lesson (title, category, theory, challenge)
4. **Save:** Appwrite Python SDK saves lesson as `status: "draft"`

---

## 7. CI/CD (GitHub Actions)

Workflow (`.github/workflows/ci-cd.yml`):
- **frontend:** ESLint + Vitest + Vite Build
- **backend:** Ruff + Pytest
- **deploy:** GitHub Pages (Source: GitHub Actions)

**Still to do:** Activate GitHub Pages in repo settings (Settings → Pages → Source: GitHub Actions)

---

## 8. Appwrite Collections Required

### `lessons`
- `title` (string), `category` (string), `theory` (string)
- `challenge` (string, JSON), `status` (string: "draft" | "published")
- `topic` (string), `created_at` (datetime), `updated_at` (datetime)

### `user_profiles`
- `user_id` (string), `xp` (integer), `streak` (integer)
- `hearts` (integer), `level` (integer)
- `last_heart_regen` (datetime), `completed_lessons` (array)

---

## 9. Open Pull Requests

| PR | Branch | Description |
|----|--------|-------------|
| #1 | `feat/fix-white-screen-and-appwrite-demo-mode` | Fix white screen on app startup + Appwrite demo mode |
| #2 | `feat/zyte-spider` | Add Zyte Scrapy spider for chemistry content scraping |

**Recommendation:** Merge PR #1 first (fixes white screen), then PR #2 (spider project).

---

Erstellt: 2026-10-28
Projekt: ChemVibe – Gamified Organic Chemistry Learning Platform
Stack: React 18 + Vite + Tailwind + Appwrite (Frontend) | FastAPI + LangChain + Zyte + Appwrite (Backend) | Scrapy (Spider)
