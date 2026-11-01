export type FlowRect={x:number;y:number;w:number;h:number};
export function flowRectOverlaps(a:FlowRect,b:FlowRect,padding=0){return a.x<b.x+b.w+padding&&a.x+a.w>b.x-padding&&a.y<b.y+b.h+padding&&a.y+a.h>b.y-padding;}
export function findFlowPlacement(obstacles:FlowRect[]):FlowRect|null{
 const left=80,right=1520,top=60,bottom=830,gap=24;
 // 文字や既存要素の周囲を候補にし、読める大きさを保てる最大の空き領域を選ぶ。
 for(let w=1360;w>=640;w-=16){const h=w/2;
  const xs=[(1600-w)/2,left,right-w,...obstacles.flatMap(r=>[r.x+r.w+gap,r.x-w-gap])];
  const ys=[bottom-h,top,...obstacles.flatMap(r=>[r.y+r.h+gap,r.y-h-gap])];
  for(const y of ys)for(const x of xs){const box={x,y,w,h};if(x<left||x+w>right||y<top||y+h>bottom)continue;if(!obstacles.some(r=>flowRectOverlaps(box,r,gap)))return box;}
 }
 return null;
}
