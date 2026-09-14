# Release preparation

The maintainer's existing checkout contains private Sites metadata and old development history.
Do **not** push that history as the initial public release.

From the development checkout, `npm run prepare:release` creates a new timestamped directory under `.release/`.
It copies an explicit allowlist of local-app files, generates a minimal package lock from the public npm registry,
and checks for private paths, private backgrounds and common credential patterns.
It does not initialize Git, commit, push, publish, or change GitHub visibility.

Before publication:

1. Review the generated directory and third-party notices.
2. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:release` there.
3. Test a clean first launch and the manual editor. Test export with an installed browser.
4. Review files manually; a heuristic scanner is not proof that all secrets have been removed.
5. With maintainer approval, initialize a **fresh** Git history in that directory and push it to the target repository.
6. Enable GitHub private vulnerability reporting and review the repository description, visibility and release notes.
7. Change visibility to Public only when the maintainer explicitly approves publication.

Personal `bg_1.png`–`bg_6.png` are excluded even if they exist locally. Future public artwork needs explicit attribution/licensing.
After the initial clean import, use that repository as the source of truth for public development.
The maintained package uses `npm run build` / `npm start`; it does not need Sites, Cloudflare D1 or desktop-app internals.
