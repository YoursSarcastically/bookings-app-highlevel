# Welcome to your AI Studio project

This project was built with AI Studio.

Bookings is the front desk for salons, gyms and studios on HighLevel: today's list, calendar, clients, memberships, catalog, team, insights, public booking, a self-service manage link and a check-in kiosk. Everything the desk does is written to HighLevel (contacts, calendars, opportunities, payments, workflows, forms, email, SMS, custom objects).

## Development

Prefer working locally? You need Node.js and npm, plus Python 3.9+ for the API (standard library only; nothing to `pip install`).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run api    # Bookings API + SQLite database on http://localhost:8787 (seeded with three demo businesses on first run)
npm run dev    # the app on http://localhost:8080
```

The app calls `/api` on its own origin; `src/routes/api/$.ts` forwards those requests to the Python server. Set `API_URL` if the API runs somewhere other than `http://127.0.0.1:8787`.

Sign in with a PIN from the sidebar: owner `1111`, staff `2222` / `3333`. Switch between the salon, gym and studio at the bottom of the sidebar.

## Hosting

The app builds and deploys like any other AI Studio project (`npm run build`). Run the API wherever Python is available and point the app at it with `API_URL`:

```sh
python3 server/server.py 8787         # the API; database file server/appointments.db (override with APPT_DB)
API_URL=http://api-host:8787 npm run build
```

## HighLevel

Create a Private Integration token in HighLevel (Settings → Private Integrations) with the Contacts, Calendars, Opportunities, Payments/Invoices, Products, Workflows, Forms, Conversations, Users, Locations and Custom Objects scopes. Then either

- copy `server/hl.config.example.json` to `server/hl.config.json` and fill in `token` and `location_id` (the sub-account id from the HighLevel URL), or
- set `HL_TOKEN` and `HL_LOCATION_ID` in the environment of the API process.

In the app open **HighLevel**, link the business, run **Sync team**, map a pipeline and workflows, then **Seed HighLevel** and **Verify**. `server/hl.config.json` is git-ignored; never commit it.

## Scripts

- `npm run dev` · TanStack Start dev server on 8080
- `npm run api` · the Python API on 8787
- `npm run build` / `npm run preview` · production build
- `npm run lint` / `npm run format` · ESLint, Prettier
- `npm run typecheck` · `tsc --noEmit`
- `npm run test:api` · end-to-end API tests on a throwaway database (`server/tests/test_e2e.py`)

## Layout

```
src/
  routes/                 file-based routes (see routes/README.md)
    __root.tsx            document shell, fonts, error and 404 pages
    _app.tsx              layout for the front desk: store + Shell (sidebar, ⌘K, PIN, onboarding)
    _app/*.tsx            frontdesk, calendar, clients, sales, catalog, team, insights, website, highlevel, settings
    book/$slug.tsx        public booking page
    manage/$slug/$token.tsx  client self-service (move / cancel)
    kiosk/$slug.tsx       check-in kiosk
    api/$.ts              same-origin proxy to the Python API
  components/app/         Shell, Bits, dialogs (book, appointment, pay, roster, block, gift card, editors), ClientDrawer, Overlays, Onboarding
  components/ui/          shadcn/ui from the template, untouched
  lib/                    api.ts (typed client), types.ts, format.ts (dates, availability), store.tsx (state, actions, PIN roles)
  styles.css              Tailwind v4 theme: tokens in oklch, status colours, shared component classes
server/
  server.py db.py hl.py   API, schema + seed, HighLevel client
  tests/test_e2e.py       end-to-end API tests
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
