import {useRef} from 'react';
import type {Slide} from '@/lib/model';
import {moveCards,toggleCard} from '@/lib/card-selection';
export default function CardHandles({index,items,selected,onSelect,onChange,onBegin}:{index:number;items:Slide['items'];selected:number[];onSelect:(ids:number[])=>void;onChange:(items:Slide['items'])=>void;onBegin?:()=>void}){
 const drag=useRef<{x:number;y:number;width:number;height:number;items:Slide['items'];original:Slide['items'];ids:number[];mode:string;changed:boolean}|null>(null);
 const snapshot=(button:HTMLElement)=>{
  const group=button.closest('.slide-items')!,r=group.getBoundingClientRect();
  const boxes=Array.from(group.children).filter(el=>el.classList.contains('slide-item')).map(el=>{const b=el.getBoundingClientRect();return {x:(b.left-r.left)/r.width*100,y:(b.top-r.top)/r.height*100,w:b.width/r.width*100,h:b.height/r.height*100};});
  return {r,items:items.map((item,i)=>({...item,box:item.box??boxes[i]}))};
 };
 return <><button type="button" className="card-handle card-handle-select" aria-label={`カード ${index+1} を選択`} aria-pressed={selected.includes(index)} onClick={e=>{e.stopPropagation();onSelect(toggleCard(selected,index));}}>{selected.includes(index)?'✓ 選択中':'選択'}</button>{['move','nw','ne','sw','se'].map(mode=><button key={mode} type="button" className={'card-handle card-handle-'+mode} aria-label={`カード ${index+1} ${mode==='move'?'を移動':mode+'のサイズ変更'}`} title={mode==='move'?'選択したカードをまとめて移動（矢印キーも使用可）':'ドラッグで幅・高さを変更'}
 onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.focus();if(e.shiftKey||e.metaKey||e.ctrlKey){onSelect(toggleCard(selected,index));return;}const ids=mode==='move'&&selected.includes(index)?selected:[index];onSelect(ids);const data=snapshot(e.currentTarget);drag.current={x:e.clientX,y:e.clientY,width:data.r.width,height:data.r.height,items:data.items,original:items,ids,mode,changed:false};e.currentTarget.setPointerCapture(e.pointerId);}}
 onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=(e.clientX-d.x)/d.width*100,dy=(e.clientY-d.y)/d.height*100;if(!d.changed&&Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)<3)return;if(!d.changed){onBegin?.();d.changed=true;}if(d.mode==='move'){onChange(moveCards(d.items,d.ids,dx,dy));return;}const b=d.items[index].box!;let {x,y,w,h}=b;if(d.mode.includes('e'))w+=dx;if(d.mode.includes('s'))h+=dy;if(d.mode.includes('w')){w-=dx;x+=dx;}if(d.mode.includes('n')){h-=dy;y+=dy;}if(w<5||h<10)return;const box={x:Math.max(-100,Math.min(200,x)),y:Math.max(-200,Math.min(300,y)),w:Math.min(300,w),h:Math.min(400,h)};onChange(d.items.map((item,i)=>i===index?{...item,box}:item));}}
 onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
 onPointerCancel={()=>{const d=drag.current;drag.current=null;if(d?.changed)onChange(d.original);}}
 onLostPointerCapture={()=>{drag.current=null;}}
 onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();const d=drag.current;drag.current=null;if(d?.changed)onChange(d.original);else onSelect([]);return;}if(mode!=='move'||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const ids=selected.includes(index)?selected:[index];onSelect(ids);const data=snapshot(e.currentTarget);onBegin?.();const step=e.shiftKey?2:.2;onChange(moveCards(data.items,ids,e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0,e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));}}
 >{mode==='move'?'移動':null}</button>)}</>;
}
