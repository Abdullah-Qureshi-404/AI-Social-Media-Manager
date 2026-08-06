# Software Requirements Specification (SRS)
## AI Social Media Manager
**Version:** 2.1 (Multi-Tenant Architecture Specification)  

---

## 1. Multi-Tenant Architecture & Data Isolation

```
 +-----------------------------------------------------------------------+
 |                            React Frontend                             |
 |           (Vite + React Query + Zustand + SSE Job Progress)           |
 +-----------------------------------+-----------------------------------+
                                     |
                          REST API / | SSE Streaming (JWT Auth)
                                     v
 +-----------------------------------------------------------------------+
 |                           FastAPI Backend                             |
 |  [Middlewares: Request ID, Security Headers, CORS, Rate Limit, Audit] |
 |                                                                       |
 |   Routers -> Services (image_ai, caption_ai) -> Repositories -> DB    |
 |            (Enforces tenant boundary WHERE user_id = ?)               |
 +---+-------------------------------+-------------------------------+---+
     |                               |                               |
     v                               v                               v
+----+---------+            +--------+--------+            +---------+-----+
| PostgreSQL 15|            |  Cloudinary CDN |            |  Redis Broker |
| (Multi-Tenant|            | (Staging & Perm |            | & Result Store|
|  user_id)    |            |  user_id paths) |            +--------+------+
+--------------+            +-----------------+                     |
                                                                    v
                                                           +--------+------+
                                                           | Celery Worker |
                                                           | & Celery Beat |
                                                           +--------+------+
                                                                    |
                                                                    v
                                                           +--------+------+
                                                           | Instagram API |
                                                           +---------------+
```

---

## 2. Multi-Tenant Repository Pattern Specification

Every repository class MUST accept `user_id` as a mandatory parameter to guarantee strict tenant data isolation:

```python
class PostRepository(BaseRepository[Post]):
    async def get_posts_by_tenant(self, db: AsyncSession, user_id: UUID, page: int = 1, limit: int = 20):
        stmt = select(Post).where(Post.user_id == user_id, Post.deleted_at.is_(None)).offset((page - 1) * limit).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_post_by_id(self, db: AsyncSession, post_id: UUID, user_id: UUID):
        stmt = select(Post).where(Post.id == post_id, Post.user_id == user_id, Post.deleted_at.is_(None))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
```

---

## 3. Granular Celery Task Specifications

1. `tasks.process_image`: Sends 1080x1080 image to Gemini 2.5 Flash Image. Staged in `temp/{user_id}/`.
2. `tasks.generate_caption`: Sends image to Gemini 1.5 Flash text API using `prompts/caption/*.md`.
3. `tasks.render_overlay`: Runs Pillow overlay script to apply caption text and cafe logo watermark.
4. `tasks.publish_post`: Triggered by Celery Beat scheduler for due scheduled posts.
5. `tasks.refresh_instagram_tokens`: Runs daily to check tokens expiring within 10 days per tenant.
6. `tasks.fetch_instagram_analytics`: Polls Meta Graph API for post likes, reach, and saves per tenant.
7. `tasks.cleanup_temp_images`: Nightly cleanup of temporary images older than 24 hours.
8. `tasks.cleanup_orphan_assets`: Weekly task removing deleted post assets from storage.
