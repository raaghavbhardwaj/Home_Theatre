/**
 * @fileoverview Stream Resolver API Endpoint.
 * Conforms to Google TypeScript standards (Layer 4: Edge API Route).
 */

import type { APIRoute } from 'astro';
import { resolveAllStreams } from '../../lib/providers';
import { resolveByImdbId } from '../../lib/tmdb';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
  'CDN-Cache-Control': 'max-age=1800, stale-while-revalidate=3600',
  'Cloudflare-CDN-Cache-Control': 'max-age=1800',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const GET: APIRoute = async (context) => {
  const { url, locals } = context;
  let tmdbId = url.searchParams.get('id') || url.searchParams.get('tmdb');
  const imdbId = url.searchParams.get('imdb') || undefined;
  const rawType = (url.searchParams.get('type') || 'movie').toLowerCase();
  const mediaType = rawType === 'tv' || rawType === 'series' ? 'tv' : 'movie';
  const season = url.searchParams.get('season') 
    ? parseInt(url.searchParams.get('season')!, 10) 
    : url.searchParams.get('s') ? parseInt(url.searchParams.get('s')!, 10) : undefined;
  const episode = url.searchParams.get('episode') 
    ? parseInt(url.searchParams.get('episode')!, 10) 
    : url.searchParams.get('e') ? parseInt(url.searchParams.get('e')!, 10) : undefined;


  // Resolve by IMDb ID if TMDB is omitted
  if (!tmdbId && imdbId) {
    const item = await resolveByImdbId(imdbId);
    if (item) tmdbId = String(item.id);
  }

  if (!tmdbId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required parameter: tmdb or imdb' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let scraperApiUrl: string | undefined;
  let scraperService: { fetch: typeof fetch } | undefined;
  try {
    // @ts-expect-error - cloudflare:workers is provided at runtime by Cloudflare Workers
    const cf = await import('cloudflare:workers');
    scraperApiUrl = (cf.env?.SCRAPER_API_URL as string) || (cf.env?.PROVIDER_API_URL as string);
    if (cf.env?.SCRAPER_SERVICE && typeof cf.env.SCRAPER_SERVICE.fetch === 'function') {
      scraperService = cf.env.SCRAPER_SERVICE as { fetch: typeof fetch };
    }
  } catch {
    // Fallback for non-Cloudflare runtimes
  }

  if (!scraperApiUrl && typeof process !== 'undefined') {
    scraperApiUrl = process.env?.SCRAPER_API_URL || process.env?.PROVIDER_API_URL;
  }

  try {
    const streams = await resolveAllStreams(
      tmdbId,
      mediaType,
      season,
      episode,
      imdbId,
      scraperApiUrl,
      scraperService
    );
    return new Response(
      JSON.stringify({
        success: true,
        count: streams.length,
        serviceBinding: Boolean(scraperService),
        scraperApiUrl: scraperApiUrl || null,
        streams,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stream resolution failed';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
