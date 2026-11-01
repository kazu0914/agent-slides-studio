import assert from 'node:assert/strict';
export async function editorUxTest(browser,api,origin,initial){
 const context=await browser.newContext({viewport:{width:1600,height:1000}}),p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const {src}=await api('/api/assets',{data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='});
 const base={...initial.slides[0],imported:true,title:'UX regression',body:'',eyebrow:'',items:[],animation:'none',artworkKind:'none',theme:'white',backgroundTemplate:'none',objects:[]};
 const slides=Array.from({length:16},(_,i)=>({...base,id:'ux-'+i,title:'Page '+(i+1)}));
 slides[14].objects=[{id:'ux-table',name:'Editable table',kind:'table',x:100,y:140,w:800,h:250,cells:[['Header A','Header B'],['alpha','beta'],['gamma','delta']],style:{fontSize:22}},{id:'ux-image',name:'Square image',kind:'image',src,x:1000,y:300,w:400,h:200}];
 const {id}=await api('/api/decks',{title:'Editor UX regression',slides});
 const state=()=>api('/api/deck?deckId='+id),saved=()=>p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const obj=async key=>(await state()).deck.slides[14].objects.find(o=>o.id===key);
 const mod=process.platform==='darwin'?'Meta':'Control';
 try{
 await p.goto(origin+'/deck/'+id);await saved();await p.locator('.thumb-row').nth(14).click();await p.reload();await saved();assert.match(await p.locator('.thumb-row').nth(14).getAttribute('class'),/selected/);
 const cell=pos=>p.locator('.center [data-table-cell="'+pos+'"]');
 for(const pos of ['1:1','2:1']){await cell(pos).click();assert(await cell(pos).evaluate(el=>document.activeElement===el));assert.equal(await cell(pos).evaluate(el=>getComputedStyle(el).cursor),'text');await p.keyboard.press(mod+'+a');await p.keyboard.type('updated '+pos);await p.keyboard.press('Enter');await saved();assert.equal((await obj('ux-table')).cells[Number(pos[0])][Number(pos[2])],'updated '+pos);}
 await cell('1:1').click();await p.keyboard.press(mod+'+a');await p.keyboard.type('cancelled');await p.keyboard.press('Escape');assert.equal(await cell('1:1').innerText(),'updated 1:1');
 await cell('1:1').click();await p.keyboard.press(mod+'+a');await p.keyboard.type('line one');await p.keyboard.press('Shift+Enter');await p.keyboard.type('line two');await cell('2:1').click();await p.keyboard.press('Enter');await saved();assert.equal((await obj('ux-table')).cells[1][1],'line one\nline two');
 await p.reload();await saved();assert.equal(await cell('1:1').innerText(),'line one\nline two');
 const image=p.locator('.center [data-free-object="ux-image"]');await image.click();
 await p.getByRole('button',{name:'編集枠の表示切替',exact:true}).evaluate(el=>el.getAttribute('aria-pressed')).then(async v=>{if(v==='true')await p.getByRole('button',{name:'編集枠の表示切替',exact:true}).click();});
 for(const corner of ['nw','ne','sw','se']){
  await image.click();const handle=image.locator('[data-corner="'+corner+'"]');assert(await handle.isVisible());assert.equal(await handle.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(229, 57, 53)');
  const bounds=await image.boundingBox(),h=await handle.boundingBox();const before=await obj('ux-image');
  // The fixture is square, centered in a wide containing box. Handles must follow the visible square.
  const visible=Math.min(bounds.width,bounds.height);assert(Math.abs(h.x+h.width/2-(bounds.x+(bounds.width-visible)/2+(corner.includes('e')?visible:0)))<1);
  const opposite=image.locator('[data-corner="'+({nw:'se',ne:'sw',sw:'ne',se:'nw'}[corner])+'"]');const anchor=await opposite.boundingBox();
  await p.mouse.move(h.x+h.width/2,h.y+h.height/2);await p.mouse.down();await p.mouse.move(h.x+h.width/2+(corner.includes('w')?-15:15),h.y+h.height/2+(corner.includes('n')?-15:15),{steps:6});await p.mouse.up();await saved();
  const after=await obj('ux-image');assert(after.h>before.h);assert(Math.abs(after.w/after.h-1)<.001);const end=await opposite.boundingBox();assert(Math.hypot(end.x-anchor.x,end.y-anchor.y)<1);
  const expanded=await handle.boundingBox();await p.mouse.move(expanded.x+expanded.width/2,expanded.y+expanded.height/2);await p.mouse.down();await p.mouse.move(expanded.x+expanded.width/2+(corner.includes('w')?8:-8),expanded.y+expanded.height/2+(corner.includes('n')?8:-8),{steps:4});await p.mouse.up();await saved();assert((await obj('ux-image')).h<after.h);
 }
 // Slide identity survives a reorder; a deleted slide falls back to a valid neighboring index.
 const current=await state();const reordered=structuredClone(current.deck);reordered.slides.unshift(reordered.slides.splice(14,1)[0]);await api('/api/deck?deckId='+id,{deck:reordered,version:current.version,requestId:'ux-reorder',reason:'test reorder',actor:'手動編集'});await p.reload();await saved();assert.match(await p.locator('.thumb-row').nth(0).getAttribute('class'),/selected/);
 const other=await api('/api/decks',{title:'Independent page position',slides:slides.slice(0,3)});await p.goto(origin+'/deck/'+other.id);await saved();assert.match(await p.locator('.thumb-row').nth(0).getAttribute('class'),/selected/);await p.locator('.thumb-row').nth(2).click();await p.goto(origin+'/deck/'+id);await saved();assert.match(await p.locator('.thumb-row').nth(0).getAttribute('class'),/selected/);
 const latest=await state();latest.deck.slides.shift();await api('/api/deck?deckId='+id,{deck:latest.deck,version:latest.version,requestId:'ux-delete',reason:'test delete',actor:'手動編集'});await p.reload();await saved();assert.match(await p.locator('.thumb-row').nth(0).getAttribute('class'),/selected/);
 await p.evaluate(key=>localStorage.setItem(key,'{bad json'),`frame-page:${id}`);await p.reload();await saved();assert.match(await p.locator('.thumb-row').nth(0).getAttribute('class'),/selected/);
 assert.deepEqual(errors,[]);console.log('PASS: real cell clicks/typing/multiline/cancel/save/reload, four image corners/ratio/anchor, hidden guides, per-deck page identity after reload/reorder');
 }finally{await context.close();}
}
