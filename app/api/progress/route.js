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
// GET SNAPSHOT FOR SELECTED DATE
// ======================================================

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const date =
      searchParams.get('date');

    let url =
      `${getSupabaseUrl()}` +
      `/rest/v1/progress_snapshots` +
      `?select=*`;

    if (date) {
      url +=
        `&progress_date=eq.${encodeURIComponent(
          date
        )}`;
    }

    url +=
      `&order=progress_date.desc,created_at.desc` +
      `&limit=1`;

    const response =
      await fetch(url, {
        headers:
          getHeaders(),

        cache: 'no-store',
      });


    if (!response.ok) {
      const text =
        await response.text();

      throw new Error(text);
    }


    const rows =
      await response.json();


    return NextResponse.json(
      {
        snapshot:
          rows?.[0] ?? null,
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
// SAVE SNAPSHOT
// ======================================================

export async function POST(
  request
) {
  try {
    const body =
      await request.json();

    if (!body.progress_date) {
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


    // Main 5 items
    for (
      const [key, item]
      of Object.entries(ITEMS)
    ) {
      payload[key] =
        cleanNumber(
          body[key],
          item.total
        );
    }


    // Additional Work
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


    const url =
      `${getSupabaseUrl()}` +
      `/rest/v1/progress_snapshots`;


    const response =
      await fetch(url, {
        method: 'POST',

        headers: {
          ...getHeaders(),

          Prefer:
            'return=representation',
        },

        body:
          JSON.stringify(
            payload
          ),
      });


    if (!response.ok) {
      const text =
        await response.text();

      throw new Error(text);
    }


    const rows =
      await response.json();


    return NextResponse.json({
      ok: true,
      snapshot:
        rows?.[0] ??
        payload,
    });
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