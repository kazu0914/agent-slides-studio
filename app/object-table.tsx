'use client';
import type {SlideObject} from '@/lib/objects';
import {tableFormat,tableTracks,tableCoverage} from '@/lib/table-layout';

export function ObjectTable({object:o,onCell,onBegin}:{object:SlideObject;onCell?:(row:number,col:number,text:string)=>void;onBegin?:()=>void}){
 const format=tableFormat(o),widths=tableTracks(format.columnWidths,100),heights=tableTracks(format.rowHeights,100),covered=tableCoverage(format);
 return <table className="object-table" data-object-table><colgroup>{widths.map((width,j)=><col key={j} style={{width:`${width}%`}}/>)}</colgroup><tbody>{o.cells.map((row,i)=><tr key={i} style={{height:`${heights[i]}%`}}>{row.map((value,j)=>{
  if(covered.has(`${i}:${j}`))return null;
  const cell=format.cells[i][j],style={...o.style,...cell.style},border=cell.borders?.map(b=>`${b.width/16}cqw ${b.dash?'dashed':'solid'} ${b.color}`);
  return <td key={j} contentEditable={onCell?'plaintext-only':false} suppressContentEditableWarning tabIndex={onCell?0:undefined} aria-label={onCell?`表の${i+1}行${j+1}列`:undefined}
   onPointerDown={e=>{if(onCell)e.stopPropagation();}}
   onDoubleClick={e=>{if(onCell)e.stopPropagation();}}
   onFocus={()=>onBegin?.()}
   onBlur={e=>{if(!onCell)return;const text=e.currentTarget.innerText;if(text.length>2000){e.currentTarget.innerText=value;return;}if(text!==value)onCell(i,j,text);}}
   onKeyDown={e=>{if(!onCell)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();e.currentTarget.innerText=value;e.currentTarget.blur();}else if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.blur();}}}
   data-table-cell={`${i}:${j}`} rowSpan={cell.rowSpan} colSpan={cell.colSpan} style={{fontFamily:style.fontFamily,fontSize:`calc(${(style.fontSize??16)/12}cqw * var(--table-text-scale, 1))`,fontWeight:style.bold?700:400,fontStyle:style.italic?'italic':undefined,textDecoration:style.underline?'underline':undefined,color:style.color,textAlign:style.align??'left',lineHeight:style.lineHeight??1.2,background:cell.fill??'transparent',padding:(cell.margin??[8,8,8,8]).map(n=>`${n/16}cqw`).join(' '),verticalAlign:cell.verticalAlign==='center'?'middle':cell.verticalAlign??'top',borderTop:border?.[0],borderRight:border?.[1],borderBottom:border?.[2],borderLeft:border?.[3]}}>{value}</td>;
 })}</tr>)}</tbody></table>;
}
