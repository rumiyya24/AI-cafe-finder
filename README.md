# AI Cafe Finder

**Live demo:** [ai-cafe-finder.vercel.app](https://ai-cafe-finder.vercel.app) (password-protected -- contact me for access)

Find the right cafe based on vibe -- not just star ratings. Search by noise level, wifi, outlets, and study-friendliness, backed by AI analysis of real Google reviews (not guesses), with source citations back to the actual reviews behind each claim.

Built as a hands-on learning project: real API integrations, a full visual redesign, and an emphasis on honesty over polish -- the app is explicit about what's confirmed by evidence versus AI-estimated versus genuinely unknown, rather than presenting confident-sounding numbers with nothing behind them.

## Features

- **Global cafe search** via Google Places API, restricted to genuine cafes (not embassies or unrelated venues that happen to match search text)
- **AI vibe extraction** -- Gemini reads a cafe's real reviews and extracts noise level, wifi, outlets, and study-friendliness, each with a supporting quote and a link back to the actual source review
- **Honest AI-estimate fallback** for cafes with no reviews, clearly labeled as an unconfirmed general estimate rather than presented as fact
- **Filters** for noise/wifi/studying (scoped to cafes you've actually checked -- filtering against unchecked cafes would be a false negative, not a real "no match")
- **Interactive map** with custom pins, click-to-select, zoom-to-cafe, and an on-map name label
- **Real cafe photos** via Places Photo API, with required author attribution
- **Geolocation-based default results** ("cafes near you" on load), with honest fallback messaging if location access is denied
- **Distance and travel time** (walking/driving/transit) from your location to a selected cafe, via Google's Routes API
- **Favoriting** and **personal notes** -- your own confirmed observations after visiting override AI guesses, clearly marked
- **Match percentage** against your stated preferences, always shown as a raw fraction (e.g. "67% (2/3)") alongside the percentage, never a bare number implying more precision than a handful of yes/no checks actually supports
- **Cafe comparison** -- select 2-4 cafes for a side-by-side table
- **AI Concierge** -- free-text requests ("I have a Zoom meeting") translated into a search query and filters via Gemini
- **Suggested prompt chips** for common use cases

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Cafe data**: Google Places API (New) -- Text Search, Place Details, Place Photos
- **AI**: Google Gemini API (`gemini-3.5-flash`) -- vibe extraction, AI-estimate fallback, Concierge query parsing
- **Maps**: Google Maps JavaScript API via `@vis.gl/react-google-maps`, custom-styled pins
- **Routing**: Google Routes API -- multi-modal distance/duration
- **Database**: Supabase (Postgres) -- favorites, personal notes, cached vibe checks, user preferences
- **Icons**: lucide-react

## Setup

### 1. Clone and install

```bash
git clone https://github.com/rumiyya24/AI-cafe-finder.git
cd AI-cafe-finder
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

Required keys:

| Variable | Where to get it |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console -- enable Places API (New), Routes API. Restrict to these APIs. **Server-side only, never exposed to the browser.** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console -- enable Maps JavaScript API. This one *is* exposed to the browser (required for map rendering) -- restrict by HTTP referrer in Cloud Console (add both `localhost:3000/*` for dev and your deployed domain for production), not by keeping it secret. |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) -- free tier covers Flash-tier models. |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Supabase project settings -- use the **secret** key (or legacy `service_role`), never the publishable/anon key, since all database access goes through server-side API routes only. |
| `SITE_USERNAME`, `SITE_PASSWORD` | Your own choice -- gates the entire app (including API routes) behind HTTP Basic Auth. Required because the app is single-user by design (see below); unset locally by default so dev stays open. |

**Never commit real key values.** `.env.local` is gitignored; `.env.example` should only ever contain placeholder text.

### 3. Database setup

Run these in Supabase's SQL Editor (enable Row Level Security when prompted for each):

```sql
create table favorites (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  cafe_name text not null,
  cafe_address text,
  created_at timestamp with time zone default now()
);

create table cafe_notes (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  cafe_name text not null,
  noise_level text,
  wifi text,
  outlets text,
  good_for_studying text,
  personal_note text,
  updated_at timestamp with time zone default now()
);

create table vibe_checks (
  place_id text primary key,
  noise_level text,
  noise_evidence text,
  noise_review_index int default -1,
  wifi text,
  wifi_evidence text,
  wifi_review_index int default -1,
  outlets text,
  outlets_evidence text,
  outlets_review_index int default -1,
  good_for_studying text,
  studying_evidence text,
  studying_review_index int default -1,
  data_source text default 'reviews',
  review_urls jsonb default '[]'::jsonb,
  checked_at timestamp with time zone default now()
);

create table user_preferences (
  id int primary key default 1,
  preferred_noise text default 'any',
  preferred_wifi text default 'any',
  preferred_studying text default 'any',
  updated_at timestamp with time zone default now(),
  constraint single_row check (id = 1)
);
insert into user_preferences (id) values (1);
```

### 4. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Deployment

Deployed on [Vercel](https://vercel.com), connected directly to this GitHub repo -- pushes to `main` auto-deploy.

**Required before deploying:**
1. Add all environment variables (including `SITE_USERNAME`/`SITE_PASSWORD`) in Vercel's project settings
2. After the first deploy, add the deployed domain (e.g. `your-app.vercel.app/*`) to the Maps JavaScript API key's allowed HTTP referrers in Google Cloud Console -- the map will fail otherwise, since the key is referrer-restricted

**Why password-protected:** this app has no authentication system by design (single-user: one preferences row, unscoped favorites/notes tables). Without Basic Auth, anyone with the URL could modify your data or consume your API quota (Gemini, Places, Maps, Routes all cost against your account). The middleware (`middleware.ts`) gates every route including API endpoints, not just pages.

## Design principles

A few deliberate choices worth knowing about if you're reading the code:

- **Never fabricate confidence.** Every AI-derived claim is either backed by a source quote/link, explicitly marked as a general estimate, or shown as unknown. No feature invents precision it doesn't have (e.g. match percentages always show their raw fraction, not just a bare number).
- **Personal observations outrank AI guesses.** If you've actually visited a cafe and left a note, that note is shown over the AI's extraction, marked accordingly.
- **Filters only apply to real data.** Filtering by noise/wifi/studying only considers cafes that have actually been vibe-checked -- an unchecked cafe silently excluded from "quiet" results would be a false negative, not a real non-match.
- **Server-side secrets stay server-side.** All Places/Gemini/Supabase secret-tier keys are used exclusively in API routes, never exposed to the browser. The one browser-exposed key (Maps JS) is restricted by HTTP referrer rather than kept secret, since it has to be public to render a map at all.

## Known limitations

- **Cafe similarity/recommendations**: implemented but currently blocked on data sparsity -- most vibe-checked cafes only have 1-2 confirmed attributes (reviews often don't explicitly mention specifics even when they exist), not enough signal yet for meaningful similarity matches.
- **Small-model faithfulness**: Gemini occasionally generates plausible-sounding details not fully supported by the source reviews, even with evidence-grounding prompts. Source links let you verify directly rather than trusting blindly.
- Photo/thumbnail data depends on what Google Places has available; not every cafe has photos.

## License

Personal project, not currently licensed for reuse.