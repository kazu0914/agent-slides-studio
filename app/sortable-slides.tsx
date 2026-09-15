'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

type Drag={id:string;pointer:number;x:number;y:number;startX:number;startY:number;active:boolean;slot:number;timer:ReturnType<typeof setTimeout>|null};
export default function SortableSlides({ids,disabled,onReorder,children}:{ids:string[];disabled:boolean;onReorder:(id:string,slot:number)=>void;children:ReactNode}){
 const list=useRef<HTMLDivElement>(null),drag=useRef<Drag|null>(null),suppressClick=useRef(false);
 const [indicator,setIndicator]=useState<{top:number;id:string}|null>(null);
 const cancel=()=>{if(drag.current?.timer)clearTimeout(drag.current.timer);drag.current=null;setIndicator(null);};
 function update(){
  const state=drag.current,root=list.current;if(!state?.active||!root)return;
  const box=root.getBoundingClientRect();
  const rows=Array.from(root.querySelectorAll<HTMLElement>('[data-slide-id]'));
  const slot=rows.findIndex(row=>state.y<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);
  state.slot=slot<0?rows.length:slot;
  const row=rows[state.slot];const last=rows.at(-1);
  const y=row?row.getBoundingClientRect().top:last?.getBoundingClientRect().bottom??box.top;
  const top=y-box.top+root.scrollTop;
  setIndicator(previous=>previous?.top===top&&previous.id===state.id?previous:{top,id:state.id});
 }
 useEffect(()=>{
  let frame=0;
  const tick=()=>{const state=drag.current,root=list.current;if(state?.active&&root){const box=root.getBoundingClientRect();const speed=state.y<box.top+45?-Math.min(14,(box.top+45-state.y)/3):state.y>box.bottom-45?Math.min(14,(state.y-box.bottom+45)/3):0;if(speed){root.scrollTop+=speed;update();}}frame=requestAnimationFrame(tick);};
  if(indicator)frame=requestAnimationFrame(tick);
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&drag.current){suppressClick.current=drag.current.active;cancel();}};
  window.addEventListener('keydown',escape);window.addEventListener('blur',cancel);
  return()=>{cancelAnimationFrame(frame);if(drag.current?.timer)clearTimeout(drag.current.timer);window.removeEventListener('keydown',escape);window.removeEventListener('blur',cancel);};
 },[indicator?.id]);
 useEffect(()=>{if(disabled)cancel();},[disabled]);
 return <div ref={list} className={`thumb-list sortable-slides ${indicator?'is-sorting':''}`} data-dragging-id={indicator?.id} onDragStart={e=>e.preventDefault()}
  onPointerDown={e=>{
   if(disabled||e.button!==0)return;
   const row=(e.target as HTMLElement).closest<HTMLElement>('[data-slide-id]');if(!row)return;
   suppressClick.current=false;
   const state:Drag={id:row.dataset.slideId!,pointer:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,active:false,slot:ids.indexOf(row.dataset.slideId!),timer:null};
   drag.current=state;
   state.timer=setTimeout(()=>{if(drag.current===state){state.active=true;update();}},220);
   row.setPointerCapture(e.pointerId);
  }}
  onPointerMove={e=>{const state=drag.current;if(!state||state.pointer!==e.pointerId)return;state.x=e.clientX;state.y=e.clientY;if(!state.active&&Math.hypot(state.x-state.startX,state.y-state.startY)>6){state.active=true;if(state.timer)clearTimeout(state.timer);}if(state.active){e.preventDefault();update();}}}
  onPointerUp={e=>{const state=drag.current;if(!state||state.pointer!==e.pointerId)return;const box=list.current!.getBoundingClientRect();const valid=e.clientX>=box.left&&e.clientX<=box.right&&e.clientY>=box.top-24&&e.clientY<=box.bottom+24;suppressClick.current=state.active;if(state.active&&valid&&!disabled)onReorder(state.id,state.slot);cancel();}}
  onLostPointerCapture={()=>{if(drag.current){suppressClick.current=drag.current.active;cancel();}}}
  onPointerCancel={()=>{suppressClick.current=!!drag.current?.active;cancel();}}
  onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}
  onKeyDown={e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(disabled)return;const row=(e.target as HTMLElement).closest<HTMLElement>('[data-slide-id]');if(!row)return;const i=ids.indexOf(row.dataset.slideId!);onReorder(ids[i],e.key==='ArrowUp'?Math.max(0,i-1):Math.min(ids.length,i+2));}}
 >{children}{indicator&&<div className="slide-insertion-line" style={{top:indicator.top}} aria-hidden="true"/>}<span className="sr-only" role="status">{indicator?'移動先で離すとスライドを並べ替えます。Escapeで取り消し。':''}</span></div>;
}
