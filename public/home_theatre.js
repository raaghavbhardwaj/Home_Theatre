/**
 * @fileoverview Standalone Home_Theatre Provider for Nuvio.
 * Hosted directly on Cloudflare Workers.
 */
var API_ENDPOINT = "https://home-theatre.fancied.workers.dev/api/streams";

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (!tmdbId) return [];
    var isTv = mediaType === "tv" || mediaType === "series" || (typeof season === "number" && season > 0);
    var queryUrl = API_ENDPOINT + "?tmdb=" + encodeURIComponent(tmdbId) + "&type=" + (isTv ? "tv" : "movie");
    if (isTv) {
      queryUrl += "&s=" + encodeURIComponent(season || "1") + "&e=" + encodeURIComponent(episode || "1");
    }
    var res = await fetch(queryUrl);
    if (!res.ok) return [];
    var data = await res.json();
    return Array.isArray(data.streams) ? data.streams : [];
  } catch (e) {
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
if (typeof exports !== "undefined") exports.getStreams = getStreams;
if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
