# AI Social Media Manager 🚀

> **AI-Powered Photo Enhancement & Automated Instagram Publishing Platform for Cafe & Bakery Owners.**

Transform raw, dim, or messy phone photos into professional, studio-quality Instagram posts complete with AI food photography styling, tailored captions, optimal hashtags, logo overlays, and automated scheduling via Meta Graph API.

---

## 🌟 Architecture Highlights

* 🧪 **Phase 0 AI Proof of Concept:** Tested and validated on 30–50 real cafe photos for quality, latency, and cost consistency.
* 📲 **Phase 0.5 Meta Developer Readiness:** Sandbox test accounts, Facebook page linkage, and permission review setup (`instagram_basic`, `instagram_content_publish`).
* 💻 **Local Native Stack:** Pure local execution without Docker (FastAPI, React + TailwindCSS, PostgreSQL, Redis, Celery).
* 🎨 **Frontend Design System:** Built using **React 18 + Vite + TailwindCSS** with `lucide-react` icons and utility-first responsive styling.
* 📁 **Runtime Markdown Prompt Templates:** Prompts externalized as clean `.md` files under `prompts/image/*.md` and `prompts/caption/*.md`.
* ⚡ **Granular Celery Task Queue:** Single-responsibility workers for image processing, caption generation, publishing, token refresh, and Cloudinary asset cleanup.
* 📦 **2-Stage Cloudinary Lifecycle:** Upload -> 1080x1080 local downscale -> Staging -> Permanent move on approval -> Automatic orphan asset purge.
* 📊 **Async Job Progress Streaming (SSE):** Real-time feedback (`QUEUED` -> `UPLOADING` -> `AI_EDITING` -> `GENERATING_CAPTION` -> `CREATING_PREVIEW` -> `READY`).

---

## 🛠️ Updated Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18 (Vite), **TailwindCSS**, Lucide Icons, Zustand, Axios |
| **Backend API** | FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 ORM, Alembic |
| **Task Queue & Scheduler** | Celery + Redis |
| **Database** | Local PostgreSQL 15 |
| **AI Models** | Google Gemini 2.5 Flash Image & Gemini 1.5 Flash Text |
| **Media Hosting** | Cloudinary CDN |
| **Execution Mode** | Local Native (pip / venv + npm) |

---

## 📚 Project Documentation

* 📄 [`IMPLEMENTATION_PLAN.md`](file:///d:/social%20media%20manager/IMPLEMENTATION_PLAN.md): Local Native Implementation Roadmap
* 📄 [`PRD.md`](file:///d:/social%20media%20manager/PRD.md): Product Requirements & Risk Mitigation
* 📄 [`SRS.md`](file:///d:/social%20media%20manager/SRS.md): Software Requirements & Celery Task Architecture
* 📄 [`API_DOCUMENTATION.md`](file:///d:/social%20media%20manager/API_DOCUMENTATION.md): REST & SSE Job Stream Specification
* 📄 [`DATABASE_DESIGN.md`](file:///d:/social%20media%20manager/DATABASE_DESIGN.md): PostgreSQL Schema & Alembic Migration Setup
