/**
 * @fileoverview TMDB & IMDb Metadata Client.
 * Conforms to Google TypeScript standards, SoC, and KISS principles.
 */

import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE } from './constants';
import type {
  Episode,
  MediaDetails,
  MediaItem,
  RawTmdbCast,
  RawTmdbDetailsResponse,
  RawTmdbFindResponse,
  RawTmdbItem,
  RawTmdbSearchResponse,
  RawTmdbSeasonEpisode,
  RawTmdbSeasonResponse,
  RawTmdbVideo,
} from './types';

/**
 * Returns full URL for a TMDB image.
 */
export function getImageUrl(
  path: string | null,
  size: 'w185' | 'w300' | 'w500' | 'w1280' | 'original' = 'w500'
): string {
  if (!path) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Normalizes raw TMDB objects into clean MediaItem interfaces.
 */
function toMediaItem(raw: RawTmdbItem, fallbackType: 'movie' | 'tv' = 'movie'): MediaItem {
  const isTv = raw.media_type === 'tv' || Boolean(raw.first_air_date) || Boolean(raw.name);
  return {
    id: raw.id,
    title: raw.title || raw.name || 'Untitled',
    overview: raw.overview || '',
    poster_path: raw.poster_path || null,
    backdrop_path: raw.backdrop_path || null,
    media_type: raw.media_type || (isTv ? 'tv' : fallbackType),
    release_date: raw.release_date || raw.first_air_date || '',
    vote_average: typeof raw.vote_average === 'number' ? Number(raw.vote_average.toFixed(1)) : 0,
    imdb_id: raw.imdb_id || raw.external_ids?.imdb_id,
  };
}

interface CloudflareRequestInit extends RequestInit {
  cf?: {
    cacheTtl?: number;
    cacheEverything?: boolean;
  };
}

/**
 * Edge-optimized fetch wrapper with Cloudflare CDN subrequest caching.
 */
async function tmdbFetch(url: string, cacheTtlSeconds: number = 86400): Promise<Response> {
  const init: CloudflareRequestInit = {
    headers: {
      Accept: 'application/json',
    },
    cf: {
      cacheTtl: cacheTtlSeconds,
      cacheEverything: true,
    },
  };
  return fetch(url, init);
}

/**
 * Resolves a media item directly by its IMDb ID (e.g. tt0137523).
 */
export async function resolveByImdbId(imdbId: string): Promise<MediaItem | null> {
  const cleanId = imdbId.trim().toLowerCase();
  if (!/^tt\d+$/.test(cleanId)) return null;

  try {
    const res = await tmdbFetch(
      `${TMDB_BASE_URL}/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`,
      86400
    );
    if (!res.ok) return null;
    const data = (await res.json()) as RawTmdbFindResponse;

    const movie = data.movie_results?.[0];
    if (movie) return toMediaItem({ ...movie, media_type: 'movie', imdb_id: cleanId });

    const tv = data.tv_results?.[0];
    if (tv) return toMediaItem({ ...tv, media_type: 'tv', imdb_id: cleanId });

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches trending media of the week.
 */
export async function getTrending(type: 'all' | 'movie' | 'tv' = 'all'): Promise<MediaItem[]> {
  try {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/trending/${type}/week?api_key=${TMDB_API_KEY}`, 43200);
    if (!res.ok) return [];
    const data = (await res.json()) as RawTmdbSearchResponse;
    return (data.results || []).map((item: RawTmdbItem) => toMediaItem(item));
  } catch {
    return [];
  }
}

/**
 * Fetches titles filtered by TMDB genre ID.
 */
export async function getByGenre(genreId: number, type: 'movie' | 'tv' = 'movie'): Promise<MediaItem[]> {
  try {
    const res = await tmdbFetch(
      `${TMDB_BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=150`,
      86400
    );
    if (!res.ok) return [];
    const data = (await res.json()) as RawTmdbSearchResponse;
    return (data.results || []).map((item: RawTmdbItem) => toMediaItem(item, type));
  } catch {
    return [];
  }
}

/**
 * Searches titles by query string or IMDb ID.
 */
export async function searchMedia(query: string): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Check if query is an IMDb ID
  if (/^tt\d+$/i.test(trimmed)) {
    const directMatch = await resolveByImdbId(trimmed);
    if (directMatch) return [directMatch];
  }

  try {
    const res = await tmdbFetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(trimmed)}&include_adult=false`,
      3600
    );
    if (!res.ok) return [];
    const data = (await res.json()) as RawTmdbSearchResponse;
    return (data.results || [])
      .filter((i: RawTmdbItem) => i.media_type === 'movie' || i.media_type === 'tv')
      .map((i: RawTmdbItem) => toMediaItem(i));
  } catch {
    return [];
  }
}

/**
 * Fetches detailed media metadata, cast, and trailers.
 */
export async function getMediaDetails(
  id: string | number,
  type: 'movie' | 'tv'
): Promise<MediaDetails | null> {
  try {
    const res = await tmdbFetch(
      `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,external_ids`,
      86400
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as RawTmdbDetailsResponse;

    const base = toMediaItem(raw, type);
    const imdb_id = raw.imdb_id || raw.external_ids?.imdb_id;

    // Extract official YouTube trailer
    let trailer_key: string | null = null;
    if (raw.videos?.results && Array.isArray(raw.videos.results)) {
      const official = raw.videos.results.find(
        (v: RawTmdbVideo) => v.site === 'YouTube' && v.type === 'Trailer' && v.official
      );
      trailer_key = official?.key || raw.videos.results.find((v: RawTmdbVideo) => v.site === 'YouTube')?.key || null;
    }

    const cast = (raw.credits?.cast || []).slice(0, 10).map((c: RawTmdbCast) => ({
      id: c.id,
      name: c.name,
      character: c.character || 'Cast',
      profile_path: c.profile_path || null,
    }));

    return {
      ...base,
      imdb_id,
      genres: raw.genres || [],
      runtime: raw.runtime,
      number_of_seasons: raw.number_of_seasons,
      seasons: (raw.seasons || []).filter((s) => s.season_number > 0),
      cast,
      trailer_key,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches TV season episode listings.
 */
export async function getSeasonEpisodes(id: string | number, season: number): Promise<Episode[]> {
  try {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}`, 86400);
    if (!res.ok) return [];
    const data = (await res.json()) as RawTmdbSeasonResponse;
    return (data.episodes || []).map((e: RawTmdbSeasonEpisode) => ({
      episode_number: e.episode_number,
      season_number: e.season_number,
      name: e.name || `Episode ${e.episode_number}`,
      overview: e.overview || '',
      still_path: e.still_path || null,
      air_date: e.air_date || '',
    }));
  } catch {
    return [];
  }
}
