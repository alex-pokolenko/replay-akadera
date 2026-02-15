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

## Deploying to AWS

```
sam build && sam deploy          # after first deploy (config saved in samconfig.toml)
sam build && sam deploy --guided  # first time — interactive prompts for region, stack name, etc.
```

Backend (Lambda + API Gateway + S3 + EventBridge) is defined in `template.yaml`. Frontend is hosted on AWS Amplify (connected to the git repo, auto-deploys on push).

## Architecture

**Shared logic** (`lib/songs.js`): Core functions — `fetchRadioPage()`, `parseSongs()`, `filterSongsByTimeRange()`. Used by the local server, Lambda handlers, and the scheduler.

**Lambda handlers** (`lambda/`): AWS Lambda functions deployed via SAM.
- `lambda/songs.js`: Songs API — reads query params, calls `lib/songs.js`, returns JSON. Wired to API Gateway `GET /songs`.
- `lambda/export.js`: Per-show playlist export — receives `{"showIndex": N}` from EventBridge, exports one show's playlist to S3 via `lib/storage.js`.

**Frontend** (`public/app.js`): Thin client that calls `GET /api/songs?from=HH:MM&to=HH:MM`, renders the song list, and handles file download. Hosted on AWS Amplify with a rewrite rule that proxies `/api/songs` to the API Gateway URL.

**Schedule** (`lib/schedule.js`): Shared `SCHEDULE` array, `DAY_NAMES`, and `buildFilename()`. Imported by `scheduler.js`, `lambda/export.js`, and referenced by EventBridge schedule definitions in `template.yaml`. The `showIndex` values in EventBridge inputs correspond to array indices in `SCHEDULE`.

**Storage** (`lib/storage.js`): Dual-mode storage abstraction (`exists`, `upload`). When `S3_BUCKET` env var is set (Lambda/production), uses S3. Otherwise falls back to local filesystem (`playlists/` directory) for local dev.

**Scheduler** (`scheduler.js`): Automated playlist export for local/self-hosted use. Only runs in the long-running `server.js` process. Key design:
- `setTimeout` chains (not `setInterval`): `getNextTrigger()` computes exact ms until the next audition's trigger time, `scheduleNext()` sets a timeout and chains to the next one after export.
- Trigger time: `endTime + FETCH_DELAY_MINUTES` (default 10, adjustable const).
- Output: playlist files in `playlists/` directory, named `Title - DJ - DD-MM-YY.txt`.
- Duplicate prevention: skips export if file already exists (safe on server restart).
- Never crashes: `exportPlaylist()` is wrapped in try/catch, scheduler continues regardless.

**Server** (`server.js`): Node.js HTTP server for local dev. Handles `/api/songs` inline (calls `lib/songs.js` directly), serves static files from `public/`, starts the scheduler on boot.

**SAM template** (`template.yaml`): Infrastructure-as-code for the AWS backend:
- S3 bucket (public read) for playlist .txt files
- Songs Lambda + HTTP API Gateway (`GET /songs`)
- Export Lambda with S3 write permissions
- 4 EventBridge Scheduler crons (one per show, Europe/Warsaw timezone, fires at `endTime + 10min`)
- IAM role for EventBridge → Lambda invocation

**API:** `GET /api/songs?from=HH:MM&to=HH:MM` → `{ "songs": [{ "time", "artist", "title" }, ...] }`. Songs returned freshest-first. Time params optional.

**HTML parsing:** Expects `<li>HH:MM &nbsp; <strong>Artist - Title</strong></li>` inside `.audio-lista`. Uses cheerio with regex fallback for robustness.

**Deployment:** Amplify Hosting serves `public/` with a rewrite rule proxying `/api/*` to API Gateway. SAM deploys the backend stack (Lambda, S3, EventBridge). For local dev, `npm run dev` runs everything in a single Node.js process.

**Environment variables** (set via SAM template / Lambda config):
- `S3_BUCKET`: Playlist storage bucket name (set automatically by SAM for the export Lambda).

## Conventions

- Spotify dark theme UI (#121212 background, #1db954 green accents)
- Status messages use color coding: red=error, green=success, gray=info
- Songs display in chronological order (oldest first)
- XSS protection via `escapeHtml()` for rendered content
- `generatePlaylistText()` is intentionally duplicated in `public/app.js` (frontend) and `lib/playlist.js` (backend) — the frontend can't `require()` from `lib/` without a build system. Keep both in sync.
- When adding a new show: add to `SCHEDULE` in `lib/schedule.js`, then add a matching `AWS::Scheduler::Schedule` in `template.yaml` with the correct `showIndex` and cron expression.
