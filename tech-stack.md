# Tech Stack & Architecture Guide for AI Agents & Developers

Welcome to the **ChemVibe** project repository! This file serves as the single source of truth for the project's technology stack, architecture, and coding guidelines. Any AI agent (like GitHub Copilot, Cursor, etc.) or human developer working on this codebase must adhere to the specifications outlined below.

---

## 1. Project Overview
ChemVibe is an interactive, automated chemistry learning platform designed for students. It combines a human-friendly, warm frontend UI with a headless backend-as-a-service and an automated AI/scraping pipeline that generates lessons.

---

## 2. Tech Stack Components

### Frontend (`/frontend`)
* **Languages & Core:** HTML5, Modern JavaScript (ES6+), CSS3 / Tailwind CSS (via CDN or local build).
* **Design Philosophy:** Human-centric, warm pastels, rounded corners, soft shadows, glassmorphism. **No sterile or default Bootstrap UI.**
* **Database Client:** Appwrite Web SDK for fetching lessons and user data dynamically.

### Backend & Database (`Appwrite`)
* **Service:** Appwrite Cloud or Self-Hosted Appwrite.
* **Database:** `learning_db`
* **Collections:** 
  * `lessons`: Stores dynamically generated chemistry lessons (Attributes: `title`, `category`, `content`, `quiz_question`).

### Automation & AI Pipeline (`/backend` - Hosted on Heroku)
* **Language/Framework:** Python 3.x with **FastAPI**.
* **Data Extraction:** **Zyte API** for reliable web scraping and gathering educational chemical data.
* **AI Agent:** **LangChain** agent to process raw scraped data and format it into structured, student-friendly chemistry lessons and quizzes.
* **Database Sync:** Appwrite Python Server SDK to push newly generated lessons directly into the Appwrite database.

---

## 3. Repository Structure (Monorepo)

```text
chem-vibe-project/
│
├── frontend/                 # User-facing website (HTML, CSS, JS, Appwrite Web SDK)
│   ├── css/
│   ├── js/
│   └── index.html
│
├── backend/                  # Automated lesson generator (Python, FastAPI, Zyte, LangChain)
│   ├── main.py
│   ├── requirements.txt
│   └── Procfile
│
├── tech-stack.md             # This file (Agent & Developer guidelines)
├── .gitignore
└── README.md
```

---

## 4. Rules for AI Agents Contributing Code
1. **Maintain the Vibe:** All UI changes must preserve the warm, organic, student-friendly aesthetic. Avoid harsh, default bootstrap styling.
2. **Keep Separation Clean:** Do not mix Python backend code into the frontend folder or vice versa. 
3. **Environment Variables:** Never hardcode API keys, Appwrite endpoints, or Zyte tokens. Always reference them via `.env` or environment configuration.