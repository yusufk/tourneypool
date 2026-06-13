# TourneyPool ⚽

An open-source tournament prediction pool app. Built with React + Vite + Cloudflare Workers.

Run a prediction competition for your team, office, or friend group during any football tournament.

## Features

- **PIN-based auth** — simple player registration, no email required
- **Match predictions** — call the score before kickoff, server-enforced lockout
- **Auto-scoring** — fetches results from football-data.org automatically
- **Leaderboard** — individual + pool standings
- **Pools** — create teams/departments for group competition
- **Flag backgrounds** — country flags as subtle card watermarks
- **Mobile-first** — bottom tab nav, responsive design
- **Zero cost** — GitHub Pages + Cloudflare Workers free tier

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yusufk/tourneypool.git
cd tourneypool
npm install
```

### 2. Set up Cloudflare Worker
```bash
# Create a KV namespace
npx wrangler kv:namespace create TOURNEY_KV

# Update wrangler.toml with your KV namespace ID

# Set secrets
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put FOOTBALL_API_KEY  # from football-data.org (free)

# Upload fixture schedule
npx wrangler kv:key put --namespace-id="YOUR_ID" "schedule" "$(cat src/data/fixtures.json)"

# Deploy
npx wrangler deploy
```

### 3. Configure the frontend
Update `src/api.ts` with your worker URL, and `vite.config.ts` / `src/App.tsx` with your base path.

### 4. Deploy frontend
```bash
npm run build
# Push to GitHub Pages, Vercel, Netlify, etc.
```

## Customisation

- **Pools** — edit `src/pages/Pools.tsx` to set your team/department names
- **Fixtures** — replace `src/data/fixtures.json` with your tournament data
- **Branding** — update colours in CSS variables at top of `src/index.css`
- **Scoring** — 3 pts exact score, 1 pt correct result (edit in `worker/index.js`)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, react-router-dom 7
- **Backend**: Cloudflare Worker + KV
- **Scores API**: football-data.org (free tier, 100 req/day)
- **Hosting**: GitHub Pages (free)

## License

MIT
