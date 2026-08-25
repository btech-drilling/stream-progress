// app/api/alert/route.js

import {
  NextResponse,
} from 'next/server';

import {
  ITEMS,
  projectSummary,
  additionalWorkSummary,
  COLLECTION_START_DATE,
  PROGRESS_END_DATE,
  MILESTONE_DATES,
} from '../../../lib/targets.js';


export const dynamic =
  'force-dynamic';


const TIME_ZONE =
  'Asia/Bangkok';


function bangkokDateString(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (p) =>
        p.type === 'year'
    )?.value;

  const month =
    parts.find(
      (p) =>
        p.type === 'month'
    )?.value;

  const day =
    parts.find(
      (p) =>
        p.type === 'day'
    )?.value;

  return `${year}-${month}-${day}`;
}


function thaiDate(
  dateString
) {
  if (!dateString) return '-';

  const [
    year,
    month,
    day,
  ] =
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

  return (
    `${day} ` +
    `${months[month - 1]} ` +
    `${year + 543}`
  );
}


function thaiDateTime(
  timestamp
) {
  if (!timestamp) return '-';

  return new Intl.DateTimeFormat(
    'th-TH-u-ca-buddhist',
    {
      timeZone:
        TIME_ZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }
  ).format(
    new Date(timestamp)
  );
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


function supabaseHeaders() {
  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error(
      'SUPABASE_SECRET_KEY is missing'
    );
  }

  return {
    apikey: secret,
    Authorization:
      `Bearer ${secret}`,
  };
}


function supabaseUrl() {
  const url =
    process.env.SUPABASE_URL;

  if (!url) {
    throw new Error(
      'SUPABASE_URL is missing'
    );
  }

  return url;
}


async function getSnapshotForDate(
  dateString
) {
  const url =
    `${supabaseUrl()}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&progress_date=eq.${dateString}` +
    `&order=created_at.desc` +
    `&limit=1`;

  const response =
    await fetch(url, {
      headers:
        supabaseHeaders(),
      cache: 'no-store',
    });

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

  const rows =
    await response.json();

  return rows?.[0] ?? null;
}


async function getLatestSnapshot(
  today
) {
  const url =
    `${supabaseUrl()}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&progress_date=lte.${today}` +
    `&order=progress_date.desc,created_at.desc` +
    `&limit=1`;

  const response =
    await fetch(url, {
      headers:
        supabaseHeaders(),
      cache: 'no-store',
    });

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

  const rows =
    await response.json();

  return rows?.[0] ?? null;
}


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

        body:
          JSON.stringify({
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
    throw new Error(
      await response.text()
    );
  }
}


function snapshotValues(
  snapshot
) {
  const values = {};

  for (
    const key
    of Object.keys(ITEMS)
  ) {
    values[key] =
      Number(
        snapshot?.[key] ??
        0
      );
  }

  values.sg_measured =
    Number(
      snapshot
        ?.sg_measured ?? 0
    );

  values.duplicate_collected =
    Number(
      snapshot
        ?.duplicate_collected ??
        0
    );

  values.heavy_counted =
    Number(
      snapshot
        ?.heavy_counted ?? 0
    );

  return values;
}


function statusIcon(
  behind,
  target
) {
  if (target === 0) {
    return '⚪';
  }

  return behind
    ? '🔴'
    : '🟢';
}


function buildSampleLines(
  summary
) {
  return Object.values(
    summary.items
  ).map(
    (item) => {
      const icon =
        statusIcon(
          item.behind,
          item.target
        );

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
        )}`
      );
    }
  );
}


function buildAdditionalLines(
  additional
) {
  const sg =
    additional.sg;

  const duplicate =
    additional.duplicate;

  const heavy =
    additional.heavyCount;


  const sgIcon =
    statusIcon(
      sg.behind,
      sg.target
    );

  const duplicateIcon =
    duplicate.behind
      ? '🔴'
      : '🟢';

  const heavyIcon =
    statusIcon(
      heavy.behind,
      heavy.target
    );


  return [
    (
      `${sgIcon} ตรวจวัดค่า ถ.พ.\n` +
      `Actual ${number(
        sg.actual
      )} / ${number(
        sg.total
      )}\n` +
      `Target ${number(
        sg.target
      )} / ${number(
        sg.total
      )}`
    ),

    (
      `${duplicateIcon} QA/QC Duplicate\n` +
      `Collected ${number(
        duplicate.actual
      )}\n` +
      `Required ${number(
        duplicate.target
      )}`
    ),

    (
      `${heavyIcon} Heavy Mineral Count\n` +
      `Actual ${number(
        heavy.actual
      )} / ${number(
        heavy.total
      )}\n` +
      `Target ${number(
        heavy.target
      )} / ${number(
        heavy.total
      )}`
    ),
  ];
}


function buildProgressMessage(
  today,
  summary,
  additional,
  milestone,
  createdAt
) {
  const sampleLines =
    buildSampleLines(
      summary
    );

  const additionalLines =
    buildAdditionalLines(
      additional
    );

  const anyBehind =
    summary.behind ||
    additional.behind;


  const header =
    milestone
      ? '📌 MILESTONE SUMMARY'
      : '📊 DAILY PROGRESS';


  const finalStatus =
    anyBehind
      ? '🔴 มีงานต่ำกว่า Target'
      : '🟢 งานทั้งหมด On Track';


  return (
    `${header}\n` +
    `วันที่ ${thaiDate(
      today
    )}\n` +
    `บันทึกล่าสุด ${thaiDateTime(
      createdAt
    )} น.\n\n` +

    `SAMPLE PROGRESS\n\n` +

    `${sampleLines.join(
      '\n\n'
    )}\n\n` +

    `────────────\n` +

    `Overall Sample\n` +
    `${number(
      summary.actualTotal
    )} / ${number(
      summary.projectTotal
    )} ` +
    `(${percent(
      summary.actualPercent
    )})\n` +

    `Target ${number(
      summary.targetTotal
    )} / ${number(
      summary.projectTotal
    )} ` +
    `(${percent(
      summary.targetPercent
    )})\n\n` +

    `ADDITIONAL WORK / QA-QC\n\n` +

    `${additionalLines.join(
      '\n\n'
    )}\n\n` +

    `────────────\n` +
    `สถานะรวม: ${finalStatus}`
  );
}


function buildNoUpdateMessage(
  today,
  latestSnapshot
) {
  let message =
    `🟠 NO PROGRESS UPDATE\n` +
    `วันที่ ${thaiDate(
      today
    )}\n\n` +
    `ยังไม่มีการบันทึก Progress ของวันนี้`;

  if (latestSnapshot) {
    message +=
      `\n\nข้อมูลล่าสุด: ${thaiDate(
        latestSnapshot
          .progress_date
      )}`;

    message +=
      `\nบันทึกเมื่อ: ${thaiDateTime(
        latestSnapshot
          .created_at
      )} น.`;
  }

  message +=
    `\n\nกรุณาอัปเดต Sample Progress ` +
    `และ Additional Work / QA-QC`;

  return message;
}


export async function GET() {
  try {
    const today =
      bangkokDateString();


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


    const milestone =
      MILESTONE_DATES.includes(
        today
      );


    const todaySnapshot =
      await getSnapshotForDate(
        today
      );


    if (!todaySnapshot) {
      const latest =
        await getLatestSnapshot(
          today
        );

      await sendLine(
        buildNoUpdateMessage(
          today,
          latest
        )
      );

      return NextResponse.json({
        ok: true,
        sent: true,
        type: milestone
          ? 'milestone-no-update'
          : 'no-update',
        today,
      });
    }


    const values =
      snapshotValues(
        todaySnapshot
      );


    const summary =
      projectSummary(
        today,
        values
      );


    const additional =
      additionalWorkSummary(
        today,
        values
      );


    const message =
      buildProgressMessage(
        today,
        summary,
        additional,
        milestone,
        todaySnapshot.created_at
      );


    await sendLine(
      message
    );


    return NextResponse.json({
      ok: true,
      sent: true,
      type: milestone
        ? 'milestone'
        : 'daily',
      today,
      sampleBehind:
        summary.behind,
      additionalBehind:
        additional.behind,
      createdAt:
        todaySnapshot.created_at,
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