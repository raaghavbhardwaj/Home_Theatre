/**
 * @fileoverview Cinejoy Scraper Provider.
 * Conforms to Google TypeScript standards (Rule 1: SRP).
 */

import type { Stream, Subtitle } from '../types';
import type { ScraperProvider } from './types';

const BACKUP_EDGE = 'https://nuvio-providers-rose.vercel.app/api/cinejoy';

export const cinejoyProvider: ScraperProvider = {
  id: 'cinejoy',
  name: 'Cinejoy',
  enabled: true,
  priority: 1,
  async resolve(tmdbId, mediaType, season, episode): Promise<Stream[]> {
    try {
      let url = `${BACKUP_EDGE}?tmdb=${encodeURIComponent(tmdbId)}&type=${mediaType === 'tv' ? 'series' : 'movie'}`;
      if (mediaType === 'tv') {
        url += `&season=${season || 1}&episode=${episode || 1}`;
      }

      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      return Array.isArray(data.streams) ? data.streams : [];
    } catch {
      return [];
    }
  },
};
