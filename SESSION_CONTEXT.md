# ChemVibe – Projekt-Kontext für zukünftige Sessions

Dieses Dokument fasst den aktuellen Stand des Projekts zusammen, damit zukünftige Sessions nahtlos anknüpfen können.

---

## 1. Repository

- **GitHub:** `Jakob-git-hub/full-stack-chemistry-learning-`
- **Branch:** `main`
- **Lokaler Pfad:** `/Users/jakobpaul/.copilot/repos/full-stack-chemistry-learning-`
- **Letzter Commit:** `6871cb8` – Backend hinzugefügt

---

## 2. Ordnerstruktur

```
full-stack-chemistry-learning-/
├── .github/workflows/ci-cd.yml      # GitHub Actions CI/CD (Lint + Pages Deploy)
├── .gitignore
├── .htmlhintrc                      # HTML-Lint-Konfiguration
├── .stylelintrc.json                # CSS-Lint-Konfiguration
├── .eslintrc.json                   # JS-Lint-Konfiguration
├── README.md                        # Projektübersicht
├── SESSION_CONTEXT.md               # Diese Datei (Kontext für zukünftige Sessions)
├── tech-stack.md                    # Tech-Stack, Architektur, Coding-Richtlinien
├── frontend/
│   ├── index.html                   # Gamified Duolingo-style UI (Skill Tree, Lesson, Result)
│   ├── styles.css                   # Pastel-Design, Glassmorphism, Animationen
│   └── app.js                       # Appwrite SDK, Lern-Logik, Quiz, Gamification
└── backend/
    ├── main.py                      # FastAPI: /generate-lesson, /request-lesson, /lessons, /publish
    ├── requirements.txt             # fastapi, uvicorn, httpx, pydantic, appwrite, langchain
    ├── Procfile                     # Heroku: uvicorn main:app --host 0.0.0.0 --port $PORT
    └── .env.example                 # Umgebungsvariablen-Vorlage
```

---

## 3. Frontend (ChemVibe – Gamified)

### Design
- Duolingo-Ästhetik: kräftige Farben (Amber, Rose), weiche Ecken, Glassmorphism, flüssige Animationen
- Status-Leiste: ❤️ Leben (3), 🔥 Streak, ⚡ XP, Level
- Kein Bootstrap, eigenes CSS mit Tailwind CDN

### Views
1. **Skill Tree** (`#skill-tree-view`) – Visueller Lernpfad mit gesperrten/abgeschlossenen/aktuellen Nodes
2. **Lesson View** (`#lesson-view`) – Info-Häppchen + interaktive Challenges (abwechselnd)
3. **Result View** (`#result-view`) – Abschluss-Feier mit XP und Streak
4. **Hearts Modal** – Bei 0 Leben: Üben oder Zurück

### Aufgabentypen (dynamisch)
- `multiple_choice` – Multiple Choice mit visuellem Feedback
- `drag_drop` – Drag & Drop Zuordnung
- `matching` – Paare zuordnen (z. B. Ethanol ↔ C₂H₅OH)
- `molecule` – Molekül-Atome visualisieren, richtige Formel wählen
- `info` – Didaktische Info-Häppchen

### Appwrite-Integration (`app.js`)
```js
const APPWRITE_CONFIG = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: 'YOUR_PROJECT_ID',      // <-- muss eingetragen werden
  databaseId: 'chemvibe',
  collectionId: 'lessons',
};
```
- `databases.listDocuments()` lädt Lektionen aus Collection `lessons`
- Demo-Fallback mit 3 Beispiel-Lektionen (Alkane, Alkene, Alkohole) falls Appwrite nicht konfiguriert

---

## 4. Backend (FastAPI + Heroku + Appwrite)

### Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `POST /generate-lesson` | Generiert Lektion (Zyte → LLM → Appwrite als `draft`) |
| `POST /request-lesson` | Admin fordert neues Thema an |
| `GET /lessons` | Listet veröffentlichte Lektionen (`status: "published"`) |
| `GET /lessons/drafts` | Listet Entwürfe für Admin-Review |
| `POST /lessons/{id}/publish` | Setzt Lektion auf `published` |
| `GET /lessons/{id}` | Einzelne Lektion mit vollem Inhalt |

### Workflow
1. Zyte API scrapet Bildungsquellen (optional, falls `source_url` angegeben)
2. LLM (OpenAI-kompatibel, LangChain-kompatibel) generiert Lektion als JSON
3. Gespeichert in Appwrite Collection `lessons` mit `status: "draft"`
4. Admin veröffentlicht über `/publish` → sichtbar für Schüler

### Umgebungsvariablen (`.env` / Heroku Config Vars)
```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=chemvibe
APPWRITE_COLLECTION_ID=lessons
ZYTE_API_KEY=...
ZYTE_API_URL=https://api.zyte.com/v1/extract
LLM_API_KEY=...
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4o-mini
```

---

## 5. CI/CD (GitHub Actions)

### Workflow (`.github/workflows/ci-cd.yml`)
- **lint:** HTML (htmlhint), CSS (stylelint), JS (eslint) bei Push/PR auf `main`
- **deploy:** GitHub Pages Deployment bei Push auf `main` (nach erfolgreichem Lint)
- **Permissions:** `contents: read`, `pages: write`, `id-token: write`
- **Publish Dir:** `./frontend`

### Noch zu erledigen
- GitHub Pages in Repo-Einstellungen aktivieren: Settings → Pages → Build and deployment → Source: **GitHub Actions**

---

## 6. Appwrite-Datenbank (Collection `lessons`)

Erforderliche Attribute in der Appwrite-Collection `lessons`:
- `title` (string)
- `category` (string)
- `icon` (string)
- `order` (integer)
- `reading_time` (integer)
- `description` (string)
- `content` (string, HTML)
- `steps` (array, JSON)
- `status` (string: "draft" | "published")
- `created_at` (datetime)
- `updated_at` (datetime)

---

## 7. Nächste Schritte / TODOs

1. **Appwrite-Credentials in `frontend/app.js` eintragen** (`APPWRITE_CONFIG`)
2. **Appwrite-Credentials in Heroku Config Vars oder `.env` eintragen** (Backend)
3. **GitHub Pages aktivieren** (Repo-Einstellungen)
4. **Appwrite-Collection `lessons` erstellen** mit obigen Attributen
5. **Backend auf Heroku deployen** (Heroku CLI oder GitHub Integration)
6. **Weitere Lektionen generieren** über `POST /generate-lesson` oder `POST /request-lesson`
7. **Admin-Dashboard** für Draft-Review und Publish (Frontend fehlt noch)
8. **Herzen-Regeneration** (nach Zeitablauf wieder aufladen)
9. **Benutzer-Authentifizierung** (Appwrite Accounts) für persönliche Streaks/XP

---

## 8. Wichtige Hinweise für zukünftige Sessions

- **Nie API-Keys hardcoden** – immer über `os.getenv()` (Backend) oder Umgebungsvariablen
- **Frontend und Backend strikt trennen** – kein Python-Code im `frontend/`-Ordner
- **Warmes Design beibehalten** – keine sterilen Bootstrap-Elemente (siehe `tech-stack.md`)
- **Lektionen standardmäßig als `draft` speichern** – erst nach Admin-Freigabe sichtbar
- **Demo-Fallback im Frontend** funktioniert ohne Appwrite für schnelles Testen

---

Erstellt: 2026-10-27
Projekt: ChemVibe – Gamified Organic Chemistry Learning Platform
