# Stream Progress v5 Pro

Professional progress dashboard for BTECH sample delivery control.

# BTECH Sample Progress Online

เว็บติดตามตัวอย่าง 4 รายการ:
- ตะกอนท้องน้ำ 418
- ชั้นดินผุพังอยู่กับที่ 418
- ตัวอย่างแร่หนัก 418
- ดินชั้น B 30

## 1) Supabase
รัน `supabase.sql` ใน SQL Editor (ถ้ารันแล้วไม่ต้องรันซ้ำ)

## 2) Vercel Environment Variables
สำหรับเริ่มใช้งานฐานข้อมูล ใส่เพียง:
- `SUPABASE_URL` = Project URL
- `SUPABASE_SECRET_KEY` = Secret key (`sb_secret_...`)

LINE เพิ่มภายหลัง:
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_TO_ID`
- `CRON_SECRET`

> Secret key อยู่ฝั่ง server เท่านั้น และไม่ถูกส่งไป browser

## 3) Deploy
Vercel > Add New > Project แล้วเลือก/ลากโฟลเดอร์ `btech-progress-online` ขึ้นไป
Framework: Next.js (ควรถูกตรวจจับอัตโนมัติ)

## 4) Cron
`vercel.json` ตั้ง `0 11 * * *` ซึ่งเท่ากับประมาณ 18:00 น. ไทย (UTC+7)
หมายเหตุ: Vercel Hobby รองรับ cron รายวัน แต่เวลาอาจไม่แม่นระดับนาที

## 5) LINE
ใช้ LINE Official Account + Messaging API แล้วใส่ token/target id ใน Vercel Environment Variables
