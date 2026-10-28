# ChemVibe — Copilot Instructions

ChemVibe is a gamified, Duolingo-style platform for learning organic chemistry. It is a **monorepo** with three parts:

- `frontend/` — React 18 + Vite + Tailwind CSS + Appwrite Web SDK (deployed to GitHub Pages)
- `backend/` — FastAPI + LangChain + Zyte + Appwrite Python SDK (hosted on Heroku)
- `chem_spider/` — Scrapy spider deployed to Zyte Scrapy Cloud (`scrapy.cfg` must stay at the repo root)

Full details live in `tech-stack.md` (single source of truth for stack, architecture, and AI-agent rules) and `SESSION_CONTEXT.md` (current project state, open PRs).

## Commands

All commands run from the repository root unless noted.

### Frontend (`frontend/`)
| Task | Command |
|------|---------|
| Install | `cd frontend && npm ci` |
| Dev server | `cd frontend && npm run dev` (Vite, port 5173) |
| Build | `cd frontend && npm run build` |
| Preview | `cd frontend && npm run preview` |
| Lint | `cd frontend && npm run lint` (ESLint) |
| Test (full) | `cd frontend && npm test` (Vitest, jsdom) |
| Test (single file) | `cd frontend && npx vitest run src/App.test.jsx` |
| Test (single test by name) | `cd frontend && npx vitest run -t "renders the skill tree"` |

### Backend (`backend/`)
| Task | Command |
|------|---------|
| Install | `cd backend && pip install -r requirements.txt` |
| Run server | `cd backend && uvicorn main:app` (Procfile: `uvicorn main:app --host 0.0.0.0 --port $PORT`) |
| Lint | `cd backend && ruff check main.py` |
| Test (full) | `cd backend && pytest -v` |
| Test (single) | `cd backend && pytest -v test_main.py::test_root` |

### Spider (`chem_spider/`)
- Deploy: `POST https://app.zyte.com/api/runspider.json` (project = `chem`, configured via `scrapy.cfg` at repo root)
- Deps: `spider-requirements.txt`

## High-level architecture

1. **Frontend** (`src/App.jsx`): AuthProvider + UserProfileProvider + views (skill tree, lesson, result, auth, admin). `main.jsx` mounts React and calls `testAppwriteConnection()` **after mount** (non-blocking) to avoid a white screen on startup.
2. **Backend** (`main.py`): agent workflow — (1) LangChain LLM plans which URLs to scrape for a topic, (2) Zyte Extraction API fetches raw data, (3) LangChain LLM structures raw data into a JSON lesson, (4) Appwrite Python SDK saves it as `status: "draft"`. All config via `os.getenv()`.
3. **Database** (Appwrite Cloud): collections `lessons` and `user_profiles` (see `tech-stack.md` §8 and `APPWRITE_SETUP.md`).
4. **Spider** (`chem_spider/spiders/chemistry.py`): scrapes chemistry pages, saves JSON, POSTs to the FastAPI backend.

## Key conventions (project-specific, not generic)

1. **Appwrite ping after mount, never at module level.** In `frontend/src/services/appwrite.js` never call `client.ping()` at module load. Call it after React mounts in `main.jsx` (non-blocking). A module-level ping causes the white-screen-on-startup bug (tracked in PR #1).
2. **Demo mode fallback.** When Appwrite is not configured, the frontend must gracefully fall back to demo data (demo lessons, local state for XP/hearts). Do not crash or show a blank screen.
3. **No hardcoded secrets.** Never hardcode API keys, Appwrite endpoints, or Zyte tokens. Reference them via `.env` / environment variables only (`os.getenv()` in backend, `VITE_APPWRITE_*` in frontend). Note: `frontend/.env` currently has hardcoded values — do not replicate that pattern.
4. **Keep separation clean.** Do not mix Python backend code into `frontend/` or vice versa.
5. **`scrapy.cfg` stays at the repo root.** Zyte Scrapy Cloud deployment depends on it being root-level; do not move it.
6. **Tailwind design vibe.** Warm, organic, student-friendly aesthetic: pastels (Amber, Rose, Indigo, Emerald), rounded corners, soft shadows, glassmorphism, Inter font. Avoid sterile/default Bootstrap styling.
7. **Environment files.** Frontend uses `.env` (Appwrite config) with `.env.example` as template; backend uses `.env.example`. Spider uses `.env.spider.example`.

## CI/CD (`.github/workflows/ci-cd.yml`)

CI runs **testing only** on GitHub Actions; building and deploying are handled externally.

- **frontend job:** `npm ci` → `npm run lint` → `npm test` (no build, no deploy)
- **backend job:** `pip install -r requirements.txt` → `ruff check main.py` → `pytest -v`
- Note: lint/test steps in CI use `|| true`, so they do not block the build. Always run lint and tests locally before pushing; do not rely on CI to catch failures.
- Frontend build and GitHub Pages deployment are no longer part of this workflow.

## Pull request workflow

- Create feature branches from `main`, open PRs targeting `main`, review before merging.
- Current open PRs (see `SESSION_CONTEXT.md`): #1 (white screen + Appwrite demo mode) and #2 (Zyte spider). Merge #1 first.

## MCP servers

`.cursor/mcp.json` configures an Appwrite MCP server (`https://mcp.appwrite.io/`). Ask the user if they want to configure any additional MCP servers relevant to this project (e.g., Playwright for E2E web testing).
