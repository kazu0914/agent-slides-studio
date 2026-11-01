import assert from 'node:assert/strict';
import {resolveCodexBinary} from '../local/codex-binary.mjs';

const current = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';
const legacy = '/Applications/ChatGPT.app/Contents/Resources/codex';
assert.equal(resolveCodexBinary({FRAME_CODEX_BIN:'/custom/codex'}, () => true), '/custom/codex');
assert.equal(resolveCodexBinary({}, () => true), current);
assert.equal(resolveCodexBinary({}, path => path === legacy), legacy);
assert.equal(resolveCodexBinary({}, () => false), 'codex');
console.log('Codex binary detection PASS');
