import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { withSpan, SpanAttr } from '@lumina/telemetry';

// ---------------------------------------------------------------------------
// Clients (lazy singleton)
// ---------------------------------------------------------------------------

let anthropic: Anthropic | undefined;
let openai: OpenAI | undefined;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for AI features');
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY is required for embeddings');
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// ---------------------------------------------------------------------------
// Embeddings (OpenAI text-embedding-3-small, 1536 dims)
// ---------------------------------------------------------------------------

/**
 * Generate an embedding vector for a piece of text.
 * Used for both listing content (at index time) and search queries (at query time).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return withSpan('ai.embedding', {
    'ai.model': 'text-embedding-3-small',
    'ai.input_length': text.length,
  }, async () => {
    const client = getOpenAI();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    });
    return response.data[0]!.embedding;
  });
}

/**
 * Build a text representation of a listing for embedding.
 * Combines all semantically relevant fields into a single string.
 */
export function buildListingEmbeddingText(listing: {
  title: string;
  description: string;
  category: string;
  city: string;
  state: string;
  country: string;
  amenities: string[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
}): string {
  const parts = [
    listing.title,
    listing.description,
    `Category: ${listing.category}`,
    `Location: ${listing.city}, ${listing.state}, ${listing.country}`,
    `Amenities: ${listing.amenities.join(', ')}`,
    `${listing.bedrooms} bedrooms, ${listing.bathrooms} bathrooms, up to ${listing.maxGuests} guests`,
  ];
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Description Generation (Claude, streaming)
// ---------------------------------------------------------------------------

export interface ListingContext {
  title: string;
  category: string;
  city: string;
  state: string;
  country: string;
  amenities: string[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  pricePerNight?: number;
}

/**
 * Generate a listing description using Claude.
 * Returns a ReadableStream of text chunks for streaming to the client.
 */
export async function generateListingDescription(
  context: ListingContext,
): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropic();
  const encoder = new TextEncoder();

  const prompt = `Write a compelling property listing description for a rental marketplace. The description should be warm, inviting, and highlight the unique features of this property.

Property details:
- Title: ${context.title}
- Type: ${context.category}
- Location: ${context.city}, ${context.state}, ${context.country}
- Bedrooms: ${context.bedrooms}
- Bathrooms: ${context.bathrooms}
- Max guests: ${context.maxGuests}
- Amenities: ${context.amenities.join(', ')}
${context.pricePerNight ? `- Price: $${context.pricePerNight}/night` : ''}

Requirements:
- 150-300 words
- Focus on the experience, not just features
- Mention the location and its appeal
- Highlight key amenities naturally
- Use evocative, professional language
- Do NOT use generic phrases like "hidden gem" or "one-of-a-kind"
- Do NOT start with "Welcome to" or "Nestled in"
- Write in third person (refer to the property as "this [category]" or by name)
- End with a sentence about the ideal guest or occasion

Return ONLY the description text, no headers or labels.`;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
