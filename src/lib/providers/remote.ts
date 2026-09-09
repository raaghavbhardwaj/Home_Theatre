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

export class RemoteScraperProvider implements ScraperProvider {
  readonly id = 'remote-scraper';
  readonly name = 'Remote Scraper Service';
  readonly priority = 1;

  private endpoint: string;

  constructor(endpoint?: string) {
    const raw = endpoint || (typeof process !== 'undefined' ? process.env?.SCRAPER_API_URL || process.env?.PROVIDER_API_URL : '') || '';
    this.endpoint = raw.trim().replace(/\/+$/, '');
  }

  get enabled(): boolean {
    return Boolean(this.endpoint);
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
      const url = `${this.endpoint}/api/streams?${params.toString()}`;
      const init: CloudflareFetchInit = {
        headers: {
          Accept: 'application/json',
        },
        cf: {
          cacheTtl: 1800,
          cacheEverything: true,
        },
      };

      const res = await fetch(url, init);
      if (!res.ok) return [];

      const data = (await res.json()) as { streams?: Stream[] };
      return Array.isArray(data.streams) ? data.streams : [];
    } catch {
      return [];
    }
  }
}
