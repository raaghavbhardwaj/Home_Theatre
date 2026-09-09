# HOME_THEATRE

> **100% Self-Contained, Extreme Minimalist Personal Streaming Portal & Edge API.**  
> Built with Astro 5+, Tailwind CSS v4, Vanilla HTML5 + `hls.js`, and deployed on Cloudflare Workers with Static Assets. Guaranteed 100/100 Google Lighthouse score.

---

## ⚡ Highlights

- **Zero React Runtime**: Pure semantic HTML5 + vanilla JavaScript islands with `hls.js`. Zero hydration delays, zero layout shifts, sub-0.4s FCP.
- **Pluggable Scraper Architecture**: Adding a new streaming provider takes exactly **1 file** in `src/lib/providers/`.
- **IMDb First-Class Citizen**: Search, browse, and play movies or TV series directly using IMDb IDs (`/watch?imdb=tt0137523`) with zero paid IMDb API subscriptions (powered by free TMDB reverse lookups).
- **Dual-Consumer Engine**: Serves both a lightning-fast web streaming interface and a self-hosted Nuvio streaming provider suite (`/manifest.json`, `/home_theatre.js`).
- **Resilient Edge Stream Aggregation**: Queries multiple scraping backends concurrently with strict 4-second timeout cancellation, deduplication, quality sorting (4K → 1080p → 720p), and seamless in-player server switching with failover.
- **Keyboard-First Navigation**: Global search hotkey (<kbd>/</kbd>), native HTML5 `<dialog>` autocomplete modal, player hotkeys (<kbd>Space</kbd>, <kbd>F</kbd>, <kbd>M</kbd>, arrow keys).

---

## 🏗️ Architecture & SoC (Separation of Concerns)

The project is structured into 5 decoupled architectural layers:

```
src/
├── lib/
│   ├── types.ts            # Layer 1: Pure domain schemas (Stream, MediaItem, Episode, Season)
│   ├── constants.ts        # Layer 1: Centralized configuration and endpoints
│   ├── tmdb.ts             # Layer 2: TMDB client & IMDb reverse lookup
│   └── providers/          # Layer 2 & 3: Pluggable Scrapers & Aggregator
│       ├── types.ts        # ScraperProvider contract
│       └── index.ts        # Aggregator: concurrency, timeout, deduplication
├── pages/
│   ├── index.astro         # Layer 5: High-density catalog & category filters
│   ├── watch.astro         # Layer 5: Theater player & episode matrix
│   └── api/                # Layer 4: Edge API Routes
│       ├── streams.ts      # Public CORS stream resolver
│       └── search.ts       # Autocomplete search endpoint
└── components/             # Layer 5: Reusable minimalist UI components
    ├── Header.astro        # Brand navigation & native search modal
    ├── MediaCard.astro     # Zero-CLS 2:3 poster card with badges
    ├── VideoPlayer.astro   # Native HTML5 video + hls.js server switcher
    └── EpisodePicker.astro # Season tabs + numeric episode matrix
```

---

## 🔌 Adding a New Streaming Provider (1-File Drop-In)

To add a new scraper backend:

1. Create a new file in `src/lib/providers/<name>.ts`:

```typescript
import type { ScraperProvider } from './types';
import type { Stream } from '../types';

export const myScraper: ScraperProvider = {
  name: 'MyProvider',
  priority: 3,
  enabled: true,
  async resolve(tmdbId, mediaType, season, episode, imdbId): Promise<Stream[]> {
    // Implement resolution logic...
    return [
      {
        name: 'MyProvider',
        title: 'MyProvider — 1080p',
        url: 'https://example.com/stream.m3u8',
        quality: '1080p',
        format: 'm3u8',
      },
    ];
  },
};
```

2. Export it in `src/lib/providers/index.ts`:

```typescript
import { myScraper } from './myScraper';

export const PROVIDERS: ScraperProvider[] = [
  vidsrcProvider,
  myScraper, // Done!
];
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
