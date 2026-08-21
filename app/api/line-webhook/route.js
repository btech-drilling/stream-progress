import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const channelSecret =
      process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_SECRET is missing' },
        { status: 500 }
      );
    }

    const body = await request.text();

    const signature =
      request.headers.get('x-line-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing LINE signature' },
        { status: 401 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    const receivedBuffer =
      Buffer.from(signature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid LINE signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);

    for (const event of data.events || []) {
      const source = event.source;

      if (
        source?.type === 'group' &&
        source.groupId
      ) {
        console.log(
          'LINE_GROUP_ID:',
          source.groupId
        );
      }
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      'LINE webhook error:',
      error
    );

    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 500 }
    );
  }
}