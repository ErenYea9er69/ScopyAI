import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/store';

// GET the full mock user profile
export async function GET() {
  const user = userStore.get('default_user');
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: 'default_user',
    credits: user.credits,
    plan: user.plan,
    settings: user.settings
  });
}

// Update settings or refill credits
export async function POST(req: NextRequest) {
  const user = userStore.get('default_user');
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const body = await req.json();

    // Dev Refill 
    if (body.action === 'refill') {
      userStore.set('default_user', { ...user, credits: user.credits + 10 });
      return NextResponse.json({ success: true, credits: user.credits + 10 });
    }

    // Save Settings
    if (body.settings) {
      userStore.set('default_user', { 
        ...user, 
        settings: { ...user.settings, ...body.settings } 
      });
      return NextResponse.json({ success: true, settings: userStore.get('default_user')?.settings });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: 'Internal err' }, { status: 500 });
  }
}
