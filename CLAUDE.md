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

**Backend** (`api/songs.js`): Vercel-compatible serverless function. Fetches HTML directly from `akadera.bialystok.pl` (no CORS issues server-side), parses with cheerio, filters by time range, returns JSON.

**Frontend** (`public/app.js`): Thin client that calls `GET /api/songs?from=HH:MM&to=HH:MM`, renders the song list, and handles file download.

**Dev server** (`server.js`): Lightweight Node.js HTTP server for local development. Routes `/api/*` to the serverless function handler, serves static files from `public/`.

**API:** `GET /api/songs?from=HH:MM&to=HH:MM` → `{ "songs": [{ "time", "artist", "title" }, ...] }`. Songs returned freshest-first. Time params optional.

**HTML parsing:** Expects `<li>HH:MM &nbsp; <strong>Artist - Title</strong></li>` inside `.audio-lista`. Uses cheerio with regex fallback for robustness.

**Deployment:** `api/` + `public/` structure is Vercel zero-config. For other platforms (Netlify, Cloudflare Pages), only the handler wrapper needs adaptation.

## Conventions

- Spotify dark theme UI (#121212 background, #1db954 green accents)
- Status messages use color coding: red=error, green=success, gray=info
- Songs display in chronological order (oldest first)
- XSS protection via `escapeHtml()` for rendered content
