# Authentic AI Voice ✦

> **An AI-powered academic writing assistant that learns your voice and enhances your documents while keeping them authentically yours.**

A full-stack web application that analyzes your writing style through stylometry, then uses AI to enhance documents in a way that sounds like *you* — not a robot. Supports rich document editing, version history, and professional PDF/LaTeX export pipelines.

---

## Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Project Structure](#-project-structure)
5. [Prerequisites](#-prerequisites)
6. [Environment Setup](#-environment-setup)
7. [Installation](#-installation)
8. [Running Locally](#-running-locally)
9. [API Reference](#-api-reference)
10. [Export Formats](#-export-formats)
11. [Keyboard Shortcuts](#-keyboard-shortcuts)
12. [Database Schema](#-database-schema)
13. [AI & Stylometry Pipeline](#-ai--stylometry-pipeline)
14. [Testing](#-testing)
15. [Sprint History](#-sprint-history)
16. [Deployment Notes](#-deployment-notes)
17. [Contributing](#-contributing)
18. [License](#-license)

---

## ✨ Features

### Core Editor
- **Rich Text Editor** — Powered by Tiptap v3 with bold, italic, underline, strikethrough, headings (H1–H3), bullet/ordered lists, blockquotes, code blocks, tables, and image embed
- **Auto-Save** — Debounced auto-save every 2 seconds after typing stops; visual status indicator (Saving… / Saved ✓ / Error)
- **Manual Force Save** — `Ctrl+S` triggers an immediate save
- **Editable Title** — Inline title editing saved on blur

### AI Enhancement
- **Voice Profile Learning** — Upload up to 5 `.txt` writing samples; the system runs full stylometric analysis (11 linguistic features)
- **AI Text Enhancement** — Select any text, click the AI bubble or press `Ctrl+Shift+A`, choose an instruction preset or write a custom one, and receive streamed AI output that matches your personal voice
- **Real-Time Streaming** — Server-Sent Events (SSE) stream AI tokens directly to the panel as they are generated
- **Replace or Copy** — Insert the AI output into the editor in one click, or copy it to clipboard
- **Rate Limiting** — 10 AI requests per user per 60-second window (server-side, in-memory)

### Export Pipeline
- **PDF Export** — Full WeasyPrint-rendered PDF with proper heading hierarchy, tables, and code blocks; binary blob download pattern (no corruption)
- **LaTeX Export** — Three professional templates:
  - `academic` — Single-column, `article` class, bibliography-ready
  - `article` — Two-column journal-style, `multicol`
  - `report` — Chapter-structured with `fancyhdr` running headers
- **Export Dialog** — Glassmorphic tabbed modal with controls for template, font size (10–14pt), paper size (A4/Letter/Legal), and optional Table of Contents

### Version History
- **Manual Snapshots** — Click "Save Version" or press the toolbar button to snapshot the current state
- **Auto-Snapshots** — Every 10th save automatically creates a version
- **Browse & Restore** — Side drawer lists all versions with timestamps; restore any version with one click

### Dashboard
- **Document Grid** — All your documents in a responsive card grid with accent colors, word counts, and relative timestamps
- **New Document** — Creates and navigates to a blank document
- **Delete** — Inline confirmation chip per card (no browser `alert()`); hard deletes document + all versions
- **Search/Filter** — Client-side real-time filter by document title

### Writing Style Settings
- **Sample Upload** — Drag-and-drop or click to upload `.txt` files (max 5)
- **Stylometric Analysis** — Background NLP pipeline using spaCy + textstat computes 11 features
- **Voice Profile Display** — Animated stat cards with progress bars for every feature
- **Loading Skeletons** — 11 shimmer cards while analysis is in progress

### UX & Error Handling
- **Toast System** — Global `addToast()` Zustand action for success/error/info notifications (top-right, auto-dismiss)
- **Global Axios Interceptor** — Maps `401 → redirect`, `429 → rate limit toast`, `422 → validation toast`, `5xx → server error toast`
- **Responsive Layout** — Tested at 768px; toolbar scrolls horizontally, AI panel uses `min(360px, 90vw)`, export dialog uses `maxWidth: 90vw`

---

## 🛠 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.110 |
| Language | Python 3.12 |
| ASGI Server | Uvicorn 0.29 |
| Database ORM | SQLAlchemy 2.0 (async) |
| DB Driver | asyncpg (runtime), psycopg2-binary (Alembic) |
| Migrations | Alembic 1.13 |
| Auth | python-jose (JWT HS256), passlib (bcrypt) |
| AI Provider | OpenAI-compatible SDK → Groq |
| NLP | spaCy 3.7 (`en_core_web_sm`), textstat 0.7 |
| PDF Export | WeasyPrint 62.3 |
| LaTeX Templates | Jinja2 3.1 |
| Config | pydantic-settings 2.2 |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Editor | Tiptap v3 |
| State | Zustand 5 |
| HTTP Client | Axios 1.16 |
| Styling | Vanilla CSS (design tokens in `globals.css`) |
| Animations | Framer Motion, CSS keyframes |
| Icons | Lucide React |
| Testing | Playwright 1.60 |

### Infrastructure
| Component | Technology |
|---|---|
| Database | PostgreSQL 15+ |
| AI Backend | Groq (via OpenAI-compatible API) |
| File Storage | Local filesystem (`backend/uploads/`) |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Browser (Next.js)              │
│  /login  /register  /dashboard  /documents/[id] │
│                    /settings                     │
└────────────────────┬────────────────────────────┘
                     │ HTTP / SSE (Axios + fetch)
                     ▼
┌─────────────────────────────────────────────────┐
│              FastAPI (Uvicorn)  :8000            │
│                                                 │
│  /api/auth      JWT login/register/me           │
│  /api/documents CRUD + hard delete              │
│  /api/documents/{id}/versions  snapshots        │
│  /api/ai/enhance               SSE stream       │
│  /api/export/pdf               WeasyPrint       │
│  /api/export/latex             Jinja2 templates │
│  /api/samples                  NLP pipeline     │
└───────┬───────────────────┬─────────────────────┘
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────────────────────┐
│  PostgreSQL  │   │  Groq API (OpenAI-compatible) │
│  (SQLAlchemy │   │  model: openai/gpt-oss-120b   │
│   async ORM) │   └──────────────────────────────┘
└──────────────┘
```

---

## 📁 Project Structure

```
Authentic-AI-Voice/
├── backend/
│   ├── .env                        # Environment variables (never commit)
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/               # Migration files
│   ├── uploads/
│   │   ├── samples/                # Uploaded .txt writing samples
│   │   └── exports/                # Generated PDF/LaTeX files
│   └── app/
│       ├── main.py                 # FastAPI app + router mounts
│       ├── config.py               # Pydantic settings
│       ├── database.py             # Async SQLAlchemy engine + session
│       ├── dependencies.py         # get_current_user, get_db
│       ├── models/
│       │   ├── user.py
│       │   ├── document.py         # is_archived, cascade versions
│       │   ├── document_version.py
│       │   └── writing_sample.py
│       ├── routers/
│       │   ├── auth.py             # POST /api/auth/register|login|me
│       │   ├── documents.py        # GET|POST|PATCH|DELETE /api/documents
│       │   ├── versions.py         # GET|POST /api/documents/{id}/versions
│       │   ├── ai.py               # POST /api/ai/enhance (SSE)
│       │   ├── export.py           # POST /api/export/pdf|latex
│       │   └── samples.py          # GET|POST|DELETE /api/samples
│       ├── services/
│       │   ├── ai_service.py       # Groq SSE streaming
│       │   └── latex_service.py    # Jinja2 template rendering
│       ├── schemas/
│       │   └── voice_profile.py    # Pydantic request/response models
│       ├── templates/
│       │   ├── academic.tex.j2     # Single-column academic
│       │   ├── article.tex.j2      # Two-column journal
│       │   └── report.tex.j2       # Chapter report with fancyhdr
│       └── utils/
│           └── stylometry.py       # spaCy + textstat analysis
│
└── frontend/
    ├── .env.local                  # NEXT_PUBLIC_API_URL
    ├── middleware.ts               # Auth redirect middleware
    ├── app/
    │   ├── globals.css             # Design tokens, animations, utilities
    │   ├── layout.tsx              # Root layout + toast container
    │   ├── page.tsx                # Root → redirect to /dashboard
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── dashboard/page.tsx      # Document grid + search + delete
    │   ├── documents/[id]/page.tsx # Editor + shortcuts + export
    │   └── settings/page.tsx       # Sample upload + voice profile
    ├── components/
    │   ├── editor/
    │   │   ├── TiptapEditor.tsx    # Tiptap instance + extensions
    │   │   ├── Toolbar.tsx         # Formatting bar (overflow-x scroll)
    │   │   ├── AIPanel.tsx         # Slide-in AI enhancement panel
    │   │   └── VersionHistoryDrawer.tsx
    │   ├── export/
    │   │   └── ExportDialog.tsx    # Tabbed PDF/LaTeX modal
    │   ├── settings/
    │   │   ├── VoiceProfileCard.tsx # Stat cards + skeleton loader
    │   │   ├── SampleUploader.tsx
    │   │   └── SampleList.tsx
    │   └── ui/
    │       ├── AppLogo.tsx
    │       ├── Skeleton.tsx         # DocumentCardSkeleton
    │       └── Toast.tsx
    ├── hooks/
    │   ├── useAutoSave.ts           # Debounced + force-save
    │   ├── useAIEnhance.ts          # SSE stream via native fetch
    │   └── useEditorSelection.ts    # Selected text tracking
    ├── lib/
    │   └── api.ts                   # Axios instance + interceptors
    ├── store/
    │   └── editorStore.ts           # Zustand: toasts, saveStatus, docId
    └── tests/
        └── sprint3.spec.ts          # Playwright E2E suite
```

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.12+ | |
| Node.js | 18+ | |
| PostgreSQL | 15+ | Running locally or remote |
| Groq API Key | — | Free tier available at [console.groq.com](https://console.groq.com) |
| GTK3 Runtime | — | **Windows only** — required by WeasyPrint for PDF export |

### Windows-specific: GTK3 for WeasyPrint

WeasyPrint requires the GTK3 runtime to render PDFs. Install from the official MSYS2-based installer:

```
https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
```

After installation, ensure `C:\Program Files\GTK3-Runtime Win64\bin` is in your system `PATH`.

---

## 🔧 Environment Setup

### Backend — `backend/.env`

```env
# PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/authentic_voice

# JWT Auth
SECRET_KEY=your-256-bit-random-secret-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider (Groq via OpenAI-compatible SDK)
OPENAI_API_KEY=gsk_your_groq_api_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL_NAME=openai/gpt-oss-120b
```

> ⚠️ **Never commit `.env` to source control.** It is already listed in `.gitignore`.

Generate a secure `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/yousseffsanafawy/Authentic-AI-Voice.git
cd Authentic-AI-Voice
```

### 2. Create the PostgreSQL database

```sql
CREATE DATABASE authentic_voice;
```

### 3. Set up the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Copy env template and fill in values
copy .env.example .env   # then edit .env

# Run database migrations
alembic upgrade head
```

### 4. Set up the Frontend

```bash
cd frontend
npm install
```

---

## 🚀 Running Locally

Open **two terminal windows** and run both servers simultaneously.

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # macOS/Linux
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |

---

## 📡 API Reference

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register new user (email + password) |
| `POST` | `/api/auth/login` | ❌ | Login → returns `access_token` (JWT) |
| `GET` | `/api/auth/me` | ✅ | Get current user info |

**Login Request:**
```json
{ "email": "user@example.com", "password": "yourpassword" }
```
**Login Response:**
```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

All authenticated requests must include:
```
Authorization: Bearer <access_token>
```

---

### Documents — `/api/documents`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/documents` | ✅ | List all non-archived documents |
| `POST` | `/api/documents` | ✅ | Create a new document |
| `GET` | `/api/documents/{id}` | ✅ | Get document by ID |
| `PATCH` | `/api/documents/{id}` | ✅ | Update title, content, word count |
| `DELETE` | `/api/documents/{id}` | ✅ | Hard delete + cascade versions → 204 |

**Document fields:**
```json
{
  "id": "uuid",
  "title": "My Document",
  "content": { /* Tiptap JSON */ },
  "content_text": "Plain text...",
  "word_count": 142,
  "current_version": 5,
  "is_archived": false,
  "created_at": "2026-05-18T00:00:00Z",
  "updated_at": "2026-05-18T01:00:00Z"
}
```

---

### Version History — `/api/documents/{id}/versions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/documents/{id}/versions` | ✅ | List all snapshots (desc order) |
| `POST` | `/api/documents/{id}/versions` | ✅ | Create manual snapshot |
| `GET` | `/api/documents/{id}/versions/{num}` | ✅ | Get snapshot content for restore |

> Auto-snapshots are created every 10th save (when `current_version % 10 == 0`).

---

### AI Enhancement — `/api/ai`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/enhance` | ✅ | Stream AI-enhanced text via SSE |

**Request:**
```json
{
  "selected_text": "The quick brown fox...",
  "instruction": "Make this more concise"
}
```

**Response:** `text/event-stream`
```
data: {"text": "A swift fox"}
data: {"text": " crosses the field."}
data: [DONE]
```

**Rate limit:** 10 requests per user per 60 seconds. Returns `429` when exceeded.

---

### Writing Samples — `/api/samples`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/samples` | ✅ | List all uploaded samples |
| `POST` | `/api/samples` | ✅ | Upload `.txt` file (multipart/form-data) |
| `DELETE` | `/api/samples/{id}` | ✅ | Delete sample + re-trigger analysis |
| `GET` | `/api/samples/voice-profile` | ✅ | Get computed voice profile |

**Voice Profile Response:**
```json
{
  "status": "ready",
  "voice_profile": {
    "avg_sentence_length": 18.4,
    "avg_word_length": 4.7,
    "type_token_ratio": 0.62,
    "passive_voice_ratio": 0.08,
    "flesch_reading_ease": 54.2,
    "flesch_kincaid_grade": 10.1,
    "conjunction_frequency": 0.032,
    "adverb_frequency": 0.021,
    "first_person_ratio": 0.04,
    "paragraph_length_avg": 87.3,
    "transition_word_ratio": 0.018,
    "top_punctuation": { ".": 0.45, ",": 0.38, ";": 0.07 }
  }
}
```

---

### Export — `/api/export`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/export/pdf` | ✅ | Generate and download PDF |
| `POST` | `/api/export/latex` | ✅ | Generate and download `.tex` file |

**PDF Request:**
```json
{ "document_id": "uuid" }
```
**Response:** `application/pdf` binary blob

**LaTeX Request:**
```json
{
  "document_id": "uuid",
  "template": "academic",
  "font_size": 12,
  "paper_size": "a4paper",
  "include_toc": true
}
```
**Response:** `text/plain` binary blob (`.tex` file)

**Template options:** `academic` | `article` | `report`
**Font size:** `10` | `11` | `12` | `14`
**Paper size:** `a4paper` | `letterpaper` | `legalpaper`

---

## 📄 Export Formats

### PDF
- Rendered by WeasyPrint from Tiptap JSON → HTML → PDF
- Supports: headings, paragraphs, bold/italic, bullet/ordered lists, blockquotes, code blocks, tables
- Font: system serif, A4, 1.6 line-height

### LaTeX Templates

| Template | Class | Columns | Header/Footer | Best For |
|---|---|---|---|---|
| `academic` | `article` | 1 | Minimal | Thesis, academic papers |
| `article` | `article` | 2 | None | Journal submissions |
| `report` | `report` | 1 | `fancyhdr` | Technical reports |

All templates are Jinja2 (`.tex.j2`) and live in `backend/app/templates/`. They are Overleaf-compatible with zero compile errors.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Ctrl+S` | Force save document | Editor |
| `Ctrl+Shift+E` | Open Export dialog | Editor |
| `Ctrl+Shift+A` | Open AI Enhancement panel | Editor |
| `Ctrl+B` | Bold | Editor |
| `Ctrl+I` | Italic | Editor |
| `Ctrl+U` | Underline | Editor |
| `Ctrl+Z` | Undo | Editor |

---

## 🗄 Database Schema

```
users
├── id          VARCHAR (UUID)   PK
├── email       VARCHAR          UNIQUE NOT NULL
├── hashed_pw   VARCHAR          NOT NULL
└── created_at  TIMESTAMP

documents
├── id              VARCHAR (UUID)  PK
├── user_id         VARCHAR         FK → users(id) CASCADE
├── title           VARCHAR         NOT NULL
├── content         JSON            (Tiptap node tree)
├── content_text    TEXT            (plain text for AI context)
├── word_count      INTEGER
├── current_version INTEGER
├── has_tables      BOOLEAN
├── has_footnotes   BOOLEAN
├── is_archived     BOOLEAN         DEFAULT false
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP

document_versions
├── id              VARCHAR (UUID)  PK
├── document_id     VARCHAR         FK → documents(id) CASCADE DELETE
├── version_number  INTEGER
├── content         JSON
├── content_text    TEXT
└── created_at      TIMESTAMP

writing_samples
├── id          VARCHAR (UUID)  PK
├── user_id     VARCHAR         FK → users(id) CASCADE
├── filename    VARCHAR
├── file_path   VARCHAR
└── created_at  TIMESTAMP
```

---

## 🧠 AI & Stylometry Pipeline

### How the Voice Profile Works

1. **Upload** — User uploads `.txt` writing samples (up to 5 files)
2. **Analyze** — Backend runs `utils/stylometry.py` which uses:
   - **spaCy** — Sentence segmentation, POS tagging, passive voice detection
   - **textstat** — Flesch Reading Ease, Flesch-Kincaid Grade Level
   - **Custom counters** — Type-token ratio, conjunction/adverb frequency, first-person ratio, transition words
3. **Store** — Profile stored in the `writing_samples` table and returned via `GET /api/samples/voice-profile`
4. **Enhance** — When the user requests AI enhancement, the voice profile is fetched and injected into the Groq system prompt as style constraints

### The 11 Voice Metrics

| Metric | What It Measures |
|---|---|
| Avg Sentence Length | Sentence complexity tendency |
| Avg Word Length | Vocabulary sophistication |
| Vocabulary Variety (TTR) | Lexical diversity |
| Passive Voice Ratio | Active vs. passive construction preference |
| Flesch Reading Ease | Overall readability (0–100) |
| Flesch-Kincaid Grade | Equivalent school grade level |
| Conjunction Frequency | Sentence joining style |
| Adverb Usage | Intensity/manner modifier habit |
| First-Person Ratio | Personal vs. formal voice |
| Avg Paragraph Length | Structural density |
| Transition Word Ratio | Logical flow patterns |

### AI Enhancement Flow

```
User selects text → picks instruction → clicks Enhance
         ↓
POST /api/ai/enhance (SSE)
         ↓
Rate limiter check (10 req/min)
         ↓
Fetch voice profile from DB (before SSE loop — avoids connection leak)
         ↓
Build system prompt: style constraints + selected_text + instruction
         ↓
Groq stream (openai.AsyncOpenAI → Groq endpoint)
         ↓
Server-Sent Events → frontend useAIEnhance hook → panel updates live
         ↓
User clicks "Replace Selection" → insertContent() in Tiptap
```

---

## 🧪 Testing

### Backend — pytest

```bash
cd backend
.\venv\Scripts\activate

# Full endpoint test suite
python test_all_endpoints.py

# Auth flow tests
python test_auth_flow.py

# Sprint-specific tests
python test_sprint3.py
python test_sprint4.py

# PDF export sanity check
python test_pdf_e2e.py

# Stress / load test (requires aiohttp)
python test_stress.py
```

### Frontend — Playwright E2E

**First-time setup (install browsers):**
```bash
cd frontend
npx playwright install
```

**Run all E2E tests:**
```bash
npm run test:e2e                    # headless
npm run test:e2e:headed             # with browser UI
npm run test:e2e:ui                 # Playwright interactive UI
```

The test suite in `frontend/tests/sprint3.spec.ts` covers:
1. Text typing and word count updates
2. AI bubble appears on text selection
3. AI Panel opens on bubble click
4. SSE enhance flow completes and populates output
5. "Replace Selection" inserts text into editor
6. Version history drawer opens
7. Save Snapshot creates version entry
8. Restore replaces editor content
9. AI Panel close button works
10. Auto-save indicator cycles through states

---

## 📅 Sprint History

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Project setup, PostgreSQL schema, FastAPI skeleton, JWT auth | ✅ Complete |
| Sprint 2 | Document CRUD, Next.js frontend, login/register, dashboard | ✅ Complete |
| Sprint 3 | Tiptap editor, auto-save, AI panel (SSE), version history | ✅ Complete |
| Sprint 4 | Stylometry pipeline, voice profile UI, settings page, PDF export | ✅ Complete |
| Sprint 5 | LaTeX export (3 templates), Export Dialog, Groq AI migration | ✅ Complete |
| Sprint 6 | Document delete, dashboard search, error interceptor, responsive polish | ✅ Complete |

Full sprint documentation is available in the `docs/` directory.

---

## 🚀 Deployment Notes

### Production Checklist

- [ ] Set a strong `SECRET_KEY` (256-bit random hex)
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` appropriately (e.g. `60` for production)
- [ ] Move `OPENAI_API_KEY` to a secrets manager (e.g. AWS Secrets Manager, Doppler)
- [ ] Set `DATABASE_URL` to your production PostgreSQL connection string
- [ ] Run `alembic upgrade head` against the production database before deploying
- [ ] Configure `CORS` in `main.py` to restrict `allow_origins` to your frontend domain
- [ ] Serve the frontend via Vercel or a static CDN; set `NEXT_PUBLIC_API_URL` to your API domain
- [ ] Use a reverse proxy (nginx/Caddy) in front of Uvicorn; run Uvicorn with `--workers 4`
- [ ] Set up file storage (replace local `uploads/` with S3 or equivalent)

### Environment Variables — Production Backend

```env
DATABASE_URL=postgresql+asyncpg://user:pass@your-db-host/authentic_voice
SECRET_KEY=<256-bit-random-hex>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=<your-groq-key>
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL_NAME=openai/gpt-oss-120b
```

### Production Frontend

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 🤝 Contributing

1. Fork the repositor
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes following conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
4. Push to your fork and open a Pull Request
5. Ensure all Playwright E2E tests pass before requesting review

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ 

*Authentic AI Voice — Write more. Sound like you.*

</div>
