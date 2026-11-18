# NICHA SPA – Starter

## 1) เตรียม Google Sheets
สร้าง Google Spreadsheet ใหม่ แล้วคัดลอก Spreadsheet ID จาก URL

## 2) ตั้งค่า Apps Script
เปิด Extensions > Apps Script ใน Spreadsheet แล้ววาง `Code.gs` (ไฟล์เดียวในชุดนี้)
ไปที่ Project Settings > Script Properties เพิ่ม:
- `DB_ID` = Spreadsheet ID
- `ADMIN_PIN` = รหัสผู้ดูแลที่คุณกำหนด (อย่าใช้รหัสตัวอย่าง)

รันฟังก์ชัน `setupSheets_` หนึ่งครั้งและอนุญาตสิทธิ์

## 3) Deploy Apps Script
Deploy > New deployment > Web app
- Execute as: Me
- Who has access: Anyone
คัดลอก URL ที่ลงท้าย `/exec`

ข้อควรระวัง: เว็บแอปสาธารณะนี้ต้องใช้ PIN และ session token; ก่อนใช้งานจริงควรเพิ่มบัญชีผู้ใช้รายบุคคล, จำกัดสิทธิ์ และทดสอบการเรียก API จากโดเมน GitHub Pages ในเบราว์เซอร์จริง ห้ามเผยแพร่ Spreadsheet ID, PIN หรือ token

## 4) เปิดเว็บบน GitHub Pages
อัปโหลดโฟลเดอร์นี้เข้า GitHub repository แล้วเปิด Settings > Pages > Deploy from branch > main / root
แก้ `js/api.js` โดยใส่ URL Apps Script ใน `API_URL`

## ขอบเขตต้นแบบ 0.1
มีโครงสร้างชีต, login PIN, เพิ่มเตียง, เพิ่มพนักงานพร้อมตรวจเปอร์เซ็นต์ 100%, เพิ่มบริการ และรายงานยอดรวมเบื้องต้น
ยังไม่ใช่รุ่นพร้อมเปิดร้าน: หน้ารับจอง/เริ่มนวด/คิดเงิน, แก้ไขและปิดใช้งานข้อมูล, ระบบสิทธิ์หลายบทบาท, audit log, การป้องกันคำขอซ้ำ และการเชื่อม API ข้ามโดเมนต้องพัฒนาและทดสอบต่อก่อนใช้เงินจริง
