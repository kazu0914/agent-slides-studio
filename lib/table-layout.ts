import type {SlideObject,TableFormat,TextStyle} from './objects';

// 行・列の追加やCSV貼り付けでも、残るセルの書式と幅を保持する。
export function resizeTableFormat(format:TableFormat|undefined,cells:string[][],previous?:string[][]):TableFormat|undefined {
 if(!format||!cells.length||!cells[0].length)return undefined;
 const rows=cells.length,cols=cells[0].length;
 const next={...format,columnWidths:Array.from({length:cols},(_,j)=>format.columnWidths[j]??format.columnWidths.at(-1)??1),rowHeights:Array.from({length:rows},(_,i)=>format.rowHeights[i]??format.rowHeights.at(-1)??1),cells:cells.map((row,i)=>row.map((_,j)=>{
  const cell={...format.cells[i]?.[j]};
  if(cell.colSpan)cell.colSpan=Math.min(cell.colSpan,cols-j);
  if(cell.rowSpan)cell.rowSpan=Math.min(cell.rowSpan,rows-i);
  return cell;
 }))};
 // 貼り付け先の結合セルに新しい値が入る場合は、結合を外して隠れたデータを作らない。
 if(previous)next.cells.forEach((row,i)=>row.forEach((cell,j)=>{
  let reveal=false;
  for(let r=i;r<i+(cell.rowSpan??1);r++)for(let c=j;c<j+(cell.colSpan??1);c++)if((r!==i||c!==j)&&cells[r][c]&&cells[r][c]!==previous[r]?.[c])reveal=true;
  if(reveal){cell.rowSpan=1;cell.colSpan=1;}
 }));
 return next;
}
export function tableFormat(object:SlideObject):TableFormat {
 return resizeTableFormat(object.tableFormat,object.cells)??{columnWidths:object.cells[0].map(()=>1),rowHeights:object.cells.map(()=>1),cells:object.cells.map((r,i)=>r.map(()=>({style:i===0?{bold:true}:{},fill:i===0?object.fill:undefined,margin:[8,8,8,8],verticalAlign:'center',borders:Array.from({length:4},()=>({color:'#94a3b8',width:1}))}))) as TableFormat['cells'],fit:'none'};
}
export function tableTracks(weights:number[],size:number){const sum=weights.reduce((a,b)=>a+b,0);return weights.map(n=>n/sum*size);}
// 結合セルの左上だけ描画し、データ自体は四角い配列のまま保存する。
export function tableCoverage(format:TableFormat){
 const covered=new Set<string>();
 format.cells.forEach((row,i)=>row.forEach((cell,j)=>{
  if(covered.has(`${i}:${j}`))return;
  for(let r=i;r<Math.min(format.cells.length,i+(cell.rowSpan??1));r++)for(let c=j;c<Math.min(row.length,j+(cell.colSpan??1));c++)if(r!==i||c!==j)covered.add(`${r}:${c}`);
 }));
 return covered;
}
export function changeTableStyle(object:SlideObject,style:TextStyle):Partial<SlideObject>{
 const delta=Object.fromEntries(Object.entries(style).filter(([k,v])=>object.style[k as keyof TextStyle]!==v));
 return {style,tableFormat:object.tableFormat?{...object.tableFormat,cells:object.tableFormat.cells.map(row=>row.map(cell=>({...cell,style:{...cell.style,...delta}})))}:undefined};
}
