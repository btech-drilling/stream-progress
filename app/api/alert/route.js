// app/api/alert/route.js

import { NextResponse } from 'next/server';

import {
  ITEMS,
  projectSummary,
  COLLECTION_START_DATE,
  PROGRESS_END_DATE,
  MILESTONE_DATES,
} from '../../../lib/targets.js';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Asia/Bangkok';


// ======================================================
// DATE UTIL
// ======================================================

function bangkokDateString(date = new Date()) {
  const parts =
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

  const year =
    parts.find(
      (part) => part.type === 'year'
    )?.value;

  const month =
    parts.find(
      (part) => part.type === 'month'
    )?.value;

  const day =
    parts.find(
      (part) => part.type === 'day'
    )?.value;

  return `${year}-${month}-${day}`;
}


function thaiDate(dateString) {
  if (!dateString) return '-';

  const [year, month, day] =
    dateString
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

  return `${day} ${
    months[month - 1]
  } ${year + 543}`;
}


function number(value) {
  return new Intl.NumberFormat(
    'th-TH'
  ).format(
    Number(value || 0)
  );
}


function percent(value) {
  return `${Number(
    value || 0
  ).toFixed(2)}%`;
}


// ======================================================
// SUPABASE
// ======================================================

function supabaseHeaders() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is missing'
    );
  }

  return {
    apikey: secretKey,
    Authorization:
      `Bearer ${secretKey}`,
  };
}


function getSupabaseUrl() {
  const url =
    process.env.SUPABASE_URL;

  if (!url) {
    throw new Error(
      'SUPABASE_URL is missing'
    );
  }

  return url;
}


// ======================================================
// GET SNAPSHOT OF SPECIFIC DATE
// ======================================================

async function getSnapshotForDate(
  dateString
) {
  const supabaseUrl =
    getSupabaseUrl();

  const url =
    `${supabaseUrl}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&progress_date=eq.${dateString}` +
    `&order=created_at.desc` +
    `&limit=1`;

  const response =
    await fetch(url, {
      method: 'GET',

      headers:
        supabaseHeaders(),

      cache: 'no-store',
    });

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Supabase error ${response.status}: ${text}`
    );
  }

  const rows =
    await response.json();

  return rows?.[0] ?? null;
}


// ======================================================
// GET LATEST SNAPSHOT UP TO TODAY
// ======================================================

async function getLatestSnapshot(
  today
) {
  const supabaseUrl =
    getSupabaseUrl();

  const url =
    `${supabaseUrl}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&progress_date=lte.${today}` +
    `&order=progress_date.desc,created_at.desc` +
    `&limit=1`;

  const response =
    await fetch(url, {
      method: 'GET',

      headers:
        supabaseHeaders(),

      cache: 'no-store',
    });

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Supabase error ${response.status}: ${text}`
    );
  }

  const rows =
    await response.json();

  return rows?.[0] ?? null;
}


// ======================================================
// LINE
// ======================================================

async function sendLine(text) {
  const token =
    process.env
      .LINE_CHANNEL_ACCESS_TOKEN;

  const to =
    process.env.LINE_TO_ID;

  if (!token || !to) {
    throw new Error(
      'LINE environment variables are missing'
    );
  }

  const response =
    await fetch(
      'https://api.line.me/v2/bot/message/push',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          to,

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
    const text =
      await response.text();

    throw new Error(
      `LINE error ${response.status}: ${text}`
    );
  }
}


// ======================================================
// ACTUAL VALUES
// ======================================================

function snapshotValues(snapshot) {
  const values = {};

  for (
    const key
    of Object.keys(ITEMS)
  ) {
    values[key] =
      Number(
        snapshot?.[key] ?? 0
      );
  }

  return values;
}


// ======================================================
// ITEM MESSAGE
// ======================================================

function buildItemLines(summary) {
  return Object.values(
    summary.items
  ).map((item) => {
    const difference =
      item.actual -
      item.target;

    let icon = '⚪';
    let detail =
      'ยังไม่ถึงช่วง Target';

    if (item.target > 0) {
      if (difference > 0) {
        icon = '🟢';

        detail =
          `เกิน Target ${number(
            difference
          )}`;
      }

      else if (
        difference === 0
      ) {
        icon = '🟢';

        detail =
          'ถึง Target';
      }

      else {
        icon = '🔴';

        detail =
          `ขาด ${number(
            Math.abs(
              difference
            )
          )}`;
      }
    }

    return (
      `${icon} ${item.label}\n` +
      `Actual ${number(
        item.actual
      )} / ${number(
        item.total
      )}\n` +
      `Target ${number(
        item.target
      )} / ${number(
        item.total
      )}\n` +
      `${detail} ตัวอย่าง`
    );
  });
}


// ======================================================
// DAILY MESSAGE
// ======================================================

function buildDailyMessage(
  today,
  summary
) {
  const itemLines =
    buildItemLines(summary);

  const overallDifference =
    summary.actualTotal -
    summary.targetTotal;

  let overallDetail;

  if (
    overallDifference > 0
  ) {
    overallDetail =
      `เกิน Target รวม ${number(
        overallDifference
      )} ตัวอย่าง`;
  }

  else if (
    overallDifference < 0
  ) {
    overallDetail =
      `ต่ำกว่า Target รวม ${number(
        Math.abs(
          overallDifference
        )
      )} ตัวอย่าง`;
  }

  else {
    overallDetail =
      'Actual เท่ากับ Target';
  }

  const status =
    summary.behind
      ? '🔴 มีรายการต่ำกว่า Target'
      : '🟢 ทุกรายการ On Track';

  return (
    `📊 DAILY PROGRESS\n` +
    `วันที่ ${thaiDate(
      today
    )}\n\n` +

    `${itemLines.join(
      '\n\n'
    )}\n\n` +

    `────────────\n` +

    `Overall Actual\n` +
    `${number(
      summary.actualTotal
    )} / ${number(
      summary.projectTotal
    )} ` +
    `(${percent(
      summary.actualPercent
    )})\n\n` +

    `Overall Target\n` +
    `${number(
      summary.targetTotal
    )} / ${number(
      summary.projectTotal
    )} ` +
    `(${percent(
      summary.targetPercent
    )})\n\n` +

    `${overallDetail}\n\n` +

    `สถานะ: ${status}`
  );
}


// ======================================================
// MILESTONE MESSAGE
// ======================================================

function buildMilestoneMessage(
  today,
  summary
) {
  const itemLines =
    buildItemLines(summary);

  const status =
    summary.behind
      ? '🔴 มีรายการต่ำกว่าเป้าหมาย'
      : '🟢 Milestone On Track';

  return (
    `📌 MILESTONE SUMMARY\n` +
    `วันที่ ${thaiDate(
      today
    )}\n\n` +

    `${itemLines.join(
      '\n\n'
    )}\n\n` +

    `────────────\n` +

    `Overall Actual\n` +
    `${number(
      summary.actualTotal
    )} / ${number(
      summary.projectTotal
    )} ` +
    `(${percent(
      summary.actualPercent
    )})\n\n` +

    `Overall Target\n` +
    `${number(
      summary.targetTotal
    )} / ${number(
      summary.projectTotal
    )} ` +
    `(${percent(
      summary.targetPercent
    )})\n\n` +

    `สถานะ: ${status}`
  );
}


// ======================================================
// NO UPDATE MESSAGE
// ======================================================

function buildNoUpdateMessage(
  today,
  targetSummary,
  latestSnapshot,
  latestSummary,
  milestone
) {
  const header =
    milestone
      ? '📌 MILESTONE — NO UPDATE'
      : '🟠 NO PROGRESS UPDATE';

  let message =
    `${header}\n` +
    `วันที่ ${thaiDate(
      today
    )}\n\n` +

    `ยังไม่มีการบันทึก Progress ` +
    `ของวันที่ ${thaiDate(
      today
    )}\n`;

  if (latestSnapshot) {
    message +=
      `\nข้อมูลล่าสุด: ` +
      `${thaiDate(
        latestSnapshot
          .progress_date
      )}\n`;

    message +=
      `Actual ล่าสุด: ` +
      `${number(
        latestSummary.actualTotal
      )} / ${number(
        latestSummary.projectTotal
      )} ` +
      `(${percent(
        latestSummary.actualPercent
      )})\n`;
  }

  else {
    message +=
      `\nยังไม่มีข้อมูล Progress ` +
      `ที่บันทึกไว้\n`;
  }

  message +=
    `\nTarget วันนี้: ` +
    `${number(
      targetSummary.targetTotal
    )} / ${number(
      targetSummary.projectTotal
    )} ` +
    `(${percent(
      targetSummary.targetPercent
    )})`;

  message +=
    `\n\nTarget ราย Item\n`;

  for (
    const item
    of Object.values(
      targetSummary.items
    )
  ) {
    message +=
      `• ${item.label}: ` +
      `${number(
        item.target
      )} / ${number(
        item.total
      )}\n`;
  }

  if (milestone) {
    message +=
      `\n⚠️ วันนี้เป็นวัน Milestone ` +
      `กรุณาอัปเดต Progress`;
  }

  return message.trim();
}


// ======================================================
// API
// ======================================================

export async function GET() {
  try {
    const today =
      bangkokDateString();

    // --------------------------------------------------
    // ตรวจช่วงการติดตาม
    // --------------------------------------------------

    if (
      today <
        COLLECTION_START_DATE ||
      today >
        PROGRESS_END_DATE
    ) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason:
          'outside-progress-period',
        today,
      });
    }


    // --------------------------------------------------
    // วันนี้เป็น Milestone หรือไม่
    // --------------------------------------------------

    const milestone =
      MILESTONE_DATES.includes(
        today
      );


    // --------------------------------------------------
    // หาข้อมูลของ "วันนี้" โดยตรง
    // --------------------------------------------------

    const todaySnapshot =
      await getSnapshotForDate(
        today
      );


    // ==================================================
    // CASE 1
    // วันนี้มีการบันทึก Progress แล้ว
    // ==================================================

    if (todaySnapshot) {
      const actualValues =
        snapshotValues(
          todaySnapshot
        );

      const summary =
        projectSummary(
          today,
          actualValues
        );

      const message =
        milestone
          ? buildMilestoneMessage(
              today,
              summary
            )
          : buildDailyMessage(
              today,
              summary
            );

      await sendLine(
        message
      );

      return NextResponse.json({
        ok: true,

        sent: true,

        type:
          milestone
            ? 'milestone'
            : summary.behind
            ? 'daily-behind'
            : 'daily-on-track',

        today,

        progressDate:
          todaySnapshot
            .progress_date,

        actual:
          summary.actualTotal,

        target:
          summary.targetTotal,

        behind:
          summary.behind,
      });
    }


    // ==================================================
    // CASE 2
    // วันนี้ยังไม่มี Progress
    // ==================================================

    const latestSnapshot =
      await getLatestSnapshot(
        today
      );

    const targetSummary =
      projectSummary(
        today,
        {}
      );

    let latestSummary = null;

    if (latestSnapshot) {
      latestSummary =
        projectSummary(
          latestSnapshot
            .progress_date,

          snapshotValues(
            latestSnapshot
          )
        );
    }

    const message =
      buildNoUpdateMessage(
        today,
        targetSummary,
        latestSnapshot,
        latestSummary,
        milestone
      );

    await sendLine(
      message
    );

    return NextResponse.json({
      ok: true,

      sent: true,

      type:
        milestone
          ? 'milestone-no-update'
          : 'no-update',

      today,

      latestProgressDate:
        latestSnapshot
          ?.progress_date ??
        null,

      target:
        targetSummary
          .targetTotal,
    });
  }

  catch (error) {
    console.error(
      'Progress alert error:',
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          'Unknown error',
      },

      {
        status: 500,
      }
    );
  }
}