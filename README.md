# Quick Fiji News

Quick Fiji News brings headlines from Fiji and Pacific news outlets into one
responsive feed. Browse by source or category, search and filter stories, switch
between light and dark themes, and install the site as a Progressive Web App
(PWA) on supported devices.

Headlines are fetched from RSS feeds and selected publisher homepages. Sources
are fetched independently, so an unavailable publisher does not prevent stories
from other sources from loading. The app has no database or required secrets;
source caching is temporary and depends on the running server instance.

## Requirements

- Node.js 20.9 or newer
- [pnpm](https://pnpm.io/installation) 10.30.3 (the version specified in
  `package.json`)
- Git

## Set up locally

```bash
git clone https://github.com/kulahad/quick-fiji-news.git
cd quick-fiji-news
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No `.env` file is required
for local development.

## Available commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Run the production build locally (run `pnpm build` first) |
| `pnpm lint` | Run ESLint |
| `pnpm exec tsc --noEmit` | Run the TypeScript type check |

## Progressive Web App

In production, the app registers a service worker and provides install support
where the browser allows it. You can install it from a supported browser on
Android and desktop; on iPhone or iPad, use Safari's **Add to Home Screen**
option. On macOS, Safari supports adding the site to the Dock.

PWA installation requires a secure context: use `localhost` for local
development or serve the deployed app over HTTPS. The service worker is enabled
in production, so verify install and offline behavior using a production build
or the deployed site rather than relying on the development server.

## News sources

The configured publisher URLs are maintained in `lib/rssService.ts`. Add or
update a source there, choosing an RSS feed or a homepage parser as appropriate.
Please keep each source isolated so one publisher's outage or response format
does not block the rest of the feed. Test changes against the publisher's live
response where possible; third-party feeds can change or become unavailable
without notice.

## Collaborating

Contributions, bug reports, and ideas are welcome. For substantial changes,
open an issue first so we can align on the approach. For a change you'd like to
contribute:

1. Fork the repository and create a focused branch from `main`.
2. Install dependencies with `pnpm install`.
3. Make the change and run the relevant checks:

   ```bash
   pnpm exec eslint <changed-files>
   pnpm exec tsc --noEmit
   pnpm build
   ```

4. Commit using the **Angular commit message convention** (Conventional
   Commits), for example:

   ```text
   feat(pwa): improve install guidance
   fix(news): handle unavailable feeds
   docs: clarify local setup
   ```

   Use a type such as `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
   `test`, `build`, `ci`, `chore`, or `revert`. Add a scope when it helps
   identify the affected area. Describe breaking changes with `BREAKING CHANGE:`
   in the commit footer.

5. Push your branch and open a pull request against `main`. Include a concise
   description, link any related issue, and add screenshots for visible UI
   changes.

Keep pull requests focused, preserve the existing design and accessibility
patterns, and avoid committing secrets or generated local files.

## Disclaimer

Quick Fiji News is an independent personal project for educational purposes. It
is not affiliated with or endorsed by the news organizations whose headlines
it displays. Articles remain the property of their respective publishers; open
the original story for the full report.
