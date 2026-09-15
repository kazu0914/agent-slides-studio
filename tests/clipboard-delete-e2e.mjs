import assert from 'node:assert/strict';
export async function clipboardDeleteTest(browser,api,origin,initial){
 const deck={...initial,title:'コピーと削除',slides:[0,1].map(i=>({...initial.slides[0],id:'clip-slide-'+i,title:'ページ '+i,animation:'none',artworkKind:'none',objects:[{id:'clip-text-'+i,name:'検証テキスト',kind:'text',text:'コピー対象',x:600,y:450,w:400,h:100},{id:'locked-'+i,name:'固定テキスト',kind:'text',text:'保持する',x:600,y:650,w:400,h:100,locked:true}],strokes:[]}))};
 const {id}=await api('/api/decks',deck),url=origin+'/deck/'+id;
 const context=await browser.newContext({viewport:{width:1500,height:1000},permissions:['clipboard-read','clipboard-write']});const p=await context.newPage();
 const saved=()=>api('/api/deck?deckId='+id);const waitSaved=()=>p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const mod=process.platform==='darwin'?'Meta':'Control';
 await p.goto(url);await waitSaved();await p.locator('.thumb-row').first().click();await p.keyboard.press(mod+'+c');
 const copied=await p.evaluate(()=>navigator.clipboard.readText());assert.equal(JSON.parse(copied).agentSlidesSlide.title,'ページ 0');
 await p.locator('.thumb-row').nth(1).click();await p.keyboard.press(mod+'+v');await p.waitForFunction(()=>document.querySelectorAll('.thumb-row').length===3);await waitSaved();
 let state=(await saved()).deck;assert.equal(state.slides[2].title,'ページ 0');assert.notEqual(state.slides[2].id,state.slides[0].id);assert.notEqual(state.slides[2].objects[0].id,state.slides[0].objects[0].id);assert.equal(state.slides[2].objects[1].locked,true);
 await p.getByRole('button',{name:'元に戻す'}).click();await waitSaved();assert.equal((await saved()).deck.slides.length,2);
 await p.getByRole('button',{name:'グリッドビュー',exact:true}).click();const grid=p.getByRole('dialog',{name:'スライド一覧',exact:true});await grid.locator('.slide-grid-card').first().click();await p.keyboard.press(mod+'+c');await p.keyboard.press(mod+'+v');await p.waitForFunction(()=>document.querySelectorAll('.slide-grid-card').length===3);await waitSaved();assert.equal((await saved()).deck.slides[1].title,'ページ 0');await grid.getByRole('button',{name:'グリッドビューを閉じる',exact:true}).click();
 await p.locator('.thumb-row').first().click();const canvas=p.locator('.center .slide');const text=canvas.locator('[data-free-object="clip-text-0"]');await text.click();await p.keyboard.press('Backspace');await waitSaved();assert(!(await saved()).deck.slides[0].objects.some(o=>o.id==='clip-text-0'),'選択ボックスを削除');
 await p.getByRole('button',{name:'元に戻す'}).click();await waitSaved();assert((await saved()).deck.slides[0].objects.some(o=>o.id==='clip-text-0'),'Undoで復元');
 await text.locator('[data-object-text]').dblclick();await text.locator('[contenteditable="plaintext-only"]').waitFor();await p.keyboard.press('End');await p.keyboard.press('Backspace');await p.locator('.projectbar').click({position:{x:5,y:5}});await waitSaved();assert((await saved()).deck.slides[0].objects.some(o=>o.id==='clip-text-0'),'文字編集中はボックスを消さない');
 await canvas.locator('[data-free-object="locked-0"]').click();await p.keyboard.press('Delete');assert((await saved()).deck.slides[0].objects.some(o=>o.id==='locked-0'),'固定要素は削除しない');
 await p.getByRole('button',{name:'選択ツール',exact:true}).click();const cb=await canvas.boundingBox(),tb=await canvas.locator('[data-edit-element="title"]').boundingBox();await p.mouse.move(cb.x+4,tb.y-4);await p.mouse.down();await p.mouse.move(tb.x+tb.width+3,tb.y+tb.height+3,{steps:8});await p.mouse.up();await p.keyboard.press('Delete');await waitSaved();assert.equal((await saved()).deck.slides[0].title,'','範囲選択した既存のタイトルボックスも削除');
 await p.reload();await waitSaved();assert.equal((await saved()).deck.slides[0].title,'');
 await context.close();console.log('PASS: native Cmd/Ctrl slide copy-paste, insertion order, unique IDs, grid, Undo, box Delete, editing and locked protection, reload');
}
