import crypto from 'crypto';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !appUrl) {
      return NextResponse.redirect(
        new URL('/auth/login?error=oauth_failed', appUrl || 'http://localhost:3000'),
      );
    }

    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = `${appUrl}/api/auth/oauth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    const response = NextResponse.redirect(googleUrl);
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
