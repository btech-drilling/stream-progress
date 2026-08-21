import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token =
      process.env.LINE_CHANNEL_ACCESS_TOKEN;

    const to =
      process.env.LINE_TO_ID;

    if (!token || !to) {
      return NextResponse.json(
        {
          error: 'LINE environment variables are missing',
        },
        {
          status: 500,
        }
      );
    }

    const response = await fetch(
      'https://api.line.me/v2/bot/message/push',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          to,

          messages: [
            {
              type: 'text',
              text: '✅ BTECH Progress Alert connected successfully',
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error =
        await response.text();

      return NextResponse.json(
        {
          error,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'LINE test sent',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}