import { NextRequest } from 'next/server';

import { priceQuoteRequestSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { calculatePriceQuote } from '@/lib/services/pricing';

async function handle(input: Record<string, unknown>, id: string) {
  const parsed = priceQuoteRequestSchema.safeParse({ ...input, listingId: id });
  if (!parsed.success) {
    return errorResponse(
      { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      400,
    );
  }
  try {
    const quote = await calculatePriceQuote(
      parsed.data.listingId,
      parsed.data.startDate,
      parsed.data.endDate,
      parsed.data.guests,
    );
    return successResponse(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate price quote';
    return errorResponse({ code: 'INTERNAL_ERROR', message }, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bodyResult = await safeParseBody(request);
  if ('error' in bodyResult) return bodyResult.error;
  return handle(bodyResult.data as Record<string, unknown>, id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const guestsParam = url.searchParams.get('guests');
  return handle(
    {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      ...(guestsParam ? { guests: Number(guestsParam) } : {}),
    },
    id,
  );
}
