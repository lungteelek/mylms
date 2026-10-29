# Debian Deploy

ไฟล์นี้ตั้งค่าให้ `https://www.coursechic.com` และ `https://coursechic.com` ชี้เข้า Node backend ที่รันอยู่ในโปรเจกต์นี้

## 0. Node.js

โปรเจกต์นี้กำหนดให้ใช้ Node.js `24.22.1` เป็น baseline สำหรับ production และ dev environment

- `20.x` เป็น EOL แล้ว
- `24.x` เป็น LTS ที่เหมาะกับงาน production ตอนนี้
- ถ้าเครื่องยังใช้ Node รุ่นเก่า ให้ upgrade ก่อน build หรือ restart service

## 1. DNS

ตั้ง `A record` ของ

- `coursechic.com`
- `www.coursechic.com`

ให้ชี้ไป public IP ของ Debian VPS

## 2. ติดตั้ง service ของ backend

build โค้ดก่อน:

```bash
cd /home/mylms/mylms_project/backend
npm run build
```

คัดลอกไฟล์ service:

```bash
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-backend.service /etc/systemd/system/mylms-backend.service
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-backend-nest.service /etc/systemd/system/mylms-backend-nest.service
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-media-worker.service /etc/systemd/system/mylms-media-worker.service
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-educator-web.service /etc/systemd/system/mylms-educator-web.service
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-student-web.service /etc/systemd/system/mylms-student-web.service
```

reload และเปิดใช้งาน:

```bash
sudo bash /home/mylms/mylms_project/scripts/manage-services.sh install
sudo bash /home/mylms/mylms_project/scripts/manage-services.sh status
```

## 3. ติดตั้ง Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

คัดลอก config:

```bash
sudo rm -f /etc/nginx/sites-enabled/panyathai.com.conf
sudo rm -f /etc/nginx/sites-available/panyathai.com.conf
sudo cp /home/mylms/mylms_project/deploy/nginx/coursechic.com.conf /etc/nginx/sites-available/coursechic.com.conf
sudo ln -sf /etc/nginx/sites-available/coursechic.com.conf /etc/nginx/sites-enabled/coursechic.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4. เปิด HTTPS

ถ้ามี wildcard certificate สำหรับ `*.coursechic.com` อยู่แล้ว ให้ใช้ certificate เดิมนั้นกับ nginx ได้เลย
และไม่จำเป็นต้องสร้าง record ราย subdomain เพิ่มจากแอปอีก

ถ้าต้องออก certificate ใหม่ ให้ทำตามวิธีที่เหมาะกับเครื่อง production ของคุณ เช่น renewal policy ของระบบที่ใช้อยู่

## 5. ตรวจสอบ

- `http://coursechic.com`
- `https://coursechic.com`
- `https://www.coursechic.com`

root path `/` จะไปที่ `backend/public/index.html` ซึ่งเป็น landing page ของ `coursechic.com`

ถ้าสร้าง tenant ใหม่ต่อ tutor แนะนำใช้ subdomain เช่น `https://<tenant-slug>.coursechic.com/admin-app.html`
และ backend จะ resolve tenant จาก host อัตโนมัติเมื่อ `APP_DOMAIN=coursechic.com`

API เดิมยังอยู่ที่ `/api/*`

frontend ใหม่สำหรับผู้สอนจะเข้าที่ `/educator`
และ nginx config นี้จะ proxy `/educator` กับ `/_next/*` ไปยัง Next app ที่ port `3100`

frontend ใหม่สำหรับผู้เรียนจะเข้าที่ `/student`
และ nginx config นี้จะ proxy `/student` กับ `/student/_next/*` ไปยัง Next app ที่ port `3101`

สำหรับงานอัปโหลดวิดีโอ:

- nginx config นี้ตั้ง `client_max_body_size 256m`
- ปิด `proxy_request_buffering` เพื่อให้ chunked upload ผ่าน proxy ได้เสถียรกว่าเดิม
- ถ้าแก้ config แล้วต้อง `sudo nginx -t` และ `sudo systemctl reload nginx` ทุกครั้ง

## หมายเหตุ

- service นี้อิง path ปัจจุบัน `WorkingDirectory=/home/mylms/mylms_project/backend`
- Nest API ที่ `/api/nest/*` ต้องรันคู่กับ Express backend เสมอ ไม่เช่นนั้น publish/course builder/knowledge base จะเจอ `502`
- Educator frontend ใหม่อิง path `WorkingDirectory=/home/mylms/mylms_project/educator-web`
- Student frontend ใหม่อิง path `WorkingDirectory=/home/mylms/mylms_project/student-web`
- ถ้า Node อยู่คนละ path ให้แก้ `ExecStart`
- media transcode worker ถูกแยกเป็น `mylms-media-worker.service` เพื่อไม่ให้ ffmpeg ไปแย่ง CPU กับ login/API ของหน้าเว็บ
- ฐานข้อมูลใช้ SQLite ที่ `backend/data/mylms.db` โดยกำหนดผ่าน `DATABASE_URL`
- ถ้าเข้า `coursechic.com` แล้วยังถูก redirect ไป `panyathai.com`, ให้ตรวจ `sudo nginx -T | rg 'server_name|coursechic|panyathai'` และลบทุก vhost / redirect rule ของโดเมนเก่าออกให้หมด
- ถ้าใช้ subdomain ต่อ tutor ให้ `*.coursechic.com` ต้องชี้มาที่ origin เดียวกับระบบนี้อยู่แล้ว
- wildcard cert ครอบคลุม `*.coursechic.com` รวมถึง `www.coursechic.com`, และ root `coursechic.com` ต้องอยู่ใน SAN list แยกด้วย

## Quick verification

```bash
sudo bash /home/mylms/mylms_project/scripts/manage-services.sh status
systemctl cat mylms-backend
systemctl cat mylms-backend-nest
systemctl cat mylms-educator-web
systemctl cat mylms-student-web
nginx -T | rg 'server_name|coursechic'
```

## Production one-shot

```bash
cd /home/mylms/mylms_project/backend
npm run build
cd /home/mylms/mylms_project/backend-nest
npm run build
cd /home/mylms/mylms_project/educator-web
npm run build
cd /home/mylms/mylms_project/student-web
npm run build
sudo bash /home/mylms/mylms_project/scripts/manage-services.sh install

sudo rm -f /etc/nginx/sites-enabled/panyathai.com.conf
sudo rm -f /etc/nginx/sites-available/panyathai.com.conf
sudo cp /home/mylms/mylms_project/deploy/nginx/coursechic.com.conf /etc/nginx/sites-available/coursechic.com.conf
sudo ln -sf /etc/nginx/sites-available/coursechic.com.conf /etc/nginx/sites-enabled/coursechic.com.conf
sudo nginx -t
sudo systemctl reload nginx
```
