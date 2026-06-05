# Handoff Workflow

ใช้ 3 คำสั่งนี้เวลาเปลี่ยนเครื่อง:

1. อัปเดต handoff snapshot
   `npm run handoff:update`

2. commit/push ไฟล์ที่ต้องแชร์
   อย่างน้อยควรมี `docs/NEXT.md` และไฟล์โค้ดที่แก้จริง

3. เครื่องใหม่ให้เริ่มด้วย
   `npm run handoff:resume`

## กติกาสั้นๆ

- อย่าพึ่งความจำใน session
- เขียนสิ่งที่ “กำลังทำอยู่” ลง `docs/NEXT.md` เสมอ
- ถ้ามีคำสั่งพิเศษหรือปัญหาแปลก ให้ใส่ใน `Runbook` หรือ `Risks / Blockers`
- ถ้า repo นี้ยังไม่พร้อมใช้ `git` ใน environment ปัจจุบัน สคริปต์จะยังสร้าง snapshot ให้จากไฟล์และ process state เท่าที่อ่านได้

