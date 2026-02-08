# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Akadera to Spotify playlist exporter. Node.js backend scrapes and parses Radio Akadera's playlist page; vanilla JS frontend displays songs and exports them as a text file for import into Spotify via TuneMyMusic.

## Running the App

```
npm install
npm run dev
```

Starts local server at `http://localhost:3000`. Serves the API (`/api/songs`) and static files from `public/`.

No tests or linting configured.

## Architecture

**Shared logic** (`lib/songs.js`): Core functions — `fetchRadioPage()`, `parseSongs()`, `filterSongsByTimeRange()`. Used by both the API handler and the scheduler.

**Backend** (`api/songs.js`): Vercel-compatible serverless function. Thin handler that imports from `lib/songs.js`, returns JSON.

**Frontend** (`public/app.js`): Thin client that calls `GET /api/songs?from=HH:MM&to=HH:MM`, renders the song list, and handles file download.

**Schedule** (`lib/schedule.js`): Shared `SCHEDULE` array, `DAY_NAMES`, and `buildFilename()`. Imported by both `scheduler.js` and `api/cron/export.js`.

**Storage** (`lib/storage.js`): Abstraction over Vercel Blob (`exists`, `upload`). Swap this module to migrate to AWS S3 — same interface.

**Scheduler** (`scheduler.js`): Automated playlist export for self-hosted use. Only runs in the long-running `server.js` process (not on Vercel/serverless). Key design:
- `setTimeout` chains (not `setInterval`): `getNextTrigger()` computes exact ms until the next audition's trigger time, `scheduleNext()` sets a timeout and chains to the next one after export.
- Trigger time: `endTime + FETCH_DELAY_MINUTES` (default 10, adjustable const).
- Output: playlist files in `playlists/` directory, named `Title - DJ - DD-MM-YY.txt`.
- Duplicate prevention: skips export if file already exists (safe on server restart).
- Never crashes: `exportPlaylist()` is wrapped in try/catch, scheduler continues regardless.

**Cron handler** (`api/cron/export.js`): Serverless alternative to `scheduler.js`. Triggered daily at 21:00 UTC by Vercel Cron. Checks which shows ended today (Europe/Warsaw timezone), exports playlists to Vercel Blob via `lib/storage.js`. Auth via `CRON_SECRET` Bearer token. Each show wrapped in its own try/catch.

**Server** (`server.js`): Node.js HTTP server. Routes `/api/*` to the handler, serves static files from `public/`, starts the scheduler on boot.

**API:** `GET /api/songs?from=HH:MM&to=HH:MM` → `{ "songs": [{ "time", "artist", "title" }, ...] }`. Songs returned freshest-first. Time params optional.

**HTML parsing:** Expects `<li>HH:MM &nbsp; <strong>Artist - Title</strong></li>` inside `.audio-lista`. Uses cheerio with regex fallback for robustness.

**Deployment:** `api/` + `public/` structure is Vercel zero-config. Cron schedule defined in `vercel.json`. For other platforms (Netlify, Cloudflare Pages), only the handler wrapper needs adaptation.

**Environment variables** (Vercel dashboard): `CRON_SECRET` (auth for cron endpoint), `BLOB_READ_WRITE_TOKEN` (auto-created when connecting Vercel Blob store).

## Conventions

- Spotify dark theme UI (#121212 background, #1db954 green accents)
- Status messages use color coding: red=error, green=success, gray=info
- Songs display in chronological order (oldest first)
- XSS protection via `escapeHtml()` for rendered content
- `generatePlaylistText()` is intentionally duplicated in `public/app.js` (frontend) and `lib/playlist.js` (backend) — the frontend can't `require()` from `lib/` without a build system. Keep both in sync.
