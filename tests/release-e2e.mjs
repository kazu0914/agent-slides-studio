import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';import {mkdtemp,symlink,rm,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {browserOptions} from '../local/browser.mjs';
const release=resolve(process.argv[2]||'.'),origin='http://127.0.0.1:9192';let proc,browser;const dirs=[];
async function start(dir){proc=spawn(process.execPath,[join(release,'dist-local/server.mjs')],{cwd:dir,env:{...process.env,FRAME_PORT:'9192',FRAME_CODEX_BIN:join(dir,'missing-codex')},stdio:'pipe'});await new Promise((ok,bad)=>{proc.stdout.on('data',d=>{if(String(d).includes(origin))ok();});proc.on('exit',()=>bad(Error('server startup failed')));});}
async function stop(){if(proc){const p=proc;proc=null;if(p.exitCode===null)await new Promise(r=>{p.on('exit',r);p.kill();});}}
async function space(){const d=await mkdtemp(join(tmpdir(),'agent-slides-release-'));dirs.push(d);for(const n of ['dist-local','drizzle'])await symlink(join(release,n),join(d,n));return d;}
async function api(path,body,method){const r=await fetch(origin+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json();assert(r.ok,JSON.stringify(j));return j;}
try{const d=await space();await start(d);assert.equal((await api('/api/codex/status')).state,'missing');assert.deepEqual(await api('/api/backgrounds'),['public-blue','public-green','public-orange','public-sunshine','public-hearts']);const response=await fetch(origin);assert.equal(response.headers.get('x-frame-options'),'DENY');assert(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
for(const headers of [{Origin:'https://example.invalid'},{Host:'example.invalid'},{'Sec-Fetch-Site':'cross-site'}])assert.equal(await new Promise((ok,bad)=>{const r=httpRequest(origin+'/api/decks',{headers},res=>{res.resume();ok(res.statusCode);});r.on('error',bad);r.end();}),403,JSON.stringify(headers));
const initial=(await api('/api/deck')).deck;
// 日本語のUTF-8バイト列の途中でHTTPチャンクを分割する。
const payload=Buffer.from(JSON.stringify({...initial,title:'AIと考える'}));const split=payload.indexOf(Buffer.from('と'))+1;
const createdByChunks=await new Promise((ok,bad)=>{const r=httpRequest(origin+'/api/decks',{method:'POST',headers:{'Content-Type':'application/json'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>{try{assert.equal(res.statusCode,201);ok(JSON.parse(body));}catch(e){bad(e);}});});r.on('error',bad);r.write(payload.subarray(0,split));setTimeout(()=>r.end(payload.subarray(split)),30);});
assert.equal((await api('/api/deck?deckId='+createdByChunks.id)).deck.title,'AIと考える');
console.log('PASS: Host/Origin/cross-site rejection, security headers, split UTF-8 request');
const deck={...initial,title:'配布テスト',slides:initial.slides.slice(0,1)};const {id}=await api('/api/decks',deck);const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';const {src}=await api('/api/assets',{data:png});deck.slides[0].title='保存の検証';deck.slides[0].objects=[{id:'test-image',name:'テスト画像',kind:'image',src,x:1200,y:600,w:80,h:80}];const saved=await api('/api/deck?deckId='+id,{deck,version:0,requestId:'smoke-save',reason:'配布動作確認',actor:'手動編集'});assert.equal(saved.version,1);await stop();await start(d);const restarted=await api('/api/deck?deckId='+id);assert.equal(restarted.deck.slides[0].title,'保存の検証');assert.equal(restarted.logs.length,1);assert((await fetch(origin+src)).ok);await api('/api/decks?deckId='+id+'&version=1',null,'DELETE');assert(!(await api('/api/decks')).some(x=>x.id===id));await api('/api/trash/restore',{deckId:id});assert((await api('/api/decks')).some(x=>x.id===id));const backup=await api('/api/backup?deckId='+id);backup.chat=[{role:'user',text:'復元確認用の会話',at:new Date().toISOString()}];await stop();await start(await space());const restored=await api('/api/backup/import',backup);const result=await api('/api/deck?deckId='+restored.id);assert.deepEqual(result.deck,restarted.deck);assert.deepEqual(result.logs,restarted.logs);assert.equal((await api('/api/codex/chat?deckId='+restored.id))[0].text,'復元確認用の会話');assert((await fetch(origin+src)).ok);
browser=await chromium.launch({headless:true,...browserOptions()});const p=await browser.newPage({viewport:{width:1500,height:1000}});await p.goto(origin+'/deck/'+restored.id);await p.getByText('Codex CLIが見つかりません。インストール後に再確認してください。',{exact:true}).waitFor();await p.getByLabel('テキストを編集',{exact:true}).click();assert(await p.locator('.center .slide').isVisible());for(const kind of ['pdf','pptx']){const r=await fetch(origin+'/api/'+kind+'?deckId='+restored.id);assert(r.ok,await r.clone().text());assert((await r.arrayBuffer()).byteLength>1000);}await p.goto(origin);const downloaded=p.waitForEvent('download');await p.getByRole('link',{name:'練習用サンプルをダウンロード'}).click();const dl=await downloaded;assert.equal(dl.suggestedFilename(),'getting-started.json');await p.locator('input[type=file][accept=".json"]').last().setInputFiles(join(release,'public/samples/getting-started.json'));await p.waitForURL('**/deck/*');
await p.getByRole('button',{name:'グリッドビュー',exact:true}).click();
const grid=p.getByRole('dialog',{name:'スライド一覧',exact:true});await grid.waitFor();
assert(await grid.locator('.slide-grid-card').count()>1,'全スライドを一覧表示');
await grid.getByRole('slider',{name:'一覧の表示サイズ'}).fill('300');
await grid.locator('.slide-grid-card').nth(1).click();
assert(await grid.isVisible(),'クリックではグリッドを閉じない');
assert.equal(await grid.locator('.slide-grid-card').nth(1).getAttribute('aria-pressed'),'true','グリッド内の選択を更新');
await grid.getByRole('button',{name:'グリッドビューを閉じる',exact:true}).click();await grid.waitFor({state:'hidden'});
assert.equal(await p.locator('.thumb-row').nth(1).getAttribute('aria-current'),'true','選んだスライドへ移動');
await p.getByRole('button',{name:'グリッドビュー',exact:true}).click();await grid.waitFor();
await p.keyboard.press('Escape');await grid.waitFor({state:'hidden'});
assert(await p.getByRole('button',{name:'グリッドビュー',exact:true}).evaluate(el=>document.activeElement===el),'閉じた後のフォーカス復帰');
await p.locator('.thumb-row').first().click();
console.log('PASS: grid view, thumbnail size, slide navigation, Escape and focus restore');
await p.getByLabel('テキストを編集',{exact:true}).click();let typingSaves=0;p.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/deck?'))typingSaves++;});
await p.locator('.center .hero-copy h2').fill('ガイドに沿って編集');
await p.waitForTimeout(1300);assert.equal(typingSaves,0,'入力中は保存ロックを開始しない');
await p.locator('.center .hero-copy h2').evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
await p.waitForTimeout(1300);assert.equal(typingSaves,0,'IME変換中は保存しない');
assert(await p.locator('.center .hero-copy h2').evaluate(el=>document.activeElement===el));
await p.locator('.center .hero-copy h2').evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));const tutorialId=new URL(p.url()).pathname.split('/').pop();assert.equal((await api('/api/deck?deckId='+tutorialId)).deck.slides[0].title,'ガイドに沿って編集');await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();await p.getByRole('dialog',{name:'プレゼンテーション',exact:true}).waitFor();await p.keyboard.press('Escape');
for(const [bg,label] of [['public-blue','ブルーウェーブ'],['public-green','グリーンウェーブ'],['public-orange','オレンジジオメトリ'],['public-sunshine','サンシャイン'],['public-hearts','ピンクハート']]){
 await p.getByRole('button',{name:'背景テンプレート '+label,exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 assert.equal((await api('/api/deck?deckId='+tutorialId)).deck.slides[0].backgroundTemplate,bg);
 assert((await p.locator('.center .slide').getAttribute('style')).includes(bg+'.png'));
 assert.equal((await fetch(origin+'/backgrounds/'+bg+'.png')).status,200);
}
console.log('PASS: five public backgrounds selected/rendered/persisted');
const title=p.locator('.center .hero-copy h2');
let rejectNext=true;
await p.route('**/api/deck?deckId='+tutorialId,async route=>{
 if(route.request().method()==='POST'&&rejectNext){rejectNext=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'テスト用の一時的な通信失敗'})});}else await route.continue();
});
await title.fill('通信失敗から復旧');await p.locator('.projectbar').click({position:{x:5,y:5}});
await p.getByRole('button',{name:'保存を再試行',exact:true}).waitFor();
assert.equal((await api('/api/deck?deckId='+tutorialId)).deck.slides[0].title,'ガイドに沿って編集');
await p.getByRole('button',{name:'保存を再試行',exact:true}).click();
await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
assert.equal((await api('/api/deck?deckId='+tutorialId)).deck.slides[0].title,'通信失敗から復旧');
await title.fill('保存してからプレゼン');await p.locator('.projectbar').click({position:{x:5,y:5}});
await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();
await p.getByRole('dialog',{name:'プレゼンテーション',exact:true}).waitFor();
assert.equal((await api('/api/deck?deckId='+tutorialId)).deck.slides[0].title,'保存してからプレゼン');
await p.keyboard.press('Escape');
const stale=await api('/api/deck?deckId='+tutorialId);
await title.fill('新しい版を保持');await p.locator('.projectbar').click({position:{x:5,y:5}});
await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
const conflict=await fetch(origin+'/api/deck?deckId='+tutorialId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deck:stale.deck,version:stale.version,requestId:'stale-tab',reason:'古いタブ',actor:'手動編集'})});
assert.equal(conflict.status,409);assert.equal((await api('/api/deck?deckId='+tutorialId)).deck.slides[0].title,'新しい版を保持');
await p.reload();await title.waitFor();assert.equal(await title.innerText(),'新しい版を保持');
console.log('PASS: failed autosave/retry, save-before-present, stale version rejected, reload');
console.log('PASS: sample download/import, browser text editing/save, presentation');console.log('PASS: clean startup, no private backgrounds, Codex absent/manual edit, save/restart, trash restore, empty-workspace backup restore incl images/history/chat, PDF/PPTX');}finally{await browser?.close();await stop();for(const d of dirs)await rm(d,{recursive:true,force:true});}
