/**
 * @fileoverview VidSrc Scraper Provider.
 * Conforms to Google TypeScript standards (Rule 1: SRP).
 */

import type { Stream, Subtitle } from '../types';
import type { ScraperProvider } from './types';

const DIRECT_API = 'https://api.speedracelight.com';
const DEC_API = 'https://enc-dec.app/api/dec-videasy';
const SUB_API = 'https://subtitles.shegu.st/subtitles';
const BACKUP_EDGE = 'https://nuvio-providers-rose.vercel.app/api/vidsrc';

const HEADERS = {
  Accept: '*/*',
  Origin: 'https://player.videasy.to',
  Referer: 'https://player.videasy.to/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/137.0.0.0 Safari/537.36',
};

async function fetchSubtitles(mediaType: string, tmdbId: string, s?: number, e?: number): Promise<Subtitle[]> {
  try {
    let url = `${SUB_API}?type=${mediaType}&tmdb=${tmdbId}`;
    if (mediaType === 'tv' && s && e) url += `&season=${s}&episode=${e}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const list = Array.isArray(json) ? json : json?.subtitles || [];
    return list.filter((i: any) => i?.url).map((i: any) => ({
      url: i.url,
      language: i.language || 'en',
      name: i.display || i.language || 'English',
    }));
  } catch {
    return [];
  }
}

async function resolveDirect(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  s?: number,
  e?: number
): Promise<Stream[]> {
  try {
    const isTv = mediaType === 'tv';
    const [seedRes, subtitles] = await Promise.all([
      fetch(`${DIRECT_API}/seed?mediaId=${tmdbId}`, { headers: HEADERS }),
      fetchSubtitles(mediaType, tmdbId, s, e),
    ]);

    if (!seedRes.ok) return [];
    const { seed } = (await seedRes.json()) as any;
    if (!seed) return [];

    const server = 'yoru';
    let target = `${DIRECT_API}/${server}/sources-with-title?mediaType=${mediaType}&tmdbId=${tmdbId}&enc=2&seed=${seed}`;
    if (isTv && s && e) {
      target += `&seasonId=${s}&episodeId=${e}`;
    }

    const encRes = await fetch(target, { headers: HEADERS });
    const encText = await encRes.text();
    if (!encText || encText.includes('error')) return [];

    const decRes = await fetch(DEC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encText, id: tmdbId, seed }),
    });

    if (!decRes.ok) return [];
    const { status, result } = (await decRes.json()) as any;
    if (status !== 200 || !result) return [];

    const streams: Stream[] = [];
    if (result.playlist) {
      streams.push({
        name: 'VidSrc [Auto]',
        title: 'VidSrc - Auto HLS',
        url: result.playlist,
        quality: 'Auto',
        format: 'm3u8',
        subtitles,
      });
    }

    if (Array.isArray(result.sources)) {
      for (const src of result.sources) {
        if (!src?.url) continue;
        const q = String(src.quality || '1080p').toUpperCase();
        const normQ = q.includes('4K') || q.includes('2160') ? '4K' : q.includes('1080') ? '1080p' : '720p';
        streams.push({
          name: `VidSrc [${normQ}]`,
          title: `VidSrc - ${normQ}`,
          url: src.url,
          quality: normQ,
          format: 'm3u8',
          subtitles,
        });
      }
    }

    return streams;
  } catch {
    return [];
  }
}

async function resolveBackup(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  s?: number,
  e?: number
): Promise<Stream[]> {
  try {
    let url = `${BACKUP_EDGE}?tmdb=${encodeURIComponent(tmdbId)}&type=${mediaType === 'tv' ? 'series' : 'movie'}`;
    if (mediaType === 'tv') {
      url += `&season=${s || 1}&episode=${e || 1}`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return Array.isArray(data.streams) ? data.streams : [];
  } catch {
    return [];
  }
}

export const vidsrcProvider: ScraperProvider = {
  id: 'vidsrc',
  name: 'VidSrc',
  enabled: true,
  priority: 1,
  async resolve(tmdbId, mediaType, season, episode): Promise<Stream[]> {
    // 1. Try direct extraction
    const directStreams = await resolveDirect(tmdbId, mediaType, season, episode);
    if (directStreams.length > 0) return directStreams;

    // 2. Failover to edge mirror
    return await resolveBackup(tmdbId, mediaType, season, episode);
  },
};
