import { NextResponse } from 'next/server';
import { ITEMS } from '../../../lib/targets';

const baseHeaders = () => ({
  apikey: process.env.SUPABASE_SECRET_KEY,
  'Content-Type': 'application/json',
});

function envOk() {
  return (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SECRET_KEY
  );
}

function cleanValue(value, total) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      total,
      Math.floor(number)
    )
  );
}

export async function GET() {
  if (!envOk()) {
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

  const url =
    `${process.env.SUPABASE_URL}` +
    `/rest/v1/progress_snapshots` +
    `?select=*` +
    `&order=created_at.desc` +
    `&limit=1`;

  const res = await fetch(
    url,
    {
      headers: baseHeaders(),
      cache: 'no-store',
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error: data,
      },
      {
        status: res.status,
      }
    );
  }

  return NextResponse.json({
    snapshot:
      data[0] || null,
  });
}

export async function POST(req) {
  if (!envOk()) {
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

  const body = await req.json();

  const payload = {
    progress_date:
      body.progress_date,
  };

  for (
    const [key, config]
    of Object.entries(ITEMS)
  ) {
    payload[key] = cleanValue(
      body[key],
      config.total
    );
  }

  const url =
    `${process.env.SUPABASE_URL}` +
    `/rest/v1/progress_snapshots`;

  const res = await fetch(
    url,
    {
      method: 'POST',

      headers: {
        ...baseHeaders(),
        Prefer:
          'return=representation',
      },

      body:
        JSON.stringify(payload),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error: data,
      },
      {
        status: res.status,
      }
    );
  }

  return NextResponse.json({
    snapshot:
      data[0],
  });
}