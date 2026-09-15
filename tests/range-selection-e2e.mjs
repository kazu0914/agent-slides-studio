import assert from 'node:assert/strict';
export async function rangeSelectionTest(browser,api,origin,initial){
 const objects=[{id:'range-text',name:'範囲選択テキスト',kind:'text',text:'動かす文字',x:1050,y:770,w:180,h:70},{id:'range-shape',name:'範囲選択図形',kind:'shape',x:1300,y:770,w:160,h:70},{id:'range-locked',name:'固定図形',kind:'shape',x:800,y:770,w:160,h:70,locked:true},{id:'range-hidden',name:'非表示図形',kind:'shape',x:600,y:770,w:160,h:70,hidden:true}];
 const deck={...initial,title:'範囲選択テスト',slides:[{...initial.slides[0],title:'範囲選択の確認',body:'文字とカードと図形を動かす',eyebrow:'RANGE SELECTION',layout:'flow',theme:'white',animation:'none',artworkKind:'none',backgroundTemplate:'none',items:[1,2,3].map(i=>({title:'カード '+i,body:'本文'})),objects,placements:undefined}]};
 const {id}=await api('/api/decks',deck);const p=await browser.newPage({viewport:{width:1500,height:1000}});
 const saved=async()=>(await api('/api/deck?deckId='+id));
 await p.goto(origin+'/deck/'+id);const canvas=p.locator('.center .slide');await canvas.waitFor();
 const point=async(x,y)=>{const r=await canvas.boundingBox();return {x:r.x+x/1600*r.width,y:r.y+y/900*r.height};};
 const draw=async(a,b,shift=false)=>{const start=await point(...a),end=await point(...b);if(shift)await p.keyboard.down('Shift');await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:8});await p.mouse.up();if(shift)await p.keyboard.up('Shift');};
 const waitSaved=()=>p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const before=(await saved()).deck.slides[0];
 await draw([30,140],[1550,860]);
 assert.equal(await canvas.locator('.card-selected').count(),3);
 assert.equal(await canvas.locator('.object-selected').count(),2,'固定・非表示要素は範囲選択しない');
 assert(await canvas.locator('.canvas-base-selected').count()>=2,'既存のタイトル・本文も選択');
 assert.equal((await saved()).version,0,'範囲選択だけでは保存しない');
 const positions=()=>canvas.locator('.card-selected,.object-selected,[data-edit-element="title"],[data-edit-element="body"]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y};}));
 const positionsBefore=await positions();
 const move=canvas.locator('[data-free-object="range-shape"]');const start=await move.boundingBox();
 await p.keyboard.down('Alt');await p.mouse.move(start.x+30,start.y+30);await p.mouse.down();await p.mouse.move(start.x+50,start.y+15,{steps:7});
 await p.waitForTimeout(900);assert.equal((await saved()).version,0,'長押し中のプレビューは保存しない');
 await p.mouse.up();await p.keyboard.up('Alt');await waitSaved();const after=(await saved()).deck.slides[0];
 assert.equal((await saved()).version,1,'混在移動を一括で保存');
 const positionsAfter=await positions();assert.equal(positionsAfter.length,positionsBefore.length);for(let i=0;i<positionsBefore.length;i++){assert(Math.abs(positionsAfter[i].x-positionsBefore[i].x-20)<1.5,'全要素の横移動量が同じ');assert(Math.abs(positionsAfter[i].y-positionsBefore[i].y+15)<1.5,'全要素の縦移動量が同じ');}
 assert(after.items.every(i=>i.box.y<0));assert(after.placements.title.x>0&&after.placements.body.y<0);
 for(const key of ['range-text','range-shape']){const a=after.objects.find(o=>o.id===key),b=before.objects.find(o=>o.id===key);assert(a.x>b.x&&a.y<b.y);}
 for(const key of ['range-locked','range-hidden'])assert.deepEqual(after.objects.find(o=>o.id===key),before.objects.find(o=>o.id===key));
 await p.getByRole('button',{name:'元に戻す'}).click();await waitSaved();assert.deepEqual((await saved()).deck.slides[0],before,'一度のUndoで混在移動全体を戻す');
 await canvas.focus();await p.keyboard.press('Escape');assert.equal(await p.getByRole('group',{name:'カードの選択操作'}).count(),0);
 await draw([20,490],[1570,755]);assert.equal(await canvas.locator('.card-selected').count(),3);assert.equal(await canvas.locator('.object-selected').count(),0);
 await draw([1010,880],[1490,755],true);assert.equal(await canvas.locator('.card-selected').count(),3);assert.equal(await canvas.locator('.object-selected').count(),2,'Shift範囲選択で追加');
 const cancelStart=await move.boundingBox();await p.mouse.move(cancelStart.x+20,cancelStart.y+20);await p.mouse.down();await p.mouse.move(cancelStart.x+60,cancelStart.y+20,{steps:5});await p.keyboard.press('Escape');await p.mouse.up();assert.deepEqual((await saved()).deck.slides[0],before,'Escで移動中止');
 await draw([20,490],[1570,755]);await draw([20,850],[20,850]);assert.equal(await canvas.locator('.card-selected').count(),0,'余白クリックで解除');
 await p.getByRole('button',{name:'テキストを編集',exact:true}).click();await draw([20,490],[1570,755]);assert.equal(await canvas.locator('.card-selected').count(),0,'テキストツールでは範囲選択しない');
 await p.getByRole('textbox',{name:'スライドのタイトル（直接編集）',exact:true}).fill('文字編集も維持');await p.locator('.projectbar').click({position:{x:5,y:5}});await waitSaved();assert.equal((await saved()).deck.slides[0].title,'文字編集も維持');
 await p.getByRole('button',{name:'マーカー',exact:true}).click();await draw([100,400],[350,420]);await waitSaved();assert(await canvas.locator('.ink-layer polyline').count()>before.strokes.length,'マーカー操作を維持（セッション内の描画）');
 const inkLayer=canvas.locator('.ink-layer');const objectLayer=canvas.locator('.free-objects');
 assert(Number(await inkLayer.evaluate(e=>getComputedStyle(e).zIndex))>Number(await objectLayer.evaluate(e=>getComputedStyle(e).zIndex)),'マーカーは不透明な図形より前面');
 const markerBefore=(await saved()).deck.slides[0];const strokeCount=await inkLayer.locator('polyline').count();
 await draw([1250,810],[1500,810]);assert.equal(await inkLayer.locator('polyline').count(),strokeCount+1,'図形を横断しても一本の線として描画');
 assert.equal(await canvas.locator('[data-testid="range-selection"]').count(),0,'マーカー中は範囲選択しない');assert.deepEqual((await saved()).deck.slides[0].objects,markerBefore.objects,'マーカー中に図形を変更しない');
 if(process.env.FRAME_UI_SCREENSHOT)await p.screenshot({path:process.env.FRAME_UI_SCREENSHOT.replace('.png','-marker.png'),fullPage:true});
 await p.getByRole('button',{name:'選択ツール',exact:true}).click();await draw([20,490],[1570,755]);await canvas.focus();await p.keyboard.press('ArrowUp');await waitSaved();
 const final=(await saved()).deck;await p.reload();await canvas.waitFor();assert.deepEqual((await saved()).deck,final,'再読み込み後も保持');
 const workspace=await saved();const scaled=structuredClone(workspace.deck);scaled.slides[0].placements={...scaled.slides[0].placements,items:{x:3,y:0,scale:.75,opacity:1}};
 await api('/api/deck?deckId='+id,{deck:scaled,version:workspace.version,requestId:'range-scaled',reason:'倍率検証',actor:'手動編集'});
 await p.reload();await canvas.waitFor();await p.getByRole('slider',{name:'フレームの表示サイズ'}).fill('70');
 await draw([20,130],[1580,880]);const scaledBefore=await positions();const sr=await move.boundingBox();
 await p.keyboard.down('Alt');await p.mouse.move(sr.x+10,sr.y+10);await p.mouse.down();await p.mouse.move(sr.x+30,sr.y-5,{steps:8});await p.mouse.up();await p.keyboard.up('Alt');await waitSaved();const scaledAfter=await positions();
 assert.equal(scaledAfter.length,scaledBefore.length);for(let i=0;i<scaledBefore.length;i++){assert(Math.abs(scaledAfter[i].x-scaledBefore[i].x-20)<1.5,'縮小表示・カード倍率変更後も横移動量が同じ');assert(Math.abs(scaledAfter[i].y-scaledBefore[i].y+15)<1.5,'縮小表示・カード倍率変更後も縦移動量が同じ');}
 const freeText=canvas.locator('[data-free-object="range-text"] [data-object-text]');await freeText.dblclick();await canvas.locator('[data-free-object="range-text"] [contenteditable="plaintext-only"]').waitFor();await freeText.fill('ダブルクリック編集');await p.locator('.projectbar').click({position:{x:5,y:5}});await waitSaved();assert.equal((await saved()).deck.slides[0].objects.find(o=>o.id==='range-text').text,'ダブルクリック編集','範囲選択後も自由配置テキストを編集できる');
 if(process.env.FRAME_UI_SCREENSHOT)await p.screenshot({path:process.env.FRAME_UI_SCREENSHOT.replace('.png','-range.png'),fullPage:true});
 await p.close();console.log('PASS: range mixed cards/text/shapes, locked/hidden, preview/atomic Undo, Shift add, cancel/clear, text/marker, keyboard and reload');
}
