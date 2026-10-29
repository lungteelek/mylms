# Educator Web

Next.js frontend ใหม่สำหรับ route `/educator`

## Run

```bash
cd /home/mylms/mylms_project/educator-web
cp .env.example .env.local
npm install
npm run dev
```

เปิดที่ `http://localhost:3100/educator`

ถ้า backend เดิมรันอยู่ที่ `http://127.0.0.1:3000` ค่า default ใน `.env.local` ใช้ได้ทันที

## Login presets

- Platform owner: `coursechic@gmail.com` / `password123` on `https://kb.coursechic.com/growth`
- Tutor Tan: `lungteelek@gmail.com` / `password123` on `https://tutortan.coursechic.com/educator`
- Tenant slug is resolved from the host; you do not need to type it.

## Production

- ให้ Next app รันที่ port `3100`
- nginx proxy `/educator` และ `/_next/` มาที่ Next app
- `/api/*` และ route เดิมทั้งหมดคงชี้ไป backend เดิมที่ port `3000`
