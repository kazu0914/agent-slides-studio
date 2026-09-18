import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {importPptx} from '../local/pptx-import';
const presentation='<p:presentation xmlns:p="p" xmlns:r="r"><p:sldSz cx="16000000" cy="9000000"/><p:sldIdLst><p:sldId r:id="second"/><p:sldId r:id="first"/></p:sldIdLst></p:presentation>';
const slide=(word:string)=>`<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="1000000" y="1000000"/><a:ext cx="8000000" cy="1000000"/></a:xfrm><a:noFill/></p:spPr><p:txBody><a:bodyPr lIns="0" rIns="0" tIns="0" bIns="0"/><a:p><a:r><a:rPr sz="2400"/><a:t>${word}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
const source={'ppt/presentation.xml':presentation,'ppt/_rels/presentation.xml.rels':'<Relationships><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="second" Target="/ppt/slides/slide2.xml"/></Relationships>','ppt/slides/slide1.xml':slide('First'),'ppt/slides/slide2.xml':slide('Second &amp; editable')};
const pack=(files:Record<string,string>)=>zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)])));
const result=importPptx(pack(source),'Example.pptx',()=>{throw Error('画像はありません');});
assert.equal(result.deck.slides.length,2);assert.equal(result.deck.slides[0].objects?.[0].text,'Second & editable');assert.equal(result.deck.slides[0].objects?.[0].x,100);assert.equal(result.deck.slides[0].objects?.[0].w,800);assert.equal(result.deck.slides[0].imported,true);assert.equal(result.deck.title,'Example');
assert.throws(()=>importPptx(pack({...source,'ppt/presentation.xml':'<!DOCTYPE x [<!ENTITY x "x">]>'+presentation}),'x.pptx',()=>''),/XML宣言/);
assert.throws(()=>importPptx(pack({...source,'ppt/presentation.xml':presentation.replace('16000000','0')}),'x.pptx',()=>''),/サイズ/);
assert.throws(()=>importPptx(new Uint8Array(0),'x.pptx',()=>''),/50MB/);
console.log('PPTX import: order, editable text, geometry, entity rejection and invalid input passed');

const nested='<p:grpSp>'.repeat(34)+'</p:grpSp>'.repeat(34);
assert.throws(()=>importPptx(pack({...source,'ppt/slides/slide1.xml':slide('x').replace('<p:spTree>','<p:spTree>'+nested)}),'nested.pptx',()=>''),/階層/);

// 長いノートは切り捨てず保持し、上限を超えた場合だけ拒否する。
const withNotes=(notes:string)=>pack({...source,'ppt/slides/_rels/slide2.xml.rels':'<Relationships><Relationship Id="notes" Type="/notesSlide" Target="../notesSlides/notesSlide2.xml"/></Relationships>','ppt/notesSlides/notesSlide2.xml':`<p:notes xmlns:p="p" xmlns:a="a"><p:sp><p:txBody><a:p><a:r><a:t>${notes}</a:t></a:r></a:p></p:txBody></p:sp></p:notes>`});
for(const n of [8072,20000])assert.equal(importPptx(withNotes('あ'.repeat(n)),'notes.pptx',()=> '').deck.slides[0].notes,'あ'.repeat(n));
assert.throws(()=>importPptx(withNotes('あ'.repeat(20001)),'notes.pptx',()=> ''),/ノートが20000文字/);
// ネイティブグラフの参照を解決し、カテゴリと小数値を保持する。
const chartSlide='<p:sld xmlns:p="p" xmlns:a="a" xmlns:c="c" xmlns:r="r"><p:cSld><p:spTree><p:graphicFrame><p:xfrm><a:off x="1000000" y="2000000"/><a:ext cx="10000000" cy="5000000"/></p:xfrm><a:graphic><a:graphicData><c:chart r:id="chart"/></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>';
const chartData=(type:string,missing=false)=>`<c:chartSpace xmlns:c="c"><c:chart><c:plotArea><c:${type}><c:barDir val="col"/><c:ser><c:tx><c:v>秒</c:v></c:tx><c:cat><c:strRef><c:strCache><c:ptCount val="2"/><c:pt idx="1"><c:v>再利用</c:v></c:pt><c:pt idx="0"><c:v>新規</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>0.472</c:v></c:pt>${missing?'':'<c:pt idx="1"><c:v>0.222</c:v></c:pt>'}</c:numCache></c:numRef></c:val></c:ser></c:${type}></c:plotArea></c:chart></c:chartSpace>`;
const chartImport=(type:string,missing=false)=>importPptx(pack({...source,'ppt/slides/slide2.xml':chartSlide,'ppt/slides/_rels/slide2.xml.rels':'<Relationships><Relationship Id="chart" Type="/chart" Target="/ppt/charts/chart1.xml"/></Relationships>','ppt/charts/chart1.xml':chartData(type,missing)}),'chart.pptx',()=> '');
for(const [type,expected] of [['barChart','bar'],['lineChart','line'],['pieChart','pie']]){const o=chartImport(type).deck.slides[0].objects![0];assert.equal(o.kind,'chart');assert.equal(o.chartType,expected);assert.deepEqual(o.cells,[['項目','秒'],['新規','0.472'],['再利用','0.222']]);assert.equal(o.x,100);assert.equal(o.y,200);}
assert.equal(chartImport('barChart',true).deck.slides[0].objects!.length,0);
assert(chartImport('barChart',true).warnings.some(w=>w.includes('欠損')));
assert(chartImport('scatterChart').warnings.some(w=>w.includes('未対応')));
// 書式を含むグラフは保存のスキーマを通過しても軸・ラベル・色を保持する。
const styled=chartData('barChart').replace('<c:chartSpace xmlns:c="c">','<c:chartSpace xmlns:c="c" xmlns:a="a">').replace('<c:ser>','<c:ser><c:spPr><a:solidFill><a:srgbClr val="087FBE"/></a:solidFill></c:spPr>').replace('</c:barChart>','<c:gapWidth val="100"/><c:dLbls><c:showVal val="1"/><c:numFmt formatCode="0.000"/></c:dLbls></c:barChart>').replace('</c:plotArea>','<c:valAx><c:scaling><c:min val="0"/><c:max val="0.6"/></c:scaling><c:majorUnit val="0.2"/><c:numFmt formatCode="0.000"/></c:valAx></c:plotArea>');
const formatted=importPptx(pack({...source,'ppt/slides/slide2.xml':chartSlide,'ppt/slides/_rels/slide2.xml.rels':'<Relationships><Relationship Id="chart" Type="/chart" Target="/ppt/charts/chart1.xml"/></Relationships>','ppt/charts/chart1.xml':styled}),'styled.pptx',()=> '').deck.slides[0].objects![0];
assert.equal(formatted.chartFormat?.maximum,.6);assert.equal(formatted.chartFormat?.majorUnit,.2);assert.equal(formatted.chartFormat?.showLegend,false);assert.equal(formatted.chartFormat?.showValue,true);assert.equal(formatted.chartFormat?.numberFormat,'0.000');assert.deepEqual(formatted.chartFormat?.colors,['#087FBE']);assert.equal(formatted.chartFormat?.gapWidth,100);
