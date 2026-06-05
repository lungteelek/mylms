# LMS System Architecture

## Goals

- รองรับ Web, iOS, Android จาก backend เดียว
- รองรับ `SaaS multi-tenant` และ `self-hosted license`
- รองรับ lesson tree หลายชั้น, video learning, transcript, AI tutor, AI planner
- แยกสิทธิ์ `owner`, `admin`, `tutor`, `student`
- รองรับ payment gateway ไทย, notifications, analytics, AI retrieval แบบ tenant-safe

## Recommended Stack

### Frontend

- Web: `Next.js App Router + TypeScript`
- Mobile: `Expo / React Native + TypeScript`
- Shared package: validation types, API client, auth DTOs, planner DTOs

### Backend

- API: `Node.js + NestJS`
- ORM: `Prisma`
- Auth: Google OAuth + JWT + refresh token
- Jobs: `BullMQ + Redis`

### Data / Infra

- Main DB: `PostgreSQL`
- Hierarchy: `ltree` for lesson tree path
- Vector search: `pgvector`
- Cache / queue: `Redis`
- Object storage: `S3 / Cloudflare R2`
- Video: `Mux` or `Cloudflare Stream`

### AI

- LLM / reasoning: `OpenAI Responses API`
- Speech-to-text: `OpenAI speech-to-text`
- Embeddings: `OpenAI embeddings`
- Optional provider fallback: `Gemini`

### Notifications / Payment

- Push: `FCM + APNs` or `expo-notifications`
- Payment: `Omise/Opn` or `2C2P`

## Logical Architecture

```text
[Web Next.js] --------\
[iOS Expo] ----------- > [API Gateway / NestJS]
[Android Expo] ------/

                           |-- Auth Module
                           |-- Tenant / RBAC Module
                           |-- Course Builder Module
                           |-- Media Module
                           |-- Enrollment Module
                           |-- Planner Module
                           |-- Billing Module
                           |-- Notification Module
                           |-- AI Module

API / Workers
  -> PostgreSQL
  -> Redis / BullMQ
  -> S3 / R2
  -> Video Provider
  -> OpenAI / Gemini
  -> Payment Gateway
  -> Push Providers
```

## Bounded Contexts

### Tenant & Access

- tenants
- tenant_memberships
- licenses
- feature_flags
- audit_logs

### Identity

- users
- user_profiles
- oauth_accounts
- refresh_tokens

### Course Delivery

- courses
- course_instructors
- lesson_nodes
- lesson_contents
- lesson_assets
- video_assets
- video_transcripts
- transcript_segments

### Learning Progress

- enrollments
- lesson_progress
- playback_sessions
- study_availability
- study_plans
- study_plan_items

### AI Knowledge / Tutor

- knowledge_bases
- kb_documents
- kb_chunks
- ai_chat_sessions
- ai_chat_messages

### Notifications / Billing

- notification_devices
- `notification_devices.platform` รองรับ `web`, `ios`, `android`, `line`, `telegram`
- notification_rules
- notifications
- payments
- payment_webhooks

## ER Diagram (Text)

```text
tenants 1---N tenant_memberships N---1 users
tenants 1---N licenses
tenants 1---N feature_flags

users 1---1 user_profiles
users 1---N oauth_accounts

tenants 1---N courses
courses 1---N course_instructors N---1 users
courses 1---N lesson_nodes
lesson_nodes 1---N lesson_nodes (self parent-child)
lesson_nodes 1---N lesson_assets
lesson_nodes 1---1 lesson_contents
lesson_nodes 1---N video_assets

video_assets 1---N video_transcripts
video_transcripts 1---N transcript_segments

users N---M courses via enrollments
enrollments 1---N lesson_progress
users 1---N playback_sessions

users 1---N study_availability
users 1---N study_plans
study_plans 1---N study_plan_items
study_plan_items N---1 lesson_nodes

tenants 1---N knowledge_bases
knowledge_bases 1---N kb_documents
kb_documents 1---N kb_chunks

users 1---N ai_chat_sessions
ai_chat_sessions 1---N ai_chat_messages

users 1---N notification_devices
users 1---N notification_rules
users 1---N notifications

tenants 1---N payments
users 1---N payments
courses 1---N payments
payments 1---N payment_webhooks (logical association by gateway_ref/event)
```

## RBAC

### Roles

- `owner`: จัดการ tenant, billing, users, courses, reports
- `admin`: จัดการนักเรียน, billing read, enrollment, support
- `tutor`: จัดการ course content, lesson, video, KB, transcript
- `student`: เรียน, chat กับ AI tutor, planner, download resources

### Enforcement

- Tenant resolution from subdomain/header/license context
- JWT contains `tenant_id`, `membership_role`, `user_id`
- Every query must filter by `tenant_id`
- Self-hosted mode can still use same tenant boundary with one active tenant

## Multi-Level Lesson Tree

ใช้ `lesson_nodes` ตัวเดียวสำหรับทุกระดับ เช่น chapter / topic / subtopic / lesson

ตัวอย่าง path:

- `chemistry`
- `chemistry.atomic_structure`
- `chemistry.atomic_structure.bohr_model`
- `chemistry.atomic_structure.bohr_model.practice_set_1`

คอลัมน์สำคัญ:

- `parent_id`
- `path` (`ltree`)
- `depth`
- `sort_order`

ข้อดี:

- query subtree ได้เร็ว
- drag/drop ย้าย branch ได้
- ใช้ node_type เดียวกันได้หลายรูปแบบ

## AI Workflows

### 1. AI Transcript

1. Tutor upload video
2. Media module creates `video_assets`
3. Video provider processes asset and returns playback ID
4. Worker extracts audio reference and sends to speech-to-text
5. Save transcript into `video_transcripts`
6. Save timestamped rows into `transcript_segments`
7. Student UI loads segments and seeks player on click
8. Playback heartbeat updates `lesson_progress.last_position_seconds`

### 2. Personal AI Tutor

1. Tutor uploads KB files per tenant/course/lesson
2. Worker extracts text and creates chunks
3. Chunks are embedded and stored in `kb_chunks`
4. Student sends question in lesson page
5. AI module retrieves top-k chunks with filters:
   - `tenant_id`
   - `course_id`
   - optionally `lesson_node_id`
6. Prompt instructs model to answer only from retrieved context
7. Response returns answer + citations
8. Save session and messages

### 3. AI Study Planner

1. Student stores weekly availability
2. Planner service reads:
   - target completion date
   - course tree
   - lesson estimated time
   - current progress
   - enrollment expiry
3. Planner algorithm generates feasible schedule
4. LLM writes human-readable explanation / advice
5. Save final rows in `study_plans` and `study_plan_items`
6. Notification worker schedules reminders

## Service Responsibilities

### Auth Module

- Google OAuth
- user creation
- tenant membership resolution
- JWT / refresh token

### Tenant Module

- tenant provisioning
- role membership
- feature flags
- license checks

### Course Module

- course CRUD
- drag/drop hierarchy updates
- content publishing
- tutor assignment

### Media Module

- signed upload URL
- provider ingestion
- playback URL
- transcript jobs

### AI Module

- transcript orchestration
- KB ingestion
- embeddings
- retrieval
- tutor response
- exercise generation
- planner explanation

### Planner Module

- availability
- deterministic schedule generation
- progress-aware replan

### Billing Module

- checkout session
- webhook processing
- enrollment activation
- renewal lifecycle

## Non-Functional Requirements

- Tenant isolation at query level
- Background jobs idempotent
- Webhooks idempotent by event ID
- Audit logging for admin/billing actions
- Signed media URLs when required
- Rate limit AI endpoints per tenant and per user
- Feature flags per plan

## Suggested API Surface

### Auth

- `POST /auth/google`
- `POST /auth/refresh`
- `GET /me`

### Courses / Lessons

- `GET /courses`
- `GET /courses/:id`
- `POST /courses`
- `PATCH /lesson-nodes/reorder`
- `POST /lesson-assets`

### Video / Transcript

- `POST /videos/upload-url`
- `POST /videos/:id/transcribe`
- `GET /videos/:id/transcript`
- `POST /progress/heartbeat`

### AI

- `POST /ai/tutor/query`
- `POST /ai/tutor/exercises`
- `POST /ai/planner/generate`
- `PATCH /ai/planner/replan`

### Billing / Notifications

- `POST /billing/checkout`
- `POST /billing/webhooks/omise`
- `POST /notifications/register-device`

## Deployment Modes

### SaaS

- Multi-tenant DB
- Shared worker cluster
- Shared AI/video accounts or tenant-level credentials by plan

### Self-hosted

- Same schema
- Single tenant per install by default
- License enforcement via `licenses`
- Customer deploys DB + API + worker + storage

## Implementation Notes

- Planner should be algorithm-first, not LLM-first
- AI tutor must always use retrieval with metadata filters
- Transcript segments should be normalized, not stored only as giant JSON
- Payment activation must rely on webhook confirmation, not client callback
- Use outbox / event pattern later if integrations grow
