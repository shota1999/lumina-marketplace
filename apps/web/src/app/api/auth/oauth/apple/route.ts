import crypto from 'crypto';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.APPLE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !appUrl) {
      return NextResponse.redirect(
        new URL('/auth/login?error=oauth_failed', appUrl || 'http://localhost:3000'),
      );
    }

    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = `${appUrl}/api/auth/oauth/apple/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'name email',
      response_type: 'code',
      response_mode: 'form_post',
      state,
    });

    const appleUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

    const response = NextResponse.redirect(appleUrl);
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(
        '/auth/login?error=oauth_failed',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      ),
    );
  }
}
