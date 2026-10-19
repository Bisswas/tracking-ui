# Live Tracker website (React + Vite + Leaflet)

Website for the live tracking project. Free to run: maps come from OpenStreetMap (no API key, no card).

## What it does
- **Sign up / log in.** Every account sees only its own devices.
- **Add device:** shows a 6 digit code. Type it into the Android app and the phone appears here by itself.
- **Live map:** the phone moves on the map every few seconds with a trail of the last 30 minutes, speed and accuracy.
  Click the map to set a destination and see the travel time, distance and arrival time (refreshed every 15 s).
- **Analytics** (Kibana style): pick a time range, see points, distance, average and top speed, charts over time,
  the path on a map and a table you can filter by speed and accuracy and export as CSV.
- **Remove device:** deletes the phone and its history.

## Run locally
```
npm install
npm run dev        # http://localhost:5174
```
The API address comes from `.env`:
```
VITE_API_URL=https://product-api-nps7.onrender.com
```
Use `http://localhost:8080` to talk to a backend running on your machine.

## Deploy on Cloudflare (free)
1. Push this folder to a GitHub repo (for example `tracking-ui`).
2. Cloudflare dashboard > Workers & Pages > Create > connect the repo.
3. Build command `npm run build`. Deploy command `npx wrangler deploy`. `wrangler.jsonc` is already in the repo.
4. Under Variables add the build variable `VITE_API_URL` with your API address.
5. On Render, set `CORS_ALLOWED_ORIGINS` on the API to your Cloudflare address so only this site can call it.

## Needs the new backend
This site calls `/api/auth/*`, `/api/devices/*` and `/api/tracking/*` (login, pairing, history, stats, ETA).
Deploy the updated `product-api` first.

## Notes
- The free API server sleeps after 15 minutes idle, so the first request can take up to a minute.
- Map tiles come from the public OpenStreetMap servers, which is fine for personal use.
- The ETA comes from a free routing service. Without an OpenRouteService key on the API it uses the OSRM demo
  server, and falls back to a rough straight-line estimate if both are unreachable (the website says so).
