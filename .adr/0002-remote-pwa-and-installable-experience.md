# 2. Remote PWA and Installable Experience

Date: 2025-11-21

## Status

Accepted

## Context

The "remote" side of the configurator is intended to be used on phones and
tablets, often in situations where:

- The operator wants a dedicated "remote" icon on their home screen.
- Network connectivity may be flaky (Wi‑Fi roaming, backstage coverage).
- The viewer is running on a fixed display while the remote moves around.

Without a PWA, the remote is just another browser tab. It is more likely to be
closed accidentally, harder to find quickly during a show, and more vulnerable
to cache/version mismatches after deployments.

## Decision

We will make the app installable as a Progressive Web App, with the remote
being the primary beneficiary.

Implementation details:

- Add a web app manifest (`public/manifest.webmanifest`) with:
  - `name`/`short_name` for install banners.
  - `start_url: "/"` and `display: "standalone"`.
  - `theme_color`/`background_color` aligned with the UI.
  - An icon (reusing `vite.svg` for the PoC).
- Register a minimal service worker (`public/sw.js`):
  - Caches `index.html` as a shell so the app can load while offline or during
    brief network blips.
  - Claims clients on activate; does not implement aggressive asset caching
    beyond the shell (to keep behaviour predictable during development).
- Register the service worker in `src/main.tsx` on window load.
- Tag pairing links/QRs with an explicit `v=` app version:
  - Defined via `APP_VERSION` in `vite.config.ts`.
  - When the remote scans a QR with a newer version, it reloads from that URL
    to ensure both ends run the same build.

## Consequences

- Operators can install the remote on mobile devices as an app-like icon with
  a standalone chrome, making it easier to discover and harder to close by
  accident.
- Basic offline resilience is provided for the shell, which is useful when
  switching networks or walking between coverage zones.
- Version mismatches are handled explicitly:
  - The viewer drives the version via the QR link.
  - The remote updates itself when necessary, avoiding subtle signalling and
    WebRTC incompatibilities between builds.
- The service worker is intentionally minimal:
  - For a real production deployment we would likely add an asset cache with
    revisioned filenames and a more nuanced update strategy.
  - For this PoC, the focus is on installability and simple cache behaviour,
    not full offline operation.

