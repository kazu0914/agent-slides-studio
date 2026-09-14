# Architecture

- `local/main.tsx`: browser entry; library, editor, export view, presenter window.
- `app/`: React editor and shared rendering. Visual review and export use the same slide renderer.
- `local/server.ts`: loopback HTTP server; input validation, APIs, SQLite initialization, static delivery.
- `lib/model.ts`, `lib/objects.ts`: Zod schemas; stable IDs, bounds, deck/object validation.
- `lib/repository.ts`: append-only revision snapshots, optimistic version checks, idempotent request IDs.
- `lib/review.ts`: restrict proposals to their allowed scope and apply selected changes.
- `local/codex.mjs`: ephemeral read-only Codex app-server process. Structured proposals are validated before saving. Cancellation terminates the process.
- `local/assets.ts`, `local/backup.ts`: content-addressed images and portable deck recovery.
- `local/pdf.ts`, `local/pptx.mjs`: static PDF and editable PPTX export using a headless browser.
- `app/presenter.tsx`: presenter window synchronized by same-origin BroadcastChannel.

The repository interface retains D1-compatible types for historical reasons, but local execution uses Node's SQLite.
There is no cloud database requirement. The public package omits the historical Sites frontend/authentication scaffold.

## Data flow

Browser draft → versioned save → validated SQLite revision → decision log.
AI request → Codex proposal → server scope restriction → visual review → selected changes → versioned save.
Images stay in `.local-data/assets`; backups embed required images and revisions.
Presenter ink is session state and is cleared when the presentation ends.

## Current limitations

Single user, one AI generation at a time; at most 50 slides and 100 independent objects per slide.
Tables: 30 rows × 12 columns. Images: PNG/JPEG/WebP, up to 10MB each. Backups: 150MB.
Built-in system fonts may differ across operating systems. Animations are flattened on export.
