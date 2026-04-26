import { NextRequest, NextResponse } from 'next/server';

interface ApiError {
  code: string;
  message: string;
}

/** Maximum allowed request body size in bytes (100KB). */
const MAX_BODY_SIZE = 100 * 1024;

/**
 * Standard success response.
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Standard error response. Never leaks internal details.
 */
export function errorResponse(error: ApiError, status: number) {
  return NextResponse.json(
    { success: false, error: { code: error.code, message: error.message } },
    { status },
  );
}

/**
 * Safely parse JSON from a request body.
 * Returns an error response on malformed JSON or payloads exceeding the size limit.
 */
export async function safeParseBody(
  request: NextRequest,
): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return {
        error: errorResponse({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' }, 413),
      };
    }
    const data = await request.json();
    return { data };
  } catch {
    return { error: errorResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400) };
  }
}

/**
 * Maps known business error codes to HTTP status codes.
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  DUPLICATE: 409,
  UNAVAILABLE: 409,
  IDEMPOTENT_REJECT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  INVALID_DATES: 400,
  PAST_DATE: 400,
  TOO_LONG: 400,
  TOO_MANY_GUESTS: 400,
  INVALID_STATUS: 400,
};

export function businessErrorResponse(code: string, message: string) {
  return errorResponse({ code, message }, ERROR_STATUS_MAP[code] ?? 400);
}
