import assert from 'node:assert/strict';
import {mkdtemp,symlink,rm,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {browserOptions} from '../local/browser.mjs';
import {flowExample,flowAgentContract} from '../lib/flow-agent.mjs';
const repo=resolve('.'),dir=await mkdtemp(join(tmpdir(),'slides-flow-')),origin='http://127.0.0.1:9194';
let proc,browser;const out=join(repo,'output/flow-qa');await mkdir(out,{recursive:true});
async function api(path,body){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json();assert(r.ok,JSON.stringify(j));return j;}
try{
 for(const n of ['dist-local','drizzle'])await symlink(join(repo,n),join(dir,n));
 proc=spawn(process.execPath,[join(repo,'dist-local/server.mjs')],{cwd:dir,env:{...process.env,FRAME_PORT:'9194',FRAME_CODEX_BIN:join(dir,'missing-codex')},stdio:'pipe'});
 await new Promise((ok,bad)=>{proc.stdout.on('data',d=>{if(String(d).includes(origin))ok();});proc.on('exit',()=>bad(Error('server startup failed')));proc.stderr.on('data',d=>process.stderr.write(d));});
 const initial=(await api('/api/deck')).deck;const slide={...initial.slides[0],id:'flow-test',title:'AIからツールへ、依頼が伝わる',body:'箱は固定したまま、接続線に信号が流れます。',eyebrow:'FLOW / 01',layout:'cards',theme:'white',animation:'none',artworkKind:'none',items:[],objects:[],placements:{}};
 const {id}=await api('/api/decks',{title:'フロー検証',slides:[slide]});
 browser=await chromium.launch({headless:true,...browserOptions()});const p=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'no-preference'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/deck/'+id);await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'分岐フローを追加',exact:true}).click();
 await p.locator('.center [data-flow-diagram]').waitFor();assert.equal(await p.locator('.center [data-flow-diagram]').getAttribute('data-flow-state'),'static');
 await p.getByText('箱 1：AIエージェント',{exact:true}).click();await p.getByLabel('箱 1 の名前',{exact:true}).fill('依頼を受け取るAI');await p.getByLabel('フローの秒数',{exact:true}).fill('4');await p.locator('.projectbar').click({position:{x:5,y:5}});
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));let saved=await api('/api/deck?deckId='+id);assert.equal(saved.deck.slides[0].objects[0].flow.nodes[0].label,'依頼を受け取るAI');await p.reload();await p.locator('.center [data-flow-node]').nth(3).waitFor();assert.equal(await p.locator('.center [data-flow-node]').count(),4);
 await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'演出をプレビュー',exact:true}).click();const preview=p.getByRole('dialog',{name:'演出プレビュー'});await preview.waitFor();const graph=preview.locator('[data-flow-diagram]');await p.waitForTimeout(400);assert.equal(await graph.getAttribute('data-flow-state'),'playing');const packet=graph.locator('[data-flow-packet]').first();const x=await packet.getAttribute('cx');await p.waitForTimeout(220);assert.notEqual(await packet.getAttribute('cx'),x);await preview.screenshot({path:join(out,'branch-preview.png')});await p.keyboard.press('Escape');
 await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();const presentation=p.getByRole('dialog',{name:'プレゼンテーション',exact:true});await presentation.waitFor();await p.waitForTimeout(350);await p.keyboard.press('p');await p.waitForTimeout(80);const paused=presentation.locator('[data-flow-packet]').first();const px=await paused.getAttribute('cx');await p.waitForTimeout(250);assert.equal(await paused.getAttribute('cx'),px);assert.equal(await presentation.locator('[data-flow-diagram]').getAttribute('data-flow-state'),'paused');await p.keyboard.press('p');await p.waitForTimeout(200);assert.notEqual(await paused.getAttribute('cx'),px);await p.keyboard.press('Escape');
 await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'演出をプレビュー',exact:true}).click();assert.equal(await preview.locator('[data-flow-diagram]').getAttribute('data-flow-state'),'static');await p.keyboard.press('Escape');
 await p.goto(origin+'/export/'+id);await p.locator('.pdf-render[data-ready=true]').waitFor();assert.equal(await p.locator('[data-flow-diagram]').getAttribute('data-flow-state'),'static');await p.locator('.export-slide').screenshot({path:join(out,'branch-export.png')});
 for(const kind of ['pdf','pptx']){const r=await fetch(origin+'/api/'+kind+'?deckId='+id);assert(r.ok,await r.clone().text());const b=Buffer.from(await r.arrayBuffer());assert(b.length>1000);await writeFile(join(out,'flow-test.'+kind),b);}
 console.log('PASS: insert/edit/save/reload, moving packets, pause/resume, reduced motion and static PDF/PPTX');
 // 外部エージェントの例を既存のレビュー経由で適用する。
 await p.goto(origin+'/deck/'+id);await p.getByRole('button',{name:'エージェント',exact:true}).click();await p.getByRole('button',{name:'エージェント連携',exact:true}).click();const dl=p.waitForEvent('download');await p.getByRole('button',{name:'現在の内容を渡す',exact:false}).click();const download=await dl;await download.saveAs(join(out,'frame-agent-context.json'));
 const context=JSON.parse(await readFile(join(out,'frame-agent-context.json'),'utf8'));assert.deepEqual(context.flowGeneration,flowAgentContract);assert.equal(context.schema.baseDeckId,id);assert.equal(context.schema.baseVersion,saved.version);
 const external=JSON.stringify({baseDeckId:id,baseVersion:saved.version,reason:'工程図を追加',patches:[{slideId:'flow-test',changes:{objects:[...saved.deck.slides[0].objects,{...flowExample,id:'serial-flow',duration:2,flow:{...flowExample.flow,effect:'steps',loop:false}}]}}]});
 const area=p.locator('textarea').filter({visible:true}).last();await area.fill(external);
 await p.getByRole('button',{name:'変更案を作成',exact:true}).click();
 await p.getByRole('button',{name:'選択した変更を適用',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const after=await api('/api/deck?deckId='+id);assert.equal(after.deck.slides[0].objects.length,2);assert.equal(after.deck.slides[0].objects[1].flow.effect,'steps');
 await p.emulateMedia({reducedMotion:'no-preference'});await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();await p.waitForTimeout(2400);const serial=p.getByRole('dialog',{name:'プレゼンテーション',exact:true}).locator('[data-free-object="serial-flow"] [data-flow-diagram]');assert.equal(await serial.getAttribute('data-flow-state'),'complete');assert.deepEqual(await serial.locator('[data-flow-node]').evaluateAll(els=>els.map(e=>e.getAttribute('opacity'))),['1','1','1']);await p.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS: external-agent contract, JSON review/apply, finite sequential playback, no browser exceptions');
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();if(proc&&proc.exitCode===null)await new Promise(r=>{proc.on('exit',r);proc.kill();});await rm(dir,{recursive:true,force:true});}
