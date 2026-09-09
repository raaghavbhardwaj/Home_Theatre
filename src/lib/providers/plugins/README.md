# Scraper Plugins Directory

This directory is for local or submodule-based scraping plugins.

### Architecture & Legal Segregation
To keep the public `Home_Theatre` repository 100% clean, legal, and compliant with DMCA and open-source policies:
1. **Never commit actual scrapers or piracy endpoints into the main repository.**
2. Scrapers should be hosted in:
   - **Option A (Remote Worker)**: A separate private Cloudflare Worker, plugged in via the `SCRAPER_API_URL` environment variable.
   - **Option B (Private Git Submodule)**: A private Git repository cloned or linked into this `plugins/` directory (`git submodule add <private-repo-url> src/lib/providers/plugins/my-scraper`).
3. Everything inside this directory (except this README and `.gitkeep`) is ignored by `.gitignore`.

### Creating a Plugin
A plugin implements the `ScraperProvider` interface defined in `../types.ts`:

```typescript
import type { ScraperProvider } from '../types';
import type { Stream } from '../../types';

export class CustomScraper implements ScraperProvider {
  readonly id = 'my-custom-scraper';
  readonly name = 'My Custom Scraper';
  readonly enabled = true;
  readonly priority = 1;

  async resolve(tmdbId: string, mediaType: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string): Promise<Stream[]> {
    // Custom scraping logic here
    return [];
  }
}
```
