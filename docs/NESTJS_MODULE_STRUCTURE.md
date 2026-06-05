# NestJS Module Structure

## Target Layout

```text
backend/
  src/
    main.ts
    app.module.ts
    common/
      guards/
      decorators/
      interceptors/
      filters/
      dto/
      utils/
    config/
      app.config.ts
      database.config.ts
      ai.config.ts
      billing.config.ts
      media.config.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      strategies/
      guards/
      dto/
    tenants/
      tenants.module.ts
      tenants.controller.ts
      tenants.service.ts
      memberships.service.ts
      licenses.service.ts
      feature-flags.service.ts
      dto/
    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      profiles.service.ts
      dto/
    courses/
      courses.module.ts
      courses.controller.ts
      courses.service.ts
      lesson-nodes.service.ts
      lesson-builder.service.ts
      lesson-assets.service.ts
      dto/
    media/
      media.module.ts
      media.controller.ts
      media.service.ts
      providers/
        mux.provider.ts
        cloudflare.provider.ts
      transcript.service.ts
      dto/
    enrollments/
      enrollments.module.ts
      enrollments.controller.ts
      enrollments.service.ts
      progress.service.ts
      playback.service.ts
    planner/
      planner.module.ts
      planner.controller.ts
      planner.service.ts
      planner-engine.service.ts
      reminder.service.ts
      dto/
    knowledge-base/
      knowledge-base.module.ts
      knowledge-base.controller.ts
      knowledge-base.service.ts
      ingestion.service.ts
      embedding.service.ts
      retrieval.service.ts
    ai/
      ai.module.ts
      ai.controller.ts
      ai.service.ts
      tutor.service.ts
      transcript-orchestrator.service.ts
      study-planner-llm.service.ts
      providers/
        openai.provider.ts
        gemini.provider.ts
      prompts/
    billing/
      billing.module.ts
      billing.controller.ts
      billing.service.ts
      providers/
        omise.provider.ts
        two-c-two-p.provider.ts
      webhook.service.ts
    notifications/
      notifications.module.ts
      notifications.controller.ts
      notifications.service.ts
      push.service.ts
      email.service.ts
    jobs/
      jobs.module.ts
      processors/
        transcript.processor.ts
        kb-ingestion.processor.ts
        planner-reminder.processor.ts
        payment-webhook.processor.ts
```

## Module Responsibilities

### `auth`

- Google OAuth login
- JWT / refresh token
- current user session
- tenant-aware login context

### `tenants`

- tenant provisioning
- membership and role assignment
- license checks
- feature flag resolution

### `users`

- student/admin/tutor profile
- minimal onboarding fields
- address and renewal metadata

### `courses`

- course CRUD
- drag/drop lesson tree
- publish/unpublish workflow
- attach PDF/external links

### `media`

- upload URL generation
- video provider abstraction
- transcript fetch and sync
- auto-resume playback state

### `enrollments`

- student activation
- expiration / renewal state
- progress tracking
- video heartbeat updates

### `planner`

- availability capture
- deterministic schedule generation
- replan logic
- reminder generation

### `knowledge-base`

- document upload
- text extraction and chunking
- embeddings creation
- vector retrieval with tenant filters

### `ai`

- tutor chat orchestration
- transcript orchestration
- exercise generation
- planner explanation generation
- provider failover

### `billing`

- checkout session creation
- webhook verification
- activate / renew enrollment
- invoice and payment audit trail

### `notifications`

- register push devices
- schedule reminders
- send push/email/in-app

### `jobs`

- background processing
- idempotent retries
- queue routing by job type

## Cross-Cutting Rules

- Every request resolves `tenantId` first
- Every repository query filters by `tenantId` unless table is global
- AI retrieval must filter by `tenantId` and usually `courseId`
- Billing webhooks are source of truth for payment state
- Background jobs must be idempotent by external event ID or checksum

## Suggested Request Context

Attach a request-scoped auth context:

```ts
type RequestContext = {
  userId: string;
  tenantId: string;
  membershipRole: 'owner' | 'admin' | 'tutor' | 'student';
  featureFlags: Record<string, boolean>;
};
```

## Suggested First Build Order

1. `prisma` + `auth` + `tenants`
2. `courses` + `lesson builder`
3. `media` + `progress`
4. `enrollments` + `billing`
5. `knowledge-base` + `ai tutor`
6. `planner` + `notifications`
