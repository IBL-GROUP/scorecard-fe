# Supply Chain Pulse (scorecard-fe)

The Supply Chain Pulse dashboard: React + Chakra UI v3, built with Vite and
served under `/scorecard-dashboard/`. It reads scorecard-be (BigQuery) and signs
in through the ONEThunder authenticator.

## Run

```bash
npm install
npm run dev     # http://localhost:5175/scorecard-dashboard/
npm run build   # type-check and build to dist/
```

`.env` holds the local URLs; `.env.sandbox` the sandbox ones:

| Variable | What it is |
|---|---|
| `VITE_API_BASE_URL` | scorecard-be, including `/api` |
| `VITE_AUTH_PORTAL_URL` | the ONEThunder portal (sign-in) |
| `VITE_AUTH_API_URL` | the authenticator API |

## Layout

```
src/
  main.tsx      entry: sign-in, permissions, the shell and /usermanual
  shell/        menu, filter bar, period control
  pages/        Pulse, Summary, Service Measure, Dispatch & WIP, RD Data Status, User Manual
  ui/           components ported from Sales Pulse 2.0 (dsr-fe)
  components/   app components (detail sheets, search, brand, …)
  features/     data loading, KPIs, store, navigation
  api/ auth/ config/ constants/ theme/ utils/
```

## Deploy

`Dockerfile` builds the app (the `VITE_*` values are build args) and serves
`dist/` with nginx on port 3004 (`nginx.conf`).
