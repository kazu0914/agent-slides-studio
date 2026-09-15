export type GuideRect={left:number;top:number;right:number;bottom:number;width:number;height:number};
export type DragGuide={axis:'x'|'y';position:number;label:string;from?:number;to?:number};
export function snapDrag(moving:GuideRect[],others:GuideRect[],root:GuideRect,dx:number,dy:number){
 if(!moving.length)return {dx,dy,guides:[] as DragGuide[]};
 const left=Math.min(...moving.map(r=>r.left)),top=Math.min(...moving.map(r=>r.top)),right=Math.max(...moving.map(r=>r.right)),bottom=Math.max(...moving.map(r=>r.bottom));
 const box={left:left+dx,right:right+dx,top:top+dy,bottom:bottom+dy,width:right-left,height:bottom-top};
 const guides:DragGuide[]=[];
 // 画面上の6px以内で最も近い端・中央を選び、拡大率に依存しない吸着にする。
 for(const axis of ['x','y'] as const){
  const start=axis==='x'?'left':'top',end=axis==='x'?'right':'bottom';
  const anchors=[box[start],(box[start]+box[end])/2,box[end]];
  let best:{delta:number;position:number}|undefined;
  for(const target of [root,...others])for(const position of [target[start],(target[start]+target[end])/2,target[end]])for(const anchor of anchors){const delta=position-anchor;if(Math.abs(delta)<=6&&(!best||Math.abs(delta)<Math.abs(best.delta)-.01))best={delta,position};}
  if(best){if(axis==='x'){dx+=best.delta;box.left+=best.delta;box.right+=best.delta;}else{dy+=best.delta;box.top+=best.delta;box.bottom+=best.delta;}
   const value=(best.position-root[start])/(axis==='x'?root.width:root.height)*(axis==='x'?1600:900);
   guides.push({axis,position:(best.position-root[start])/(axis==='x'?root.width:root.height)*100,label:`${axis.toUpperCase()} ${Math.round(value)} px`});
  }
 }
 // 重なりのある隣接要素までの余白を測る。値はスライドの1600×900座標で表示する。
 const vertical=others.filter(r=>r.left<box.right&&r.right>box.left&&(r.bottom<=box.top||r.top>=box.bottom)).map(r=>r.bottom<=box.top?{from:r.bottom,to:box.top}:{from:box.bottom,to:r.top}).sort((a,b)=>(a.to-a.from)-(b.to-b.from))[0];
 if(vertical)guides.push({axis:'y',position:Math.min(98,(box.right-root.left)/root.width*100+1),from:(vertical.from-root.top)/root.height*100,to:(vertical.to-root.top)/root.height*100,label:`${Math.round((vertical.to-vertical.from)/root.height*900)} px`});
 const horizontal=others.filter(r=>r.top<box.bottom&&r.bottom>box.top&&(r.right<=box.left||r.left>=box.right)).map(r=>r.right<=box.left?{from:r.right,to:box.left}:{from:box.right,to:r.left}).sort((a,b)=>(a.to-a.from)-(b.to-b.from))[0];
 if(horizontal)guides.push({axis:'x',position:Math.min(98,(box.bottom-root.top)/root.height*100+1),from:(horizontal.from-root.left)/root.width*100,to:(horizontal.to-root.left)/root.width*100,label:`${Math.round((horizontal.to-horizontal.from)/root.width*1600)} px`});
 return {dx,dy,guides};
}
export function DragGuides({guides}:{guides:DragGuide[]}){return <div className="drag-guides" aria-hidden="true">{guides.map((g,i)=>g.from===undefined?<div key={i} className={`drag-guide alignment ${g.axis}`} style={g.axis==='x'?{left:`${g.position}%`}:{top:`${g.position}%`}}><span>{g.label}</span></div>:<div key={i} className={`drag-guide distance ${g.axis}`} style={g.axis==='y'?{left:`${g.position}%`,top:`${g.from}%`,height:`${g.to!-g.from}%`}:{top:`${g.position}%`,left:`${g.from}%`,width:`${g.to!-g.from}%`}}><span>{g.label}</span></div>)}</div>;}
