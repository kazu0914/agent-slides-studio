import type {Slide} from '@/lib/model';
import type {CanvasSelection} from './use-range-selection';
export type Alignment='left'|'center'|'right'|'top'|'middle'|'bottom'|'horizontal'|'vertical';
type Entry={kind:'objects'|'cards'|'elements';id:string|number;rect:DOMRect};
export function alignSelection(root:HTMLElement,source:Slide,selection:CanvasSelection,mode:Alignment):Partial<Slide>|null{
 const entries:Entry[]=[];
 const add=(kind:Entry['kind'],id:Entry['id'],el:HTMLElement|null)=>{if(!el)return;const rect=el.getBoundingClientRect();if(rect.width&&rect.height)entries.push({kind,id,rect});};
 for(const id of selection.objects){const o=source.objects?.find(o=>o.id===id);if(o&&!o.locked&&!o.hidden)add('objects',id,root.querySelector(`[data-free-object="${CSS.escape(id)}"]`));}
 for(const i of selection.cards)add('cards',i,root.querySelector(`.slide-item[data-card-index="${i}"]`));
 for(const key of selection.elements)add('elements',key,root.querySelector(`[data-edit-element="${key}"]`));
 // グループ化した要素は一つのまとまりとして動かす。
 const units=new Map<string,Entry[]>();
 for(const entry of entries){const group=entry.kind==='objects'?source.objects?.find(o=>o.id===entry.id)?.groupId:undefined;const key=group?'group:'+group:entry.kind+':'+entry.id;units.set(key,[...(units.get(key)||[]),entry]);}
 const boxes=[...units.values()].map(members=>{const left=Math.min(...members.map(e=>e.rect.left)),top=Math.min(...members.map(e=>e.rect.top)),right=Math.max(...members.map(e=>e.rect.right)),bottom=Math.max(...members.map(e=>e.rect.bottom));return {members,left,top,right,bottom,width:right-left,height:bottom-top};});
 const distribute=mode==='horizontal'||mode==='vertical';if(boxes.length<(distribute?3:2))return null;
 const horizontal=['left','center','right','horizontal'].includes(mode);
 const axis=horizontal?'left':'top',size=horizontal?'width':'height',end=horizontal?'right':'bottom';
 const low=Math.min(...boxes.map(b=>b[axis])),high=Math.max(...boxes.map(b=>b[end]));
 boxes.sort((a,b)=>a[axis]-b[axis]);
 const gap=(high-low-boxes.reduce((n,b)=>n+b[size],0))/(boxes.length-1);
 let cursor=low;const deltas=new Map<Entry,{x:number;y:number}>();
 for(const box of boxes){let target=low;if(distribute){target=cursor;cursor+=box[size]+gap;}else if(mode==='center'||mode==='middle')target=(low+high-box[size])/2;else if(mode==='right'||mode==='bottom')target=high-box[size];const delta=target-box[axis];for(const entry of box.members)deltas.set(entry,{x:horizontal?delta:0,y:horizontal?0:delta});}
 const rect=root.getBoundingClientRect(),group=root.querySelector<HTMLElement>('.slide-items');
 const zoom=rect.width/root.offsetWidth;
 const inverse=group?new DOMMatrix(getComputedStyle(group).transform).inverse():new DOMMatrix();
 const patch:Partial<Slide>={};
 for(const [entry,d] of deltas){
  if(Math.abs(d.x)+Math.abs(d.y)<.01)continue;
  if(entry.kind==='objects'){
   patch.objects??=structuredClone(source.objects||[]);const o=patch.objects.find(o=>o.id===entry.id)!;o.x+=d.x/rect.width*1600;o.y+=d.y/rect.height*900;
   if(o.x < -1600||o.x>3200||o.y < -900||o.y>1800)return null;
  }else if(entry.kind==='elements'){
   const key=entry.id as keyof NonNullable<Slide['placements']>;patch.placements??={...source.placements};const p=source.placements?.[key]||{x:0,y:0,scale:1,opacity:1};const x=p.x+d.x/rect.width*100,y=p.y+d.y/rect.height*100;if(Math.abs(x)>100||Math.abs(y)>100)return null;patch.placements[key]={...p,x,y};
  }else if(group){
   // 初期の自動配置を保存座標に変換してから移動する。
   patch.items??=source.items.map((item,i)=>{const el=group.querySelectorAll<HTMLElement>('.slide-item')[i];return item.box||!el?structuredClone(item):{...item,box:{x:el.offsetLeft/group.clientWidth*100,y:el.offsetTop/group.clientHeight*100,w:el.offsetWidth/group.clientWidth*100,h:el.offsetHeight/group.clientHeight*100}};});
   const b=patch.items[Number(entry.id)].box;if(!b)continue;b.x+=(inverse.a*d.x+inverse.c*d.y)/(group.clientWidth*zoom)*100;b.y+=(inverse.b*d.x+inverse.d*d.y)/(group.clientHeight*zoom)*100;if(b.x < -100||b.x>200||b.y < -200||b.y>300)return null;
  }
 }
 return Object.keys(patch).length?patch:null;
}
