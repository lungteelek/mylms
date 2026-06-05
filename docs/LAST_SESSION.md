# Last Session Snapshot

Generated: 2026-06-05 09:30:00 +07

Project root: `/home/mylms/mylms_project`


## Checklist

- [ ] อัปเดต `docs/NEXT.md`
- [ ] commit / push งานล่าสุด
- [ ] ระบุ blocker ถ้ามี

## Repo State

Git metadata is unavailable from this environment.

## Run State

### Run Directory

```text
/home/mylms/mylms_project/.codex/run/backend-nest.log
/home/mylms/mylms_project/.codex/run/backend-nest.pid
/home/mylms/mylms_project/.codex/run/backend.log
/home/mylms/mylms_project/.codex/run/backend.pid
```
### Backend PID

```text
811296
```
### Nest PID

```text
811297
```

## Recent Logs

### Express Tail

```text

> backend@1.0.0 start
> ts-node src/index.ts

```
### Nest Tail

```text
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/progress/heartbeat, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RoutesResolver] AiTutorController {/api/ai}: +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/ai/tutor/query, POST} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/ai/tutor/summary, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/ai/tutor/exercises, POST} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/ai/sessions/:sessionId, GET} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RoutesResolver] KnowledgeBaseController {/api/knowledge-bases}: +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases, GET} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases/:knowledgeBaseId/documents, POST} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases/:knowledgeBaseId/documents/bulk, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases/documents/:documentId/ingest, POST} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases/:knowledgeBaseId/documents, GET} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases/documents/:documentId, DELETE} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/knowledge-bases/documents/:documentId, PATCH} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RoutesResolver] PlannerController {/api}: +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/planner/availability, PUT} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/planner/generate, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/planner/current, GET} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/planner/replan, POST} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/admin/students/:studentId/planner, GET} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RoutesResolver] NotificationsController {/api/notifications}: +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/notifications/inbox, GET} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/notifications/devices, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/notifications/devices/:platform/:pushToken, DELETE} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/notifications/:notificationId/read, POST} route +1ms
[Nest] 811341  - 06/04/2026, 12:56:18 PM     LOG [RouterExplorer] Mapped {/api/notifications/dispatch, POST} route +0ms
[Nest] 811341  - 06/04/2026, 12:56:19 PM     LOG [NotificationSchedulerService] QUEUE_DRIVER is not bullmq, skipping recurring notification dispatch registration
[Nest] 811341  - 06/04/2026, 12:56:20 PM     LOG [SchemaBootstrapService] Course tree bootstrap schema is ready
[Nest] 811341  - 06/04/2026, 12:56:20 PM     LOG [NestApplication] Nest application successfully started +8ms
```

## Next File

### NEXT.md

```text
# Next

อัปเดตไฟล์นี้ทุกครั้งก่อนเปลี่ยนเครื่องหรือจบ session

## Auto Snapshot

<!-- AUTO-SNAPSHOT:START -->
- generated: 2026-06-05 09:30:00 +07
- branch: unavailable
- git status: unavailable
- services: express:stale-pid, nest:stale-pid
- demo urls: http://localhost:3000/admin-app.html , http://localhost:3000/student-app.html
<!-- AUTO-SNAPSHOT:END -->

## Current Goal

- ทำให้ CourseChic ใช้งานจริงได้ครบ: admin app, admin console, student app, tenant subdomain, และ deploy บน `coursechic.com`

## Done

- เปลี่ยน branding เป็น `Tutor Tan` / `CourseChic`
- ตั้ง route `/admin`, `/console`, `/student`
- ทำ `admin-console.html` สำหรับสร้าง tutor/tenant
- เพิ่ม validation และ disabled state ให้ `admin-app.html` กับ `admin-console.html`
- เพิ่ม validation และ disabled state ให้ `student-app.html`
- รองรับ `*.coursechic.com`
- ออก wildcard SSL แล้ว
- อัปเดต `docs/LAST_SESSION.md` ด้วย `handoff:update`
- ปรับ `course builder` และ payment demo ให้เป็นภาษาเดียวกับ admin app
- ปรับ internal storage key และ payment session id ให้เข้าชุดกับ product naming
- เพิ่ม flow ให้ tutor บันทึก HTML landing page เป็น `index.html` ของบัญชีองค์กร
- เพิ่มธีม `cartoon`, `anime`, `cuteboy` ใน `student-app`
- ปรับ `dark` login ให้ช่อง `Gmail` และ `Password` อ่านง่ายขึ้น
- ปรับ layout `student-app` ให้เมนูและ progress ไม่ล้น

## In Progress

- เช็ก flow สร้าง tutor + DNS + subdomain + course builder + landing page ให้จบครบ
- ยืนยัน production deploy บน `coursechic.com` ไม่ redirect ไปโดเมนเก่า

## Next Steps

1. ตรวจ flow ใน browser จริง
2. ถ้าต้องไป production ให้รัน deploy checklist บนเครื่องจริง
3. ถ้ายังมี edge case ค่อยเก็บ inline validation และ copy ที่เหลือ
4. หลัง deploy ทุกครั้งให้ restart backend service หรือ demo stack ก่อนทดสอบ debug route
5. validation ชื่อ tutor / slug ต้องอยู่ตั้งแต่จุดสมัครหรือ register flow แม้ตอนนี้ยังไม่มีหน้า register แยก

## Production Checklist: `tutortan`

1. เปิด `https://tutortan.coursechic.com/debug/tenant-resolution`
2. ถ้า route ไม่ตอบ ให้ลอง `https://tutortan.coursechic.com/api/debug/tenant-resolution`
3. เช็กว่า `tenantSlug` = `tutortan`
4. เช็กว่า `landingExists` = `true`
5. เช็กว่า `resolved` = `true`
6. ถ้าไม่จริง ให้ตรวจว่า production DB มี tenant `tutortan`
7. ถ้ายัง fallback ไปหน้า public หลัก ให้ตรวจว่าไฟล์ `uploads/landing-pages/tutortan/index.html` มีอยู่บนเครื่อง production
8. ถ้า tenant ถูกต้องแต่ยังไม่เสิร์ฟ ให้ตรวจ nginx ว่าส่ง `Host: tutortan.coursechic.com` ไปที่ backend โดยไม่ rewrite กลับโดเมนหลัก
9. ถ้ายังสงสัยไฟล์ landing page ให้ลอง `https://tutortan.coursechic.com/api/debug/landing-page/tutortan`

## Production Commands

```bash
curl -s https://tutortan.coursechic.com/api/debug/tenant-resolution
curl -s https://tutortan.coursechic.com/api/debug/landing-page/tutortan
sudo systemctl restart mylms-backend
sudo systemctl reload nginx
```

## Runbook

- เริ่ม demo stack: `npm run demo:start`
- ปิด demo stack: `npm run demo:stop`
- เปิดหน้า admin: `http://localhost:3000/admin-app.html`
- เปิดหน้าฝั่งเรียน: `http://localhost:3000/student-app.html`

## Demo Accounts

- Admin: `instructor@example.com / password123`
- Student: `student@example.com / password123`

## Important Files

- `backend/public/admin-app.html`
- `backend/public/admin-console.html`
- `backend/public/student-app.html`
- `backend/public/index.html`
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/admin.ts`
- `deploy/nginx/coursechic.com.conf`
- `deploy/DEBIAN_DEPLOY.md`

## Risks / Blockers

- Git metadata unavailable from this environment, so `handoff` snapshots cannot report branch or status.
- demo stack has been started in this session for verification
- production redirect symptom reported: `coursechic.com` may still point to an old `panyathai.com` nginx/vhost/certbot config on the live server, ต้องตรวจบนเครื่องจริงด้วย `sudo nginx -T` และ certbot config
- production readiness depends on the live server having `APP_DOMAIN=coursechic.com` set correctly and wildcard DNS already pointing to the origin

## Notes For Next Machine

- branch / source of truth: current workspace in `/home/mylms/mylms_project`
- ต้อง pull อะไรก่อนหรือไม่: ไม่มีข้อมูล branch จาก environment นี้
- ต้องเช็ก env หรือ service อะไรเพิ่ม: `APP_DOMAIN=coursechic.com`, demo stack
```
