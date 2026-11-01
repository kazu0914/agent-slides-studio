import {z} from 'zod';
const id=z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
export const flowIcons=['none','agent','bridge','mail','database','document','cloud'] as const;
export const flowSchema=z.object({
 nodes:z.array(z.object({id,label:z.string().max(48),detail:z.string().max(64).default(''),icon:z.enum(flowIcons).default('none'),x:z.number().min(0).max(880),y:z.number().min(0).max(420),w:z.number().min(120).max(320).default(200),h:z.number().min(80).max(160).default(110)})).min(2).max(12),
 edges:z.array(z.object({id,from:id,to:id,label:z.string().max(32).default(''),step:z.number().int().min(0).max(20).default(0)})).max(24),
 effect:z.enum(['signal','draw','steps']).default('signal'),loop:z.boolean().default(true),
}).superRefine((f,c)=>{
 const ids=new Set(f.nodes.map(n=>n.id));
 if(ids.size!==f.nodes.length||new Set(f.edges.map(e=>e.id)).size!==f.edges.length)c.addIssue({code:'custom',message:'箱と接続のIDはそれぞれ一意にしてください'});
 if(f.nodes.some(n=>n.x+n.w>1000||n.y+n.h>500))c.addIssue({code:'custom',message:'箱は1000×500の領域内に配置してください'});
 if(f.edges.some(e=>!ids.has(e.from)||!ids.has(e.to)||e.from===e.to))c.addIssue({code:'custom',message:'接続先には存在する別の箱を指定してください'});
});
export type FlowDiagram=z.infer<typeof flowSchema>;
export type FlowNode=FlowDiagram['nodes'][number];
export function makeFlow(kind:'serial'|'branch'):FlowDiagram{
 const node=(id:string,label:string,detail:string,x:number,y:number,icon:FlowNode['icon'])=>({id,label,detail,x,y,w:200,h:110,icon});
 return flowSchema.parse(kind==='serial'?{nodes:[node('input','入力','依頼・データ',30,195,'document'),node('process','処理','AIが整理',400,195,'agent'),node('result','結果','確認して活用',770,195,'document')],edges:[{id:'e1',from:'input',to:'process',step:0},{id:'e2',from:'process',to:'result',step:1}]}:{nodes:[node('agent','AIエージェント','依頼を受け取る',25,195,'agent'),node('bridge','MCP','ツールにつなぐ',390,195,'bridge'),node('mail','メール','下書きを作成',765,35,'mail'),node('data','データ','情報を参照',765,355,'database')],edges:[{id:'e1',from:'agent',to:'bridge',step:0},{id:'e2',from:'bridge',to:'mail',step:1},{id:'e3',from:'bridge',to:'data',step:1}]});
}
export function flowProgress(flow:FlowDiagram,elapsed:number,duration:number){
 const cycle=Math.max(2,duration)*1000;const t=flow.loop?elapsed%cycle:Math.min(elapsed,cycle);
 const steps=[...new Set(flow.edges.map(e=>e.step))].sort((a,b)=>a-b);const travel=cycle*.82/Math.max(1,steps.length);
 return flow.edges.map(e=>Math.max(0,Math.min(1,(t-steps.indexOf(e.step)*travel)/travel)));
}
export function flowCurve(a:FlowNode,b:FlowNode){
 const dx=b.x+b.w/2-a.x-a.w/2,dy=b.y+b.h/2-a.y-a.h/2;const horizontal=Math.abs(dx)>=Math.abs(dy);
 const start=horizontal?{x:dx>=0?a.x+a.w:a.x,y:a.y+a.h/2}:{x:a.x+a.w/2,y:dy>=0?a.y+a.h:a.y};
 const end=horizontal?{x:dx>=0?b.x:b.x+b.w,y:b.y+b.h/2}:{x:b.x+b.w/2,y:dy>=0?b.y:b.y+b.h};
 const bend=horizontal?(end.x-start.x)/2:(end.y-start.y)/2;
 const c1=horizontal?{x:start.x+bend,y:start.y}:{x:start.x,y:start.y+bend};const c2=horizontal?{x:end.x-bend,y:end.y}:{x:end.x,y:end.y-bend};
 const point=(t:number)=>({x:(1-t)**3*start.x+3*(1-t)**2*t*c1.x+3*(1-t)*t*t*c2.x+t**3*end.x,y:(1-t)**3*start.y+3*(1-t)**2*t*c1.y+3*(1-t)*t*t*c2.y+t**3*end.y});
 return {d:`M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`,point};
}

export function describeFlow(flow:FlowDiagram){
 const labels=new Map(flow.nodes.map((n,i)=>[n.id,n.label||`箱${i+1}`]));
 const connected=new Set(flow.edges.flatMap(e=>[e.from,e.to]));
 const edges=flow.edges.map(e=>`${labels.get(e.from)} → ${labels.get(e.to)}${e.label?`（${e.label}）`:''}`);
 const isolated=flow.nodes.filter(n=>!connected.has(n.id)).map(n=>labels.get(n.id));
 return [edges.length?`接続：${edges.join('、')}`:'接続なし',isolated.length?`未接続の箱：${isolated.join('、')}`:''].filter(Boolean).join('。');
}
