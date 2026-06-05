# Implementation Plan

## Phase 1: Core Platform

### 1. Auth + Tenant

- Implement Google OAuth login
- Create tenant-aware JWT payload
- Resolve tenant by subdomain/header
- Add RBAC guard for `owner`, `admin`, `tutor`, `student`

Related models:

- `Tenant`
- `TenantMembership`
- `User`
- `OauthAccount`
- `RefreshToken`
- `License`
- `FeatureFlag`

### 2. Course Builder

- Course CRUD
- Lesson tree CRUD
- Reorder transaction
- Lesson content and assets
- Course publish flow

Related models:

- `Course`
- `CourseInstructor`
- `LessonNode`
- `LessonContent`
- `LessonAsset`

## Phase 2: Media + Learning

### 3. Video Delivery

- Upload URL endpoint
- Video provider abstraction
- Video status sync
- Playback heartbeat
- Auto-resume

Related models:

- `VideoAsset`
- `PlaybackSession`
- `LessonProgress`

### 4. Enrollment + Student Management

- Enrollment activation
- Expiry / renewal state
- Student list and profile
- Admin view of progress and planner

Related models:

- `Enrollment`
- `LessonProgress`
- `StudyPlan`
- `StudyPlanItem`

## Phase 3: AI

### 5. Transcript Pipeline

- Trigger transcription job
- Save transcript segments
- Transcript API for lesson page

Related models:

- `VideoTranscript`
- `TranscriptSegment`

### 6. Knowledge Base + AI Tutor

- Document upload
- Text extraction/chunking
- Embedding pipeline
- Retrieval service with tenant/course filters
- Tutor chat and exercise generation

Related models:

- `KnowledgeBase`
- `KbDocument`
- `KbChunk`
- `AiChatSession`
- `AiChatMessage`

### 7. AI Study Planner

- Availability CRUD
- Deterministic schedule generator
- Replan service
- LLM explanation layer

Related models:

- `StudyAvailability`
- `StudyPlan`
- `StudyPlanItem`

## Phase 4: Billing + Notifications

### 8. Billing

- Checkout session
- Webhook verification
- Enrollment activation after payment
- Renewal reminders

Related models:

- `Payment`
- `PaymentWebhook`
- `Enrollment`

### 9. Notifications

- Register devices
- Reminder scheduler
- Push/email/in-app senders

Related models:

- `NotificationDevice`
- `NotificationRule`
- `Notification`

## Suggested Sprint Order

1. Auth, tenant, RBAC
2. Course builder and lesson tree
3. Media upload, playback, progress
4. Enrollment and admin student management
5. Transcript pipeline
6. Knowledge base and AI tutor
7. Study planner
8. Billing and notifications

## Key Technical Decisions

- Use transaction for tree reorder
- Use queue workers for transcript / KB ingestion / notifications
- Use webhook as payment source of truth
- Use retrieval-first AI guardrail
- Keep one codebase for SaaS and self-hosted
