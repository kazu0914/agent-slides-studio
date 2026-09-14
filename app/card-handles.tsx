import {useRef} from 'react';
import type {Slide} from '@/lib/model';
export default function CardHandles({index,items,onChange,onBegin}:{index:number;items:Slide['items'];onChange:(items:Slide['items'])=>void;onBegin?:()=>void}){
 const drag=useRef<{x:number;y:number;width:number;height:number;items:Slide['items'];mode:string}|null>(null);
 return <>{['move','nw','ne','sw','se'].map(mode=><button key={mode} type="button" className={'card-handle card-handle-'+mode} aria-label={`カード ${index+1} ${mode==='move'?'を移動':mode+'のサイズ変更'}`} title={mode==='move'?'ドラッグでカードを移動':'ドラッグで幅・高さを変更'}
 onPointerDown={e=>{e.preventDefault();e.stopPropagation();const group=e.currentTarget.closest('.slide-items')!,r=group.getBoundingClientRect();const boxes=Array.from(group.children).filter(el=>el.classList.contains('slide-item')).map(el=>{const b=el.getBoundingClientRect();return {x:(b.left-r.left)/r.width*100,y:(b.top-r.top)/r.height*100,w:b.width/r.width*100,h:b.height/r.height*100};});const snapshot=items.map((item,i)=>({...item,box:boxes[i]}));drag.current={x:e.clientX,y:e.clientY,width:r.width,height:r.height,items:snapshot,mode};onBegin?.();onChange(snapshot);e.currentTarget.setPointerCapture(e.pointerId);}}
 onPointerMove={e=>{const d=drag.current;if(!d)return;const b=d.items[index].box!;const dx=(e.clientX-d.x)/d.width*100,dy=(e.clientY-d.y)/d.height*100;let {x,y,w,h}=b;if(d.mode==='move'){x+=dx;y+=dy;}else{if(d.mode.includes('e'))w+=dx;if(d.mode.includes('s'))h+=dy;if(d.mode.includes('w')){w-=dx;x+=dx;}if(d.mode.includes('n')){h-=dy;y+=dy;}}if(w<5||h<10)return;const box={x:Math.max(-100,Math.min(200,x)),y:Math.max(-200,Math.min(300,y)),w:Math.min(300,w),h:Math.min(400,h)};onChange(d.items.map((item,i)=>i===index?{...item,box}:item));}}
 onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
 onPointerCancel={()=>{drag.current=null;}}
 onLostPointerCapture={()=>{drag.current=null;}}
 >{mode==='move'?'移動':null}</button>)}</>;
}
