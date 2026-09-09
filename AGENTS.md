# System & Architectural Governance: `Home_Theatre`

This document defines the strict engineering guidelines, architectural patterns, clean code standards, and conventions for **`Home_Theatre`**. It is the single source of truth for all human and AI agents working on this repository.

---

## 1. Architectural Philosophy & Zero-React Mandate

`Home_Theatre` is an ultra-minimalist, high-performance personal streaming web application and edge API.
- **Hosting**: Cloudflare Workers with Static Assets.
- **Engine**: Astro 5+ in Server (`output: 'server'`) mode.
- **Styling**: Tailwind CSS v4 (native `@import "tailwindcss"` engine).
- **Client Runtime**: **Zero React**. All client-side interactions utilize pure semantic HTML5 elements (`<video>`, `<dialog>`, `<details>`) and lightweight vanilla JavaScript islands with `hls.js`.
- **Target Performance**: 100/100 Google Lighthouse / PageSpeed score across Performance, Accessibility, Best Practices, and SEO.

---

## 2. Separation of Concerns (SoC) — The 5 Architectural Layers

Every source file in the project belongs strictly to one of the following 5 decoupled layers:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Presentation & Islands (src/pages, src/components) │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Edge API Routes (src/pages/api/*)                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Domain Aggregators (src/lib/providers/index.ts)   │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Providers & External Clients (src/lib/providers/*) │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Contracts & Constants (src/lib/types.ts, constants)│
└─────────────────────────────────────────────────────────────┘
```

1. **Layer 1: Contracts & Constants (`src/lib/types.ts`, `src/lib/constants.ts`)**
   - Pure TypeScript definitions and immutable constants. Zero runtime dependencies.
   - All domain schemas (`Stream`, `Subtitle`, `MediaItem`, `MediaDetails`, `Episode`, `Season`) live here.
2. **Layer 2: Providers & Metadata Clients (`src/lib/providers/*`, `src/lib/tmdb.ts`)**
   - Isolated scraper modules implementing the `ScraperProvider` contract.
   - Metadata fetching and IMDb resolution using free TMDB endpoints.
3. **Layer 3: Domain Aggregators (`src/lib/providers/index.ts`)**
   - Executes enabled providers concurrently with strict timeout guards (4,000 ms).
   - Deduplicates playable stream URLs and sorts streams from highest quality (4K/1080p) to lowest.
4. **Layer 4: Edge API Routes (`src/pages/api/streams.ts`, `src/pages/api/search.ts`)**
   - CORS-enabled HTTP JSON endpoints (`Access-Control-Allow-Origin: *`).
   - Serves both web frontend islands and third-party media players (e.g. Nuvio).
5. **Layer 5: Presentation & Client Islands (`src/pages/*`, `src/components/*`)**
   - Server-rendered Astro templates with progressive enhancement.
   - Native `<dialog>` search modal and vanilla `<video>` / `hls.js` player island.

---

## 3. The Pluggable Scraper Architecture

Adding a new streaming provider requires creating exactly **one file** and registering it in the array:

1. Create `src/lib/providers/<provider-name>.ts`:
   ```typescript
   import type { ScraperProvider } from './types';
   import type { Stream } from '../types';

   export const myNewProvider: ScraperProvider = {
     name: 'MyProvider',
     priority: 3,
     enabled: true,
     async resolve(tmdbId, mediaType, season, episode, imdbId): Promise<Stream[]> {
       // 1. Fetch from provider API or upstream server
       // 2. Return Stream[]
       return [];
     }
   };
   ```
2. Register the provider in `src/lib/providers/index.ts`:
   ```typescript
   import { myNewProvider } from './myNewProvider';

   export const PROVIDERS: ScraperProvider[] = [
     vidsrcProvider,
     cinejoyProvider,
     myNewProvider, // <- One-line addition
   ];
   ```

The aggregator handles concurrent execution, timeout cancellation, error isolation, deduplication, and quality sorting automatically.

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

All code contributions must strictly adhere to the following 5 Clean Code Rules:
1. **Rule 1 (SRP - Single Responsibility Principle)**: Every module, component, and function must do one thing well. Keep scraper parsing logic isolated from HTTP routing.
2. **Rule 2 (Explicit Descriptive Naming)**: Use intention-revealing names (`resolveByImdbId`, `executeProviderWithTimeout`). Never use abbreviations like `res1`, `tmp`, or `chk`.
3. **Rule 3 (Fail-Fast & Guard Clauses)**: Validate inputs at the boundary. Return early rather than nesting deep `if/else` blocks.
4. **Rule 4 (Zero Hardcoding & DRY Constants)**: All external endpoints, API keys, timeouts, and genre tables must be centralized in `src/lib/constants.ts`.
5. **Rule 5 (Immutability & Zero `any`)**: Use `readonly`, `as const`, and strict domain interfaces. The `any` type is strictly prohibited in business logic.
