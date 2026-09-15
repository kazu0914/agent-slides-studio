import assert from 'node:assert/strict';
export async function alignmentTest(browser,api,origin,initial){
 const objects=[0,1,2,3].map(i=>({id:'align-'+i,name:'項目'+i,kind:'text',text:'整列 '+i,x:220+i*17,y:[180,330,530,690][i],w:950,h:[70,80,60,70][i]}));
 const deck={...initial,title:'整列テスト',slides:[{...initial.slides[0],title:'',body:'',eyebrow:'',items:[],objects:[...objects,{...objects[0],id:'locked',x:1400,w:100,locked:true}],artworkKind:'none',animation:'none'}]};
 const {id}=await api('/api/decks',deck);const p=await browser.newPage({viewport:{width:1500,height:1000}});await p.goto(origin+'/deck/'+id);
 const canvas=p.locator('.center .slide'),waitSaved=()=>p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み')),saved=()=>api('/api/deck?deckId='+id);
 await waitSaved();const b=await canvas.boundingBox();await p.mouse.move(b.x+10,b.y+20);await p.mouse.down();await p.mouse.move(b.x+b.width-10,b.y+b.height-10,{steps:8});await p.mouse.up();
 assert.equal(await canvas.locator('.object-selected').count(),4);const menu=p.getByLabel('選択した要素を整列');
 const boxes=()=>canvas.locator('.object-selected').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 const original=(await saved()).deck.slides[0];
 for(const [mode,check] of [['left',r=>r.x],['center',r=>r.x+r.w/2],['right',r=>r.x+r.w],['top',r=>r.y],['middle',r=>r.y+r.h/2],['bottom',r=>r.y+r.h]]){
  await menu.selectOption(mode);await waitSaved();const r=await boxes();assert(r.every(v=>Math.abs(check(v)-check(r[0]))<1.5),mode);
  await p.getByRole('button',{name:'元に戻す'}).click();await waitSaved();assert.deepEqual((await saved()).deck.slides[0],original,'Undo '+mode);
 }
 await menu.selectOption('left');await waitSaved();await menu.selectOption('vertical');await waitSaved();const r=(await boxes()).sort((a,b)=>a.y-b.y),g=r.slice(1).map((v,i)=>v.y-r[i].y-r[i].h);assert(Math.max(...g)-Math.min(...g)<1.5,'縦の余白を等間隔');assert(r.every(v=>Math.abs(v.x-r[0].x)<1.5));
 const final=(await saved()).deck;assert.deepEqual(final.slides[0].objects.find(o=>o.id==='locked'),original.objects.find(o=>o.id==='locked'));
 if(process.env.FRAME_UI_SCREENSHOT)await p.screenshot({path:process.env.FRAME_UI_SCREENSHOT});await p.reload();await waitSaved();assert.deepEqual((await saved()).deck,final);await p.close();console.log('PASS: six alignment directions, equal vertical gaps, locked exclusion, atomic Undo, reload');
 const mixed={...initial,title:'混在整列',slides:[{...initial.slides[0],layout:'flow',title:'混在テスト',body:'本文',eyebrow:'',artworkKind:'none',animation:'none',items:[1,2,3].map(i=>({title:'カード '+i,body:'本文'})),placements:{items:{x:3,y:0,scale:.75,opacity:1}},objects:[{...objects[0],y:780,w:180,h:65},{...objects[1],y:780,x:1000,w:140,h:65}]}]};
 const mid=(await api('/api/decks',mixed)).id;const m=await browser.newPage({viewport:{width:1500,height:1000}});await m.goto(origin+'/deck/'+mid);const c=m.locator('.center .slide');await c.waitFor();await m.getByRole('slider',{name:'フレームの表示サイズ'}).fill('70');const rect=await c.boundingBox();await m.mouse.move(rect.x+2,rect.y+2);await m.mouse.down();await m.mouse.move(rect.x+rect.width-2,rect.y+rect.height-2,{steps:8});await m.mouse.up();
 const ready=()=>m.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 await m.getByLabel('選択した要素を整列').selectOption('left');await ready();
 const xs=await c.locator('.card-selected,.object-selected,[data-edit-element="title"],[data-edit-element="body"]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().left));assert.equal(xs.length,7);assert(Math.max(...xs)-Math.min(...xs)<2,'縮小・カード倍率を含む混在整列');
 await m.getByRole('button',{name:'元に戻す'}).click();await ready();
 await m.close();console.log('PASS: mixed cards/text/objects alignment at 70% zoom and scaled card container');

 const horizontal={...deck,slides:[{...deck.slides[0],objects:[0,1,2].map(i=>({...objects[i],x:[150,550,1100][i],y:300,w:[120,200,160][i]}))}]};const hid=(await api('/api/decks',horizontal)).id;const h=await browser.newPage({viewport:{width:1500,height:1000}});await h.goto(origin+'/deck/'+hid);const hc=h.locator('.center .slide');await hc.waitFor();const hb=await hc.boundingBox();await h.mouse.move(hb.x+3,hb.y+3);await h.mouse.down();await h.mouse.move(hb.x+hb.width-3,hb.y+hb.height-3,{steps:8});await h.mouse.up();await h.getByLabel('選択した要素を整列').selectOption('horizontal');await h.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));const hs=await hc.locator('.object-selected').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {x:b.left,right:b.right};}).sort((a,b)=>a.x-b.x));assert(Math.abs((hs[1].x-hs[0].right)-(hs[2].x-hs[1].right))<1.5);await h.close();console.log('PASS: equal horizontal gaps with unequal object widths');

}
