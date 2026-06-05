# backend-nest

NestJS scaffold for the next-generation LMS backend.

## Scope

This scaffold is intentionally separate from the current Express backend so the existing app can keep running while the new architecture is built in parallel.

## Included

- NestJS app bootstrap
- shared config
- Prisma service
- JWT auth skeleton
- tenant context endpoint
- course builder controller/service stubs
- knowledge base controller/service stubs
- AI tutor controller/service stubs
- study planner controller/service stubs

## OpenAI Integration

- `AI tutor` uses OpenAI Responses API when `OPENAI_API_KEY` is configured
- `Transcript` can use OpenAI speech-to-text when `audioFilePath` is supplied to the transcribe endpoint
- If OpenAI is not configured, the app falls back to deterministic local placeholder logic

## Queue-backed Jobs

- `knowledge-base`: document ingestion and embedding creation
- `media`: transcript generation pipeline
- `notifications`: planner reminder scheduling
- `notifications` also supports dispatching due `in_app` notifications into delivered state
- Set `QUEUE_DRIVER=bullmq` to use Redis-backed workers
- In `bullmq` mode, notification dispatch is registered as a recurring job every 60 seconds
- Keep `QUEUE_DRIVER=inline` for local fallback without Redis

## Email Delivery

- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`
- Email delivery uses Nodemailer SMTP transport
- If SMTP is not configured, notifications still flow as `in_app` and email send is skipped safely

## Push Delivery

- Configure `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`
- Push delivery uses Firebase Cloud Messaging HTTP v1
- Device tokens are read from `notification_devices.push_token`
- If Firebase is not configured, push send is skipped safely

## LINE / Telegram Delivery

- Configure `LINE_CHANNEL_ACCESS_TOKEN` to enable LINE Messaging API push delivery
- Store the LINE user id in `notification_devices.push_token` with `platform=line`
- Configure `TELEGRAM_BOT_TOKEN` to enable Telegram bot delivery
- Store the Telegram `chat_id` in `notification_devices.push_token` with `platform=telegram`
- If either provider is not configured, that channel is skipped safely

## Notification Endpoints

- `POST /api/notifications/devices` registers or updates a device/channel token
- `DELETE /api/notifications/devices/:platform/:pushToken` removes a device/channel token
- `POST /api/notifications/:notificationId/read` marks a notification as read for the current user
- `GET /api/notifications/inbox` returns the current user's inbox

## Not Included Yet

- real Prisma repository implementation
- Google OAuth flow
- payment providers
- queue workers
- media provider integrations
- real AI retrieval and generation

## Setup

1. Copy `.env.example` to `.env`
2. Start Redis if you want real background jobs:

```bash
docker compose up -d redis
```

3. Install dependencies:

```bash
cd backend-nest
npm install
```

4. Generate Prisma client from the LMS blueprint:

```bash
npm run prisma:generate
```

5. Set `QUEUE_DRIVER=bullmq` in `.env` to use Redis-backed jobs. Keep `inline` for local fallback.

6. Start development server:

```bash
npm run start:dev
```

## Notes

- Prisma blueprint source: `../backend/prisma/lms-blueprint.prisma`
- Current controllers return stub payloads shaped to match `docs/openapi.yaml`
- Next implementation step is replacing stub services with tenant-aware Prisma queries and domain services
