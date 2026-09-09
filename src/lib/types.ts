/**
 * @fileoverview Pure domain contracts and schemas for Home_Theatre.
 * Conforms to Google TypeScript standards (Layer 1: Contract & Schema).
 */

export interface Subtitle {
  url: string;
  language: string;
  name?: string;
}

export interface Stream {
  name: string;
  title: string;
  url: string;
  quality: '4K' | '1080p' | '720p' | '480p' | 'Auto' | string;
  format?: 'm3u8' | 'mp4' | 'mkv' | string;
  size?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
}

export interface MediaItem {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  vote_average: number;
  imdb_id?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Episode {
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
}

export interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
}

export interface MediaDetails extends MediaItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  seasons?: Season[];
  cast: CastMember[];
  trailer_key?: string | null;
}
