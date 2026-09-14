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

## Dependency remediation (2026-09-14)

The public package uses a local PptxGenJS 4.0.1 distribution under vendor/pptxgenjs.
Its runtime and type files are unchanged, with hashes and upstream license retained.
The unused image-size dependency was removed from its package manifest. Neither
runtime entry point imports it. This removes the vulnerable ICNS/JXL/HEIF parsers
(GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq) from the public dependency tree;
we did not suppress or ignore the audit findings. See vendor/pptxgenjs/UPSTREAM.md.
A clean public install reports zero known npm audit vulnerabilities on this date.
This is not a guarantee against unknown vulnerabilities or future advisories.

## Final review hardening (2026-09-14)

The server rejects cross-site Fetch Metadata requests, checks Host and Origin, and
sets a Content Security Policy that denies framing, plugins and external scripts.
HTTP JSON bodies are byte-limited and decoded after joining UTF-8 chunks.
PPTX group nesting is limited to 32 levels, in addition to ZIP/XML/slide limits.
Regression checks cover these boundaries plus save conflicts, backup restoration
and PDF/PPTX export. This review is not an independent penetration test and does
not guarantee the absence of vulnerabilities.
