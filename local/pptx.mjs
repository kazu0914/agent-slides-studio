import {chartOptions} from './chart-options.mjs';
import {browserOptions} from './browser.mjs';
import PptxGenJS from 'pptxgenjs';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
const colors=['2454EF','13A89E','EF8244','B26DE3','E0507A','71819A'];
const inch=px=>px/96,hex=value=>value.replace('#','');
export async function renderPptx(origin,id,version){
 const browser=await chromium.launch({headless:true,...browserOptions()});
 try{const page=await browser.newPage({viewport:{width:1600,height:900}});await page.goto(`${origin}/export/${encodeURIComponent(id)}`,{waitUntil:'networkidle'});await page.locator('.pdf-render[data-ready=true]').waitFor();await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));});
 const snapshot=await (await page.request.get(`${origin}/api/deck?deckId=${encodeURIComponent(id)}`)).json();if(snapshot.version!==version)throw Error('出力中にデッキが更新されました。再試行してください');
 const pptx=new PptxGenJS();pptx.defineLayout({name:'STUDIO',width:inch(1600),height:inch(900)});pptx.layout='STUDIO';pptx.author='Agent Slides Studio';pptx.subject='Editable slide export';pptx.title=snapshot.deck.title;pptx.lang='ja-JP';pptx.theme={headFontFace:'Hiragino Sans',bodyFontFace:'Hiragino Sans',lang:'ja-JP'};
 for(let i=0;i<snapshot.deck.slides.length;i++){
  const source=snapshot.deck.slides[i],slide=pptx.addSlide();slide.addNotes(source.notes||'');
  const target=page.locator('.export-slide').nth(i);await target.scrollIntoViewIfNeeded();
  const geometry=await target.evaluate(root=>{const base=root.getBoundingClientRect();const color=s=>{const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.clearRect(0,0,1,1);ctx.fillStyle=s;ctx.fillRect(0,0,1,1);const d=ctx.getImageData(0,0,1,1).data;return d[3]===0?'FFFFFF':Array.from(d).slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('');};const measure=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x-base.x,y:r.y-base.y,w:r.width,h:r.height,fontSize:parseFloat(s.fontSize),font:s.fontFamily.split(',')[0].replace(/["']/g,''),color:color(s.color),bold:parseInt(s.fontWeight)>=600,italic:s.fontStyle==='italic',underline:s.textDecorationLine.includes('underline'),align:s.textAlign,opacity:parseFloat(s.opacity),text:el.textContent||'',background:s.backgroundColor,borderColor:color(s.borderTopColor),borderWidth:parseFloat(s.borderTopWidth)};};return {texts:Array.from(root.querySelectorAll('.slide-eyebrow,.hero-copy h2,.hero-copy>p,.slide-item>span,.slide-item h3,.slide-item p,.slide-footer>span')).map(measure).filter(x=>x.text&&x.w>0&&x.h>0),cards:Array.from(root.querySelectorAll('.slide-item')).map(measure),background:color(getComputedStyle(root.querySelector('.slide')).backgroundColor)};});
  slide.background={color:geometry.background};
  if(source.backgroundTemplate&&source.backgroundTemplate!=='none'){
   // 背景もブラウザでPNGへ再描画し、出力ライブラリに元ファイルを渡さない。
   const data=await page.evaluate(async id=>{const img=new Image();img.src='/backgrounds/'+id+'.png';try{await img.decode();}catch{return null;}const c=document.createElement('canvas');c.width=1600;c.height=900;c.getContext('2d').drawImage(img,0,0,1600,900);return c.toDataURL('image/png');},source.backgroundTemplate);
   if(data)slide.addImage({data,x:0,y:0,w:inch(1600),h:inch(900)});
  }
  for(const card of geometry.cards){if(card.borderWidth){if(['comparison','flow'].includes(source.layout))slide.addShape(pptx.ShapeType.rect,{x:inch(card.x),y:inch(card.y),w:inch(card.w),h:inch(card.h),line:{color:card.borderColor,width:.75},fill:{color:'FFFFFF',transparency:100}});else slide.addShape(pptx.ShapeType.line,{x:inch(card.x),y:inch(card.y),w:inch(card.w),h:0,line:{color:card.borderColor,width:.75}});}}
  if(source.layout==='timeline')slide.addShape(pptx.ShapeType.line,{x:inch(112),y:inch(459),w:inch(1376),h:0,line:{color:'64748B',width:1}});
  for(const t of geometry.texts){slide.addText(t.text,{x:inch(t.x),y:inch(t.y),w:inch(t.w),h:inch(t.h+4),fontFace:t.font,fontSize:t.fontSize*.75,color:t.color,bold:t.bold,italic:t.italic,underline:t.underline,align:['left','center','right','justify'].includes(t.align)?t.align:'left',margin:0,breakLine:false,valign:'top',paraSpaceAfter:0,transparency:(1-t.opacity)*100,objectName:'Template text'});}
  // Only ornaments are rasterized. Text, shapes, tables and charts remain native.
  async function ornament(selector){const el=target.locator(selector).first();if(!await el.count())return;await el.evaluate(e=>e.setAttribute('data-pptx-ornament','true'));const style=await page.addStyleTag({content:'html,body,#root,#app,.pdf-render,.export-slide,.slide{background:transparent!important}.slide *{visibility:hidden!important}[data-pptx-ornament],[data-pptx-ornament] *{visibility:visible!important}'});const png=await target.screenshot({type:'png',omitBackground:true,animations:'disabled'});await style.evaluate(e=>e.remove());await el.evaluate(e=>e.removeAttribute('data-pptx-ornament'));slide.addImage({data:'image/png;base64,'+png.toString('base64'),x:0,y:0,w:inch(1600),h:inch(900),altText:'静止したアニメーション'});}
  await ornament('.artwork-position');await ornament('.statement-arrow');
  for(const o of source.objects||[]){if(o.hidden)continue;const pos={x:inch(o.x),y:inch(o.y),w:inch(o.w),h:inch(o.h),rotate:o.rotation,transparency:(1-o.opacity)*100,objectName:o.name};const style={fontFace:o.style.fontFamily||'Hiragino Sans',fontSize:o.style.fontSize||16,color:hex(o.style.color||'#17233b'),bold:o.style.bold,italic:o.style.italic,underline:o.style.underline,align:o.style.align||'left',margin:0};
   if(o.kind==='text')slide.addText(o.text,{...pos,...style,...(o.href?{hyperlink:{url:o.href}}:{}),valign:o.verticalAlign==='center'?'mid':o.verticalAlign==='bottom'?'bottom':'top',paraSpaceAfter:0});
   if(o.kind==='shape')slide.addShape({rectangle:pptx.ShapeType.rect,ellipse:pptx.ShapeType.ellipse,arrow:pptx.ShapeType.rightArrow,line:pptx.ShapeType.line}[o.shape],{...pos,fill:{color:hex(o.fill),transparency:(1-o.opacity*(o.fillOpacity??1))*100},line:{color:hex(o.stroke),width:o.strokeWidth===undefined?1:o.strokeWidth*.75,transparency:o.strokeWidth===0?100:0}});
   if(o.kind==='image'){const data=await target.locator(`[data-free-object="${o.id}"] img`).evaluate((img,o)=>{const canvas=document.createElement('canvas');canvas.width=Math.round(o.w);canvas.height=Math.round(o.h);const ctx=canvas.getContext('2d');const scale=o.fit==='cover'?Math.max(o.w/img.naturalWidth,o.h/img.naturalHeight):Math.min(o.w/img.naturalWidth,o.h/img.naturalHeight);const w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(o.w-w)*o.cropX/100,(o.h-h)*o.cropY/100,w,h);return canvas.toDataURL('image/png');},o);slide.addImage({...pos,data,altText:o.name});}
   if(o.kind==='table')slide.addTable(o.cells.map((r,i)=>r.map(text=>({text,options:i===0?{fill:hex(o.fill),bold:true}:{}}))),{...pos,...style,rowH:inch(o.h)/o.cells.length,colW:Array(o.cells[0].length).fill(inch(o.w)/o.cells[0].length),border:{type:'solid',color:'94A3B8',pt:.75},autoPage:false,margin:5});
   if(o.kind==='chart'){const series=o.cells[0].slice(1).map((name,j)=>({name,labels:o.cells.slice(1).map(r=>r[0]),values:o.cells.slice(1).map(r=>Number(r[j+1]))}));slide.addChart(o.chartType,o.chartType==='pie'?series.slice(0,1):series,{...pos,showLegend:true,showTitle:false,showValue:false,catAxisLabelFontFace:style.fontFace,valAxisLabelFontFace:style.fontFace,legendFontFace:style.fontFace,legendFontSize:12,chartColors:colors,showCatName:o.chartType==='pie',catAxisLabelColor:style.color,valAxisLabelColor:style.color,legendColor:style.color,showBorder:false,barDir:'col',...chartOptions(o.chartFormat)});}
   if(o.kind==='motion')await ornament(`[data-free-object="${o.id}"]`);
  }
 }
 return Buffer.from(await pptx.write({outputType:'nodebuffer'}));
 }finally{await browser.close();}
}
