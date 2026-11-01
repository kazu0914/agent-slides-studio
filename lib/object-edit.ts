import type {SlideObject} from './objects';

export function duplicateObjects(objects:SlideObject[],selected:string[]):SlideObject[]{
 const source=objects.filter(o=>selected.includes(o.id));
 if(objects.length+source.length>100)throw Error('1枚に100要素までです。複製する要素を減らしてください。');
 const groups=new Map<string,string>();
 return source.map(o=>{
  if(o.groupId&&!groups.has(o.groupId))groups.set(o.groupId,crypto.randomUUID());
  return {...structuredClone(o),id:crypto.randomUUID(),groupId:o.groupId?groups.get(o.groupId):undefined,x:Math.min(3200,o.x+24),y:Math.min(1800,o.y+24),locked:false};
 });
}
