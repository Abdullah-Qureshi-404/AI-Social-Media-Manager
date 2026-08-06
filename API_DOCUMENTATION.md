# API Documentation
## AI Social Media Manager REST & SSE API
**Base URL:** `/api/v1`  
**Authentication:** `Bearer <JWT_ACCESS_TOKEN>`  
**Content-Type:** `application/json` (except multipart image upload)  

---

## 1. Middleware & System Headers

### Global Response Headers
All responses include:
* `X-Request-ID`: Unique tracking UUID for request tracing.
* `X-RateLimit-Limit`: Maximum allowed requests per window.
* `X-RateLimit-Remaining`: Remaining requests in current window.

---

## 2. Job Status & SSE Endpoints

### 2.1 `GET /api/v1/jobs/{job_id}/stream`
* **Description:** Real-time Server-Sent Events (SSE) endpoint streaming job progress feedback.
* **Header:** `Accept: text/event-stream`
* **Stream Events:**
  ```json
  event: job_update
  data: {
    "job_id": "job_12345",
    "post_id": "post_67890",
    "status": "AI_EDITING",
    "progress_percent": 45,
    "message": "Gemini AI is fixing lighting and enhancing food details..."
  }
  ```

---

## 3. Post Creation & AI Endpoints

### 3.1 `POST /api/v1/posts/upload`
* **Description:** Stage raw phone photo. Downscales to 1080x1080 and uploads to Cloudinary temporary folder.
* **Content-Type:** `multipart/form-data`
* **Form Data:** `file: <binary image file>`
* **Response (201 Created):**
  ```json
  {
    "post_id": "98765432-10ab-cded-ef01-234567890abc",
    "status": "UPLOADED",
    "temp_image_url": "https://res.cloudinary.com/demo/image/upload/v1234/temp/raw_photo.jpg",
    "job_id": "job_12345"
  }
  ```

### 3.2 `POST /api/v1/posts/{post_id}/ai-edit`
* **Description:** Trigger `image_ai.py` service.
* **Request Body:**
  ```json
  {
    "preset_name": "golden_hour",
    "custom_instruction": "soft warm lighting on muffin, rustic table background"
  }
  ```
* **Response (202 Accepted):**
  ```json
  {
    "job_id": "job_67890",
    "status": "QUEUED",
    "message": "AI image editing queued"
  }
  ```

### 3.3 `POST /api/v1/posts/{post_id}/generate-captions`
* **Description:** Trigger `caption_ai.py` text service using `prompts/caption/*.md`.
* **Response (202 Accepted):**
  ```json
  {
    "job_id": "job_77889",
    "status": "QUEUED"
  }
  ```

### 3.4 `POST /api/v1/posts/{post_id}/approve`
* **Description:** Final user approval of post. Promotes Cloudinary asset from temporary staging to permanent storage folder and updates state to `APPROVED`.
* **Response (200 OK):**
  ```json
  {
    "post_id": "98765432-10ab-cded-ef01-234567890abc",
    "status": "APPROVED",
    "permanent_image_url": "https://res.cloudinary.com/demo/image/upload/v1235/perm/final_approved.jpg"
  }
  ```
