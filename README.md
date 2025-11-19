# P2P WebRTC Configurator (Viewer + Remote)

A lightweight proof-of-concept that pairs a large-screen Viewer with a tablet/phone Remote using WebRTC DataChannels. No servers beyond optional SDP copy/paste. Built with Vite (React + SWC), TypeScript, Tailwind CSS v4, TanStack Router/Query, Jotai, and a small shadcn-style UI layer.

## Quickstart
- Install: `pnpm install`
- Develop: `pnpm dev` then open `/remote` on a phone/tablet and `/viewer` on a desktop.
- Lint: `pnpm lint`
- Build: `pnpm build`
- Format: `pnpm format`

## P2P Flow
1) Remote (authoritative) visits `/remote`, clicks **Create offer**, and shares the encoded SDP blob.  
2) Viewer visits `/viewer`, pastes the offer, clicks **Create answer**, and returns the answer blob.  
3) Remote applies the answer. Once connected, it sends `config:replace` followed by `config:update` deltas for every tweak.

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

## Deployment (Bitbucket Pipelines → Vercel)
- Pipeline: `bitbucket-pipelines.yml` runs `npm ci && npm run lint && npm run build`.
- Deployment step installs `vercel@latest` and runs `vercel deploy --prebuilt`.
- Required env vars (set in Bitbucket repo settings):
  - `VERCEL_TOKEN`
  - `VERCEL_PROJECT`
  - `VERCEL_SCOPE` (team or user scope)
- Vercel config: `vercel.json` targets the static `dist` output.

## Notes
- Tailwind v4 (no config file) via `@tailwindcss/vite`.
- State is refresh-resistant: the remote resends a full `config:replace` on connect.
- Heartbeats (`system:ping/pong`) keep the data channel alive and surface disconnects quickly.
