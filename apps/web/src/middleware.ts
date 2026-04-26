import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Next.js Edge Middleware
// ---------------------------------------------------------------------------
// Runs at the edge before every matched route. Handles:
//  1. Auth guards for protected routes
//  2. Admin role enforcement
//  3. Bot / crawler detection for API rate-limit headers
//  4. Security headers
//  5. Geo-based locale hint
// ---------------------------------------------------------------------------

const PROTECTED_PATHS = ['/dashboard', '/settings', '/bookings', '/messages', '/notifications'];
const ADMIN_PATHS = ['/admin'];
const AUTH_COOKIE = 'lumina_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(AUTH_COOKIE)?.value;
  const response = NextResponse.next();

  // ---- 1. Auth guards ----
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if ((isProtected || isAdmin) && !sessionToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- 2. Admin role enforcement (cookie-based hint) ----
  // Full role check is done server-side in admin layout, but we add a fast
  // edge redirect for users without the admin hint cookie.
  if (isAdmin && sessionToken) {
    const role = request.cookies.get('lumina_role')?.value;
    if (role && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ---- 3. Bot detection header ----
  const ua = request.headers.get('user-agent') ?? '';
  const isBot = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|linkedinbot/i.test(ua);
  if (isBot) {
    response.headers.set('X-Bot-Detected', '1');
  }

  // ---- 4. Security headers ----
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // ---- 5. Geo-based locale hint ----
  // Geo data is available on Vercel/Cloudflare; header-based fallback for other providers
  const country =
    request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry') ?? null;

  if (country) {
    response.headers.set('X-Geo-Country', country);

    const countryLocaleMap: Record<string, string> = {
      JP: 'ja',
      KR: 'ko',
      CN: 'zh',
      DE: 'de',
      FR: 'fr',
      ES: 'es',
      BR: 'pt',
      PT: 'pt',
    };
    const suggestedLocale = countryLocaleMap[country];
    if (suggestedLocale) {
      response.headers.set('X-Suggested-Locale', suggestedLocale);
    }
  }

  // ---- 6. API rate-limit identification ----
  if (pathname.startsWith('/api/')) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
    response.headers.set('X-Client-IP', ip);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
