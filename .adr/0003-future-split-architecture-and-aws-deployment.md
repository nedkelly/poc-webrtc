# 3. Future Split Architecture and AWS Deployment

Date: 2025-11-21

## Status

Proposed

## Context

This repository implements a proof‑of‑concept WebRTC configurator as:

- A single Vite/React application serving both Viewer and Remote routes.
- A tiny `/api/signal` endpoint co‑located with the frontend (Vercel function).

For the PoC this is ideal:

- One codebase is easy to iterate on.
- Shared types and WebRTC helpers (`src/shared/*`) live in one place.
- Deployments are simple (Bitbucket Pipelines → Vercel static hosting +
  micro‑API).

However, in a real production environment we expect:

- Viewer and Remote to be built, versioned, and deployed independently.
- A dedicated signalling service, likely implemented as an AWS Lambda, behind
  a stable HTTPS endpoint.
- AWS‑centric infrastructure for observability, secrets, and networking.

We want to ensure this PoC doesn’t paint us into a corner and that it
captures the architectural intent for the eventual split.

## Decision

We will treat this repo as a "vertical slice" PoC and design it so that:

1. **Viewer and Remote can be split into separate frontends**:
   - Shared logic lives under `src/shared/` (protocol, WebRTC session helper).
   - Shared state shape (`ConfigState`, message types) is API‑agnostic and can
     be moved into its own package later.
   - Viewer/Remote routing is already separated under `src/routes/`.

2. **The signalling API has a clear contract**:
   - `/api/signal` currently accepts:
     - `POST { sessionId, offer? , answer? }`
     - `GET { sessionId } → { offer, answer }`
   - The client code does not depend on Vercel specifics; only on this
     JSON contract and TTL semantics.
   - For production we can:
     - Move the implementation to an AWS Lambda behind API Gateway.
     - Back it with DynamoDB, ElastiCache/Redis, or another store optimized
       for short‑lived sessions.

3. **Deployment assumptions are documented but not hard‑coded**:
   - The current PoC uses Vercel rewrites and KV integration, but the
     frontends do not assume a particular host beyond relative `/api` paths.
   - The PWA and QR flows are based on origin‑relative URLs so they can be
     reused across hosting environments (Vercel, S3 + CloudFront, etc.).

## Consequences

- The current codebase demonstrates end‑to‑end behaviour while remaining
  refactor‑friendly:
  - Viewer and Remote can be split into separate repos or packages by
    extracting `src/shared/*` and re‑wiring routes.
  - The signalling layer can be replaced with an AWS Lambda implementation
    without changing the client handshake.
- AWS infrastructure responsibilities are clear:
  - Host static frontends (Viewer/Remote) using S3 + CloudFront or an
    equivalent service.
  - Implement `/signal` (or similar) as a Lambda function with a TTL‑backed
    store and appropriate logging/metrics.
- This ADR sets expectations that:
  - The PoC prioritizes simplicity and iteration speed.
  - A future production system will have stricter concerns (auth, rate
    limiting, observability) that are deliberately out of scope here but can
    be layered on top of the existing contract.

