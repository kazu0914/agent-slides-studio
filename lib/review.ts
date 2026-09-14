import {deckSchema,fieldNames,type Deck,type Slide} from './model';
export type Scope={mode:'deck'|'slide'|'objects';slideId:string;objectIds:string[]};
export function constrainDeck(base:Deck,next:Deck,scope:Scope):Deck{
 if(scope.mode==='deck')return next;
 const source=base.slides.find(s=>s.id===scope.slideId),proposed=next.slides.find(s=>s.id===scope.slideId);if(!source||!proposed)throw Error('固定したスライドは削除できません');
 const slide=scope.mode==='slide'?proposed:{...source,objects:(source.objects||[]).flatMap(o=>{if(!scope.objectIds.includes(o.id)||o.locked)return [o];const n=proposed.objects?.find(x=>x.id===o.id);return n?[n]:[];})};
 return {...base,slides:base.slides.map(s=>s.id===source.id?slide:s)};
}
export type ReviewChange={id:string;slideId:string;label:string;before:unknown;after:unknown;apply:(d:Deck)=>void};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function reviewChanges(base:Deck,next:Deck):ReviewChange[]{
 const rows:ReviewChange[]=[];const add=(r:ReviewChange)=>{if(!same(r.before,r.after))rows.push(r);};
 add({id:'deck-title',slideId:'',label:'デッキ名',before:base.title,after:next.title,apply:d=>{d.title=next.title;}});
 const baseIds=base.slides.map(s=>s.id),nextIds=next.slides.map(s=>s.id);
 if(!same(baseIds,nextIds))add({id:'structure',slideId:'',label:'スライドの追加・削除・並び順',before:base.slides.map(s=>s.title),after:next.slides.map(s=>s.title),apply:d=>{d.slides=next.slides.map(s=>d.slides.find(x=>x.id===s.id)||structuredClone(s));}});
 for(const after of next.slides){const before=base.slides.find(s=>s.id===after.id);if(!before)continue;
  for(const key of Object.keys({...before,...after}) as (keyof Slide)[]){if(key==='id'||key==='objects')continue;add({id:after.id+':'+key,slideId:after.id,label:`${after.title||'無題'} · ${fieldNames[key]||key}`,before:before[key],after:after[key],apply:d=>{const s=d.slides.find(s=>s.id===after.id);if(s)(s as unknown as Record<string,unknown>)[key]=structuredClone(after[key]);}});}
  const a=before.objects||[],b=after.objects||[];
  for(const id of new Set([...a,...b].map(o=>o.id))){const old=a.find(o=>o.id===id),obj=b.find(o=>o.id===id);add({id:after.id+':object:'+id,slideId:after.id,label:`${after.title||'無題'} · ${obj?.name||old?.name} ${!old?'追加':!obj?'削除':'変更'}`,before:old,after:obj,apply:d=>{const s=d.slides.find(s=>s.id===after.id);if(!s)return;const list=s.objects||[];s.objects=obj?(old?list.map(x=>x.id===id?structuredClone(obj):x):[...list,structuredClone(obj)]):list.filter(x=>x.id!==id);}});}
  if(!same(a.filter(o=>b.some(x=>x.id===o.id)).map(o=>o.id),b.filter(o=>a.some(x=>x.id===o.id)).map(o=>o.id)))rows.push({id:after.id+':layers',slideId:after.id,label:`${after.title} · 重なり順`,before:a.map(o=>o.name),after:b.map(o=>o.name),apply:d=>{const s=d.slides.find(s=>s.id===after.id);if(s)s.objects=[...(s.objects||[])].sort((x,y)=>b.findIndex(o=>o.id===x.id)-b.findIndex(o=>o.id===y.id));}});
 }
 return rows;
}
export function mergeReview(base:Deck,rows:ReviewChange[],ids:string[]):Deck{const d=structuredClone(base);for(const r of rows)if(ids.includes(r.id))r.apply(d);return deckSchema.parse(d);}
