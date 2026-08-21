import { NextResponse } from 'next/server';
import { ITEMS, projectSummary } from '../../../lib/targets';

const START_DATE = '2026-09-01';
const END_DATE = '2026-10-15';

const MILESTONES = [
  '2026-09-05',
  '2026-09-20',
  '2026-09-30',
  '2026-10-05',
  '2026-10-15',
];

function bangkokToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function bangkokDateFromTimestamp(timestamp) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

function thaiDate(dateString) {
  const [year, month, day] = dateString
    .split('-')
    .map(Number);

  const months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];

  return `${day} ${months[month - 1]} ${year + 543}`;
}

function fmt(value) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function pct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

async function getLatestSnapshot() {
  const url =
    `${process.env.SUPABASE_URL}` +
    '/rest/v1/progress_snapshots' +
    '?select=*' +
    '&order=created_at.desc' +
    '&limit=1';

  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data === 'string'
        ? data
        : JSON.stringify(data)
    );
  }

  return data[0] || null;
}

async function sendLine(text) {
  if (
    !process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    !process.env.LINE_TO_ID
  ) {
    throw new Error(
      'LINE environment variables are missing'
    );
  }

  const response = await fetch(
    'https://api.line.me/v2/bot/message/push',
    {
      method: 'POST',

      headers: {
        Authorization:
          `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,

        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        to: process.env.LINE_TO_ID,

        messages: [
          {
            type: 'text',
            text,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `LINE API error: ${error}`
    );
  }
}

function makeValues(snapshot) {
  return Object.fromEntries(
    Object.keys(ITEMS).map((key) => [
      key,
      Number(snapshot?.[key] ?? 0),
    ])
  );
}

function behindMessage(
  today,
  summary
) {
  const behindRows =
    summary.rows.filter(
      (row) =>
        row.target > 0 &&
        row.actual < row.target
    );

  const details = behindRows
    .map((row) => {
      const missing =
        row.target - row.actual;

      return [
        `🔴 ${row.label}`,
        `Actual ${fmt(row.actual)} / ${fmt(row.total)}`,
        `Target ${fmt(row.target)} / ${fmt(row.total)}`,
        `ขาด ${fmt(missing)} ตัวอย่าง`,
      ].join('\n');
    })
    .join('\n\n');

  const totalMissing =
    Math.max(
      0,
      summary.targetTotal -
      summary.actualTotal
    );

  return [
    '⚠️ SAMPLE PROGRESS ALERT',
    `วันที่ ${thaiDate(today)}`,
    '',
    details,
    '',
    `Overall Actual: ${fmt(summary.actualTotal)} / ${fmt(summary.totalProject)} (${pct(summary.actualPct)})`,
    `Overall Target: ${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} (${pct(summary.targetPct)})`,
    `🔴 Behind ${fmt(totalMissing)} ตัวอย่าง`,
  ].join('\n');
}

function noUpdateMessage(
  today,
  snapshot,
  summary
) {
  const lastUpdate =
    snapshot?.created_at
      ? bangkokDateFromTimestamp(
          snapshot.created_at
        )
      : null;

  return [
    '🟠 NO PROGRESS UPDATE',
    `วันที่ ${thaiDate(today)}`,
    '',
    'ยังไม่มีการบันทึก Progress ของวันนี้',
    lastUpdate
      ? `ข้อมูลล่าสุดบันทึกเมื่อ ${thaiDate(lastUpdate)}`
      : 'ยังไม่มีข้อมูลที่บันทึกไว้',
    '',
    `Target วันนี้: ${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} (${pct(summary.targetPct)})`,
    '',
    'กรุณาอัปเดต Actual Progress ในระบบ',
  ].join('\n');
}

function milestoneMessage(
  today,
  summary
) {
  const rows = summary.rows
    .map((row) => {
      const difference =
        row.actual - row.target;

      const state =
        difference >= 0
          ? `🟢 ถึง/เกิน ${fmt(difference)}`
          : `🔴 ขาด ${fmt(-difference)}`;

      return [
        `${state} · ${row.label}`,
        `Actual ${fmt(row.actual)} / ${fmt(row.total)}`,
        `Target ${fmt(row.target)} / ${fmt(row.total)}`,
      ].join('\n');
    })
    .join('\n\n');

  const overallMissing =
    Math.max(
      0,
      summary.targetTotal -
      summary.actualTotal
    );

  return [
    '📌 MILESTONE SUMMARY',
    `วันที่ ${thaiDate(today)}`,
    '',
    rows,
    '',
    `Overall Actual: ${fmt(summary.actualTotal)} / ${fmt(summary.totalProject)} (${pct(summary.actualPct)})`,
    `Overall Target: ${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} (${pct(summary.targetPct)})`,
    summary.behind
      ? `🔴 Behind ${fmt(overallMissing)} ตัวอย่าง`
      : '🟢 On Track',
  ].join('\n');
}

export async function GET(request) {
  try {
    /*
      Vercel Cron สามารถส่ง Authorization header
      ด้วย CRON_SECRET ได้

      ตอนทดสอบ localhost ถ้ายังไม่ได้ตั้ง
      CRON_SECRET จะผ่านส่วนนี้ได้
    */
    if (process.env.CRON_SECRET) {
      const authorization =
        request.headers.get(
          'authorization'
        );

      if (
        authorization !==
        `Bearer ${process.env.CRON_SECRET}`
      ) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
          },
          {
            status: 401,
          }
        );
      }
    }

    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return NextResponse.json(
        {
          error:
            'Supabase environment variables are missing',
        },
        {
          status: 500,
        }
      );
    }

    const today =
      bangkokToday();

    /*
      ก่อนเริ่มงาน หรือหลังจบโครงการ
      ไม่ส่ง Alert
    */
    if (
      today < START_DATE ||
      today > END_DATE
    ) {
      return NextResponse.json({
        sent: false,
        reason:
          'outside-project-period',
        date: today,
      });
    }

    const snapshot =
      await getLatestSnapshot();

    const values =
      makeValues(snapshot);

    /*
      Target ต้องคิดตาม "วันนี้"
      ไม่ใช่ progress_date ใน snapshot
    */
    const summary =
      projectSummary(
        today,
        values
      );

    /*
      ถ้ายังไม่มี Target วันนี้
      ไม่ต้องส่ง
    */
    if (
      summary.targetTotal === 0
    ) {
      return NextResponse.json({
        sent: false,
        reason:
          'target-not-started',
        date: today,
      });
    }

    const lastSaveDate =
      snapshot?.created_at
        ? bangkokDateFromTimestamp(
            snapshot.created_at
          )
        : null;

    /*
      RULE 1
      วันนี้ยังไม่มีใครบันทึก
    */
    if (
      lastSaveDate !== today
    ) {
      const text =
        noUpdateMessage(
          today,
          snapshot,
          summary
        );

      await sendLine(text);

      return NextResponse.json({
        sent: true,
        type: 'no-update',
        date: today,
      });
    }

    /*
      RULE 2
      วัน Milestone ส่งเสมอ
      ไม่ว่าจะ On Track หรือ Behind
    */
    if (
      MILESTONES.includes(today)
    ) {
      const text =
        milestoneMessage(
          today,
          summary
        );

      await sendLine(text);

      return NextResponse.json({
        sent: true,
        type: 'milestone',
        date: today,
      });
    }

    /*
      RULE 3
      วันปกติส่งเฉพาะ Behind
    */
    if (summary.behind) {
      const text =
        behindMessage(
          today,
          summary
        );

      await sendLine(text);

      return NextResponse.json({
        sent: true,
        type: 'behind',
        date: today,
      });
    }

    /*
      On Track + ไม่ใช่ Milestone
      = ไม่ส่ง เพื่อไม่ spam
    */
    return NextResponse.json({
      sent: false,
      type: 'on-track',
      reason:
        'no-alert-required',
      date: today,
    });
  }

  catch (error) {
    console.error(
      'Alert error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          'Unknown alert error',
      },
      {
        status: 500,
      }
    );
  }
}