# System & Architectural Governance: `Home_Theatre`

This document defines the strict engineering guidelines, architectural patterns, clean code standards, and conventions for **`Home_Theatre`**. It is the single source of truth for all human and AI agents working on this repository.

---

## 1. Architectural Philosophy: Zero Bloat, Zero React & 100% Legal Separation

`Home_Theatre` is an ultra-minimalist, high-performance personal streaming web application and edge API.
- **Hosting**: Cloudflare Workers with Static Assets.
- **Engine**: Astro 5+ in Server (`output: 'server'`) mode.
- **Styling**: Tailwind CSS v4 (native `@import "tailwindcss"` engine with `@theme` design tokens and `build.inlineStylesheets: 'always'`).
- **Client Runtime**: **Zero React**. All client-side interactions utilize pure semantic HTML5 elements (`<video>`, `<dialog>`, `<button>`) and lightweight inlined vanilla JavaScript controllers.
- **Legal Architecture**: **100% Clean & Legal Core**. Zero scrapers, zero copyrighted links, and zero DMCA-sensitive logic in the main repository. All scraping logic is decoupled via the Hybrid Plugin Engine (Remote Worker API or private Git submodules).
- **Target Performance**: 100/100 Google Lighthouse / PageSpeed score across Performance (CLS=0, LCP < 200ms, critical chain = 1), Accessibility (WCAG 2.1 AA, WAI-ARIA Combobox 1.2), Best Practices, and SEO.

---

## 2. Separation of Concerns (SoC) — The 5 Architectural Layers

Every source file in the project belongs strictly to one of the following 5 decoupled layers:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Presentation & Pages (src/pages, src/components)   │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Edge API Routes (src/pages/api/*)                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Domain Aggregators (src/lib/providers/index.ts)   │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Providers & Metadata Clients (src/lib/providers/*) │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Contracts & Constants (src/lib/types.ts, constants)│
└─────────────────────────────────────────────────────────────┘
```

1. **Layer 1: Contracts & Constants (`src/lib/types.ts`, `src/lib/constants.ts`)**
   - Pure TypeScript definitions and immutable constants. Zero runtime dependencies.
   - 100% strict typing: zero `any`, zero `as any`.
   - All domain schemas (`Stream`, `Subtitle`, `MediaItem`, `MediaDetails`, `Episode`, `Season`, `RawTmdb*`) live here.
2. **Layer 2: Providers & Metadata Clients (`src/lib/providers/*`, `src/lib/tmdb.ts`)**
   - Pluggable scraper modules implementing the `ScraperProvider` contract.
   - `RemoteScraperProvider`: Adapter calling an external private scraper Worker via `SCRAPER_API_URL`.
   - Metadata fetching and IMDb resolution using free TMDB endpoints with Cloudflare Edge subrequest caching (`cf: { cacheTtl, cacheEverything }`).
3. **Layer 3: Domain Aggregators (`src/lib/providers/index.ts`)**
   - Executes enabled providers concurrently with strict timeout guards (`SCRAPER_TIMEOUT_MS`).
   - Deduplicates playable stream URLs and sorts streams from highest quality (4K/1080p) to lowest.
   - Exports `registerProvider()` for local private plugin integration.
4. **Layer 4: Edge API Routes (`src/pages/api/streams.ts`, `src/pages/api/search.ts`)**
   - CORS-enabled HTTP JSON endpoints (`Access-Control-Allow-Origin: *`).
   - Broadcasts `Cache-Control`, `CDN-Cache-Control`, and `Cloudflare-CDN-Cache-Control` for worldwide edge caching.
   - Serves both web frontend islands and third-party media players (e.g. Nuvio).
5. **Layer 5: Presentation & Client Pages (`src/pages/*`, `src/components/*`)**
   - Server-rendered Astro templates with progressive enhancement.
   - Zero-bloat Spotlight search interface with predictive prefetching and keyboard navigation.
   - Native `<dialog>` search modal isolated in `SearchDialog.astro` (rendered strictly when `!isHome`).
   - Universal video player with `hls.js` fallback and 1-click VLC/MPV codec error boundary.

---

## 3. The Hybrid Pluggable Scraper Architecture

To preserve 100% legality and compliance with GitHub Terms of Service:
1. **Never commit actual scrapers or piracy endpoints into the main repository.**
2. **Mode 1: Remote Worker Adapter (Recommended)**:
   - Host the scraper in a completely separate, private Cloudflare Worker.
   - Point `Home_Theatre` to it using the `SCRAPER_API_URL` or `PROVIDER_API_URL` environment variable.
   - `RemoteScraperProvider` forwards queries and normalizes the stream results with Cloudflare edge caching.
3. **Mode 2: Private Git Submodule (`src/lib/providers/plugins/`)**:
   - Link a private repository as a submodule in `src/lib/providers/plugins/`.
   - Everything inside `src/lib/providers/plugins/` (except `README.md` and `.gitkeep`) is ignored by `.gitignore`.
   - Plugins implement `ScraperProvider` and call `registerProvider(new MyPlugin())`.

---

## 4. Free IMDb Integration (Zero External Paid APIs)

`Home_Theatre` natively supports IMDb title lookup (`tt...`) and badges without relying on paid IMDb/AWS subscriptions:
- TMDB's free `/find/{external_id}?external_source=imdb_id` endpoint resolves IMDb IDs into TMDB media objects.
- All watch routes accept both TMDB ID and IMDb ID:
  - `/watch?imdb=tt0137523`
  - `/watch?id=550&type=movie`
  - `/watch?imdb=tt0944947&season=1&episode=1`
- The Stream API automatically resolves IMDb IDs if TMDB ID is omitted:
  - `/api/streams?imdb=tt0137523`

---

## 5. Dual-Consumer API & Self-Hosted Nuvio Protocol

The application acts as a standalone streaming web portal and as a self-hosted provider server for the Nuvio streaming platform:
- **`public/manifest.json`**: Standard Nuvio provider manifest.
- **`public/home_theatre.js`**: Nuvio client provider script that queries `/api/streams`.
- **`/api/streams`**: Standard Open Stream API accepting `id`/`tmdb`, `imdb`, `type`, `season`/`s`, and `episode`/`e`.

---

## 6. Google TypeScript Style Guide & Clean Code Rules

All code contributions must strictly adhere to the following Clean Code Rules:
1. **Rule 1 (SRP - Single Responsibility Principle)**: Every module, component, and function must do one thing well. Keep scraper parsing logic isolated from HTTP routing.
2. **Rule 2 (Explicit Descriptive Naming)**: Use intention-revealing names (`resolveByImdbId`, `executeProviderWithTimeout`). Never use abbreviations like `res1`, `tmp`, or `chk`.
3. **Rule 3 (Fail-Fast & Guard Clauses)**: Validate inputs at the boundary. Return early rather than nesting deep `if/else` blocks.
4. **Rule 4 (Zero Hardcoding & DRY Constants)**: All external endpoints, API keys, timeouts, and genre tables must be centralized in `src/lib/constants.ts`.
5. **Rule 5 (100% Strict TypeScript & Zero `any`)**: Enforce `strict: true`, `strictNullChecks: true`, and `noImplicitAny: true`. The `any` type or `as any` casting is strictly prohibited across the entire codebase. Catch blocks must use `catch (err: unknown)` with `err instanceof Error` narrowing.
