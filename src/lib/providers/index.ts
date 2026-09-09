/**
 * @fileoverview Central Provider Aggregator Engine.
 * Conforms to Google TypeScript standards (Layer 3: Domain Aggregator).
 */

import { SCRAPER_TIMEOUT_MS } from '../constants';
import type { Stream } from '../types';
import type { ScraperProvider } from './types';

/**
 * Registry of all available stream providers.
 * Currently empty - waiting for new website integration.
 */
export const PROVIDERS: ScraperProvider[] = [];

const QUALITY_WEIGHTS: Record<string, number> = {
  '4K': 5,
  '2160p': 5,
  '1440p': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  Auto: 0,
  Unknown: -1,
};

/**
 * Executes a single provider with a strict timeout guard.
 */
async function executeProviderWithTimeout(
  provider: ScraperProvider,
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
  imdbId?: string
): Promise<Stream[]> {
  try {
    const timeoutPromise = new Promise<Stream[]>((resolve) =>
      setTimeout(() => resolve([]), SCRAPER_TIMEOUT_MS)
    );

    const scrapePromise = provider.resolve(tmdbId, mediaType, season, episode, imdbId);
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch {
    return [];
  }
}

/**
 * Concurrently resolves streams across all enabled providers, deduplicates URLs,
 * and sorts them from highest resolution (4K) to lowest.
 */
export async function resolveAllStreams(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
  imdbId?: string
): Promise<Stream[]> {
  const activeProviders = PROVIDERS.filter((p) => p.enabled).sort(
    (a, b) => a.priority - b.priority
  );

  const results = await Promise.allSettled(
    activeProviders.map((p) =>
      executeProviderWithTimeout(p, tmdbId, mediaType, season, episode, imdbId)
    )
  );

  const allStreams: Stream[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allStreams.push(...res.value);
    }
  }

  // Deduplicate streams by playable URL
  const seenUrls = new Set<string>();
  const uniqueStreams: Stream[] = [];

  for (const s of allStreams) {
    if (!s.url || seenUrls.has(s.url)) continue;
    seenUrls.add(s.url);
    uniqueStreams.push(s);
  }

  // Sort streams by quality descending
  uniqueStreams.sort((a, b) => {
    const scoreA = QUALITY_WEIGHTS[a.quality || 'Unknown'] ?? -1;
    const scoreB = QUALITY_WEIGHTS[b.quality || 'Unknown'] ?? -1;
    return scoreB - scoreA;
  });

  return uniqueStreams;
}

/**
 * Ergonomic object-based wrapper for stream resolution.
 */
export async function getAggregatedStreams(options: {
  tmdbId: string | number;
  imdbId?: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}): Promise<Stream[]> {
  return resolveAllStreams(
    String(options.tmdbId),
    options.type,
    options.season,
    options.episode,
    options.imdbId
  );
}

