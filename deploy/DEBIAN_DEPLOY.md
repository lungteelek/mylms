# Debian Deploy

ไฟล์นี้ตั้งค่าให้ `https://www.coursechic.com` และ `https://coursechic.com` ชี้เข้า Node backend ที่รันอยู่ในโปรเจกต์นี้

## 1. DNS

ตั้ง `A record` ของ

- `coursechic.com`
- `www.coursechic.com`

ให้ชี้ไป public IP ของ Debian VPS

## 2. ติดตั้ง service ของ backend

คัดลอกไฟล์ service:

```bash
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-backend.service /etc/systemd/system/mylms-backend.service
```

reload และเปิดใช้งาน:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mylms-backend
sudo systemctl status mylms-backend
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

## หมายเหตุ

- service นี้อิง path ปัจจุบัน `WorkingDirectory=/home/mylms/mylms_project/backend`
- ถ้า Node หรือ npm อยู่คนละ path ให้แก้ `ExecStart`
- ถ้าฐานข้อมูล PostgreSQL ไม่ได้รันในเครื่องเดียวกัน ให้ปรับ `DATABASE_URL` ใน `backend/.env`
- ถ้าเข้า `coursechic.com` แล้วยังถูก redirect ไป `panyathai.com`, ให้ตรวจ `sudo nginx -T | rg 'server_name|coursechic|panyathai'` และลบทุก vhost / redirect rule ของโดเมนเก่าออกให้หมด
- ถ้าใช้ subdomain ต่อ tutor ให้ `*.coursechic.com` ต้องชี้มาที่ origin เดียวกับระบบนี้อยู่แล้ว
- wildcard cert ครอบคลุม `*.coursechic.com` รวมถึง `www.coursechic.com`, และ root `coursechic.com` ต้องอยู่ใน SAN list แยกด้วย

## Quick verification

```bash
systemctl status mylms-backend --no-pager
systemctl cat mylms-backend
nginx -T | rg 'server_name|coursechic'
```

## Production one-shot

```bash
sudo cp /home/mylms/mylms_project/deploy/systemd/mylms-backend.service /etc/systemd/system/mylms-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now mylms-backend

sudo rm -f /etc/nginx/sites-enabled/panyathai.com.conf
sudo rm -f /etc/nginx/sites-available/panyathai.com.conf
sudo cp /home/mylms/mylms_project/deploy/nginx/coursechic.com.conf /etc/nginx/sites-available/coursechic.com.conf
sudo ln -sf /etc/nginx/sites-available/coursechic.com.conf /etc/nginx/sites-enabled/coursechic.com.conf
sudo nginx -t
sudo systemctl reload nginx

sudo systemctl reload nginx
```
