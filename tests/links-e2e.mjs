import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
export async function linksTest(browser,api,origin,initial){
 const {id}=await api('/api/decks',{...initial,title:'リンク検証',slides:[{...initial.slides[0],objects:[{id:'link-box',name:'リンク対象',kind:'text',text:'詳しくはこちら',x:300,y:300,w:500,h:100}]}]});
 const p=await browser.newPage();await p.goto(origin+'/deck/'+id);
 await p.locator('.center [data-free-object="link-box"]').click();await p.getByRole('button',{name:'編集',exact:true}).click();
 const field=p.getByRole('textbox',{name:'リンク先URL',exact:true});await field.fill('javascript:alert(1)');await p.getByRole('button',{name:'リンクを適用',exact:true}).click();await p.getByRole('alert').filter({hasText:'https://'}).waitFor();
 await field.fill('example.com/reference');await p.getByRole('button',{name:'リンクを適用',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 assert.equal((await api('/api/deck?deckId='+id)).deck.slides[0].objects[0].href,'https://example.com/reference');
 await p.reload();const link=p.locator('.center [data-free-object="link-box"] a');assert.equal(await link.getAttribute('href'),'https://example.com/reference');assert.equal(await link.getAttribute('tabindex'),'-1');
 await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();const live=p.getByRole('dialog',{name:'プレゼンテーション',exact:true}).getByRole('link',{name:'詳しくはこちら',exact:true});await live.waitFor();assert.equal(await live.getAttribute('target'),'_blank');assert.equal(await live.evaluate(e=>getComputedStyle(e).pointerEvents),'auto');
 await p.context().route('https://example.com/**',r=>r.fulfill({body:'Link test'}));const popupPromise=p.waitForEvent('popup');await live.click();const popup=await popupPromise;await popup.waitForLoadState();assert.equal(popup.url(),'https://example.com/reference');await popup.close();await p.keyboard.press('Escape');
 const response=await fetch(origin+'/api/pptx?deckId='+id);assert(response.ok);const files=unzipSync(new Uint8Array(await response.arrayBuffer()));assert(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']).includes('https://example.com/reference'));
 await p.locator('.center [data-free-object="link-box"]').click();await p.getByRole('button',{name:'編集',exact:true}).click();await p.getByRole('button',{name:'リンクを解除',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));assert.equal((await api('/api/deck?deckId='+id)).deck.slides[0].objects[0].href,undefined);await p.close();
 console.log('PASS: URL validation, apply, save/reload, presentation link, native PPTX hyperlink and removal');
}
