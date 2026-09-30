import assert from "node:assert/strict";
import { initialDeck } from "../lib/model";
import { AppError } from "../lib/repository";
import { generateCodexProposal, parseChatInput } from "../local/codex-proposal";

const deck = structuredClone(initialDeck);
const before = structuredClone(deck);
const input = {prompt: "提案書を作ってください", selectedSlideId: deck.slides[0].id, version: 0};
assert.equal(parseChatInput({...input, prompt: "あ".repeat(8000)}).prompt.length, 8000);
assert.throws(() => parseChatInput({...input, prompt: "あ".repeat(8001)}), /8,000文字/);
assert.throws(() => parseChatInput({...input, prompt: " "}), /依頼文を入力/);
assert.throws(() => parseChatInput({...input, version: "0"}), /送信設定/);

const valid = {answer: "変更案です", proposalJson: JSON.stringify({
  reason: "提案書を作成", patches: [], deck,
}), webSearchCount: 1};
const tooMany = structuredClone(deck);
tooMany.slides[0].items = Array.from({length: 5}, () => ({title: "項目", body: "説明"}));
const malformed = { ...valid, proposalJson: JSON.stringify({reason: "提案書", patches: [], deck: tooMany}) };
let calls = 0;
const options = {model: "test-model", effort: "low", webSearch: false,
  scope: {mode: "deck" as const, slideId: deck.slides[0].id, objectIds: []}};
const repaired = await generateCodexProposal(input.prompt, deck, input.selectedSlideId, [], options,
  async (prompt, current, selected, history, opts: any) => {
    calls++;
    assert.equal(prompt, input.prompt);
    assert.equal(current, deck);
    assert.equal(selected, input.selectedSlideId);
    assert.equal(opts.model, options.model);
    assert.deepEqual(opts.scope, options.scope);
    if (calls === 1) return malformed;
    assert.equal(opts.proposalRepair.issues[0].path, "deck.slides.0.items");
    assert.equal(opts.proposalRepair.issues[0].code, "too_big");
    assert.deepEqual(opts.proposalRepair.response, malformed);
    return valid;
  });
assert.equal(calls, 2);
assert.equal(repaired.webSearchCount, 2);
assert.deepEqual(repaired.proposal?.deck, deck);
assert.deepEqual(deck, before, "検証・修復では元のデッキを変更しない");

for (const response of [malformed, {...valid, proposalJson: "{invalid"}]) {
  calls = 0;
  await assert.rejects(generateCodexProposal(input.prompt, deck, input.selectedSlideId, [], options,
    async () => { calls++; return response; }),
  error => error instanceof AppError && error.status === 502 && /AIが作成した変更案/.test(error.message));
  assert.equal(calls, 2, "修復は一度まで");
}
calls = 0;
await assert.rejects(generateCodexProposal(input.prompt, deck, input.selectedSlideId, [], options,
  async () => { calls++; throw new Error("接続失敗"); }), /接続失敗/);
assert.equal(calls, 1, "通信失敗を再生成しない");

const controller = new AbortController();
calls = 0;
await assert.rejects(generateCodexProposal(input.prompt, deck, input.selectedSlideId, [], {...options, signal: controller.signal},
  async () => { calls++; controller.abort(); return malformed; }), /生成を停止/);
assert.equal(calls, 1, "停止後に再生成しない");

calls = 0;
await assert.rejects(generateCodexProposal(input.prompt, deck, input.selectedSlideId, [], options,
  async () => { calls++; return calls === 1 ? malformed : {...valid, proposalJson: ""}; }), /AIが作成した変更案/);
const answerOnly = await generateCodexProposal(input.prompt, deck, input.selectedSlideId, [], options,
  async () => ({...valid, proposalJson: ""}));
assert.equal(answerOnly.proposal, null, "通常の会話は変更案なしでも許可する");
console.log("Codex proposal validation, bounded repair, cancellation and input errors PASS");
