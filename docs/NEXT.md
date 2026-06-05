# Next

อัปเดตไฟล์นี้ทุกครั้งก่อนเปลี่ยนเครื่องหรือจบ session

## Auto Snapshot

<!-- AUTO-SNAPSHOT:START -->
- generated: 2026-06-05 00:33:05 +07
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
- ปรับธีม `dark` ให้ช่อง login อ่านง่ายขึ้น
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
