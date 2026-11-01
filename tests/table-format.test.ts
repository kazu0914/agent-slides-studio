import assert from 'node:assert/strict';
import {zipSync,strToU8,unzipSync,strFromU8} from 'fflate';
import PptxGenJS from 'pptxgenjs';
import {importPptx} from '../local/pptx-import';
import {objectSchema} from '../lib/objects';
import {tableCoverage,resizeTableFormat,changeTableStyle,tableTracks} from '../lib/table-layout';
import {pptxTable} from '../local/pptx-table';
import {preserveTextOverflow} from '../local/pptx-text.mjs';

const cell=(text:string,color:string,fill:string,bold=false,extra='')=>`<a:tc ${extra}><a:txBody><a:bodyPr/><a:p><a:pPr algn="l"/><a:r><a:rPr sz="2000" b="${bold?1:0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Noto Sans JP"/></a:rPr><a:t>${text}</a:t></a:r></a:p></a:txBody><a:tcPr marL="100000" marR="200000" marT="10000" marB="20000" anchor="ctr"><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:lnB w="12700"><a:solidFill><a:srgbClr val="224466"/></a:solidFill></a:lnB></a:tcPr></a:tc>`;
const bytes=(merged=false)=>zipSync(Object.fromEntries(Object.entries({
 'ppt/presentation.xml':'<p:presentation xmlns:p="p" xmlns:r="r"><p:sldSz cx="16000000" cy="9000000"/><p:sldIdLst><p:sldId r:id="s1"/></p:sldIdLst></p:presentation>',
 'ppt/_rels/presentation.xml.rels':'<Relationships><Relationship Id="s1" Target="slides/slide1.xml"/></Relationships>',
 'ppt/slides/slide1.xml':`<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:graphicFrame><p:xfrm><a:off x="1000000" y="2000000"/><a:ext cx="10000000" cy="2000000"/></p:xfrm><a:graphic><a:graphicData><a:tbl><a:tblPr/><a:tblGrid><a:gridCol w="2000000"/><a:gridCol w="8000000"/></a:tblGrid><a:tr h="400000">${cell('項目','FFFFFF','006F91',true,merged?'gridSpan="2"':'')}${cell(merged?'':'詳細','FFFFFF','006F91',true,merged?'hMerge="1"':'')}</a:tr><a:tr h="1600000">${cell('対象','263747','FFFFFF')}${cell('1行目&#10;2行目','263747','FFFFFF')}</a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>`,
}).map(([k,v])=>[k,strToU8(v)])));
const read=(b:Uint8Array)=>importPptx(b,'table.pptx',()=> '').deck.slides[0].objects!.find(o=>o.kind==='table')!;
const o=read(bytes());assert.deepEqual(o.cells,[['項目','詳細'],['対象','1行目\n2行目']]);assert.deepEqual(o.tableFormat?.columnWidths,[200,800]);assert.deepEqual(o.tableFormat?.rowHeights,[40,160]);
assert.equal(o.tableFormat?.cells[0][0].style?.color,'#FFFFFF');assert.equal(o.tableFormat?.cells[1][0].style?.bold,false);assert.equal(o.tableFormat?.cells[0][0].fill,'#006F91');assert.equal(o.tableFormat?.cells[0][0].style?.fontSize,19.05);assert.deepEqual(o.tableFormat?.cells[0][0].margin,[1,20,2,10]);assert.equal(o.tableFormat?.cells[0][0].borders?.[2].width,1.27);
assert.deepEqual(objectSchema.parse(JSON.parse(JSON.stringify(o))).tableFormat,o.tableFormat,'保存後も表書式を保持');
const resized=resizeTableFormat(o.tableFormat,[['a','b','c'],['d','e','f'],['g','h','i']])!;assert.deepEqual(resized.columnWidths,[200,800,800]);assert.deepEqual(resized.rowHeights,[40,160,160]);assert.equal(resized.cells[0][0].fill,'#006F91');assert.equal(resized.cells[2][2].fill,undefined);
assert.equal(changeTableStyle(o,{...o.style,fontSize:24}).tableFormat?.cells[0][0].style?.fontSize,24);assert.equal(changeTableStyle(o,{...o.style,fontSize:24}).tableFormat?.cells[0][0].style?.bold,true);
assert.equal(objectSchema.safeParse({...o,tableFormat:{...o.tableFormat,columnWidths:[1]}}).success,false);
assert.equal(objectSchema.safeParse({...o,tableFormat:{...o.tableFormat,cells:o.tableFormat!.cells.map(r=>r.map(c=>({...c,rowSpan:30})))}}).success,false);
const merged=read(bytes(true));assert(tableCoverage(merged.tableFormat!).has('0:1'));assert.equal(resizeTableFormat(merged.tableFormat,[['見出し','新しい値'],['a','b']],merged.cells)?.cells[0][0].colSpan,1,'CSV貼り付け後の値を結合セルの裏に隠さない');assert.equal(resizeTableFormat(merged.tableFormat,[['a'],['b']])?.cells[0][0].colSpan,1);
for(const source of [o,merged]){
 const pptx=new PptxGenJS();pptx.defineLayout({name:'STUDIO',width:1600/96,height:900/96});pptx.layout='STUDIO';
 const table=pptxTable(source);pptx.addSlide().addTable(table.rows as never,table.options as never);const output=preserveTextOverflow(await pptx.write({outputType:'nodebuffer'}) as Uint8Array,[[]]);const out=read(output);
 const xml=strFromU8(unzipSync(output)['ppt/slides/slide1.xml']);assert(!xml.includes('charset='),'Mac版PowerPointで日本語が化ける固定文字セットを除去');assert(xml.includes('lang="ja-JP"'),'表の言語を指定');assert(xml.includes('<a:spcPts'),'ブラウザと同じ固定行送りで表が下へ伸びない');assert(Math.abs(out.tableFormat!.cells[0][0].style!.lineHeight!-1.2)<.001);
 assert.deepEqual(out.cells,source.cells);assert.deepEqual(tableTracks(out.tableFormat!.columnWidths,100),[20,80]);
 for(let i=0;i<2;i++)assert(Math.abs(out.tableFormat!.rowHeights[i]-source.tableFormat!.rowHeights[i])<.01,'行高を往復で保持');
 assert.equal(out.tableFormat?.cells[0][0].style?.fontSize,19.05);assert.deepEqual(out.tableFormat?.cells[0][0].margin,source.tableFormat?.cells[0][0].margin);assert(Math.abs(out.tableFormat!.cells[0][0].borders![2].width-source.tableFormat!.cells[0][0].borders![2].width)<.001,'EMUの整数丸めの範囲で罫線幅を保持');assert.equal(out.tableFormat?.cells[0][0].fill,'#006F91');assert.equal(out.tableFormat?.cells[0][0].colSpan,source.tableFormat?.cells[0][0].colSpan);
}
console.log('Table dimensions, cell formatting, newlines, resize, merges and native PPTX roundtrip PASS');
