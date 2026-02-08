# Akspoti - Roadmap

## Architecture
- [ ] Move parsing logic to backend (Node.js or lightweight alternative like Bun/Deno). UI becomes purely presentational layer calling backend API.

## Features
- [ ] Add 2nd export option: use Spotify API to create playlist directly (no manual TuneMyMusic step)
- [ ] Add time range input (from/to) to filter songs
- [ ] Add scheduler for automated exports at end of time range
  - Use case: export songs from specific broadcast, e.g., 18:00-22:00 every Friday

## Deployment
- [ ] When tested locally, host as public page
  - **Simple options (recommended):** Vercel, Netlify, Cloudflare Pages
    - Zero config, deploy via `git push`, auto-scaling, free tier
    - Backend: serverless functions / Cloudflare Workers
  - **AWS Amplify** - use if already in AWS ecosystem or want AWS experience
    - More setup than simple options, but simpler than raw AWS (S3+CloudFront+Lambda)
    - Similar workflow to Vercel once configured

## Security (for Spotify API integration)
- [ ] Implement OAuth 2.0 PKCE flow (no client secret exposed in browser)
- [ ] Never store refresh tokens on server - keep in user's browser (httpOnly cookie or encrypted localStorage)
- [ ] Use short-lived access tokens
- [ ] Add clear "Disconnect Spotify" option for users
