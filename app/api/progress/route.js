// app/api/progress/route.js

import {
  NextResponse,
} from 'next/server';

import {
  ITEMS,
  SG_TOTAL,
  HEAVY_COUNT_TOTAL,
} from '../../../lib/targets.js';


export const dynamic =
  'force-dynamic';


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


function getHeaders() {
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

    'Content-Type':
      'application/json',
  };
}


function cleanNumber(
  value,
  max
) {
  return Math.max(
    0,
    Math.min(
      max,
      Number(value ?? 0)
    )
  );
}


// ======================================================
// FETCH ONE SNAPSHOT
// ======================================================

async function fetchSnapshot(
  query
) {
  const url =
    `${getSupabaseUrl()}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&${query}` +
    `&order=progress_date.desc,created_at.desc` +
    `&limit=1`;


  const response =
    await fetch(
      url,
      {
        method: 'GET',

        headers:
          getHeaders(),

        cache: 'no-store',
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
// GET
//
// 1. ถ้ามี record วันที่เลือก -> ใช้ record วันนั้น
// 2. ถ้ายังไม่มี -> ใช้ยอดสะสมล่าสุดก่อนวันนั้น
// 3. บอก frontend ด้วยว่าเป็น exact หรือ carried forward
// ======================================================

export async function GET(
  request
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      );


    const date =
      searchParams.get(
        'date'
      );


    // --------------------------------------------------
    // ไม่ส่ง date มา
    // เอา record ล่าสุดทั้งหมด
    // --------------------------------------------------

    if (!date) {

      const latest =
        await fetchSnapshot(
          'progress_date=not.is.null'
        );


      return NextResponse.json(
        {
          snapshot:
            latest,

          exact: true,

          requestedDate:
            latest
              ?.progress_date ??
            null,

          sourceDate:
            latest
              ?.progress_date ??
            null,
        },
        {
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate',
          },
        }
      );
    }


    // --------------------------------------------------
    // 1. หา record ของวันที่เลือกก่อน
    // --------------------------------------------------

    const exactSnapshot =
      await fetchSnapshot(
        `progress_date=eq.${encodeURIComponent(
          date
        )}`
      );


    if (exactSnapshot) {

      return NextResponse.json(
        {
          snapshot:
            exactSnapshot,

          exact: true,

          requestedDate:
            date,

          sourceDate:
            exactSnapshot
              .progress_date,
        },
        {
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate',
          },
        }
      );
    }


    // --------------------------------------------------
    // 2. วันที่เลือกยังไม่มี record
    // Carry Forward จากวันก่อนหน้า
    // --------------------------------------------------

    const previousSnapshot =
      await fetchSnapshot(
        `progress_date=lt.${encodeURIComponent(
          date
        )}`
      );


    return NextResponse.json(
      {
        snapshot:
          previousSnapshot,

        exact: false,

        requestedDate:
          date,

        sourceDate:
          previousSnapshot
            ?.progress_date ??
          null,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  catch (error) {

    console.error(
      'GET progress error:',
      error
    );


    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to load progress',
      },
      {
        status: 500,
      }
    );
  }
}


// ======================================================
// POST
// SAVE SNAPSHOT
// ======================================================

export async function POST(
  request
) {
  try {

    const body =
      await request.json();


    if (
      !body.progress_date
    ) {

      return NextResponse.json(
        {
          error:
            'progress_date is required',
        },
        {
          status: 400,
        }
      );
    }


    const payload = {
      progress_date:
        body.progress_date,
    };


    // --------------------------------------------------
    // MAIN SAMPLE ITEMS
    // --------------------------------------------------

    for (
      const [
        key,
        item,
      ]
      of Object.entries(
        ITEMS
      )
    ) {

      payload[key] =
        cleanNumber(
          body[key],
          item.total
        );
    }


    // --------------------------------------------------
    // ADDITIONAL WORK
    // --------------------------------------------------

    payload.sg_measured =
      cleanNumber(
        body.sg_measured,
        SG_TOTAL
      );


    payload.duplicate_collected =
      cleanNumber(
        body.duplicate_collected,
        100
      );


    payload.heavy_counted =
      cleanNumber(
        body.heavy_counted,
        HEAVY_COUNT_TOTAL
      );


    // --------------------------------------------------
    // SAVE
    // --------------------------------------------------

    const url =
      `${getSupabaseUrl()}` +
      `/rest/v1/progress_snapshots`;


    const response =
      await fetch(
        url,
        {
          method: 'POST',

          headers: {
            ...getHeaders(),

            Prefer:
              'return=representation',
          },

          cache: 'no-store',

          body:
            JSON.stringify(
              payload
            ),
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


    const snapshot =
      rows?.[0] ??
      payload;


    return NextResponse.json(
      {
        ok: true,

        snapshot,

        exact: true,

        requestedDate:
          body.progress_date,

        sourceDate:
          body.progress_date,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  catch (error) {

    console.error(
      'POST progress error:',
      error
    );


    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to save progress',
      },
      {
        status: 500,
      }
    );
  }
}