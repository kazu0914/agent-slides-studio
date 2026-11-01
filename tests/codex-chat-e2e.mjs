import assert from 'node:assert/strict';

export async function codexChatTest(page) {
  const input = page.getByRole('textbox', {name: 'エージェントへの指示', exact: true});
  const send = page.getByRole('button', {name: '変更案を作成', exact: true});
  const ai = page.getByRole('button', {name: 'AI対話', exact: true});
  const quick = page.getByRole('button', {name: 'クイック操作', exact: true});
  const json = page.getByRole('button', {name: 'エージェント連携', exact: true});
  const retry = page.getByRole('button', {name: '再確認', exact: true});
  const prompt = '以下の内容で提案書を作成してください。\n' + '毎週の目標と振り返りをまとめます。\n'.repeat(150);
  let online = false, fail = true, requests = 0;
  await page.route('**/api/codex/status', route => route.fulfill({json: online
    ? {available: true, state: 'ready', message: 'Codexに接続済み'}
    : {available: false, state: 'connection_error', message: 'テスト用接続エラー'}}));
  await page.route('**/api/codex/models', route => route.fulfill({json: {data: [{
    model: 'test-model', displayName: 'テスト用モデル', isDefault: true,
    defaultReasoningEffort: 'low', supportedReasoningEfforts: [{reasoningEffort: 'low'}],
  }]}}));
  await page.route('**/api/codex/chat?*', route => {
    if (route.request().method() !== 'POST') return route.continue();
    requests++;
    assert.equal(route.request().postDataJSON().prompt, prompt);
    return route.fulfill({status: fail ? 502 : 200, json: fail
      ? {error: 'AIが作成した変更案の形式を修復できませんでした。入力文は保持しています。'}
      : {answer: 'テスト応答', proposal: null, version: 0}});
  });
  try {
    await page.reload();
    await page.getByText('テスト用接続エラー', {exact: true}).waitFor();
    assert.match(await ai.getAttribute('class'), /chosen/);
    await input.fill(prompt);
    assert(await send.isDisabled());
    await json.click();
    assert.equal(await input.inputValue(), prompt);
    await send.click();
    await page.getByText('この欄はJSON形式の変更提案専用です。', {exact: false}).waitFor();
    assert.equal(await input.inputValue(), prompt);
    assert(!(await page.locator('body').innerText()).includes('Unexpected token'));
    await ai.click();
    online = true;
    await retry.click();
    await page.getByText('Codexに接続済み', {exact: true}).waitFor();
    assert(await send.isEnabled());
    await quick.click();
    await retry.click();
    await page.getByText('Codexに接続済み', {exact: true}).waitFor();
    assert.match(await quick.getAttribute('class'), /chosen/);
    assert.equal(await input.inputValue(), prompt);
    await ai.click();
    online = false;
    await retry.click();
    await page.getByText('テスト用接続エラー', {exact: true}).waitFor();
    assert.match(await ai.getAttribute('class'), /chosen/);
    assert.equal(await input.inputValue(), prompt);
    assert(await send.isDisabled());
    online = true;
    await retry.click();
    await page.getByText('Codexに接続済み', {exact: true}).waitFor();
    await send.click();
    await page.getByText('AIが作成した変更案の形式を修復できませんでした。入力文は保持しています。', {exact: true}).waitFor();
    assert.equal(await input.inputValue(), prompt);
    fail = false;
    await send.click();
    await page.getByText('テスト応答', {exact: true}).waitFor();
    assert.equal(await input.inputValue(), '');
    assert.equal(requests, 2);
    console.log('PASS: Codex modes, reconnect, Japanese JSON errors and prompt preservation');
  } finally {
    await page.unrouteAll({behavior: 'wait'});
    await page.reload();
  }
}
