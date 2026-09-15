import type {Slide} from './model';
export function toggleCard(selected:number[],index:number){return selected.includes(index)?selected.filter(id=>id!==index):[...selected,index];}
// 境界で各カードの間隔が変わらないよう、全選択に同じ移動量を適用する。
export function moveCards(items:Slide['items'],selected:number[],dx:number,dy:number):Slide['items']{
 const boxes=items.filter((_,i)=>selected.includes(i)).flatMap(item=>item.box?[item.box]:[]);
 if(!boxes.length)return items;
 dx=Math.max(Math.max(...boxes.map(b=>-100-b.x)),Math.min(Math.min(...boxes.map(b=>200-b.x)),dx));
 dy=Math.max(Math.max(...boxes.map(b=>-200-b.y)),Math.min(Math.min(...boxes.map(b=>300-b.y)),dy));
 return items.map((item,i)=>selected.includes(i)&&item.box?{...item,box:{...item.box,x:item.box.x+dx,y:item.box.y+dy}}:item);
}
