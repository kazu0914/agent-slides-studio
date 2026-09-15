import {snapDrag,type DragGuide} from './drag-guides';
import {useEffect,useRef,useState,type RefObject,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import type {Slide} from '@/lib/model';
import type {ElementKey} from './element-controls';
export type CanvasSelection={cards:number[];objects:string[];elements:ElementKey[]};
export const emptySelection=():CanvasSelection=>({cards:[],objects:[],elements:[]});
type Target={kind:'cards'|'objects'|'elements';id:number|string;rect:DOMRect};
type Gesture={pointer:number;x:number;y:number;mode:'range'|'move';targets:Target[];selection:CanvasSelection;source:Slide;root:DOMRect;items:DOMRect|null;inverse:{a:number;b:number;c:number;d:number};boxes:Slide['items'];moved:boolean};
export function useRangeSelection(root:RefObject<HTMLDivElement|null>,source:Slide,enabled:boolean,selection:CanvasSelection,onSelect:(s:CanvasSelection)=>void,onCommit?:(patch:Partial<Slide>)=>void){
 const active=useRef<Gesture|null>(null),previewRef=useRef<Partial<Slide>|null>(null);
 const [preview,setPreview]=useState<Partial<Slide>|null>(null),[range,setRange]=useState<{x:number;y:number;w:number;h:number}|null>(null);
 const [guides,setGuides]=useState<DragGuide[]>([]);
 const count=selection.cards.length+selection.objects.length+selection.elements.length;
 const reset=()=>{active.current=null;previewRef.current=null;setPreview(null);setRange(null);setGuides([]);};
 useEffect(()=>{reset();},[source.id,enabled]);
 useEffect(()=>{const cancel=()=>reset();window.addEventListener('blur',cancel);return()=>window.removeEventListener('blur',cancel);},[]);
 const targets=():Target[]=>{
  const host=root.current!;const result:Target[]=[];
  host.querySelectorAll<HTMLElement>('.slide-item,[data-free-object],[data-edit-element="title"],[data-edit-element="body"],[data-edit-element="eyebrow"],[data-edit-element="artwork"]').forEach(el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);if(!rect.width||!rect.height||style.visibility==='hidden'||style.display==='none')return;
   if(el.dataset.freeObject){const obj=source.objects?.find(o=>o.id===el.dataset.freeObject);if(!obj||obj.hidden||obj.locked)return;result.push({kind:'objects',id:obj.id,rect});}
   else if(el.classList.contains('slide-item'))result.push({kind:'cards',id:Number(el.dataset.cardIndex),rect});
   else if(el.textContent?.trim()||el.dataset.editElement==='artwork')result.push({kind:'elements',id:el.dataset.editElement!,rect});
  });return result;
 };
 const selectedTarget=(el:HTMLElement)=>{
  const obj=el.closest<HTMLElement>('[data-free-object]');if(obj)return selection.objects.includes(obj.dataset.freeObject!);
  const card=el.closest<HTMLElement>('[data-card-index]');if(card)return selection.cards.includes(Number(card.dataset.cardIndex));
  const base=el.closest<HTMLElement>('[data-edit-element]');return !!base&&selection.elements.includes(base.dataset.editElement as ElementKey);
 };
 const makeGesture=(pointer:number,x:number,y:number,mode:'range'|'move'):Gesture=>{
  const host=root.current!,group=host.querySelector<HTMLElement>('.slide-items'),gr=group?.getBoundingClientRect()??null;
  const zoom=host.getBoundingClientRect().width/host.offsetWidth;
  const inverse=group?new DOMMatrix(getComputedStyle(group).transform).inverse():new DOMMatrix();
  const boxes=source.items.map((item,i)=>{const el=group?.querySelectorAll<HTMLElement>('.slide-item')[i];return item.box||!el||!group?item:{...item,box:{x:el.offsetLeft/group.clientWidth*100,y:el.offsetTop/group.clientHeight*100,w:el.offsetWidth/group.clientWidth*100,h:el.offsetHeight/group.clientHeight*100}};});
  return {pointer,x,y,mode,targets:targets(),selection,source,root:host.getBoundingClientRect(),items:group&&gr?new DOMRect(gr.x,gr.y,group.clientWidth*zoom,group.clientHeight*zoom):null,inverse:{a:inverse.a,b:inverse.b,c:inverse.c,d:inverse.d},boxes,moved:false};
 };
 const translate=(g:Gesture,dx:number,dy:number):Partial<Slide>=>{
  const patch:Partial<Slide>={};let minX=-Infinity,maxX=Infinity,minY=-Infinity,maxY=Infinity;
  // 全要素に同じ画面上の移動量を適用し、保存形式ごとの境界も共通で制限する。
  const limit=(x:number,y:number,sx:number,sy:number,l:number,r:number,t:number,b:number)=>{minX=Math.max(minX,(l-x)*sx);maxX=Math.min(maxX,(r-x)*sx);minY=Math.max(minY,(t-y)*sy);maxY=Math.min(maxY,(b-y)*sy);};
  for(const o of g.source.objects||[])if(g.selection.objects.includes(o.id)&&!o.locked&&!o.hidden)limit(o.x,o.y,g.root.width/1600,g.root.height/900,-1600,3200,-900,1800);
  for(const key of g.selection.elements){const p=g.source.placements?.[key];limit(p?.x||0,p?.y||0,g.root.width/100,g.root.height/100,-100,100,-100,100);}
  dx=Math.max(minX,Math.min(maxX,dx));dy=Math.max(minY,Math.min(maxY,dy));
  const cardDelta=()=>g.items?{x:(g.inverse.a*dx+g.inverse.c*dy)/g.items.width*100,y:(g.inverse.b*dx+g.inverse.d*dy)/g.items.height*100}:{x:0,y:0};
  let fraction=1;const delta=cardDelta();
  for(const i of g.selection.cards){const box=g.boxes[i]?.box;if(!box)continue;for(const [v,d,lo,hi] of [[box.x,delta.x,-100,200],[box.y,delta.y,-200,300]])if(d)fraction=Math.min(fraction,Math.max(0,((d>0?hi:lo)-v)/d));}
  dx*=fraction;dy*=fraction;const cd=cardDelta();
  if(g.selection.objects.length)patch.objects=(g.source.objects||[]).map(o=>g.selection.objects.includes(o.id)&&!o.locked&&!o.hidden?{...o,x:o.x+dx/g.root.width*1600,y:o.y+dy/g.root.height*900}:o);
  if(g.selection.cards.length&&g.items){patch.items=g.boxes.map((item,i)=>g.selection.cards.includes(i)&&item.box?{...item,box:{...item.box,x:item.box.x+cd.x,y:item.box.y+cd.y}}:item);}
  if(g.selection.elements.length){patch.placements={...g.source.placements};for(const key of g.selection.elements){const p=g.source.placements?.[key]||{x:0,y:0,scale:1,opacity:1};patch.placements[key]={...p,x:p.x+dx/g.root.width*100,y:p.y+dy/g.root.height*100};}}
  return patch;
 };
 const typing=(el:HTMLElement)=>!!el.closest('input,textarea,select')||!!el.closest('[contenteditable="plaintext-only"]:focus,[contenteditable="true"]:focus');
 const onPointerDownCapture=(e:ReactPointerEvent<HTMLDivElement>)=>{
  if(!enabled||e.button!==0||!onCommit)return;const el=e.target as HTMLElement;
  if(e.detail>1||typing(el)||el.closest('.element-box')||el.closest('[data-object-resize],.object-resize,.element-resize,.card-handle-nw,.card-handle-ne,.card-handle-sw,.card-handle-se'))return;
  const isItem=el.closest('[data-free-object],[data-card-index],[data-edit-element="title"],[data-edit-element="body"],[data-edit-element="eyebrow"],[data-edit-element="artwork"]');
  const move=!!isItem&&selectedTarget(el)&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey;
  if(isItem&&!move){
   const object=el.closest<HTMLElement>('[data-free-object]');
   if(object&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey){const obj=source.objects?.find(o=>o.id===object.dataset.freeObject);if(!obj||obj.locked||obj.hidden)return;const next={cards:[],elements:[],objects:obj.groupId?(source.objects||[]).filter(o=>o.groupId===obj.groupId&&!o.locked&&!o.hidden).map(o=>o.id):[obj.id]};onSelect(next);e.preventDefault();e.stopPropagation();root.current!.focus({preventScroll:true});active.current={...makeGesture(e.pointerId,e.clientX,e.clientY,'move'),selection:next};return;}
   const card=el.closest<HTMLElement>('[data-card-index]');
   if(card&&el.closest('.card-handle-move')&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey){const next={cards:[Number(card.dataset.cardIndex)],objects:[],elements:[]};onSelect(next);e.preventDefault();e.stopPropagation();root.current!.focus({preventScroll:true});active.current={...makeGesture(e.pointerId,e.clientX,e.clientY,'move'),selection:next};return;}
   if(!e.shiftKey&&!e.metaKey&&!e.ctrlKey)onSelect(emptySelection());return;
  }
  if(el.closest('button')&&!el.closest('.card-handle-move'))return;
  e.preventDefault();e.stopPropagation();root.current!.focus({preventScroll:true});
  active.current=makeGesture(e.pointerId,e.clientX,e.clientY,move?'move':'range');
  if(!move&&!e.shiftKey)active.current.selection=emptySelection();
  if(!move)root.current!.setPointerCapture(e.pointerId);
 };
 const onPointerMoveCapture=(e:ReactPointerEvent<HTMLDivElement>)=>{
  const g=active.current;if(!g||e.pointerId!==g.pointer)return;e.preventDefault();e.stopPropagation();
  const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.moved&&Math.hypot(dx,dy)<4)return;g.moved=true;
  if(g.mode==='move'){if(!root.current!.hasPointerCapture(e.pointerId))root.current!.setPointerCapture(e.pointerId);const selected=(t:Target)=>g.selection[t.kind].includes(t.id as never);
   const moving=g.targets.filter(selected).map(t=>t.rect);
   const other=g.targets.filter(t=>!selected(t)).map(t=>t.rect);
   // ロック要素も位置合わせの参照には使うが移動対象には含めない。
   for(const o of g.source.objects||[])if(o.locked&&!o.hidden){const el=root.current?.querySelector<HTMLElement>(`[data-free-object="${CSS.escape(o.id)}"]`);if(el)other.push(el.getBoundingClientRect());}
   const snap=e.altKey?{dx,dy,guides:[]}:snapDrag(moving,other,g.root,dx,dy);
   const p=translate(g,snap.dx,snap.dy);setGuides(snap.guides);previewRef.current=p;setPreview(p);return;}
  const l=Math.min(e.clientX,g.x),t=Math.min(e.clientY,g.y),r=Math.max(e.clientX,g.x),b=Math.max(e.clientY,g.y);
  const next:CanvasSelection={cards:[...g.selection.cards],objects:[...g.selection.objects],elements:[...g.selection.elements]};
  for(const target of g.targets)if(target.rect.left<r&&target.rect.right>l&&target.rect.top<b&&target.rect.bottom>t){if(target.kind==='cards')next.cards.push(Number(target.id));else if(target.kind==='objects')next.objects.push(String(target.id));else next.elements.push(target.id as ElementKey);}
  const groups=new Set((source.objects||[]).filter(o=>next.objects.includes(o.id)&&o.groupId).map(o=>o.groupId));
  for(const o of source.objects||[])if(o.groupId&&groups.has(o.groupId)&&!o.locked&&!o.hidden)next.objects.push(o.id);
  onSelect({cards:[...new Set(next.cards)],objects:[...new Set(next.objects)],elements:[...new Set(next.elements)]});
  setRange({x:(l-g.root.left)/g.root.width*100,y:(t-g.root.top)/g.root.height*100,w:(r-l)/g.root.width*100,h:(b-t)/g.root.height*100});
 };
 const onPointerUpCapture=(e:ReactPointerEvent<HTMLDivElement>)=>{const g=active.current;if(!g)return;e.stopPropagation();if(g.mode==='move'&&g.moved&&previewRef.current)onCommit?.(previewRef.current);else if(g.mode==='range'&&!g.moved)onSelect(g.selection);reset();if(root.current?.hasPointerCapture(e.pointerId))root.current.releasePointerCapture(e.pointerId);};
 const onKeyDownCapture=(e:ReactKeyboardEvent<HTMLDivElement>)=>{
  if(!enabled||typing(e.target as HTMLElement))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();reset();onSelect(emptySelection());return;}
  if(count&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&onCommit){e.preventDefault();e.stopPropagation();const n=e.shiftKey?10:1,g=makeGesture(-1,0,0,'move');onCommit(translate(g,e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0));}
 };
 return {preview,range,guides,handlers:{onPointerDownCapture,onPointerMoveCapture,onPointerUpCapture,onPointerCancel:reset,onLostPointerCapture:reset,onKeyDownCapture}};
}
