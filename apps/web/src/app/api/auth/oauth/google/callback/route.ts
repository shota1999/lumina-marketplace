import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { createSession } from '@/lib/auth';
import { getDb, users, oauthAccounts } from '@lumina/db';

const ERROR_REDIRECT = '/auth/login?error=oauth_failed';

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = request.cookies.get('oauth_state')?.value;

    // Verify CSRF state
    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Fetch user profile
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    const db = getDb();

    // Check if OAuth account already exists
    const existingOAuth = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, 'google'),
          eq(oauthAccounts.providerAccountId, googleUser.id),
        ),
      )
      .limit(1);

    let userId: string;

    const existingOAuthRecord = existingOAuth[0];
    if (existingOAuthRecord) {
      // Existing OAuth link -- log in
      userId = existingOAuthRecord.userId;

      // Update tokens
      await db
        .update(oauthAccounts)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existingOAuthRecord.refreshToken,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        })
        .where(eq(oauthAccounts.id, existingOAuthRecord.id));
    } else {
      // Check if a user with this email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .limit(1);

      if (existingUser[0]) {
        // Link OAuth account to existing user
        userId = existingUser[0].id;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0]!,
            passwordHash: null,
            avatarUrl: googleUser.picture || null,
          })
          .returning({ id: users.id });

        userId = newUser!.id;
      }

      // Create OAuth account link
      await db.insert(oauthAccounts).values({
        userId,
        provider: 'google',
        providerAccountId: googleUser.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      });
    }

    // Create session
    await createSession(userId);

    // Clear the OAuth state cookie and redirect
    const response = NextResponse.redirect(new URL('/', appUrl));
    response.cookies.delete('oauth_state');
    return response;
  } catch {
    return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
  }
}
