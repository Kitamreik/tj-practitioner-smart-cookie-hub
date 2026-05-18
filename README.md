# Academic Stream

A client-side React + Vite LMS prototype with mock auth, semester-scoped content, Google Classroom import, internal chat, exams, and mobile gestures. All data persists in `localStorage` — no backend required.

## Development

```bash
npm install
npm run dev       # start Vite dev server
npm run build     # produce static dist/
npm run preview   # serve the built bundle locally
npm test          # run Vitest suite
```

## Hosting

The app is a static SPA. See [HOSTING.md](./HOSTING.md) for ready-to-use configs for Vercel, Netlify, Cloudflare Pages, GitHub Pages, Docker/nginx, AWS S3 + CloudFront, and Firebase Hosting. The repo ships with `vercel.json`, `netlify.toml`, `Dockerfile`, and `nginx.conf`.

## Demo accounts

Pre-seeded credentials for `webmaster`, `admin`, and `student` roles are listed inside the login screen.
