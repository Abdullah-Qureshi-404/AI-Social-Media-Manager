# Production Implementation Plan & Architecture Roadmap
## AI Social Media Manager (V2.1 - Multi-Tenant SaaS Specification)

**Authors:** Senior Software Architect, Senior Full Stack Engineer, DevOps & Product Architect  
**Target Platform:** Mobile-First Responsive Web Application (Cafe & Bakery Social Management)  
**Primary Integration:** Google Gemini API (2.5 Flash Image & 1.5 Flash Text) + Meta Instagram Graph API  
**Architecture:** Multi-Tenant SaaS (V1 User-Level Data Isolation) | Local Native Execution  

---

## 1. Executive Architectural Summary & Design Principles

This document presents a **production-oriented, scalable, maintainable, multi-tenant SaaS implementation roadmap** designed for local native execution.

### Multi-Tenancy Architecture Principles (V1)
1. **User-Level Tenant Boundary:** Each registered cafe/bakery owner is an isolated tenant (`user_id`).
2. **Strict Repository Data Isolation:** All database repository methods (`get_posts`, `get_post_by_id`, `delete_post`) strictly enforce `WHERE user_id = current_user_id`. No query accesses resources without tenant filtering.
3. **Per-Tenant Usage Guards & Rate Limits:** Cloudinary asset folders (`temp/{user_id}/`, `perm/{user_id}/`), Gemini AI edit limits (3 edits/post, 10 edits/hr), and Meta API tokens are isolated per tenant.
4. **V2 Migration Readiness:** Schema and repositories are structured for migration to `organization_id` when multi-user team workspaces are introduced in V2.

### Technical Design Choices
* **Local Native Execution:** Runs natively on local development environment (Python Virtual Environment, Local PostgreSQL, Local Redis, Celery worker/beat processes, and Vite dev server with TailwindCSS).
* **Frontend Stack:** React 18 + Vite with **TailwindCSS** for rapid, utility-first responsive styling and UI library integrations (Lucide Icons, Zustand, Axios).
* **Phase 0 AI Benchmark:** 1-week technical validation testing Gemini 2.5 Flash Image on 30–50 real cafe photos.
* **Phase 0.5 Meta App Review Setup:** Parallel track for Meta App Review setup (`instagram_basic`, `instagram_content_publish`).
* **Runtime External Prompt Templates:** Markdown prompt files under `prompts/image/*.md` and `prompts/caption/*.md` loaded dynamically by AI services.
* **Granular Celery Tasks:** Single-responsibility workers with exponential backoff retries (1m -> 5m -> 15m).
* **Real-time SSE Status Streaming:** Job progress streamed via Server-Sent Events (`QUEUED` -> `AI_EDITING` -> `CREATING_PREVIEW` -> `READY`).

---

## 2. Directory & Component Structure

```text
d:/social media manager/
├── .env.example
├── PRD.md
├── SRS.md
├── API_DOCUMENTATION.md
├── DATABASE_DESIGN.md
├── IMPLEMENTATION_PLAN.md
├── README.md
│
├── prompts/                         # External Markdown Prompt Templates
│   ├── image/
│   │   ├── food_enhancement_base.md
│   │   ├── golden_hour.md
│   │   ├── rustic_cafe.md
│   │   ├── dark_moody.md
│   │   └── clean_minimalist.md
│   ├── caption/
│   │   ├── friendly.md
│   │   ├── professional.md
│   │   ├── playful.md
│   │   └── minimal.md
│   └── hashtags/
│       └── food_hashtags.md
│
├── backend/                         # FastAPI Python Backend
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/                    # Database Migration Versions
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py                 # FastAPI Application Entrypoint
│       ├── constants.py            # System Configuration Constants
│       ├── api/                    # API Route Handlers
│       │   ├── v1/
│       │   │   ├── router.py
│       │   │   ├── auth.py
│       │   │   ├── posts.py
│       │   │   ├── jobs.py
│       │   │   ├── users.py
│       │   │   └── health.py
│       │   └── dependencies.py     # Auth & Tenant Dependencies
│       ├── core/                   # Infrastructure Core
│       │   ├── config.py           # Pydantic BaseSettings
│       │   ├── security.py         # JWT & Password Hashing
│       │   ├── logging.py          # Structured JSON Logger
│       │   ├── database.py         # SQLAlchemy Async Engine
│       │   └── celery_app.py       # Celery Worker Configuration
│       ├── middleware/             # HTTP Middlewares
│       │   ├── request_id.py       # X-Request-ID Middleware
│       │   ├── exception_handler.py# Global Error Normalization
│       │   ├── rate_limit.py       # Slowapi Redis Rate Limiter
│       │   └── audit_logger.py     # Audit Trail Logging
│       ├── models/                 # SQLAlchemy Multi-Tenant Database Entities
│       │   ├── user.py             # Tenant Owner Entity
│       │   ├── post.py             # Tenant-scoped Post Entity
│       │   ├── post_version.py     # Tenant-scoped Edit Stack
│       │   ├── tag.py              # Shared Hashtag Catalog
│       │   ├── analytics.py        # Tenant Post Metrics
│       │   └── audit_log.py        # Tenant Action History
│       ├── schemas/                # Pydantic Request/Response Models
│       │   ├── auth.py
│       │   ├── post.py
│       │   ├── job.py
│       │   └── user.py
│       ├── repositories/           # Multi-Tenant Data Access Layer
│       │   ├── base_repository.py  # Generic Tenant Query Helper
│       │   ├── user_repository.py
│       │   ├── post_repository.py  # Enforces WHERE user_id = ?
│       │   └── tag_repository.py
│       ├── services/               # Core Domain Business Logic
│       │   ├── prompt_loader.py    # Runtime .md Prompt Loader
│       │   ├── image_ai.py         # Gemini 2.5 Flash Image Service
│       │   ├── caption_ai.py       # Gemini 1.5 Flash Text Service
│       │   ├── overlay_service.py  # Pillow Overlay Engine
│       │   ├── cloudinary_service.py # Tenant-scoped Staging & Perm Move
│       │   └── instagram_service.py  # Meta Graph API Connector
│       ├── tasks/                  # Granular Celery Background Tasks
│       │   ├── process_image.py
│       │   ├── generate_caption.py
│       │   ├── render_overlay.py
│       │   ├── publish_post.py
│       │   ├── refresh_tokens.py
│       │   ├── fetch_analytics.py
│       │   └── cleanup_assets.py
│       └── utils/                  # Helper Utilities
│           └── image_resizer.py    # 1080x1080 pillow downscaling
│
└── frontend/                        # React + TailwindCSS Frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── index.css               # Tailwind directives & custom theme
        ├── api/                    # Axios API Client & SSE Connectors
        │   ├── client.js
        │   ├── postsApi.js
        │   └── jobStreamer.js
        ├── store/                  # Client State Management (Zustand)
        │   ├── authStore.js
        │   └── postFlowStore.js
        ├── components/             # Reusable Tailwind UI Components
        │   ├── layout/
        │   │   ├── Header.jsx
        │   │   └── Sidebar.jsx
        │   ├── post/
        │   │   ├── ImageUploader.jsx
        │   │   ├── JobProgressTracker.jsx
        │   │   ├── ComparisonSlider.jsx
        │   │   ├── PresetSelector.jsx
        │   │   ├── CaptionPicker.jsx
        │   │   ├── OverlayEditor.jsx
        │   │   └── ScheduleModal.jsx
        │   └── ui/
        │       ├── Button.jsx
        │       ├── Toast.jsx
        │       └── Card.jsx
        ├── pages/                  # Page Views
        │   ├── Dashboard.jsx
        │   ├── CreatePost.jsx
        │   ├── PostHistory.jsx
        │   └── Settings.jsx
        └── utils/
            └── cn.js               # Tailwind class merging utility
```

---

## 3. Implementation Roadmap (Phased Development)

### Phase 0: AI Benchmark Proof of Concept (PoC)
* **Goal:** Benchmark Gemini 2.5 Flash Image on 30–50 real food/bakery photos.

### Phase 0.5: Meta Developer Sandbox & App Review Readiness
* **Goal:** Set up Meta Developer App in parallel to avoid publish blockage later.

### Phase 1: Environment Setup & Local Infrastructure Setup
* **Goal:** Prepare local Python environment, PostgreSQL database `social_media_manager`, and Redis server.

### Phase 2: Database Migration System (Alembic) & Multi-Tenant Repository Layer
* **Goal:** Establish database schema with Alembic versioning and multi-tenant repository classes (`WHERE user_id = ?`).

### Phase 3: Middlewares, Security, Audit Logging & Health System
* **Goal:** Request ID tracing, structured JSON logging, rate limiting middleware, and health endpoints.

### Phase 4: Modular AI Microservices, Prompt Loader & Pillow Overlay Engine
* **Goal:** External Markdown prompt loader (`prompts/image/*.md`, `prompts/caption/*.md`), Gemini AI services, Pillow overlay engine.

### Phase 5: Granular Celery Tasks, Scheduler & Cloudinary Staging Lifecycle
* **Goal:** Isolated background workers and tenant-scoped Cloudinary staging (`temp/{user_id}/` -> `perm/{user_id}/`).

### Phase 6: Async Job Status Streaming (SSE) & React + TailwindCSS Frontend Shell
* **Goal:** Mobile-responsive UI with TailwindCSS and SSE job progress tracking.

### Phase 7: Meta Instagram Graph API Publishing & Token Refresh
* **Goal:** Automated 2-step Meta publishing and token health checks per tenant.

### Phase 8: End-to-End Multi-Tenant Integration & Verification
* **Goal:** Validate tenant data isolation, end-to-end post creation, scheduled publishing, and orphan asset cleanup.
