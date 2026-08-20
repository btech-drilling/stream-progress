import { NextResponse } from 'next/server';
import { projectSummary } from '../../../lib/targets';

const sbHeaders = () => ({
  apikey: process.env.SUPABASE_SECRET_KEY,
});

function bangkokDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function buildMessage(dateStr, summary) {
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n);
  const pct = (n) => `${n.toFixed(2)}%`;
  const behindRows = summary.rows.filter((r) => r.target > 0 && r.actual < r.target);
  if (!summary.targetTotal) {
    return `✅ SAMPLE PROGRESS\nวันที่ ${dateStr}\nยังไม่ถึงช่วง Target\nActual รวม ${fmt(summary.actualTotal)} / ${fmt(summary.totalProject)} (${pct(summary.actualPct)})`;
  }
  if (!behindRows.length) {
    return `✅ SAMPLE PROGRESS — ON TRACK\nวันที่ ${dateStr}\nActual รวม ${fmt(summary.actualTotal)} / ${fmt(summary.totalProject)} (${pct(summary.actualPct)})\nTarget รวม ${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} (${pct(summary.targetPct)})`;
  }
  const detail = behindRows.map((r) => `🔴 ${r.label}\nActual ${fmt(r.actual)} / ${fmt(r.total)} | Target ${fmt(r.target)} | ขาด ${fmt(r.target-r.actual)} ตัวอย่าง`).join('\n\n');
  return `⚠️ SAMPLE PROGRESS ALERT\nวันที่ ${dateStr}\n\n${detail}\n\nOverall Actual ${fmt(summary.actualTotal)} / ${fmt(summary.totalProject)} (${pct(summary.actualPct)})\nOverall Target ${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} (${pct(summary.targetPct)})`;
}

export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are missing' }, { status: 500 });
  }
  const latestRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/progress_snapshots?select=*&order=created_at.desc&limit=1`, { headers: sbHeaders(), cache: 'no-store' });
  const latest = await latestRes.json();
  if (!latestRes.ok) return NextResponse.json({ error: latest }, { status: latestRes.status });
  if (!latest[0]) return NextResponse.json({ ok: true, skipped: 'No snapshot yet' });

  const dateStr = bangkokDate();
  const s = latest[0];
  const summary = projectSummary(dateStr, s);
  const message = buildMessage(dateStr, summary);

  if (!summary.behind) return NextResponse.json({ ok: true, sent: false, message });
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_TO_ID) {
    return NextResponse.json({ ok: false, error: 'LINE environment variables are missing', preview: message }, { status: 500 });
  }

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: process.env.LINE_TO_ID, messages: [{ type: 'text', text: message }] }),
  });
  if (!lineRes.ok) return NextResponse.json({ ok: false, error: await lineRes.text(), preview: message }, { status: 500 });
  return NextResponse.json({ ok: true, sent: true, message });
}
