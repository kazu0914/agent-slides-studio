import assert from 'node:assert/strict';
import {zipSync,strToU8,unzipSync,strFromU8} from 'fflate';
import PptxGenJS from 'pptxgenjs';
import {importPptx} from '../local/pptx-import';
import {preserveTextOverflow} from '../local/pptx-text.mjs';
import {textLayout} from '../lib/text-layout';
import {objectSchema} from '../lib/objects';

const fixture=(body:string)=>zipSync({
 'ppt/presentation.xml':strToU8('<p:presentation xmlns:p="p" xmlns:r="r"><p:sldSz cx="18288000" cy="10287000"/><p:sldIdLst><p:sldId r:id="s1"/></p:sldIdLst></p:presentation>'),
 'ppt/_rels/presentation.xml.rels':strToU8('<Relationships><Relationship Id="s1" Target="slides/slide1.xml"/></Relationships>'),
 'ppt/slides/slide1.xml':strToU8(`<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="4743450" y="3352800"/><a:ext cx="523875" cy="714375"/></a:xfrm><a:noFill/></p:spPr><p:txBody>${body}<a:p><a:r><a:rPr sz="3150" b="1"><a:solidFill><a:srgbClr val="087FBE"/></a:solidFill><a:latin typeface="Noto Sans JP"/></a:rPr><a:t>→</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`),
});
const read=(body:string)=>importPptx(fixture(body),'arrows.pptx',()=> '').deck.slides[0].objects![0];
const arrow=read('<a:bodyPr><a:noAutofit/></a:bodyPr>');
assert.equal(arrow.text,'→');assert.equal(arrow.style.color,'#087FBE');
assert.equal(arrow.style.fontSize,26.25);
assert(Math.abs(arrow.w-29.8333333333)<.001, '元の余白と文字枠のサイズを保つ');
assert.deepEqual(arrow.textLayout,{wrap:true,autoFit:'none',overflowX:'visible',overflowY:'visible'});
assert.deepEqual(textLayout({...arrow,textLayout:undefined},true),arrow.textLayout,'旧版のインポートにもPowerPointの既定値を適用');
assert.equal(textLayout({...arrow,textLayout:undefined},false).overflowX,'clip','通常の手動文字枠は従来のクリップ動作');
const clipped=read('<a:bodyPr wrap="none" horzOverflow="clip" vertOverflow="clip"><a:noAutofit/></a:bodyPr>');
assert.deepEqual(clipped.textLayout,{wrap:false,autoFit:'none',overflowX:'clip',overflowY:'clip'});
for(const attributes of ['fontScale="80000" lnSpcReduction="20000"','fontScale="80%" lnSpcReduction="20%"']){
 const shrink=read(`<a:bodyPr><a:normAutofit ${attributes}/></a:bodyPr>`);
 assert.equal(shrink.style.fontSize,21);assert.equal(shrink.style.lineHeight,.96);assert.equal(shrink.textLayout?.autoFit,'shrink');
}
assert.equal(read('<a:bodyPr><a:spAutoFit/></a:bodyPr>').textLayout?.autoFit,'resize');
assert.deepEqual(objectSchema.parse(JSON.parse(JSON.stringify(arrow))).textLayout,arrow.textLayout);

const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
const slide=pptx.addSlide(),marker='agent-slides-text-arrow';
slide.addText('→',{x:1,y:1,w:.3,h:.6,fontSize:26.25,color:'087FBE',margin:0,wrap:false,fit:'none',objectName:marker});
const layout={...clipped.textLayout!,overflowY:'visible' as const};
const bytes=preserveTextOverflow(await pptx.write({outputType:'nodebuffer'}),[[{marker,name:'青い矢印',layout}]]);
const xml=strFromU8(unzipSync(bytes)['ppt/slides/slide1.xml']);
assert(xml.includes('name="青い矢印"'));assert(!xml.includes(marker));
const restored=importPptx(bytes,'roundtrip.pptx',()=> '').deck.slides[0].objects!.find(o=>o.kind==='text')!;
assert.deepEqual(restored.textLayout,layout);assert.equal(restored.text,'→');assert.equal(restored.style.color,'#087FBE');
console.log('PPTX text overflow, wrapping, autofit, legacy defaults and roundtrip PASS');
