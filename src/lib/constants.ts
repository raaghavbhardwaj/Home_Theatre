/**
 * @fileoverview Centralized constants for Home_Theatre.
 * Conforms to Google TypeScript standards (Rule 4: Constant Extraction).
 */

export const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const IMDB_BASE_URL = 'https://www.imdb.com/title';

export const SCRAPER_TIMEOUT_MS = 4000;

export const GENRES = [
  { id: 28, slug: 'action', name: 'Action' },
  { id: 878, slug: 'scifi', name: 'Sci-Fi' },
  { id: 16, slug: 'anime', name: 'Anime' },
  { id: 35, slug: 'comedy', name: 'Comedy' },
  { id: 80, slug: 'crime', name: 'Crime' },
  { id: 18, slug: 'drama', name: 'Drama' },
  { id: 27, slug: 'horror', name: 'Horror' },
  { id: 53, slug: 'thriller', name: 'Thriller' },
] as const;
