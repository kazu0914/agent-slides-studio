import type {SlideObject} from '../lib/objects';
import {tableFormat,tableTracks,tableCoverage} from '../lib/table-layout';

export function pptxTable(object:SlideObject,textScale=1){
 const format=tableFormat(object),covered=tableCoverage(format);
 const rows=object.cells.map((row,i)=>row.flatMap((text,j)=>{
  if(covered.has(`${i}:${j}`))return [];
  const cell=format.cells[i][j],s={...object.style,...cell.style},margin=cell.margin??[8,8,8,8];
  // 出力ライブラリは上余白が1未満だとインチとして解釈するため、全辺の単位を揃える。
  const marginUnit=margin[0]*.75>=1?.75:1/96;
  return [{text,options:{lang:'ja-JP',fontFace:s.fontFamily??'Hiragino Sans',fontSize:(s.fontSize??16)*textScale,bold:s.bold??false,italic:s.italic??false,underline:s.underline??false,color:(s.color??'#17233b').slice(1),align:s.align??'left',valign:cell.verticalAlign==='center'?'middle':cell.verticalAlign??'top',fill:cell.fill?{color:cell.fill.slice(1)}:undefined,margin:margin.map(n=>n*marginUnit),border:cell.borders?.map(b=>({type:b.width===0?'none':b.dash?'dash':'solid',color:b.color.slice(1),pt:b.width*.75})),lineSpacing:(s.fontSize??16)*textScale*(s.lineHeight??1.2),paraSpaceAfter:0,colspan:cell.colSpan??1,rowspan:cell.rowSpan??1}}];
 }));
 return {rows,options:{x:object.x/96,y:object.y/96,w:object.w/96,rowH:tableTracks(format.rowHeights,object.h/96),colW:tableTracks(format.columnWidths,object.w/96),autoPage:false,margin:0,paraSpaceAfter:0,objectName:object.name,rotate:object.rotation,transparency:(1-object.opacity)*100}};
}
