# Product Requirements Document (PRD)
## AI Social Media Manager
**Version:** 2.1 (Multi-Tenant SaaS Specification)  
**Target Audience:** Cafe & Bakery Owners (Small Business Content Creators)  
**Primary Platform:** Instagram Graph API  
**Business Model:** Multi-Tenant Software-as-a-Service (SaaS)  
**Status:** Approved Production Specification  

---

## 1. Executive Summary & Multi-Tenant Vision
The **AI Social Media Manager** is a multi-tenant SaaS social media automation platform designed for non-technical small business owners (cafes, bakeries, food trucks, artisanal shops). 

### Multi-Tenancy Architecture Principles (V1)
* **Tenant Isolation:** Each registered cafe/bakery owner operates within an isolated tenant boundary (`user_id`).
* **Tenant-Scoped Data Security:** Posts, AI image edit histories, captions, scheduled publishing, and Meta access tokens are strictly isolated per tenant.
* **Per-Tenant Rate Limits & Usage Guards:** AI image editing is capped at 3 free edits per post and 10 edits per hour per tenant to ensure cost control and prevent API abuse.
* **Future V2 Upgrade Path:** Schema and API repositories are designed to seamlessly upgrade to multi-user organization accounts (`organization_id`) in V2.

---

## 2. Core Workflows & Multi-Tenant Features

1. **Phase 0 AI Validation:** Validated via 30–50 real cafe photo tests for quality, cost, and latency consistency.
2. **Tenant-Isolated Asset Ingestion:** Photos are compressed to 1080x1080 and uploaded to tenant-isolated Cloudinary staging (`/temp/{user_id}/`).
3. **Modular AI Microservices:**
   * `image_ai.py`: Enhances photo lighting using **Gemini 2.5 Flash Image** driven by `prompts/image/*.md`.
   * `caption_ai.py`: Generates 3 brand-voiced caption variations (Casual, Professional, Engaging) using **Gemini 1.5 Flash Text** driven by `prompts/caption/*.md`.
4. **Pillow Graphics Overlay Service:** Adds text overlays and cafe logo watermarks without altering source image quality.
5. **Real-Time Tenant Job Streaming:** Real-time job feedback (`QUEUED` -> `UPLOADING` -> `AI_EDITING` -> `GENERATING_CAPTION` -> `CREATING_PREVIEW` -> `READY`) streamed via Server-Sent Events (SSE) scoped to the tenant session.
6. **Celery Multi-Tenant Scheduler:** Granular workers checking scheduled posts for due tenants every minute with exponential backoff retries.

---

## 3. Comprehensive Feature Scope & V1 SaaS Boundaries

### 3.1 Core Features (V1 Portfolio Scope)
1. **Multi-Tenant Auth & Business Profile:** JWT auth with HTTP-only refresh tokens, Instagram Business account linking, and automated daily 60-day token health checks per tenant.
2. **Cloudinary 2-Stage Asset Lifecycle:** Temporary upload staging (`temp/{user_id}/`), automatic 1080x1080 downscaling, user approval move to permanent storage (`perm/{user_id}/`), and nightly orphan asset purge.
3. **AI Food Photo Enhancement & Markdown Prompts:**
   * 4 presets: *Golden Hour Warmth*, *Rustic Cafe*, *Clean Minimalist*, *Dark Moody*.
   * Undo/redo version comparison (`post_image_versions`).
   * Rate limiting: 3 free edits per post, max 10 edits/hour per tenant.
4. **AI Caption & Hashtag Engine:** 3 caption options generated via `prompts/caption/*.md` + 10-15 hashtag suggestions.
5. **Pillow Overlay Engine:** Caption text overlay & cafe logo watermarking.
6. **Real-time Job Progress Streaming (SSE):** Scoped job status tracking.

### 3.2 Deferred Phase 2 Scope (Post-V1 Multi-User Workspace)
* Multi-user organizations & team roles (`Owner`, `Manager`, `Creator`).
* Instagram Carousel support & vertical 9:16 Story auto-resizing.
* Pre-publish engagement prediction score.
