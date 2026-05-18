# Hosting

This is a Vite + React SPA. `npm run build` produces a fully static `dist/` directory that can be served from any static host. Every host needs the same two things:

1. **Serve `dist/` as the web root.**
2. **SPA fallback** — every unknown path should serve `index.html` so React Router can handle the route on the client.

Below are ready-to-use configs for the most common platforms. Configs in this repo (`vercel.json`, `netlify.toml`, `Dockerfile`, `nginx.conf`) are real and tested patterns — not placeholders.

---

## Vercel

`vercel.json` (already in repo) sets the build command, output directory, SPA rewrite, and long-cache headers for hashed assets. Just import the repo in the Vercel dashboard, or run:

```bash
npm i -g vercel
vercel        # follow prompts, defaults are correct
vercel --prod
```

## Netlify

`netlify.toml` (already in repo) configures the build and the `/* -> /index.html 200` redirect required for client-side routing.

```bash
npm i -g netlify-cli
netlify deploy --build           # preview
netlify deploy --build --prod    # production
```

## Cloudflare Pages

1. Connect the repo in the Cloudflare Pages dashboard.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Add a SPA fallback by creating `public/_redirects` with:
   ```
   /* /index.html 200
   ```
   (Cloudflare Pages reads `_redirects` from the publish directory.)

## GitHub Pages

GitHub Pages does not natively support SPA rewrites, so we use the `404.html` trick.

1. In `vite.config.ts`, set `base: '/<your-repo-name>/'` if you are publishing to `username.github.io/<repo>` (skip for a custom domain or user/org pages root).
2. Build and copy index.html as the 404 fallback:
   ```bash
   npm run build
   cp dist/index.html dist/404.html
   ```
3. Publish `dist/` to the `gh-pages` branch (e.g. with the `gh-pages` npm package) or via a GitHub Actions workflow that uploads `dist/` as a Pages artifact.

## Docker / self-hosted (nginx)

`Dockerfile` builds the app and serves it with nginx using `nginx.conf` (SPA fallback + asset caching + gzip already configured).

```bash
docker build -t academic-stream .
docker run --rm -p 8080:80 academic-stream
# open http://localhost:8080
```

Behind your own nginx (without Docker), point a `server { root /path/to/dist; ... }` block at the built output and copy the `location` blocks from `nginx.conf`.

## AWS S3 + CloudFront

1. `npm run build`
2. Sync to your bucket: `aws s3 sync dist/ s3://<bucket>/ --delete`
3. In CloudFront, add a **custom error response** for HTTP 403 and 404 that returns `/index.html` with status 200. That is the SPA fallback.
4. Set long cache TTLs for `/assets/*` and short TTL (or no-cache) for `index.html`.

## Firebase Hosting

```bash
npm i -g firebase-tools
firebase init hosting   # public dir: dist, single-page app: Yes, no GitHub action unless wanted
npm run build
firebase deploy
```

The "single-page app" prompt writes the required rewrite into `firebase.json`.

## Render / Railway / Fly.io / any container host

Use the included `Dockerfile`. These platforms detect it automatically; just point them at the repo and they will build and run on port 80.

---

## Environment & runtime notes

- **No backend required.** All data is persisted client-side in `localStorage`. There are no server env vars to set for the app itself.
- **Google Classroom import** uses Google Identity Services with an OAuth Client ID that the webmaster pastes into the UI at runtime. When deploying to a new origin, add that origin to **Authorized JavaScript origins** in the same OAuth client in Google Cloud Console.
- **HTTPS** is required for Google OAuth, the Vibration API, and `localStorage` to be reliable across browsers — all platforms above provide it by default.
- **SPA fallback** is mandatory. If you see a 404 when refreshing a deep link (e.g. `/dashboard`), the fallback is not configured.
