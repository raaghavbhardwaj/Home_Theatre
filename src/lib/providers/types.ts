/**
 * @fileoverview Pluggable Scraper Provider Contract.
 * Conforms to Google TypeScript standards (Layer 2: Scraper Provider).
 */

import type { Stream } from '../types';

export interface ScraperProvider {
  /** Unique provider identifier */
  readonly id: string;
  /** Human-readable provider label */
  readonly name: string;
  /** Whether the provider is active */
  readonly enabled: boolean;
  /** Execution order preference (1 = primary) */
  readonly priority: number;

  /**
   * Resolves playable streams for the given media title.
   *
   * @param tmdbId TMDB identifier
   * @param mediaType Either 'movie' or 'tv'
   * @param season Season number (1-indexed for TV, undefined for movies)
   * @param episode Episode number (1-indexed for TV, undefined for movies)
   * @param imdbId Optional IMDb identifier for exact resolution
   */
  resolve(
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number,
    imdbId?: string
  ): Promise<Stream[]>;
}
