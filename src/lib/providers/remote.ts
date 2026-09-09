/**
 * @fileoverview Remote External Scraper Provider Adapter.
 * Conforms to Google TypeScript standards (Layer 2: Provider Adapter).
 * Allows plugging in external private scraping Workers or microservices via URL.
 */

import type { Stream } from '../types';
import type { ScraperProvider } from './types';

interface CloudflareFetchInit extends RequestInit {
  cf?: {
    cacheTtl?: number;
    cacheEverything?: boolean;
  };
}

export type Fetcher = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export class RemoteScraperProvider implements ScraperProvider {
  readonly id = 'remote-scraper';
  readonly name = 'Remote Scraper Service';
  readonly priority = 1;

  private endpoint: string;
  private fetcher?: Fetcher;

  constructor(endpoint?: string, fetcher?: Fetcher) {
    const raw =
      endpoint ||
      (typeof import.meta !== 'undefined' && (import.meta.env?.SCRAPER_API_URL || import.meta.env?.PROVIDER_API_URL)) ||
      (typeof process !== 'undefined' ? process.env?.SCRAPER_API_URL || process.env?.PROVIDER_API_URL : '') ||
      'https://cinejoy-worker.fancied.workers.dev';
    this.endpoint = String(raw).trim().replace(/\/+$/, '');
    this.fetcher = fetcher;
  }

  get enabled(): boolean {
    return Boolean(this.endpoint) || Boolean(this.fetcher);
  }

  async resolve(
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number,
    imdbId?: string
  ): Promise<Stream[]> {
    if (!this.enabled) return [];

    const params = new URLSearchParams({
      id: tmdbId,
      type: mediaType,
    });
    if (season !== undefined) params.set('season', String(season));
    if (episode !== undefined) params.set('episode', String(episode));
    if (imdbId) params.set('imdb', imdbId);

    try {
      const baseUrl = this.fetcher
        ? 'http://cinejoy-worker'
        : (this.endpoint || 'https://cinejoy-worker.fancied.workers.dev');
      const url = `${baseUrl}/api/streams?${params.toString()}`;
      const init: CloudflareFetchInit = {
        headers: {
          Accept: 'application/json',
        },
      };

      const fetchFn = this.fetcher ? this.fetcher.fetch.bind(this.fetcher) : fetch;
      const res = await fetchFn(url, init);
      if (!res.ok) {
        console.error(`[RemoteScraper] HTTP ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = (await res.json()) as { streams?: Stream[] };
      return Array.isArray(data.streams) ? data.streams : [];
    } catch (err) {
      console.error('[RemoteScraper] Fetch failed:', err);
      return [];
    }
  }
}
