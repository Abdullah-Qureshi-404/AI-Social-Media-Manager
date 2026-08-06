# Database Design Specification
## AI Social Media Manager PostgreSQL Schema
**Database Management System:** PostgreSQL 15+  
**ORM:** SQLAlchemy 2.0  
**Migration Tool:** Alembic (Phase 2 dedicated setup)  
**Multi-Tenancy Model:** V1 User-Level Row Filtering (Prepared for V2 Organization Upgrade)  

---

## 1. Multi-Tenancy Architecture & Data Isolation

The application is a **SaaS (Software-as-a-Service) multi-tenant platform**. For V1, the tenant isolation boundary is at the **User Level** (`user_id`). 

### Tenant Isolation Rules:
1. **Strict Query Scoping:** Every database repository method MUST enforce tenant isolation via `WHERE user_id = :current_user_id`.
2. **Indexed Tenant Columns:** All tenant-owned tables (`posts`, `post_image_versions`, `analytics`, `audit_logs`) possess dedicated B-Tree indexes on `user_id`.
3. **Cloudinary Asset Scoping:** Assets are stored in tenant-isolated Cloudinary folders: `temp/{user_id}/` and `perm/{user_id}/`.
4. **V2 Migration Readiness:** Schema column names and foreign keys follow strict conventions to allow seamless migration to `organization_id` when multi-user team workspaces are introduced in V2.

```
 +---------------+         +---------------------+        +--------------------+
 |     users     | 1 --- * |        posts        | 1 -- * | post_image_versions|
 | (Tenant Root) |         | (WHERE user_id = ?) |        | (WHERE post_id = ?)|
 +---------------+         +---------------------+        +--------------------+
         |                            |
         | 1                          | 1
         *                            *
 +---------------+         +---------------------+        +--------------------+
 |  audit_logs   |         |     post_tags       | * -- 1 |        tags        |
 | (user_id idx) |         | (user_id scoped)    |        | (Global / Shared)  |
 +---------------+         +---------------------+        +--------------------+
                                      | 1
                                      * 1
                           +---------------------+
                           |      analytics      |
                           | (user_id via post)  |
                           +---------------------+
```

---

## 2. DDL & Migration Workflow (Alembic)

All schema changes are managed strictly via Alembic migrations (`alembic revision --autogenerate -m "description"`).

```sql
CREATE TYPE post_status_enum AS ENUM (
    'UPLOADED',
    'PROCESSING_IMAGE',
    'IMAGE_READY',
    'CAPTION_READY',
    'WAITING_APPROVAL',
    'APPROVED',
    'SCHEDULED',
    'POSTING',
    'PUBLISHED',
    'FAILED',
    'RETRYING'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    brand_voice VARCHAR(50) DEFAULT 'friendly' CHECK (brand_voice IN ('friendly', 'professional', 'fun', 'minimal')),
    logo_url TEXT,
    instagram_user_id VARCHAR(100),
    instagram_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status post_status_enum NOT NULL DEFAULT 'UPLOADED',
    original_image_url TEXT NOT NULL,
    temp_image_url TEXT,
    permanent_image_url TEXT,
    caption TEXT,
    edit_count INT DEFAULT 0,
    max_edits_allowed INT DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    instagram_media_id VARCHAR(100),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compound Index for Fast Tenant-Scoped Polling
CREATE INDEX idx_posts_user_tenant ON posts(user_id, status);
CREATE INDEX idx_posts_scheduled_due ON posts(status, scheduled_at) WHERE deleted_at IS NULL;
```
