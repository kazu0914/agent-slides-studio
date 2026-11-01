import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';

export async function textLayoutTest(browser,api,origin,initial){
 const native={wrap:true,autoFit:'none',overflowX:'visible',overflowY:'visible'};
 const arrow={id:'legacy-arrow',name:'青い矢印',kind:'text',text:'→',x:400,y:250,w:29.8333,h:54.5,style:{fontFamily:'Noto Sans JP',fontSize:26.25,bold:true,color:'#087FBE',lineHeight:1.2}};
 const objects=[arrow,{...arrow,id:'new-arrow',x:550,textLayout:native},
  {...arrow,id:'clipped-text',x:750,text:'長い文字が入りません',textLayout:{...native,overflowX:'clip',overflowY:'clip'}},
  {...arrow,id:'shrink-text',x:300,y:450,w:130,h:35,text:'ABCD EFGH IJKL',style:{fontFamily:'Arial',fontSize:36,color:'#087FBE'},textLayout:{...native,wrap:false,autoFit:'shrink',overflowX:'clip',overflowY:'clip'}}];
 const {id}=await api('/api/decks',{title:'PPTX文字互換テスト',slides:[{...initial.slides[0],imported:true,title:'',body:'',eyebrow:'',animation:'none',artworkKind:'none',backgroundTemplate:'none',objects,items:[]}]});
 const p=await browser.newPage({viewport:{width:1500,height:1000}});
 try{
  await p.goto(origin+'/deck/'+id);await p.locator('.center [data-free-object="legacy-arrow"]').waitFor();await p.evaluate(()=>document.fonts.ready);
  for(const name of ['legacy-arrow','new-arrow']){
   const arrow=p.locator(`.center [data-free-object="${name}"]`);
   assert.equal(await arrow.locator('[data-object-text]').innerText(),'→');
   assert.equal(await arrow.locator('.overflow-badge').count(),0);
   assert.deepEqual(await arrow.locator('.free-object-body').evaluate(el=>({x:getComputedStyle(el).overflowX,y:getComputedStyle(el).overflowY,color:getComputedStyle(el).color})),{x:'visible',y:'visible',color:'rgb(8, 127, 190)'});
  }
  const clipped=p.locator('.center [data-free-object="clipped-text"]'),badge=clipped.getByRole('img',{name:'文字が枠を超えています'});
  await badge.waitFor();assert.equal(await badge.innerText(),'!');
  assert.equal(await clipped.locator('.free-object-body .overflow-badge').count(),0,'警告は文字クリップの外');
  const box=await clipped.boundingBox(),mark=await badge.boundingBox();assert(mark.y<box.y,'警告は文字枠の外に置く');
  const size=()=>p.locator('.center [data-free-object="shrink-text"]').evaluate(el=>{
   const outer=el.querySelector('.free-object-body'),text=el.querySelector('[data-object-text]');
   return {font:parseFloat(getComputedStyle(text).fontSize),base:parseFloat(getComputedStyle(outer).fontSize),overflow:text.scrollWidth>outer.clientWidth+1||text.getBoundingClientRect().height>outer.getBoundingClientRect().height+1};
  });
  const small=await size();assert(small.font<small.base);assert.equal(small.overflow,false);
  await p.reload();await p.locator('.center [data-free-object="shrink-text"]').waitFor();assert.equal((await size()).overflow,false);
  assert.equal((await api('/api/deck?deckId='+id)).version,0,'表示時に保存済みデータを変更しない');
  await p.getByRole('button',{name:'プレゼンテーション',exact:true}).click();await p.getByRole('dialog',{name:'プレゼンテーション',exact:true}).waitFor();
  assert.equal(await p.getByRole('dialog',{name:'プレゼンテーション',exact:true}).locator('.overflow-badge').count(),0);
  await p.keyboard.press('Escape');
  const response=await fetch(origin+'/api/pptx?deckId='+id);assert(response.ok,await response.clone().text());
  const xml=strFromU8(unzipSync(new Uint8Array(await response.arrayBuffer()))['ppt/slides/slide1.xml']);
  assert(xml.includes('horzOverflow="overflow"'));assert(xml.includes('horzOverflow="clip"'));assert(xml.includes('wrap="none"'));
  assert(!xml.includes('文字が枠を超えています'));assert(!xml.includes('agent-slides-text-'));
  console.log('PASS: legacy/imported arrows, overflow badge, shrink, reload, presentation and PPTX settings');
 }finally{await p.close();}
}
