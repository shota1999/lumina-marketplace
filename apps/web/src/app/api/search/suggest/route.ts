import { NextRequest, NextResponse } from 'next/server';

import { MEILISEARCH_INDEX } from '@lumina/shared';

import { getMeiliClient } from '@/lib/meilisearch';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const client = getMeiliClient();
    const index = client.index(MEILISEARCH_INDEX);

    const results = await index.search(q, {
      limit: 8,
      attributesToRetrieve: ['id', 'title', 'slug', 'category', 'city', 'country', 'pricePerNight'],
      attributesToHighlight: ['title'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      showRankingScore: false,
    });

    // Deduplicate suggestions: listings + inferred location/category suggestions
    const listingSuggestions = results.hits.map((hit) => ({
      type: 'listing' as const,
      id: hit['id'] as string,
      title: hit['title'] as string,
      highlight: (hit._formatted?.['title'] as string) ?? (hit['title'] as string),
      slug: hit['slug'] as string,
      category: hit['category'] as string,
      city: hit['city'] as string,
      country: hit['country'] as string,
      pricePerNight: hit['pricePerNight'] as number,
    }));

    // Extract unique locations from results
    const seenLocations = new Set<string>();
    const locationSuggestions: { type: 'location'; text: string }[] = [];
    for (const hit of results.hits) {
      const loc = `${hit['city'] as string}, ${hit['country'] as string}`;
      if (!seenLocations.has(loc)) {
        seenLocations.add(loc);
        locationSuggestions.push({ type: 'location', text: loc });
      }
      if (locationSuggestions.length >= 3) break;
    }

    // Extract unique categories
    const seenCategories = new Set<string>();
    const categorySuggestions: { type: 'category'; text: string; value: string }[] = [];
    for (const hit of results.hits) {
      const cat = hit['category'] as string;
      if (!seenCategories.has(cat)) {
        seenCategories.add(cat);
        categorySuggestions.push({
          type: 'category',
          text: `${cat.charAt(0).toUpperCase() + cat.slice(1)} rentals`,
          value: cat,
        });
      }
      if (categorySuggestions.length >= 2) break;
    }

    return NextResponse.json({
      success: true,
      data: {
        listings: listingSuggestions.slice(0, 5),
        locations: locationSuggestions,
        categories: categorySuggestions,
        total: results.estimatedTotalHits ?? 0,
      },
    });
  } catch (error) {
    logger.error('Suggest failed', { error: String(error) });
    return NextResponse.json({ success: true, data: { listings: [], locations: [], categories: [], total: 0 } });
  }
}
