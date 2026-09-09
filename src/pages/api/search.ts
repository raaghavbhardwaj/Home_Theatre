/**
 * @fileoverview Search & IMDb Autocomplete API Endpoint.
 * Conforms to Google TypeScript standards (Layer 4: Edge API Route).
 */

import type { APIRoute } from 'astro';
import { searchMedia } from '../../lib/tmdb';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
  'CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800',
  'Cloudflare-CDN-Cache-Control': 'max-age=86400',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || '';

  if (!query.trim()) {
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: CORS_HEADERS });
  }

  try {
    const results = await searchMedia(query);
    return new Response(JSON.stringify({ results }), { status: 200, headers: CORS_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal search error';
    return new Response(JSON.stringify({ results: [], error: message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};
