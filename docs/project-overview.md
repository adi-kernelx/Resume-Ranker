# Resume Ranking System — Project Overview

*Written for someone opening this repository for the first time. Assumes no prior context.*

_Last updated: 2026-09-10 · Branch: `feature/continue-ai-pipeline`_

---

## 1. What this project actually does

A candidate uploads a PDF or DOCX resume. Within seconds they get back:

- A **structured extraction** of who they are — contact info, education, skills, projects, work experience.
- A **0-100 ATS score** with a five-dimension breakdown and a paragraph of AI-generated feedback.
- A **ranked list of every company in the index** (currently 139), each labelled *Eligible* or *Not Eligible* against that company's actual hiring criteria (CPI cutoff, allowed branches, DSA requirement), with an explanation of the score and any missing skills.
- A **cross-referenced GitHub audit** if their resume mentions a GitHub profile — repositories fuzzy-matched to listed projects, language usage measured in bytes, and additional skills pulled straight from README files.

Recruiters (or a placement cell) can also view the same data across every candidate — leaderboards, aggregate skill demand, ATS trends over time.

The differentiator isn't the resume review; those are commodity. It's that the system reads the candidate's **actual code**, so it can say things no other tool can — *"you list C++ on your resume, but your GitHub is 49.9% Python and 10.2% C++"*.

---

## 2. High-level architecture

![Architecture](assets/architecture.svg)

```
┌────────────────┐     HTTPS      ┌──────────────────┐     PostgREST      ┌──────────────┐
│  React SPA     │ ─────────────▶ │  FastAPI backend │ ────────────────▶ │  Supabase    │
│  (Vercel)      │ ◀───────────── │  (Google Cloud   │ ◀──────────────── │  (Postgres + │
│                │                │   Run, Docker)   │                    │   Storage +  │
└────────────────┘                └──────────────────┘                    │   Auth +     │
                                    │                                     │   pgvector)  │
                                    ├─ Groq API (LLM)                     └──────────────┘
                                    ├─ GitHub REST API
                                    └─ SentenceTransformer / CrossEncoder (local)
```

Three genuinely separate GitHub repositories:

| Repo | Contents | Deploys to |
|---|---|---|
| `Resume_Ranker_Frontend` | `client/` | Vercel |
| `Resume_Ranker_Backend`  | `server/` | Cloud Run (auto-build on push to `main`) |
| `resume_ranking_system` | Everything (this monorepo) | Not deployed — combined history of both |

Cost floor: **$0/month** on free tiers. Cloud Run scales to zero, Supabase free tier, Vercel Hobby, Groq free tier.

---

## 3. The resume upload pipeline, end to end

This is the flow that defines the product. Every other feature is a view of data this pipeline produces.

```
Browser                    FastAPI                              Supabase / Groq / GitHub
   │                          │                                            │
   │  POST /api/resumes/      │                                            │
   │─────multipart──────────▶ │                                            │
   │                          │  upload PDF to Storage                     │
   │                          │───────────────────────────────────────────▶│
   │                          │  INSERT jobs row (status=processing)       │
   │                          │───────────────────────────────────────────▶│
   │  {job_id}                │                                            │
   │◀──────────────────────── │                                            │
   │                          │  (background task begins)                  │
   │  GET /status/{job_id}    │  ┌── parse (PyMuPDF + LLM)                 │
   │─────poll──────────────▶ │  │                                          │
   │                          │  ├── ATS score (deterministic)             │
   │                          │  │                                          │
   │                          │  ├── generate embedding                    │
   │                          │  │                                          │
   │                          │  ├── fetch companies ──────────────────────▶│
   │                          │  │                                          │
   │                          │  ├── rank (hard filter → biencoder →       │
   │                          │  │        top-K → batched cross-encoder)   │
   │                          │  │                                          │
   │                          │  ├── LLM gap analysis (runs in parallel    │
   │                          │  │        with ranking, awaited after)     │
   │                          │  │                                          │
   │                          │  └── write resume + rankings ──────────────▶│
   │                          │                                            │
   │  ...status=completed     │                                            │
   │◀──────────────────────── │                                            │
   │  navigate to results     │                                            │
```

Warm-container cost measured on real data: **~14 seconds end to end**, dominated by LLM structured extraction during parsing (~9s) and the cross-encoder (~3s). The LLM gap analysis (~3s) runs concurrently with ranking, so it adds nothing. Cold container adds ~30-50s of one-time model loading.

---

## 4. Backend (`server/`)

FastAPI, Python 3.10, deployed as a Docker container on Google Cloud Run.

### 4.1 Directory map

```
server/
├── Dockerfile                     # Multi-stage: pip → download models → verify offline load
├── requirements.txt
├── .env.example                   # Every env var documented; production values on Cloud Run
├── migrations/                    # 5 SQL files, applied via Supabase SQL editor
├── data/
│   ├── skill_taxonomy.json        # 15 categories, ~460 canonical skill names
│   └── branch_mapping.json        # 4 buckets grouping equivalent engineering branches
└── app/
    ├── main.py                    # FastAPI app, CORS, router wiring, /warmup
    ├── core/
    │   ├── config.py              # pydantic-settings — the single source for all secrets
    │   ├── database.py            # Supabase client singleton
    │   └── security.py            # get_current_user() — verifies Supabase JWT
    ├── models/                    # Pydantic request/response schemas
    │   ├── resume.py
    │   └── company.py
    ├── api/endpoints/
    │   ├── resumes.py             # /api/resumes/*  (upload, status, get, delete)
    │   ├── companies.py           # /api/companies/*  (CRUD, /parse-jd)
    │   └── analytics.py           # /api/analytics/*  (dashboards, deterministic aggregates)
    └── services/                  # The AI/ML pipeline lives here
        ├── resume_parser.py       # PyMuPDF + LLM + GitHub → structured JSON
        ├── llm_service.py         # Provider-agnostic facade over Groq / Gemini / Ollama
        ├── embedding_engine.py    # SentenceTransformer, 384-dim, singleton
        ├── company_matcher.py     # Hard filters + soft scoring + CrossEncoder
        ├── rank_service.py        # Orchestrates a resume against all companies
        ├── ats_scorer.py          # Deterministic 0-100 ATS score
        ├── github_service.py      # Parallel GitHub API enrichment
        └── nlp_model.py           # Shared lazy-loaded spaCy singleton
```

### 4.2 The FastAPI entry point

`app/main.py` does five things:

1. **Imports `app.core.config` first** — this must precede any `sentence_transformers` import anywhere in the process, because HuggingFace's cache-location env vars are read at module import time, not model-load time. Reordering this import silently breaks the model cache path in production.
2. Sets **environment-aware CORS** — in production it requires `FRONTEND_ORIGINS` to be set and refuses to start otherwise (deliberate: silent CORS misconfiguration is worse than a crash-loop).
3. Mounts three routers under `/api/{resumes,companies,analytics}`.
4. Exposes `GET /` — a trivial welcome endpoint.
5. Exposes **`GET /warmup`** — force-loads all three ML models and returns per-model status. Used both by a scheduled keep-alive job and as a health check that surfaces the "cross-encoder failed to load" failure mode.

### 4.3 The parsing service (`resume_parser.py`)

This is the most complex service. It fuses three data sources into one candidate profile.

**Pipeline:**

1. **Text extraction** — PyMuPDF (`fitz`) for PDFs, `python-docx` for DOCX. PyMuPDF also captures embedded hyperlinks, which lets us catch GitHub/LinkedIn URLs hiding behind icons.
2. **Section splitting** — regex-based header detection. Recognizes `Education`, `Experience` (including `Research Experience`, `Internships`, `Positions of Responsibility`), `Skills`, `Projects`, `Achievements`, etc.
3. **Heuristic extraction** — for each section, targeted regex pulls out contact info, GPA (with 4.0→10.0 normalization), degree, field of study, institution, year ranges.
4. **LLM extraction** — the whole raw text is sent to Groq (`openai/gpt-oss-120b`) with a strict JSON schema. This is decisively better than heuristics at grouping bullet points into projects and at handling two-column layouts that PyMuPDF flattens into a single line stream.
5. **GitHub enrichment** — if a GitHub URL was found, `github_service` fetches repos, per-repo language breakdowns, and READMEs (all in parallel under a 20s wall-clock budget).
6. **Bayesian merge** — the three sources vote on each skill. A skill mentioned on the resume gets prior confidence 0.75; agreement with the LLM updates to ~0.95; a GitHub language at 40%+ of bytes pushes it near certainty. Every skill carries a `sources` array so the UI can distinguish *"you claimed this"* from *"we found this in your code"*.

**Output schema** (persisted as JSONB in `resumes.parsed_data`):

```json
{
  "contact": { "name", "email", "phone", "linkedin", "github" },
  "education": [ { "institution", "degree", "field", "gpa", "start_year", "end_year" } ],
  "skills": [ { "name", "confidence": 0.9, "sources": ["Resume", "GitHub (Repo: 49.9%)"] } ],
  "experience": [ { "company", "role", "duration", "description" } ],
  "projects": [ { "title", "description", "technologies": [...] } ],
  "section_order": ["education", "experience", "projects", "skills"]
}
```

### 4.4 The LLM service (`llm_service.py`)

Provider-agnostic facade. Three backends, chosen by `LLM_PROVIDER` env var:

| Provider | Use case | Default model |
|---|---|---|
| `groq` (default) | Production — free, fast (~1-3s), generous rate limit | `openai/gpt-oss-120b` |
| `gemini` | Alternative cloud provider with multi-API-key rotation | `gemini-2.0-flash` |
| `ollama` | Local development if you have Ollama running | `llama3.2:1b` |

Both cloud backends support **multi-key rotation** — supply a comma-separated list to `GROQ_API_KEYS` / `GEMINI_API_KEYS` and the service transparently rotates on 429s. Both also detect and fail fast on dead model IDs with a `CRITICAL` log, rather than silently falling back to a placeholder string.

Three call sites:

- `extract_resume_data()` — JSON extraction from raw resume text (called by the parser).
- `extract_job_description_data()` — powers the "Auto-Fill with AI" button in the Add Company dialog.
- `generate_general_ats_feedback()` — the paragraph of AI feedback shown on the results page.

### 4.5 The embedding engine (`embedding_engine.py`)

Singleton `SentenceTransformer('all-MiniLM-L6-v2')`, 384-dim output, lazy-loaded on first use.

Two roles:

- **Document embedding** — flattens a parsed resume or a JD into a dense text form and embeds it. Cached on `resumes.embedding` and `companies.jd_embedding` (pgvector columns).
- **Skill embedding** — per-skill vectors, cached in-process so the same skill string is only encoded once per container lifetime. Batched: encoding 100 skill strings takes 0.08s batched vs 0.82s individually.

`compute_similarity()` is a numpy cosine (previously a hand-written Python loop that was 1000× slower). It also transparently accepts pgvector's JSON-string return format — a subtle but important detail, because PostgREST returns `vector` columns as `"[0.1,0.2,...]"` strings, not lists.

`best_skill_similarities()` does one matrix multiply instead of an N×M scalar loop — the difference between 55,000 pure-Python cosine calls and a single BLAS operation per resume.

### 4.6 The company matcher (`company_matcher.py`)

Two-stage: hard filters, then soft scoring.

**Hard filters** — binary pass/fail:

1. **CPI/GPA cutoff** — candidate's GPA vs `min_gpa` (or legacy `cpi`).
2. **Branch eligibility** — the candidate's field of study must match one of the company's allowed branches. `"Any Branch"` is recognized as a wildcard, not treated as a literal branch name. Branch names are normalized (`"Maths & Computing"` == `"Mathematics and Computing"`) and looked up through `branch_mapping.json` for equivalence groups.
3. **DSA requirement** — if the company requires DSA competency, at least one of `["data structures", "algorithms", "dsa", "competitive programming", "problem solving"]` must appear in the candidate's skills.

**Soft scoring** — 100 points across five dimensions:

| Component | Points | How |
|---|---|---|
| Skill overlap | 30 | Exact skill matches + semantic similarity for unmatched required skills |
| Cross-encoder | 30 | `ms-marco-MiniLM-L-6-v2` cross-encoder on `(JD, flattened resume)` |
| Academic + branch fit | 15 | GPA surplus above cutoff + branch-role affinity |
| Project relevance | 15 | Overlap of project technologies with company's `project_keywords` |
| Experience | 10 | Baseline for any experience |

The cross-encoder is the expensive step. To avoid running it 139 times per upload, `rank_service` first uses the cheap bi-encoder to pick the **top-K most similar eligible companies** (default `K=30`), and only those get the full cross-encoder pass. The other eligible companies still get the remaining 70 points scored normally.

### 4.7 The ranking service (`rank_service.py`)

Orchestrates the whole compute. Two entry points:

- **`generate_rankings(resume, companies, user_id)`** — the upload path. One resume against all companies. Warms the skill-embedding cache with the entire vocabulary in one batched call, runs the two-stage pipeline, then re-ranks the user's other resumes to update everyone's position for each company.
- **`rank_resumes_for_company(company, resumes)`** — the "new company created" path. All resumes against one company, batched — the JD is encoded once, all resumes go through the CrossEncoder in one batch.

Both are pure functions; the endpoints wrap them in `asyncio.to_thread` so the event loop stays free.

### 4.8 The ATS scorer (`ats_scorer.py`)

Deterministic, no LLM. Five components, 100 points total:

| Component | Points | What it checks |
|---|---|---|
| Contact info | 15 | Email, phone, LinkedIn/GitHub each worth 5 |
| Formatting | 20 | Standard sections present, education positioned appropriately |
| Quantifiable metrics | 25 | Count of numbers/percentages/dollar amounts in bullet points |
| Action verbs | 25 | Count of unique strong verbs via spaCy POS tagging |
| Keyword density | 15 | Fraction of listed skills that actually appear in project descriptions |

The paragraph of AI feedback (`generate_gap_analysis`) is a separate function, kicked off as an async task at the same time as ranking so its 2-5s network call overlaps with the compute instead of adding to it.

### 4.9 GitHub service (`github_service.py`)

Runs when the parser detects a GitHub URL. Fetches:

- **All public repos** (paged, max 3 pages of 100).
- **Language byte-counts per repo** — parallel, 8-way thread pool, under a shared 20s wall-clock budget.
- **READMEs of repos that fuzzy-match resume project titles** (Levenshtein distance + substring check) — also parallel.

Extracts skills the resume might have missed (e.g. `Tailwind`, `spaCy`, `PostgreSQL` mentioned in a README) and language usage in bytes (which becomes the *"49.9% Python"* fingerprint).

**Requires `GITHUB_TOKEN`** — unauthenticated GitHub API is 60 requests/hour and a single resume with many repos can exhaust that. A no-scope token (which is all this needs — it only reads public data) raises the limit to 5,000/hour.

### 4.10 API endpoints reference

**`/api/resumes/`**

| Method | Path | Auth | What |
|---|---|---|---|
| POST | `/` | ✓ | Upload a PDF/DOCX. Validates extension + size, uploads to Supabase Storage, kicks off background pipeline, returns `{job_id}` immediately. |
| GET | `/status/{job_id}` | ✓ | Poll pipeline progress. Returns `{status, step, resume_id?}`. |
| GET | `/` | ✓ | List the current user's resumes (narrow payload — no `raw_text` or `parsed_data`). |
| GET | `/{resume_id}` | ✓ | Full resume detail, including rankings with populated company names. |
| DELETE | `/{resume_id}` | ✓ | Delete resume + its Storage file. |

**`/api/companies/`**

| Method | Path | Auth | What |
|---|---|---|---|
| POST | `/parse-jd` | – | Given raw JD text, returns structured company data (LLM extraction). |
| POST | `/` | ✓ | Create a company. Kicks off background re-ranking of all existing resumes against it. |
| GET | `/` | – | List all companies. |
| GET | `/{company_id}` | – | One company. |

**`/api/analytics/`** — all deterministic (no LLM), all scoped to the current user's resumes:

- `/missing-skills` — top 15 skills required by companies but missing from most of this user's candidates.
- `/company-demand` — top 20 skills across all company JDs.
- `/insights` — 5-6 template-based observations for a placement dashboard.
- `/department-comparison` — avg ATS score grouped by branch.
- `/ats-history` — trend line for the user's uploads over time.
- `/version-comparison` — same candidate email uploading multiple times, tracking their ATS score progression.

### 4.11 Configuration & secrets

Every secret goes through `pydantic-settings` in `app/core/config.py`, reading `.env` locally and OS env vars in production. Never `os.environ.get()` directly — that silently misses `.env` values since nothing calls `load_dotenv()`.

| Variable | Required? | Where set |
|---|---|---|
| `SUPABASE_URL` | ✓ | Cloud Run + local `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Cloud Run + local `.env` |
| `LLM_PROVIDER` | – (default `groq`) | Cloud Run + local `.env` |
| `GROQ_API_KEYS` | ✓ if provider is groq | Cloud Run + local `.env`, comma-separated |
| `GROQ_MODEL_NAME` | – (default `openai/gpt-oss-120b`) | Cloud Run + local `.env` |
| `GITHUB_TOKEN` | Strongly recommended | Cloud Run + local `.env` |
| `FRONTEND_ORIGINS` | ✓ in production | Cloud Run only |
| `ENVIRONMENT` | – | Cloud Run (`production`), local (`development`) |
| `SUPABASE_DB_PASSWORD` | Local only | For direct-Postgres maintenance scripts, never the API |

**Never in Vercel.** The frontend is a browser bundle — every `REACT_APP_*` variable ships to the client. Only truly public values (`REACT_APP_API_URI`, `REACT_APP_SUPABASE_ANON_KEY`) belong there.

---

## 5. Frontend (`client/`)

React 18 (Create React App / CRACO), Tailwind CSS, deployed to Vercel.

### 5.1 Directory map

```
client/
├── package.json                   # No proxy field — API URL is env-configured
├── tailwind.config.js             # Dark theme, custom tokens (background, surface, accent, ...)
└── src/
    ├── index.js                   # QueryClient + Router root
    ├── App.jsx                    # Route definitions + shell
    ├── index.css                  # Global styles + Tailwind directives + component classes
    ├── contexts/
    │   └── AuthContext.jsx        # Supabase Auth wrapper
    ├── services/
    │   ├── api.js                 # Axios instance, all backend endpoints in one file
    │   └── analyticsApi.js        # Analytics endpoints
    ├── hooks/
    │   └── useTheme.js
    ├── utils/
    │   ├── scoring.js             # Client-side score helpers
    │   └── exportPdf.js           # jsPDF-based results PDF export
    ├── pages/
    │   ├── LandingPage.jsx        # Unauthed landing
    │   ├── AuthPage.jsx           # /login and /signup (same component)
    │   ├── ATSDashboard.jsx       # Recruiter overview across all uploads
    │   ├── CandidateProfile.jsx   # Single candidate's full results
    │   ├── ResumeResultPage.jsx   # Wraps CandidateProfile for the results route
    │   └── Leaderboard.jsx        # Cross-candidate ranking per company
    └── components/
        ├── common/                # Header, Footer, ProtectedRoute
        ├── Dashboard/             # Home dashboard, FeaturesSection, PopularCompanies
        ├── Company/               # CompaniesShowcase (browse), AddCompanyModal (create)
        ├── CompanyMatch/          # ScoreBreakdown, SkillGapTable (used in expand rows)
        └── ATS/                   # ATSScoreCard
```

### 5.2 Routes

| Path | Component | Auth |
|---|---|---|
| `/` | `LandingPage` (unauthed) / `Dashboard` (authed) | – |
| `/login`, `/signup` | `AuthPage` | – |
| `/upload` | `Dashboard` | ✓ |
| `/companies` | `CompaniesShowcase` | – |
| `/ats` | `ATSDashboard` | ✓ |
| `/leaderboard` | `Leaderboard` | ✓ |
| `/resumes/:id` | `ResumeResultPage` | ✓ |

### 5.3 Data fetching

All backend calls go through **one** axios instance in `services/api.js`. `API_URL` reads `REACT_APP_API_URI` (set in Vercel env vars to the Cloud Run URL). Never hardcode URLs in components.

Reads use **`@tanstack/react-query`** — pages that share data (resumes, companies) reuse the cache, so navigating between `/`, `/ats` and back doesn't refetch.

The upload flow is a special case: `POST /api/resumes/` returns immediately with a `job_id`, and the client polls `GET /status/{job_id}` on a 3-second timer with a 100-attempt ceiling, updating a stepped progress indicator. On completion it navigates to `/resumes/{id}`.

Errors surface as an **inline dismissible banner** with `role="alert"` and `aria-live="assertive"` — never `window.alert()`, which freezes the tab and can't be styled.

### 5.4 Auth flow

Supabase Auth via `@supabase/supabase-js`. `AuthContext` holds the session and exposes `signIn` / `signUp` / `signOut`. `ProtectedRoute` redirects to `/login` if there's no session. Every backend request attaches the Supabase JWT as `Authorization: Bearer <token>`; `server/app/core/security.py` verifies it and returns the current user.

Users only see their own resumes and analytics. Companies are global.

### 5.5 Design system

Dark theme only. Tokens defined in `tailwind.config.js` (`background`, `surface`, `surface-2`, `accent`, `muted`, `line`, `line-strong`, ...) and reusable component classes in `index.css` (`.card`, `.cyber-panel`, `.chip`, `.btn-primary`, `.btn-ghost`, `.score-badge-*`).

**Do not use Tailwind's default palette** (`slate-*`, `blue-*`, etc.) — they don't match the theme.

---

## 6. Database (Supabase)

PostgreSQL with the `pgvector` extension. Row-level security is enforced on user data via the service-role key + explicit `user_id` filtering in the API.

### 6.1 Tables

| Table | Purpose |
|---|---|
| `resumes` | The parsed candidate profile, rankings JSONB, ATS score, and a 384-dim `embedding` (pgvector). Scoped per user. |
| `companies` | Global. Includes `jd_text`, a 384-dim `jd_embedding`, skill lists, and hiring criteria. |
| `rankings` | Denormalized `(resume_id, company_id, overall_score, rank, dimension_scores)` for fast leaderboard queries. |
| `jobs` | Upload-pipeline status. Text primary key = the client-facing `job_id`. Poll-friendly. |
| `ats_history` | An append-only log — one row per upload — for the ATS-trend and version-comparison analytics. |
| `auth.users` | Supabase's own auth table. Referenced by `user_id` FKs. |

Migrations live in `server/migrations/` and are applied manually via the Supabase SQL editor. After adding a column, run `NOTIFY pgrst, 'reload schema';` so PostgREST picks it up immediately (otherwise the next insert fails with `Could not find the column X in the schema cache`).

### 6.2 Storage

One bucket, `resumes`. Files are uploaded under the key `{user_id}/{uuid}{ext}`. The original filename never touches the path — that was a path-traversal risk.

---

## 7. Deployment

### 7.1 Backend — Google Cloud Run

- **Region:** `asia-south1`
- **Container:** 1 vCPU, 2 GiB memory
- **Billing:** Instance-based (`--no-cpu-throttling`) — required so the background upload task gets full CPU after the HTTP response returns
- **Scaling:** min 0, max 2 (staying at $0/month baseline)
- **Startup CPU boost:** enabled
- **CI/CD:** Cloud Build trigger on every push to `main` in `Resume_Ranker_Backend`
- **Dockerfile design:** downloads all three ML models at build time and runs a build-time verification step that loads them from the baked cache with `HF_HUB_OFFLINE=1` — the build fails if the cache path is wrong, rather than shipping a container that silently fails to load the cross-encoder at runtime

### 7.2 Frontend — Vercel

- **Framework:** Create React App
- **Env vars:** `REACT_APP_API_URI` (Cloud Run URL), `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
- **CI/CD:** Auto-deploy on push to `main` in `Resume_Ranker_Frontend`

### 7.3 Keep-alive

`.github/workflows/keepalive.yml` runs every 10 minutes:

- Hits `GET /warmup` on Cloud Run — force-loads all three models and verifies they load (a `degraded` response fails the workflow, catching a broken deployment before uploads start scoring at 70%).
- Hits Supabase with a trivial `SELECT` to keep the free-tier project from auto-pausing after 7 days of inactivity.

Not a hard guarantee — Cloud Run can still reclaim an instance, and concurrent requests can spin up a cold one. The only real fix is `--min-instances=1`, which ends the $0/month bill.

---

## 8. Performance profile

Measured on real data (139 companies, warm container):

| Stage | Time |
|---|---|
| Parse PDF + LLM extraction + GitHub enrichment | 9.61s |
| ATS score (deterministic) | 0.21s |
| Resume embedding | 0.08s |
| Fetch companies | 0.72s |
| Warm skill vocabulary | 0.34s |
| Hard filter + bi-encoder | 0.03s |
| Batched cross-encoder (top 30) | 3.01s |
| Score top-K | 0.02s |
| LLM gap analysis (overlapped) | 3.31s |
| **Total (with overlap)** | **~14s** |

Cold container adds ~30-50s of one-time model loading. The `/warmup` endpoint plus the keep-alive workflow keeps most uploads on the warm path.

Known biggest remaining levers: LLM extraction (~9s) and the cross-encoder pass (~3s). The LLM call could overlap with GitHub enrichment; the cross-encoder is already batched, so shortening it further means a smaller model or a smaller top-K.

---

## 9. Local development

### 9.1 Backend

```bash
cd server
python -m venv venv && venv\Scripts\activate     # or `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env                              # fill in the values
uvicorn app.main:app --reload --port 8000
```

First request takes ~30-50s to load models. Subsequent requests are fast. Swagger UI at `http://localhost:8000/docs`.

### 9.2 Frontend

```bash
cd client
npm install
cp .env.example .env.local                        # set REACT_APP_API_URI=http://localhost:8000/api
npm start
```

Runs at `http://localhost:3000` and calls the local backend directly.

### 9.3 One-off maintenance scripts

`server/check_schema.py`, `alter_jobs.py`, `scratch_migration.py` — connect directly to Postgres via `psycopg2`. Never used by the running API. They read `SUPABASE_DB_PASSWORD` from `.env`; excluded from the Docker image via `.dockerignore` so they don't ship to production.

---

## 10. Key design decisions worth understanding

**Everything is a Bayesian merge, not a hierarchy.** Skills, education fields, project titles — each source (regex, LLM, GitHub) contributes evidence with a confidence. This is why the results page can distinguish *"you claimed this"* from *"we verified this in your code"* from *"you didn't list this but you clearly know it"*.

**LLM output is treated as a suggestion, not a source of truth.** Every LLM call has a heuristic fallback that produces something usable if the LLM fails, is misconfigured, or is rate-limited. Every LLM output is validated (JSON schema, sanity checks against section presence). A hallucinated experience section is silently discarded if no experience-bearing header was found in the document.

**Lazy-load everything expensive.** The models (embedding, cross-encoder, spaCy) are loaded on first use, not at import. This lets uvicorn bind its port immediately on cold start — Cloud Run's startup probe has a timeout that eager loading was blowing past.

**The pre-filter must be numerically real.** The cross-encoder pass is the biggest cost per upload. Its input — the top-K most-similar companies by bi-encoder cosine — has to actually rank companies. When pgvector was returning stored vectors as JSON strings, the pure-Python similarity comparison silently returned 0.0 for every company and the "top 30" was arbitrary. The fix (in `_as_vector()`) transparently accepts both list and string forms.

**Compute and I/O overlap wherever possible.** The LLM gap analysis kicks off before ranking runs and is awaited only after — hiding its ~3s network round-trip behind compute the pipeline was going to do anyway. GitHub enrichment fetches all repos in parallel under a shared time budget. Bulk DB writes go out in one batched call.

**Fail loudly, or don't fail at all.** Config errors that used to be silent (missing `FRONTEND_ORIGINS`, wrong CrossEncoder cache path, dead LLM model ID) now either refuse to start or log `CRITICAL`. Anything that was worth catching quietly (an LLM timeout, a single company failing to score) is caught and logged but does not fail the whole upload.

---

## 11. Where to look for things

**"How does the upload actually work?"** → [server/app/api/endpoints/resumes.py](../server/app/api/endpoints/resumes.py), function `process_resume_background`.

**"How is a match score computed?"** → [server/app/services/company_matcher.py](../server/app/services/company_matcher.py), method `compute_company_score`.

**"How is the ATS score computed?"** → [server/app/services/ats_scorer.py](../server/app/services/ats_scorer.py), function `calculate_general_score`.

**"How do I add a new backend endpoint?"** → Add it to the relevant router in `server/app/api/endpoints/`, then add the wrapper in `client/src/services/api.js`. Never call fetch/axios from a component directly.

**"How do I add a new secret?"** → Add the field to `Settings` in `server/app/core/config.py`, document it in `server/.env.example`, then set it locally in `server/.env` and on Cloud Run (or Vercel if it's a `REACT_APP_*` public value).

**"Where's the DB schema?"** → `server/migrations/*.sql`, in numeric order. Latest schema is the union of all applied migrations.

**"How do I run the pipeline manually against a PDF?"** → `python -c "from app.services.resume_parser import ResumeParser; import json; print(json.dumps(ResumeParser().parse('path/to/file.pdf'), indent=2, default=str))"` from `server/`.

---

## 12. Related documents

- [README.md](../README.md) — public-facing pitch
- [Deployment_Documentation.md](../Deployment_Documentation.md) — deployment history
- [master_implementation_log.md](../master_implementation_log.md) — the AI/ML build log
- [PhasePlan.md](../PhasePlan.md) — original phase-by-phase task division
- [plan.md](../plan.md) — architecture audit + remediation log
- [docs/documentation.md](./documentation.md) — earlier documentation revision
- [docs/git_workflow.md](./git_workflow.md) — branching/PR convention
- [docs/architecture.mmd](./architecture.mmd) — Mermaid architecture diagram source
