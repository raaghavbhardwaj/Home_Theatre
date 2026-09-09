/**
 * @fileoverview Subtitle Proxy & SRT-to-WebVTT Converter API Endpoint.
 * Conforms to Google TypeScript standards (Layer 4: Edge API Route).
 * Ensures subtitles conform to the WebVTT standard required by HTML5 <track>.
 */

import type { APIRoute } from 'astro';

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'text/vtt; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
  'CDN-Cache-Control': 'max-age=604800',
  'Cloudflare-CDN-Cache-Control': 'max-age=604800',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/**
 * Converts SubRip (SRT) format to standard WebVTT format.
 */
function srtToWebVtt(content: string): string {
  // Strip byte-order-mark and normalize carriage returns
  let text = content.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n').trim();

  // If already valid WebVTT, return directly
  if (text.startsWith('WEBVTT')) {
    return text;
  }

  // Convert comma millisecond separators to periods (00:01:23,456 --> 00:01:23.456)
  text = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return `WEBVTT\n\n${text}\n`;
}

/**
 * Resolves upstream URL if Shegu proxy URL is used with base64 payload.
 */
function extractUpstreamUrl(url: string): string | null {
  if (!url.includes('/sub/')) return null;
  try {
    const parts = url.split('/sub/');
    if (parts.length < 2 || !parts[1]) return null;
    const base64Part = parts[1].split('?')[0];
    const decoded = atob(base64Part);
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded;
    }
  } catch {
    // Fallback to primary URL
  }
  return null;
}

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return new Response('WEBVTT\n\nNOTE: Invalid or missing url parameter\n', {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const upstreamUrl = extractUpstreamUrl(targetUrl);
  const candidateUrls = upstreamUrl ? [targetUrl, upstreamUrl] : [targetUrl];

  let rawContent: string | null = null;

  for (const candidate of candidateUrls) {
    try {
      const res = await fetch(candidate, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
          Referer: 'https://cinejoy.to/',
          Origin: 'https://cinejoy.to',
        },
      });

      if (res.ok) {
        rawContent = await res.text();
        if (rawContent && rawContent.length > 0) {
          break;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  if (!rawContent) {
    return new Response('WEBVTT\n\nNOTE: Failed to fetch subtitle file\n', {
      status: 502,
      headers: CORS_HEADERS,
    });
  }

  const vttContent = srtToWebVtt(rawContent);

  return new Response(vttContent, {
    status: 200,
    headers: CORS_HEADERS,
  });
};
