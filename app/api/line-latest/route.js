// app/api/line-latest/route.js

import {
  NextResponse,
} from 'next/server';

import {
  ITEMS,
  projectSummary,
  additionalWorkSummary,
} from '../../../lib/targets.js';


export const dynamic =
  'force-dynamic';


const TIME_ZONE =
  'Asia/Bangkok';


// ======================================================
// FORMAT
// ======================================================

function thaiDate(
  dateString
) {
  if (!dateString) {
    return '-';
  }

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
  if (!timestamp) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'th-TH-u-ca-buddhist',
    {
      timeZone:
        TIME_ZONE,

      day:
        'numeric',

      month:
        'short',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit',

      hour12:
        false,
    }
  ).format(
    new Date(timestamp)
  );
}


function number(
  value
) {
  return new Intl.NumberFormat(
    'th-TH'
  ).format(
    Number(value || 0)
  );
}


function percent(
  value
) {
  return `${Number(
    value || 0
  ).toFixed(2)}%`;
}


// ======================================================
// SUPABASE
// ======================================================

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


function getSupabaseHeaders() {
  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error(
      'SUPABASE_SECRET_KEY is missing'
    );
  }

  return {
    apikey:
      secret,

    Authorization:
      `Bearer ${secret}`,
  };
}


// ======================================================
// GET LATEST SNAPSHOT
// ======================================================

async function getLatestSnapshot() {
  const url =
    `${getSupabaseUrl()}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&order=progress_date.desc,created_at.desc` +
    `&limit=1`;


  const response =
    await fetch(
      url,
      {
        method: 'GET',

        headers:
          getSupabaseHeaders(),

        cache:
          'no-store',
      }
    );


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

async function sendLine(
  text
) {
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
        method:
          'POST',

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
                type:
                  'text',

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
// SNAPSHOT VALUES
// ======================================================

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
        ?.sg_measured ??
      0
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
        ?.heavy_counted ??
      0
    );


  return values;
}


// ======================================================
// STATUS
// ======================================================

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


// ======================================================
// SAMPLE LINES
// ======================================================

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


      const difference =
        item.actual -
        item.target;


      let detail =
        'ยังไม่ถึง Target';


      if (item.target > 0) {

        if (difference > 0) {
          detail =
            `เกิน ${number(
              difference
            )}`;
        }

        else if (
          difference === 0
        ) {
          detail =
            'ถึง Target';
        }

        else {
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

        `${detail}`
      );
    }
  );
}


// ======================================================
// ADDITIONAL WORK LINES
// ======================================================

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
    duplicate.target === 0
      ? '⚪'
      : duplicate.behind
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


// ======================================================
// MESSAGE
// ======================================================

function buildMessage(
  snapshot,
  summary,
  additional
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


  const finalStatus =
    anyBehind
      ? '🔴 มีงานต่ำกว่า Target'
      : '🟢 งานทั้งหมด On Track';


  return (
    `📊 LATEST PROGRESS\n` +

    `Progress ณ วันที่ ${thaiDate(
      snapshot.progress_date
    )}\n` +

    `บันทึกล่าสุด ${thaiDateTime(
      snapshot.created_at
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


// ======================================================
// POST
// ส่ง Progress ล่าสุดเข้า LINE
// ======================================================

export async function POST() {
  try {

    const snapshot =
      await getLatestSnapshot();


    if (!snapshot) {

      return NextResponse.json(
        {
          ok:
            false,

          error:
            'ยังไม่มีข้อมูล Progress',
        },
        {
          status:
            404,
        }
      );
    }


    const values =
      snapshotValues(
        snapshot
      );


    const summary =
      projectSummary(
        snapshot.progress_date,
        values
      );


    const additional =
      additionalWorkSummary(
        snapshot.progress_date,
        values
      );


    const message =
      buildMessage(
        snapshot,
        summary,
        additional
      );


    await sendLine(
      message
    );


    return NextResponse.json({
      ok:
        true,

      sent:
        true,

      progressDate:
        snapshot.progress_date,

      createdAt:
        snapshot.created_at,

      actual:
        summary.actualTotal,

      target:
        summary.targetTotal,
    });

  }

  catch (error) {

    console.error(
      'LINE latest error:',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        error:
          error?.message ||
          'Unable to send LINE progress',
      },
      {
        status:
          500,
      }
    );
  }
}