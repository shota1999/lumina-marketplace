import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { createSession } from '@/lib/auth';
import { getDb, users, oauthAccounts } from '@lumina/db';

const ERROR_REDIRECT = '/auth/login?error=oauth_failed';

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
}

interface AppleIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
}

function decodeAppleIdToken(idToken: string): AppleIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  // Base64url decode the payload (second part)
  const payload = parts[1]!
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const decoded = Buffer.from(payload, 'base64').toString('utf-8');
  return JSON.parse(decoded) as AppleIdTokenClaims;
}

export async function POST(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const formData = await request.formData();
    const code = formData.get('code') as string | null;
    const state = formData.get('state') as string | null;
    const storedState = request.cookies.get('oauth_state')?.value;

    // Apple may send user info as JSON string on first authorization
    const userStr = formData.get('user') as string | null;
    let appleName: string | null = null;
    if (userStr) {
      try {
        const userData = JSON.parse(userStr) as { name?: { firstName?: string; lastName?: string } };
        const firstName = userData.name?.firstName || '';
        const lastName = userData.name?.lastName || '';
        appleName = [firstName, lastName].filter(Boolean).join(' ') || null;
      } catch {
        // Ignore parse errors for user data
      }
    }

    // Verify CSRF state
    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.APPLE_CLIENT_ID!,
        client_secret: process.env.APPLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/oauth/apple/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    const tokens: AppleTokenResponse = await tokenResponse.json();

    // Decode the id_token to get user claims
    const claims = decodeAppleIdToken(tokens.id_token);

    if (!claims.sub) {
      return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
    }

    const db = getDb();

    // Check if OAuth account already exists
    const existingOAuth = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, 'apple'),
          eq(oauthAccounts.providerAccountId, claims.sub),
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
      const email = claims.email;

      if (!email) {
        return NextResponse.redirect(new URL(ERROR_REDIRECT, appUrl));
      }

      // Check if a user with this email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser[0]) {
        // Link OAuth account to existing user
        userId = existingUser[0].id;
      } else {
        // Create new user -- Apple only sends the name on first auth
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            name: appleName || email.split('@')[0]!,
            passwordHash: null,
          })
          .returning({ id: users.id });

        userId = newUser!.id;
      }

      // Create OAuth account link
      await db.insert(oauthAccounts).values({
        userId,
        provider: 'apple',
        providerAccountId: claims.sub,
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
