import { existsSync } from "node:fs";

export function resolveCodexBinary(env = process.env, exists = existsSync) {
  if (env.FRAME_CODEX_BIN) return env.FRAME_CODEX_BIN;
  // デスクトップアプリ更新前後の配置に対応し、PATH上の古いCLIより優先する。
  return [
    "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex",
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    "/Applications/Codex.app/Contents/Resources/codex",
  ].find(exists) || "codex";
}
