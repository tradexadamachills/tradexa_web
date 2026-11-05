# Tradexa React website

React + TypeScript + Vite. Start with `npm ci`, then `npm run dev`.

- `/`: marketing website
- `/preview`: clearly labeled sample workspace
- `/login`: live account onboarding
- `/app`: authenticated, screened and admin-approved workspace

`npm run build` produces `dist/`. `npm test` runs UI/security tests. `node scripts/browser-smoke.mjs` runs local browser checks with both servers running; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your local Chromium executable if needed.

See [full setup and deployment guide](../docs/WEB_ADMIN_SETUP.md). Only public Supabase settings belong in Vite environment variables. No service-role, SMTP or provider secrets belong here.
