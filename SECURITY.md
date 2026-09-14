# Security

This project is a local, single-user application. It has no application-level login.
Do not expose its port to a network or publish it behind a reverse proxy.
Host/Origin validation and loopback binding do not isolate users or processes on the same computer.

AI requests send the deck JSON, instruction and recent conversation to the authenticated Codex service.
Backups include slide contents, images, decision history and conversation. Treat them as private documents.
Export uses a local browser. Keep Node.js, the browser, Codex and dependencies updated.

Do not put credentials or confidential reproduction data in public issues.
For a vulnerability, use GitHub's **Report a vulnerability** on the Security tab if enabled.
If it is unavailable, open a minimal issue asking the maintainer for a private reporting channel;
do not include exploit details or sensitive data until that channel is established.

Only the current development branch is maintained. There is no fixed security response SLA.

## Known dependency advisory (2026-09-14)

PptxGenJS 4.0.1 transitively depends on image-size, which npm audit reports under
GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq (ICNS/JXL/HEIF parser denial of service).
The current registry versions have no non-breaking upstream fix. Do not use `npm audit fix --force`
without review: it proposes a major downgrade of PptxGenJS.
This app only supplies browser-generated PNG data to PptxGenJS, including backgrounds;
it does not pass raw uploaded images or arbitrary image paths to that parser.
The advisory remains in dependency audit results and must be revisited before release.
Vite and esbuild were updated to 8.3.0 and 0.28.2 respectively during release preparation.

Release candidate review (2026-09-14): the minimal public dependency tree still reports two high-severity
package entries (`image-size` and its parent `pptxgenjs`). All `addImage` call sites in the exporter
use PNG produced by the browser; the PPTX importer accepts PNG/JPEG/WebP bytes and does not call
`image-size`. This limits reachability of the affected ICNS/JXL/HEIF parsers, but does not remove
the installed vulnerable dependency. This remains a disclosed limitation of the local preview release.
