import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { webhookUrl } = await req.json();

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json({ error: 'Invalid Slack Webhook URL' }, { status: 400 });
    }

    // Attempt to post a test generic message to the webhook
    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        text: '👋 *ScopyAI Intelligence* connected successfully.\n\nYou will now receive scheduled market intelligence signals right here in Slack.',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Slack API error: ${res.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Slack Test API]', err);
    return NextResponse.json({ error: 'External Integration Failed' }, { status: 500 });
  }
}
