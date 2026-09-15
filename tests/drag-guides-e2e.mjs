import assert from 'node:assert/strict';
export async function dragGuidesTest(browser,api,origin,initial){
 const objects=[{id:'moving',name:'移動する文字',kind:'text',text:'移動',x:400,y:500,w:250,h:70},{id:'reference',name:'参照',kind:'text',text:'参照',x:500,y:200,w:250,h:70,locked:true}];
 const deck={...initial,title:'ドラッグガイド',slides:[{...initial.slides[0],title:'',body:'',eyebrow:'',items:[],artworkKind:'none',animation:'none',objects}]};const {id}=await api('/api/decks',deck);const p=await browser.newPage({viewport:{width:1500,height:1000}});await p.goto(origin+'/deck/'+id);const canvas=p.locator('.center .slide');await canvas.waitFor();await p.getByLabel('編集枠の表示切替').click();assert(await p.locator('.center').evaluate(e=>e.classList.contains('edit-guides-hidden')));const before=await api('/api/deck?deckId='+id);const b=await canvas.boundingBox(),el=canvas.locator('[data-free-object="moving"]'),r=await el.boundingBox();
 await p.mouse.move(r.x+20,r.y+20);await p.mouse.down();await p.mouse.move(r.x+20+98/1600*b.width,r.y+20,{steps:10});
 assert(await canvas.locator('.drag-guide.alignment.x').isVisible(),'編集枠を非表示でもピンクのガイドは表示');assert(await canvas.locator('.drag-guide.distance.y').isVisible(),'距離も表示');assert((await canvas.locator('.drag-guide.alignment.x').innerText()).includes('500 px'));assert((await canvas.locator('.drag-guide.distance.y').innerText()).includes('230 px'));
 assert(Math.abs((await el.boundingBox()).x-(b.x+500/1600*b.width))<1.5,'左端へ吸着');await p.waitForTimeout(1100);assert.equal((await api('/api/deck?deckId='+id)).version,before.version,'ドラッグ中は保存しない');
 if(process.env.FRAME_UI_SCREENSHOT)await p.screenshot({path:process.env.FRAME_UI_SCREENSHOT});
 await p.keyboard.down('Alt');await p.mouse.move(r.x+20+96/1600*b.width,r.y+20,{steps:3});assert.equal(await canvas.locator('.drag-guide').count(),0);await p.keyboard.up('Alt');await p.mouse.move(r.x+20+98/1600*b.width,r.y+20,{steps:3});await p.mouse.up();assert.equal(await canvas.locator('.drag-guide').count(),0);
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));const saved=await api('/api/deck?deckId='+id);assert(Math.abs(saved.deck.slides[0].objects[0].x-500)<.2);assert.equal(saved.version,before.version+1);assert.deepEqual(saved.deck.slides[0].objects[1],before.deck.slides[0].objects[1]);
 await p.getByRole('button',{name:'元に戻す'}).click();await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));assert.deepEqual((await api('/api/deck?deckId='+id)).deck,before.deck);
 // 前の移動の自動保存待ち中に次のドラッグを始め、保存周期をまたいでも位置が戻らない。
 await p.keyboard.down('Alt');
 let box=await el.boundingBox();await p.mouse.move(box.x+20,box.y+20);await p.mouse.down();await p.mouse.move(box.x+45,box.y+35,{steps:5});await p.mouse.up();
 box=await el.boundingBox();await p.mouse.move(box.x+20,box.y+20);await p.mouse.down();await p.mouse.move(box.x+60,box.y+50,{steps:5});
 const during=await el.boundingBox(),version=(await api('/api/deck?deckId='+id)).version;
 await p.waitForTimeout(1400);
 assert.equal((await api('/api/deck?deckId='+id)).version,version,'連続ドラッグ中に前回の自動保存が割り込まない');
 assert(Math.abs((await el.boundingBox()).x-during.x)<1,'押したまま待っても移動位置が戻らない');
 await p.mouse.move(box.x+80,box.y+60,{steps:5});await p.mouse.up();await p.keyboard.up('Alt');
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const final=await el.boundingBox();assert(Math.abs(final.x-(box.x+60))<1,'最後の移動位置を確定');
 await p.reload();await canvas.waitFor();assert(Math.abs((await el.boundingBox()).x-final.x)<1,'連続移動の確定位置を再読込して保持');
 await p.close();console.log('PASS: direct text drag, pink alignment/distance guides, snap, Alt bypass, cleanup, one save, locked reference, Undo');
}
