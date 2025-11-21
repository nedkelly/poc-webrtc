# P2P WebRTC Configurator (Viewer + Remote)

A lightweight proof-of-concept that pairs a large-screen Viewer with a tablet/phone Remote using WebRTC DataChannels. No servers beyond optional SDP copy/paste. Built with Vite (React + SWC), TypeScript, Tailwind CSS v4, TanStack Router/Query, Jotai, and a small shadcn-style UI layer.

## Quickstart
- Install: `pnpm install`
- Develop: `pnpm dev` then open `/remote` on a phone/tablet and `/viewer` on a desktop.
- Lint: `pnpm lint`
- Build: `pnpm build`
- Format: `pnpm format`

## P2P Flow (with session API)
1) Viewer (large screen) visits `/viewer`, clicks **Generate QR Code**, and shows a QR/link that embeds a session ID and the offer. It also posts the offer to `/api/signal`.
2) Remote visits `/remote`, scans the QR or opens the link, fetches the offer (from the QR or `/api/signal`), generates an answer, and POSTs it back to `/api/signal`.
3) Viewer polls `/api/signal` for the answer and applies it automatically. Once connected, the remote sends `config:replace` followed by `config:update` deltas for every tweak.

Message protocol is defined in `src/shared/protocol.ts`:
```ts
type Message =
  | { type: 'config:update'; delta: Partial<ConfigState> }
  | { type: 'config:replace'; full: ConfigState }
  | { type: 'viewer:event'; event: string }
  | { type: 'system:ping' }
  | { type: 'system:pong' };
```

WebRTC helper lives in `src/shared/webrtc.ts` (manual SDP swap, bundled ICE, heartbeat pings).

## Project Structure
- `src/router.tsx` – TanStack Router setup for `/`, `/viewer`, `/remote`
- `src/routes/*` – Pages for home, viewer, and remote
- `src/shared/*` – Protocol types + WebRTC session helper
- `src/state/*` – Jotai atoms for config/session state
- `src/components/ui/*` – Minimal shadcn-style primitives (button/card/input/etc.)

## Deployment
- Build output lives in `dist` from `pnpm build` and can be served by any static host (for example Vercel, S3/CloudFront, or Netlify).
- `vercel.json` is included so you can point a Vercel project at this repo and use its default build pipeline or GitHub integration (no Bitbucket Pipelines required).
- If you want Bitbucket Pipelines CI, add a `bitbucket-pipelines.yml` that runs `pnpm install`, `pnpm lint`, and `pnpm build`, then deploy the `dist` folder to your chosen host.
- Signaling: `/api/signal` uses Vercel KV if `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set (falls back to in-memory). Use a durable store for production reliability and keep the SPA rewrites in `vercel.json` to avoid 404s on refresh.
- A minimal `/api/signal` endpoint is shipped for in-memory signaling in preview/dev; swap to a durable store (e.g., Vercel KV/Redis) for reliability in production.

## Notes
- Tailwind v4 (no config file) via `@tailwindcss/vite`.
- State is refresh-resistant: the remote resends a full `config:replace` on connect.
- Heartbeats (`system:ping/pong`) keep the data channel alive and surface disconnects quickly.
