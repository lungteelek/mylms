# Next

อัปเดตไฟล์นี้ทุกครั้งก่อนเปลี่ยนเครื่องหรือจบ session

## Auto Snapshot

<!-- AUTO-SNAPSHOT:START -->
- generated: 2026-06-27 13:04:52 +07
- branch: main
- git status:  M .codex/run/backend-nest.log; M .codex/run/backend-nest.pid; M .codex/run/backend.pid; M backend-nest/dist/auth/auth.controller.d.ts; M backend-nest/dist/auth/auth.controller.js;unavailable
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
- ปรับธีม `dark` ให้ช่อง login อ่านง่ายขึ้น
- ปรับ layout `student-app` ให้เมนูและ progress ไม่ล้น
- ลด refetch ของ `educator-web` เวลาหน้าจอเปลี่ยนขนาด และเก็บ responsive ของ tree action bar ให้ไม่ล้นบนจอแคบ
- harden session restore ของ educator/student web ให้ล้าง `localStorage` ที่เสียรูปก่อน hydrate เพื่อกัน client-side crash จาก session เก่า

## In Progress

- เช็ก flow สร้าง tutor + DNS + subdomain + course builder + landing page ให้จบครบ
- ยืนยัน production deploy บน `coursechic.com` ไม่ redirect ไปโดเมนเก่า
- วาง media pipeline สำหรับวิดีโอ: upload -> transcode -> transcript -> signed playback token -> R2 sync
- ตั้งค่า `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_API_TOKEN`, `CLOUDFLARE_R2_PUBLIC_BASE_URL` บน production
- HLS master/variant playlists และ segments ถูกสร้างขึ้นแล้ว และ student app รองรับ `hls.js` แล้ว: ใช้ HLS ถ้ามี, native HLS บน Safari, fallback mp4 ถ้าไม่ได้
- auto transcript ใช้ `OPENAI_API_KEY` + ffmpeg audio extract ถ้ามี key; ถ้าไม่มีจะสร้าง fallback transcript จาก metadata เพื่อไม่ให้ flow ค้าง
- admin upload วิดีโอมี progress bar + step chips แล้ว: upload / transcode / sync / done เพื่อให้ครูเห็นสถานะชัดขึ้น
- transcode pipeline เปลี่ยนเป็น background job + status polling endpoint แล้ว เพื่อให้ progress บน admin เห็นเปอร์เซ็นต์จริง
- admin มีรายการวิดีโอของทุก lesson node แล้ว พร้อมดึงสถานะจาก `/videos/status` และเปิดวิดีโอได้จาก row นั้น
- admin lesson-node video list auto-refresh ตอนมีงาน processing อยู่ เพื่อเห็นสถานะแบบ live โดยไม่ต้อง reload หน้า
- admin lesson-node video list มีปุ่ม retry สำหรับรายการที่ status failed แล้ว
- `/videos/status` ส่ง `playbackUrl` กลับมาแล้ว และ `/videos/play` ใช้ token จาก manifest เป็น fallback ได้
- media upload มี hard limit ที่ backend แล้ว: default 2048 MB, override ได้ด้วย `MEDIA_UPLOAD_MAX_MB`
- admin upload panel ตรวจไฟล์ size ฝั่ง client แล้วและบอกชื่อไฟล์/ขนาดก่อนส่ง
- admin upload panel รองรับ drag-and-drop แล้ว
- media transcode job auto-retry ได้ 2 attempts ก่อน mark failed
- admin upload panel รองรับ resumable upload สำหรับไฟล์ใหญ่กว่า threshold แล้ว
- media policy ใหม่: max upload 2GB และ source video ต้องมีความละเอียดอย่างน้อย 720p
- media cleanup ลบ local source/chunk/session และลบ R2 source หลัง transcode สำเร็จ
- media cleanup scheduler กวาด session/chunk ค้างเกิน TTL อัตโนมัติแล้ว
- admin resumable chunk upload retries each chunk up to 3 times before failing
- media transcode is now queued durably to disk and processed by a worker loop that survives restarts
- admin media jobs panel now shows queue/running/failed/done entries from backend
- media routes now accept both `/api/modules/:id/videos/...` and `/api/lesson-nodes/:id/videos/...`
- frontend media calls now point at the `lesson-nodes` alias while preserving the existing backend storage logic
- admin upload selector now targets lesson nodes from the course tree, and student/course-builder UIs show lesson/video badges from `selectedCourseTree`

## Next Steps

### Educator web continuation

1. ตรวจหน้า `lesson route`, `course detail`, และ `course tree editor` บน browser จริงอีกรอบว่าไม่มี component ไหนยังล้นหรือซ่อน action สำคัญเกินไป
2. ถัดไปค่อยเก็บ theme consistency และ a11y ของ tab/toggle ให้ครบ

### Existing product backlog

1. ตรวจ flow ใน browser จริงหลัง switch ไป `lesson-nodes` alias ว่า upload/playback/status/transcript ยังครบทุกกรณี
2. ถ้าจะยกชื่อ backend ให้เป็น `lessonNodeId` จริง ๆ ต้อง refactor storage/job key ภายในอีกชั้น
3. ถ้าจะไป production ให้รัน deploy checklist บนเครื่องจริง
4. หลัง deploy ทุกครั้งให้ restart backend service หรือ demo stack ก่อนทดสอบ debug route
5. validation ชื่อ tutor / slug ต้องอยู่ตั้งแต่จุดสมัครหรือ register flow แม้ตอนนี้ยังไม่มีหน้า register แยก
6. R2 sync ตอนนี้ใช้ Cloudflare API upload endpoint แบบ bearer token แล้ว ถ้า production ยังไม่เห็นไฟล์ ให้เช็ก env ก่อน
7. ถ้าจะใช้ HLS ใน browser ทั่วไป ต้องเพิ่ม hls.js หรือทำ native Safari-only path; ตอนนี้ยัง fallback mp4
8. media status endpoint ใช้จากหน้า admin แล้ว แต่ยังต้องตรวจ browser จริงว่าลิงก์เล่นวิดีโอเปิดได้ครบทุกกรณี
9. live polling ในหน้า admin ควรหยุดเมื่อไม่มี item ที่ยัง processing เพื่อไม่กินทรัพยากรเกินจำเป็น
10. retry วิดีโอที่ fail ควรมีข้อความบอกเหตุผลจาก backend ถ้า transcode รอบใหม่ยัง fail
11. upload limit ควรสอดคล้องกับ disk quota / reverse proxy limit บน production ก่อนเปิดให้ user จริง
12. client-side validation ควรตรงกับ backend limit เสมอไม่ให้ error message ขัดกัน
13. auto-retry ไม่ควรทำให้คนเห็นสถานะค้างนานเกินไป ถ้า attempt แรก fail ควรบอกว่ากำลัง retry อยู่
14. resumable upload ต้องระวัง timeout ของ proxy และขนาด chunk ให้เหมาะกับ server จริง
15. source cleanup หลัง transcode ต้องไม่ลบก่อน transcript และต้องลบเฉพาะเมื่อ ready สำเร็จจริง
16. cleanup scheduler ควรอ้างอิง TTL จาก env ให้ปรับได้ใน production
17. chunk retry should surface the final failing chunk number in the upload note for easier debugging
18. queue worker should expose a simple admin log view later if debugging needs more visibility
19. media jobs panel should eventually support filtering by lesson node and direct jump to status detail

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
- `backend/src/index.ts` (`/api/media` mount for media router)
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
