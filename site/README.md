# Platform Kernel product showcase

A standalone React presentation for the released Kernel V2 library (v0.3.0). The Java modules and Maven release pipeline are independent of this site.

## Local development

Use Node.js 22+:
```sh
cd site
npm ci
npm test
npm run dev
```
Open http://127.0.0.1:4173. Use `npm run build` to generate `dist/`. The build bundles React and CSS locally; no CDN or backend is needed. All paths are relative to support GitHub Pages project URLs.

## Hosting
In repository Settings → Pages, select **GitHub Actions** as the source (one-time administrator action). Merge this PR, then run the **Platform Kernel Pages** workflow manually if it did not deploy automatically. The expected default URL is https://vyrnforge.github.io/platform-kernel/. Every later change to site/ on main triggers a build/deployment.

The Flow Studio displays illustrative, step-driven request, transaction, event and observability sequences with animated graph connections, playback, timeline scrubbing and source-linked inspection. These are not production benchmark or live service results. The capability data links to the reviewed v0.3.0 release commit. Update src/data.mjs and src/flow-data.mjs when the kernel changes. Do not put private project documents, credentials, internal tenant data or secrets into this public website.
