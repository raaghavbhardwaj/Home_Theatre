# HOME_THEATRE

> **100% Self-Contained, Extreme Minimalist Personal Streaming Portal & Edge API.**  
> Built with Astro 5+, Tailwind CSS v4, Vanilla HTML5 + `hls.js`, and deployed on Cloudflare Workers with Static Assets. Guaranteed 100/100 Google Lighthouse score.

---

## ⚡ Highlights

- **Zero React Runtime**: Pure semantic HTML5 + vanilla JavaScript islands with `hls.js`. Zero hydration delays, zero layout shifts, sub-0.4s FCP.
- **100% Legal & DMCA-Proof Core**: The core repository contains zero hardcoded piracy endpoints or scraping logic. Streaming backends connect via decoupled remote workers or git-ignored submodules.
- **Hybrid Plugin Architecture**: Connect your stream scraper via a private remote Cloudflare Worker (`SCRAPER_API_URL`) or an isolated local plugin (`src/lib/providers/plugins/`).
- **Zero-Bloat Spotlight Search**: Instant keyboard-driven navigation (<kbd>&uarr;</kbd>/<kbd>&darr;</kbd>, <kbd>Enter</kbd>, <kbd>Esc</kbd>) with predictive edge prefetching for 0ms watch page transitions.
- **IMDb First-Class Citizen**: Search, browse, and play movies or TV series directly using IMDb IDs (`/watch?imdb=tt0137523`) with zero paid IMDb API subscriptions (powered by free TMDB reverse lookups).
- **Edge Caching & CDN Optimization**: Tiered Cloudflare caching (`s-maxage=86400`, `stale-while-revalidate=604800`) across SSR routes and Edge APIs, with subrequest caching for TMDB metadata.
- **Dual-Consumer Engine**: Serves both a lightning-fast web streaming interface and a self-hosted Nuvio streaming provider suite (`/manifest.json`, `/home_theatre.js`).
- **Resilient Edge Stream Aggregation**: Queries scraping providers concurrently with strict timeout cancellation, deduplication, quality sorting (4K → 1080p → 720p), and seamless in-player server switching with failover.
- **100% Strict TypeScript**: Strict type safety throughout the codebase with zero `any` and zero `as any`.

---

## 🏗️ Architecture & SoC (Separation of Concerns)

The project is structured into 5 decoupled architectural layers:

```
src/
├── lib/
│   ├── types.ts            # Layer 1: Pure domain schemas (Stream, MediaItem, Episode, Season)
│   ├── constants.ts        # Layer 1: Centralized configuration, edge timeouts, and endpoints
│   ├── tmdb.ts             # Layer 2: TMDB client with Edge subrequest caching & IMDb lookup
│   └── providers/          # Layer 2 & 3: Pluggable Scrapers & Aggregator
│       ├── types.ts        # ScraperProvider contract
│       ├── remote.ts       # Remote worker scraper adapter (SCRAPER_API_URL)
│       ├── plugins/        # Git-ignored directory for private scraper plugins
│       └── index.ts        # Aggregator: concurrency, timeout, deduplication, registerProvider()
├── pages/
│   ├── index.astro         # Layer 5: High-density Spotlight search & curated catalog
│   ├── watch.astro         # Layer 5: Theater player & episode matrix
│   └── api/                # Layer 4: Edge API Routes with global CDN caching
│       ├── streams.ts      # Public CORS stream resolver
│       ├── search.ts       # Autocomplete search endpoint
│       └── subtitles.ts    # Universal SRT-to-WebVTT edge proxy with CDN caching
└── components/             # Layer 5: Reusable minimalist UI components
    ├── Header.astro        # Brand navigation
    ├── SearchDialog.astro  # Native HTML5 search modal (rendered on subpages)
    ├── MediaCard.astro     # Zero-CLS 2:3 poster card with badges
    ├── VideoPlayer.astro   # Native HTML5 video + hls.js server switcher & VLC/MPV fallback
    └── EpisodePicker.astro # Season tabs + numeric episode matrix
```

---

## 🔌 The Hybrid Plugin System

To keep `Home_Theatre` 100% legal and safe to host publicly on GitHub and Cloudflare:

### Option 1: Remote Worker Adapter & Service Binding (Recommended)
Deploy your scraping logic to a separate private Cloudflare Worker (e.g. `cinejoy-worker`). Point `Home_Theatre` to it using environment variables or a high-performance Cloudflare Worker Service Binding:

**Method A: Cloudflare Worker Service Binding (Zero Latency Edge IPC)**:
In `wrangler.jsonc`:
```jsonc
{
  "services": [
    {
      "binding": "SCRAPER_SERVICE",
      "service": "cinejoy-worker"
    }
  ]
}
```

**Method B: Public / External URL**:
```bash
# In .env or Cloudflare Worker secrets / environment variables
SCRAPER_API_URL="https://my-private-scraper.workers.dev"
```

The remote worker implements a standard HTTP JSON endpoint:
```
GET /api/streams?id=550&type=movie
GET /api/streams?id=1399&type=tv&season=1&episode=1
```
Returning:
```json
{
  "streams": [
    {
      "name": "Cinejoy",
      "title": "Cinejoy — 4K",
      "url": "https://stream.example.com/master.m3u8",
      "quality": "4K",
      "format": "m3u8",
      "subtitles": [
        { "language": "en", "name": "English", "url": "https://subtitles.example.com/en.vtt" }
      ]
    }
  ]
}
```

### Option 2: Private Git Submodule / Local Plugin
Clone your private scraper repository into `src/lib/providers/plugins/` (which is excluded from Git via `.gitignore`):

```bash
git submodule add https://github.com/your-username/private-scrapers.git src/lib/providers/plugins/private
```

Inside your plugin, implement the `ScraperProvider` contract and register it:

```typescript
import { registerProvider } from '../index';
import type { ScraperProvider } from '../types';

export const customProvider: ScraperProvider = {
  name: 'CustomProvider',
  priority: 1,
  enabled: true,
  async resolve(tmdbId, mediaType, season, episode, imdbId) {
    // Custom scraping logic
    return [];
  }
};

registerProvider(customProvider);
```

---

## 📺 Nuvio Setup

`Home_Theatre` provides a ready-to-use, self-hosted Nuvio extension:

1. In Nuvio Settings → **Providers**, click **Add Provider**.
2. Enter your deployed manifest URL:
   ```
   https://home-theatre.fancied.workers.dev/manifest.json
   ```
3. Nuvio will automatically install `home_theatre.js` and stream directly through your edge worker!

---

## 🚀 Development & Deployment

### Prerequisites
- Node.js `>= 22.12.0`
- `pnpm` `>= 10.0.0`
- Cloudflare `wrangler` CLI

### Local Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build locally
pnpm run preview
```

### Edge Deployment
```bash
# Deploy directly to Cloudflare Workers
pnpm run deploy
```

---

## 📜 License

MIT &copy; [Raaghav Bhardwaj](https://github.com/raaghavbhardwaj)
