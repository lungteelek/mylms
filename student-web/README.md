# Student Web

Next.js frontend สำหรับ route `/student`

## Run

```bash
cd /home/mylms/mylms_project/student-web
cp .env.example .env.local
npm install
npm run dev
```

เปิดที่ `http://localhost:3101/student`

ถ้า backend เดิมรันอยู่ที่ `http://127.0.0.1:3000` ค่า default ใน `.env.local` ใช้ได้ทันที

## Login presets

- Ploy Student: `student@example.com` / `password123` on `https://tutortan.coursechic.com/student`
- Mint Student: `student2@example.com` / `password123` on `https://tutortan.coursechic.com/student`
- Beam Student: `student3@example.com` / `password123` on `https://tutortan.coursechic.com/student`
- Tenant slug is resolved from the host; you do not need to type it.

## Production

- ให้ Next app รันที่ port `3101`
- nginx proxy `/student` และ `/student/_next/` มาที่ Next app
- `/api/*` และ route เดิมทั้งหมดคงชี้ไป backend เดิมที่ port `3000`
