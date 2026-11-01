import assert from 'node:assert/strict';
export async function tableLayoutTest(browser,api,origin,initial){
 const cells=[['項目','内容'],['対象','1行目\n2行目'],['方法','本文の説明です。\n次の行も保持します。\n3行目の説明です。'],['結果','編集して保存できます。'],['補足','幅の広い本文列です。\n読みやすさを保ちます。'],['限界','最後の行です。\n省略せずに表示します。']];
 const table={id:'format-table',name:'書式付きの表',kind:'table',x:90,y:190,w:1420,h:500,cells,style:{fontSize:18,fontFamily:'Noto Sans JP'},tableFormat:{columnWidths:[250,1170],rowHeights:[42,70,105,70,105,108],fit:'none',cells:cells.map((r,i)=>r.map(()=>({style:{fontSize:18,fontFamily:'Noto Sans JP',bold:i===0,color:i===0?'#FFFFFF':'#263747',lineHeight:1.2},fill:i===0?'#006F91':'#FFFFFF',margin:[5,18,5,18],verticalAlign:'center',borders:Array.from({length:4},()=>({color:'#94a3b8',width:0}))})))}};
 const other={...structuredClone(table),id:'second-table',name:'別の表',x:1200,y:730,w:300,h:100,cells:[['別の表']],tableFormat:undefined};
 const {id}=await api('/api/decks',{...initial,title:'表の互換性検証',slides:[{...initial.slides[0],id:'table-slide',imported:true,animation:'none',artworkKind:'none',backgroundTemplate:'none',objects:[table,other]}]});
 const p=await browser.newPage({viewport:{width:1800,height:1100}}),saved=async()=>api('/api/deck?deckId='+id);
 try{
 await p.goto(origin+'/deck/'+id);await p.getByRole('button',{name:'編集',exact:true}).click();
 const box=p.locator('.center [data-free-object="format-table"]'),body=box.locator('.free-object-body');await box.waitFor();await p.evaluate(()=>document.fonts.ready);
 let metrics=await box.evaluate(el=>{const body=el.querySelector('.free-object-body'),cells=el.querySelectorAll('tr:first-child td');return {h:body.clientHeight,scroll:body.scrollHeight,ratio:cells[0].getBoundingClientRect().width/cells[1].getBoundingClientRect().width,white:getComputedStyle(cells[0]).color,first:getComputedStyle(cells[0]).whiteSpace};});
 assert(metrics.scroll<=metrics.h+2);assert(Math.abs(metrics.ratio-250/1170)<.005);assert.equal(metrics.white,'rgb(255, 255, 255)');assert.equal(metrics.first,'pre-wrap');assert.equal(await box.locator('.overflow-badge').count(),0);
 await box.click({position:{x:10,y:10}});
 const input=p.getByRole('textbox',{name:'セル 2-2',exact:true});await input.waitFor();assert.equal(await input.evaluate(e=>e.tagName),'TEXTAREA');assert.equal(await input.inputValue(),'1行目\n2行目');
 await input.fill('1行目を更新\n2行目は保持');await p.locator('.projectbar').click({position:{x:5,y:5}});
 await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 assert.equal((await saved()).deck.slides[0].objects[0].cells[1][1],'1行目を更新\n2行目は保持');
 await p.getByText('表の列幅と表示',{exact:true}).click();await p.getByRole('spinbutton',{name:'列 1 の幅 (%)',exact:true}).fill('22');await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 assert(Math.abs((await saved()).deck.slides[0].objects[0].tableFormat.columnWidths[0]-22)<.001);
 await p.getByRole('button',{name:'行＋',exact:true}).click();await p.getByRole('button',{name:'列＋',exact:true}).click();await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 let o=(await saved()).deck.slides[0].objects[0];assert.equal(o.cells.length,7);assert.equal(o.tableFormat.rowHeights.length,7);assert.equal(o.tableFormat.columnWidths.length,3);assert.equal(o.tableFormat.cells[0][0].fill,'#006F91');
 await p.getByRole('button',{name:'行−',exact:true}).click();await p.getByRole('button',{name:'列−',exact:true}).click();await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const font=p.getByRole('spinbutton',{name:'文字サイズ (pt)',exact:true});await font.fill('20');await font.press('Enter');await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 o=(await saved()).deck.slides[0].objects[0];assert(o.tableFormat.cells.every(r=>r.every(c=>c.style.fontSize===20)));assert.equal(o.tableFormat.cells[0][0].style.bold,true);
 await p.getByRole('spinbutton',{name:'要素の高さ',exact:true}).fill('200');await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));assert.equal(await box.locator('.overflow-badge').count(),1);
 await p.getByRole('checkbox',{name:'表の文字を枠内に縮小',exact:true}).check();await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));await p.waitForFunction(()=>!document.querySelector('.center [data-free-object="format-table"] [data-text-overflow]'));
 assert(Number(await body.evaluate(el=>getComputedStyle(el).getPropertyValue('--table-text-scale')))<1);
 await p.reload();await box.waitFor();await p.waitForFunction(()=>!document.querySelector('.center [data-free-object="format-table"] [data-text-overflow]'));
 assert.equal((await saved()).deck.slides[0].objects[0].cells[1][1],'1行目を更新\n2行目は保持');assert.deepEqual((await saved()).deck.slides[0].objects[1].cells,[['別の表']]);
 const response=await fetch(origin+'/api/pptx?deckId='+id);assert(response.ok,await response.clone().text());const bytes=Buffer.from(await response.arrayBuffer());
 const imported=await api('/api/pptx/import',{name:'roundtrip.pptx',data:bytes.toString('base64')});const restored=(await api('/api/deck?deckId='+imported.id)).deck.slides[0].objects.find(o=>o.kind==='table');
 assert.equal(restored.cells[1][1],'1行目を更新\n2行目は保持');assert(Math.abs(restored.tableFormat.columnWidths[0]/restored.tableFormat.columnWidths.reduce((a,b)=>a+b,0)-.22)<.001);assert.equal(restored.tableFormat.cells[0][0].fill,'#006F91');assert(restored.tableFormat.cells[1][1].style.fontSize<20);
 const merged={...structuredClone(table),cells:[['結合見出し',''],['元A','元B']],tableFormat:{...structuredClone(table.tableFormat),rowHeights:[1,1],cells:table.tableFormat.cells.slice(0,2).map(r=>r.map(c=>structuredClone(c)))}};
 merged.tableFormat.cells[0][0].colSpan=2;
 const pasteId=(await api('/api/decks',{...initial,title:'結合セルへの貼り付け',slides:[{...initial.slides[0],id:'merged-slide',imported:true,animation:'none',artworkKind:'none',objects:[merged]}]})).id;
 await p.goto(origin+'/deck/'+pasteId);await p.getByRole('button',{name:'編集',exact:true}).click();await box.click({position:{x:10,y:10}});
 await p.getByRole('textbox',{name:'CSV・表データ',exact:true}).fill('新見出し,隠してはいけない値\n本文A,本文B');await p.getByRole('button',{name:'表データを適用',exact:true}).click();await p.locator('.projectbar').click({position:{x:5,y:5}});await p.waitForFunction(()=>document.querySelector('.projectbar')?.textContent?.includes('保存済み'));
 const pasted=(await api('/api/deck?deckId='+pasteId)).deck.slides[0].objects[0];assert.equal(pasted.tableFormat.cells[0][0].colSpan,1);assert.equal(await box.locator('tr').first().locator('td').count(),2);assert.equal(await box.locator('tr').first().locator('td').nth(1).innerText(),'隠してはいけない値');
 console.log('PASS: table column widths, colors, newlines, editing, row/column changes, shrink, save/reload, merged-cell paste and native PPTX roundtrip');
 }finally{await p.close();}
}
