# Resume Ranker — Frontend

React 18 single-page app for Resume Ranker, styled with Tailwind CSS and deployed on Vercel.

See the [root README](../README.md) for the full project overview and architecture.

## Run locally

```bash
npm install
cp .env.example .env.local   # set REACT_APP_API_URI and the Supabase values
npm start
```

The app runs at `http://localhost:3000` and talks to the FastAPI backend at `REACT_APP_API_URI`.

## Structure

- `src/pages/` — dashboard, ATS dashboard, candidate profile, leaderboard
- `src/components/` — upload flow, score cards, company match breakdowns
- `src/services/api.js` — every backend call goes through this axios client
- `src/contexts/AuthContext.jsx` — Supabase authentication
