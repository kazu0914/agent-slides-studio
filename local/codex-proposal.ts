import { z } from "zod";
import { applyProposal, proposalSchema, type Deck } from "../lib/model";
import { constrainDeck, type Scope } from "../lib/review";
import { AppError } from "../lib/repository";
import { askCodex } from "./codex.mjs";

export const chatInputSchema = z.object({
  prompt: z.string().trim().min(1, "依頼文を入力してください。")
    .max(8000, "依頼文は8,000文字以内にしてください。入力文は保持しています。"),
  model: z.string().max(100).optional(),
  effort: z.string().max(20).optional(),
  webSearch: z.boolean().default(false),
  scope: z.object({
    mode: z.enum(["deck", "slide", "objects"]),
    slideId: z.string(),
    objectIds: z.array(z.string()).max(100),
  }).optional(),
  selectedSlideId: z.string(),
  version: z.number().int(),
});

export function parseChatInput(body: unknown) {
  const parsed = chatInputSchema.safeParse(body);
  if (parsed.success) return parsed.data;
  const promptIssue = parsed.error.issues.find(issue => issue.path[0] === "prompt");
  throw new AppError(promptIssue?.message || "送信設定を確認できませんでした。画面を再読み込みして再送してください。", 400);
}

function validateProposal(raw: string, deck: Deck, scope?: Scope) {
  if (!raw.trim()) return null;
  const proposal = proposalSchema.parse(JSON.parse(raw));
  const next = applyProposal(deck, proposal);
  return scope ? proposalSchema.parse({
    reason: proposal.reason, patches: [], deck: constrainDeck(deck, next, scope),
  }) : proposal;
}

function validationFeedback(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.slice(0, 8).map(issue => ({
      path: issue.path.join(".") || "proposal", code: issue.code, message: issue.message,
    }));
  }
  return [{path: "proposal", code: error instanceof SyntaxError ? "invalid_json" : "invalid_proposal",
    message: error instanceof SyntaxError ? "proposalJsonを有効なJSONにしてください。" : error instanceof Error ? error.message : "変更案の形式を確認してください。"}];
}

type Options = {
  model?: string; effort?: string; webSearch?: boolean; signal?: AbortSignal; scope?: Scope;
};

export async function generateCodexProposal(
  prompt: string, deck: Deck, selectedSlideId: string, history: unknown[],
  options: Options, generate = askCodex,
) {
  let repair: {response: unknown; issues: ReturnType<typeof validationFeedback>} | undefined;
  let webSearchCount = 0;
  // AI出力だけを一度修復する。入力不備・通信失敗・停止は再試行しない。
  for (let attempt = 0; attempt < 2; attempt++) {
    if (options.signal?.aborted) throw new AppError("生成を停止しました。", 499);
    const result = await generate(prompt, deck, selectedSlideId, history, {...options, proposalRepair: repair});
    if (options.signal?.aborted) throw new AppError("生成を停止しました。", 499);
    webSearchCount += result.webSearchCount || 0;
    try {
      const proposal = validateProposal(result.proposalJson, deck, options.scope);
      if (repair && !proposal) throw new Error("修復対象の変更案を省略せず返してください。");
      return {...result, proposal, webSearchCount};
    } catch (error) {
      const issues = validationFeedback(error);
      if (attempt === 1) {
        const fields = [...new Set(issues.map(issue => issue.path))].join("、");
        throw new AppError(`AIが作成した変更案の形式を修復できませんでした（${fields}）。入力文は保持しています。もう一度送信してください。`, 502);
      }
      repair = {response: result, issues};
    }
  }
  throw new AppError("AIの変更案を取得できませんでした。", 502);
}
