# PptxGenJS local distribution

Source: https://www.npmjs.com/package/pptxgenjs/v/4.0.1
Upstream repository: https://github.com/gitbrent/PptxGenJS
License: MIT; the upstream LICENSE is retained.

The ESM, CommonJS and type files are copied unchanged from upstream 4.0.1.
Their SHA-256 values are recorded in upstream-sha256.json.
Only the package manifest is adapted: a private local name/version, removal of
unused image-size dependency and development scripts, and the selected file list.
The application uses the ESM entry point. Neither distributed entry point imports
image-size. Removing it prevents the vulnerable image parsers from being installed
in the public application's dependency tree. This is not an upstream security fix.

When updating, verify runtime imports, compare copied files to the published npm
package, run dependency audit and the full PDF/PPTX export regression tests.
Do not restore the removed dependency without reviewing its security status.
