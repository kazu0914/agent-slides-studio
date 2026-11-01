import assert from 'node:assert/strict';
export async function slideMotionTest(browser,api,origin,initial){
 const source={...initial.slides[0],id:'motion-main',title:'伝える、動きで。',body:'登場順と強さをデザインする。',eyebrow:'MOTION',layout:'cards',animation:'reveal',artworkKind:'none',items:[{title:'見出し',body:'最初に主張を。'},{title:'順番',body:'一つずつ伝える。'},{title:'強弱',body:'要点を強調する。'}],revealSteps:{body:1,items:2},objects:[{id:'motion-box',name:'後から表示',kind:'text',x:80,y:730,w:500,h:90,rotation:8,opacity:.7,text:'自由配置にも対応',appearAt:3}]};
 const {id}=await api('/api/decks',{title:'演出検証',slides:[source,{...source,id:'motion-next',title:'次のメッセージ'}]});
 const p=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'no-preference'});await p.goto(origin+'/deck/'+id);await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'ダイナミック',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));assert.equal((await api('/api/deck?deckId='+id)).deck.slides[0].motion.entrance,'zoom');
 assert.equal(await p.locator('.center .slide').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='slide-motion').length),0);
 await p.getByRole('button',{name:'演出をプレビュー',exact:true}).click();const preview=p.getByRole('dialog',{name:'演出プレビュー'});await preview.waitFor();
 assert(await preview.evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.id==='slide-motion')));
 await p.waitForTimeout(1600);await preview.getByRole('button',{name:'次の表示',exact:true}).click();assert(await preview.locator('.hero-copy>p').evaluate(el=>el.getAnimations().some(a=>a.id==='slide-motion')));assert.equal(await preview.locator('.hero-copy>h2').evaluate(el=>el.getAnimations().filter(a=>a.id==='slide-motion').length),0);
 await preview.getByRole('button',{name:'次の表示',exact:true}).click();assert(await preview.locator('.slide-item').first().evaluate(el=>el.getAnimations().some(a=>a.id==='slide-motion')));
 await preview.getByRole('button',{name:'次の表示',exact:true}).click();const object=preview.locator('[data-free-object="motion-box"]');await object.waitFor();assert(await object.evaluate(el=>el.getAnimations().some(a=>a.id==='slide-motion')));await p.waitForTimeout(1600);assert.equal(await object.evaluate(el=>getComputedStyle(el).opacity),'0.7');assert.notEqual(await object.evaluate(el=>getComputedStyle(el).transform),'none');
 if(process.env.MOTION_SCREENSHOT)await preview.screenshot({path:process.env.MOTION_SCREENSHOT});
 await p.keyboard.press('Escape');await preview.waitFor({state:'hidden'});
 for(const [name,property] of [['すっきり','translate'],['シネマ','clipPath']]){
  await p.getByRole('button',{name,exact:true}).click();await p.getByRole('button',{name:'演出をプレビュー',exact:true}).click();
  assert(await preview.locator('.hero-copy>h2').evaluate((el,key)=>el.getAnimations().some(a=>a.id==='slide-motion'&&key in a.effect.getKeyframes()[0]),property));await p.keyboard.press('Escape');
 }
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));await p.reload();await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();const presentation=p.getByRole('dialog',{name:'プレゼンテーション',exact:true});await presentation.waitFor();await p.keyboard.press('p');assert(await presentation.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='slide-motion').every(a=>a.playState==='paused')));await p.keyboard.press('p');await p.keyboard.press('Escape');
 await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'演出をプレビュー',exact:true}).click();assert.equal(await preview.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='slide-motion').length),0);await p.keyboard.press('Escape');
 await p.goto(origin+'/export/'+id);await p.locator('.pdf-render[data-ready=true]').waitFor();assert.equal(await p.locator('.export-slide').first().evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='slide-motion').length),0);assert.equal(await p.locator('[data-free-object="motion-box"]').first().evaluate(el=>getComputedStyle(el).opacity),'0.7');
 for(const kind of ['pdf','pptx']){const r=await fetch(origin+'/api/'+kind+'?deckId='+id);assert(r.ok);assert((await r.arrayBuffer()).byteLength>1000);}
 await p.close();console.log('PASS: motion presets persist, editor stays still, stepped preview, pause, reduced motion, native placement/opacity and static PDF/PPTX');
}
