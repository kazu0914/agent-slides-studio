import assert from 'node:assert/strict';
export async function backgroundTest(browser,api,origin,initial){
 const {src}=await api('/api/assets',{data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='});
 const {id}=await api('/api/decks',{...initial,title:'背景の回帰テスト',slides:[{...initial.slides[0],imported:true,title:'',body:'',eyebrow:'',items:[],artworkKind:'none',animation:'none',theme:'white',backgroundColor:'#FFFFFF',backgroundTemplate:'none',objects:[{id:'background',kind:'image',name:'元の背景',src,x:0,y:0,w:1600,h:900},{id:'text',kind:'text',name:'本文',text:'保持する本文',x:100,y:100,w:500,h:100},{id:'photo',kind:'image',name:'写真',src,x:700,y:400,w:100,h:100}]}]});
 const p=await browser.newPage({viewport:{width:1500,height:1000}});await p.goto(origin+'/deck/'+id);await p.getByRole('button',{name:'編集',exact:true}).click();const canvas=p.locator('.center .slide');
 const state=async()=>(await api('/api/deck?deckId='+id)).deck.slides[0];
 const saved=()=>p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 await p.getByRole('button',{name:'背景テンプレート',exact:false}).first().click();await saved();
 let s=await state();assert(s.objects[0].hidden);assert(!s.objects[2].hidden);assert.equal(s.objects[1].text,'保持する本文');assert(s.backgroundOriginal);assert((await canvas.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('/backgrounds/'));assert.equal(await canvas.locator('[data-free-object="background"]').count(),0);
 await p.reload();await canvas.waitFor();assert.equal(await canvas.locator('[data-free-object="background"]').count(),0);await p.getByRole('button',{name:'編集',exact:true}).click();
 await p.getByLabel('背景色',{exact:true}).selectOption('dark');await saved();s=await state();assert.equal(s.theme,'dark');assert.equal(s.backgroundTemplate,'none');assert.equal(s.backgroundColor,undefined);assert.equal(await canvas.evaluate(e=>getComputedStyle(e).backgroundImage),'none');assert.notEqual(await canvas.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 await p.getByRole('button',{name:'元の背景に戻す',exact:true}).click();await saved();s=await state();assert.equal(s.objects[0].hidden,false);assert.equal(s.objects[0].src,src);assert.equal(s.backgroundColor,'#FFFFFF');assert.equal(s.backgroundOriginal,undefined);assert.equal(s.objects.length,3);
 await p.reload();await canvas.waitFor();assert.equal(await canvas.locator('[data-free-object="background"]').count(),1);
 await p.close();console.log('PASS: imported background override, foreground preservation, theme priority, save, reload and original background restoration');
}
