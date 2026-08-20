'use client';

import { useEffect, useMemo, useState } from 'react';
import { ITEMS, projectSummary } from '../lib/targets';

const keys = ['stream', 'weathered', 'heavy', 'bsoil'];
const initial = { stream: 0, weathered: 0, heavy: 0, bsoil: 0 };

function todayBangkok() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function fmt(value) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function statusFor(row) {
  if (row.target === 0) return { label: 'Not due', tone: 'neutral', detail: 'ยังไม่ถึง Target' };
  if (row.gap >= 0) return { label: 'On track', tone: 'good', detail: `เกิน/ถึงเป้า ${fmt(row.gap)} ตัวอย่าง` };
  return { label: 'Behind', tone: 'bad', detail: `ขาด ${fmt(-row.gap)} ตัวอย่าง` };
}

function nextMilestone(date) {
  const milestones = [
    ['2026-09-05', 'ชุดที่ 1', '5 ก.ย. 2569', '100 / 418 ต่อ Item'],
    ['2026-09-20', 'ชุดที่ 2', '20 ก.ย. 2569', '200 / 418 ต่อ Item'],
    ['2026-09-30', 'ชุดที่ 3', '30 ก.ย. 2569', '320 / 418 ต่อ Item'],
    ['2026-10-05', 'ชุดที่ 4', '5 ต.ค. 2569', '418 / 418 ต่อ Item'],
    ['2026-10-15', 'ดินชั้น B', '15 ต.ค. 2569', '30 / 30'],
  ];
  return milestones.find(([d]) => date <= d) || ['-', 'ครบทุกชุด', '-', 'ส่งครบตามแผน'];
}

export default function Page() {
  const [date, setDate] = useState(todayBangkok());
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState('กำลังโหลดข้อมูลล่าสุด...');
  const [saving, setSaving] = useState(false);
  const summary = useMemo(() => projectSummary(date, values), [date, values]);
  const milestone = useMemo(() => nextMilestone(date), [date]);

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => {
        if (d.snapshot) {
          setValues({
            stream: d.snapshot.stream,
            weathered: d.snapshot.weathered,
            heavy: d.snapshot.heavy,
            bsoil: d.snapshot.bsoil,
          });
          setDate(d.snapshot.progress_date || todayBangkok());
          setMessage('โหลดข้อมูลล่าสุดแล้ว');
        } else {
          setMessage('ยังไม่มีข้อมูลที่บันทึก');
        }
      })
      .catch(() => setMessage('โหลดข้อมูลไม่สำเร็จ'));
  }, []);

  async function save() {
    setSaving(true);
    setMessage('กำลังบันทึก...');
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_date: date, ...values }),
      });
      const data = await res.json();
      setMessage(res.ok ? 'บันทึก Progress เรียบร้อย' : `บันทึกไม่สำเร็จ: ${data.error || 'unknown error'}`);
    } catch {
      setMessage('บันทึกไม่สำเร็จ: เชื่อมต่อระบบไม่ได้');
    } finally {
      setSaving(false);
    }
  }

  const overallGap = summary.actualPct - summary.targetPct;

  return (
    <main className="pageShell">
      <header className="appHeader">
        <div className="brandBlock">
          <div className="brandMark">B</div>
          <div>
            <div className="brandTitle">BTECH</div>
            <div className="brandSub">Sample Progress Control</div>
          </div>
        </div>
        <div className="headerMeta">
          <span className="liveDot" /> Online dashboard
        </div>
      </header>

      <section className="heroCard">
        <div className="heroMain">
          <div className="heroEyebrow">OVERALL SAMPLE PROGRESS</div>
          <div className="heroHeadline">
            <span className="heroPercent">{summary.actualPct.toFixed(2)}%</span>
            <span className="heroStatusText">
              {summary.targetTotal === 0 ? 'ยังไม่ถึงช่วง Target' : summary.behind ? 'ต่ำกว่าแผน' : 'ตามแผน'}
            </span>
          </div>
          <div className="heroCount">
            <strong>{fmt(summary.actualTotal)}</strong> / {fmt(summary.totalProject)} ตัวอย่างสะสม
          </div>
          <div className="heroProgress" aria-label={`Overall progress ${summary.actualPct.toFixed(2)}%`}>
            <span style={{ width: `${Math.min(100, summary.actualPct)}%` }} />
          </div>
          <div className="heroFoot">
            Overall คิดจากตัวอย่างทุก Item รวมกัน: 418 + 418 + 418 + 30 = 1,284 ตัวอย่าง
          </div>
        </div>

        <div className="controlPanel">
          <label htmlFor="progress-date">วันที่ประเมิน</label>
          <input id="progress-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="primaryButton" onClick={save} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก Progress'}
          </button>
          <div className="saveMessage">{message}</div>
        </div>
      </section>

      <section className="metricGrid">
        <Metric
          title="Target วันนี้"
          value={`${summary.targetPct.toFixed(2)}%`}
          sub={`${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} ตัวอย่าง`}
        />
        <Metric
          title="Gap จากแผน"
          value={`${overallGap >= 0 ? '+' : ''}${overallGap.toFixed(2)}%`}
          sub={summary.targetTotal === 0 ? 'ยังไม่ถึงช่วง Target' : summary.behind ? `ขาด ${fmt(summary.targetTotal - summary.actualTotal)} ตัวอย่าง` : `เกินเป้า ${fmt(Math.max(0, summary.actualTotal - summary.targetTotal))} ตัวอย่าง`}
          tone={summary.targetTotal === 0 ? 'neutral' : summary.behind ? 'bad' : 'good'}
        />
        <Metric
          title="สถานะโครงการ"
          value={summary.targetTotal === 0 ? 'Not Due' : summary.behind ? 'Behind' : 'On Track'}
          sub={summary.targetTotal === 0 ? 'รอเริ่ม Target ตามแผน' : summary.behind ? 'ควรเร่ง Progress' : 'Progress ถึงหรือเกิน Target'}
          tone={summary.targetTotal === 0 ? 'neutral' : summary.behind ? 'bad' : 'good'}
        />
        <Metric
          title="กำหนดถัดไป"
          value={milestone[1]}
          sub={`${milestone[2]} · ${milestone[3]}`}
        />
      </section>

      <section className="contentGrid">
        <div className="panel">
          <div className="panelHeading">
            <div>
              <div className="sectionEyebrow">ACTUAL INPUT</div>
              <h2>Progress by Item</h2>
            </div>
            <div className="panelNote">กรอกเป็นจำนวนสะสมของแต่ละ Item</div>
          </div>

          <div className="itemGrid">
            {keys.map((key, index) => {
              const row = summary.rows.find((r) => r.key === key);
              const status = statusFor(row);
              return (
                <article className="itemCard" key={key}>
                  <div className="itemTop">
                    <div className="itemNumber">0{index + 1}</div>
                    <span className={`statusBadge ${status.tone}`}>{status.label}</span>
                  </div>
                  <h3>{ITEMS[key].label}</h3>
                  <div className="itemTotal">เป้าหมายทั้งหมด {fmt(row.total)} ตัวอย่าง</div>

                  <div className="inputRow">
                    <label htmlFor={`input-${key}`}>Actual สะสม</label>
                    <div className="numberInputWrap">
                      <input
                        id={`input-${key}`}
                        type="number"
                        min="0"
                        max={ITEMS[key].total}
                        value={values[key]}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            [key]: Math.max(0, Math.min(ITEMS[key].total, Number(e.target.value || 0))),
                          }))
                        }
                      />
                      <span>/ {fmt(row.total)}</span>
                    </div>
                  </div>

                  <div className="itemProgressLine">
                    <strong>{row.progress.toFixed(2)}%</strong>
                    <span>Target {fmt(row.target)} / {fmt(row.total)}</span>
                  </div>
                  <div className="itemBar"><span style={{ width: `${Math.min(100, row.progress)}%` }} /></div>
                  <div className={`gapText ${status.tone}`}>{status.detail}</div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="panel summaryPanel">
          <div className="sectionEyebrow">PROJECT SUMMARY</div>
          <h2>ยอดสะสมรวม</h2>
          <div className="summaryBig">{fmt(summary.actualTotal)}</div>
          <div className="summaryUnit">จากทั้งหมด {fmt(summary.totalProject)} ตัวอย่าง</div>
          <div className="summaryDivider" />
          {summary.rows.map((row) => (
            <div className="summaryRow" key={row.key}>
              <div>
                <strong>{row.label}</strong>
                <span>{row.progress.toFixed(2)}%</span>
              </div>
              <b>{fmt(row.actual)} / {fmt(row.total)}</b>
            </div>
          ))}
          <div className="summaryCallout">
            <strong>หลักการคิด Overall</strong>
            <span>Actual ของทั้ง 4 Item รวมกัน ÷ 1,284 × 100</span>
          </div>
        </aside>
      </section>

      <section className="panel schedulePanel">
        <div className="panelHeading">
          <div>
            <div className="sectionEyebrow">DELIVERY PLAN</div>
            <h2>แผนส่งตัวอย่าง 3 รายการหลัก</h2>
          </div>
          <div className="panelNote">ตะกอนท้องน้ำ · ชั้นดินผุพังอยู่กับที่ · ตัวอย่างแร่หนัก รวม 1,254 ตัวอย่าง</div>
        </div>
        <div className="deliverySummary">
          <div><span>3 รายการหลัก</span><strong>418 × 3</strong></div>
          <div><span>Total</span><strong>1,254 ตัวอย่าง</strong></div>
          <div><span>Delivery batches</span><strong>4 รอบ</strong></div>
          <div><span>แผนต่อ Item</span><strong>100 / 100 / 120 / 98</strong></div>
        </div>
        <div className="tableWrap">
          <table className="deliveryTable">
            <thead>
              <tr><th>รอบส่ง</th><th>กำหนดส่ง</th><th>ยอดสะสม 3 รายการหลัก</th><th>Progress</th></tr>
            </thead>
            <tbody>
              <DeliveryRow batch="01" date="1–5 ก.ย. 2569" total="300 / 1,254" pct="23.92%" />
              <DeliveryRow batch="02" date="15–20 ก.ย. 2569" total="600 / 1,254" pct="47.85%" />
              <DeliveryRow batch="03" date="25–30 ก.ย. 2569" total="960 / 1,254" pct="76.56%" />
              <DeliveryRow batch="04" date="1–5 ต.ค. 2569" total="1,254 / 1,254" pct="100%" />
            </tbody>
          </table>
        </div>
        <div className="deliveryFootnote">ตารางนี้แสดงเฉพาะ 3 รายการหลักเท่านั้น · ดินชั้น B จำนวน 30 ตัวอย่างติดตามแยกใน Progress by Item</div>
      </section>

      <footer className="footerNote">
        Stream Progress · BTECH Sample Delivery Control · ข้อมูลบันทึกบน Supabase
      </footer>
    </main>
  );
}

function Metric({ title, value, sub, tone = 'neutral' }) {
  return (
    <div className={`metricCard ${tone}`}>
      <div className="metricLabel">{title}</div>
      <div className="metricValue">{value}</div>
      <div className="metricSub">{sub}</div>
    </div>
  );
}

function DeliveryRow({ batch, date, total, pct }) {
  return (
    <tr>
      <td><span className="batchBadge">{batch}</span></td>
      <td><strong>{date}</strong></td>
      <td><span className="deliveryTotal">{total}</span></td>
      <td><span className="progressBadge">{pct}</span></td>
    </tr>
  );
}
