import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
export async function sideImageTest(browser,api,origin,initial){
 const {id}=await api('/api/decks',{...initial,title:'右画像パターン検証',slides:[{...initial.slides[0],title:'画像と伝えるメッセージ',body:'本文を編集できます',objects:[]}]});
 const p=await browser.newPage({viewport:{width:1500,height:1000}});await p.goto(origin+'/deck/'+id);await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'パターン：右画像・70/30',exact:true}).click();
 await p.getByLabel('右側の画像を選ぶ').setInputFiles('public/backgrounds/public-midnight.png');await p.locator('.center .side-image-panel img').waitFor();
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 let saved=(await api('/api/deck?deckId='+id)).deck.slides[0];assert(saved.sideImage?.src);assert.equal(saved.layout,'image-right');assert.equal(saved.theme,'white');
 await p.reload();const canvas=p.locator('.center .slide');const box=await canvas.boundingBox(),image=await canvas.locator('.side-image-panel').boundingBox();assert(Math.abs(image.width/box.width-.3)<.001);assert(Math.abs(image.height/box.height-1)<.001);
 const backup=await api('/api/backup?deckId='+id);assert(backup.assets[saved.sideImage.src]);
 for(const kind of ['pdf','pptx']){const response=await fetch(origin+'/api/'+kind+'?deckId='+id);assert(response.ok);const bytes=new Uint8Array(await response.arrayBuffer());assert(bytes.length>1000);if(kind==='pptx'){const files=unzipSync(bytes);assert(strFromU8(files['ppt/slides/slide1.xml']).includes('画像と伝えるメッセージ'));assert(Object.keys(files).some(k=>k.startsWith('ppt/media/')));}}
 await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'画像を外す',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));assert.equal((await api('/api/deck?deckId='+id)).deck.slides[0].sideImage,null);await p.close();console.log('PASS: side image pattern, upload, save/reload, 70/30 geometry, backup, PDF/PPTX and removal');
}
