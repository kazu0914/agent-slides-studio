'use client';
import {useEffect,useId,useRef} from 'react';
import {Bot,Waypoints,Mail,Database,FileText,Cloud} from 'lucide-react';
import {flowCurve,flowProgress,describeFlow,type FlowDiagram as Flow} from '@/lib/flow-diagram';
const icons={agent:Bot,bridge:Waypoints,mail:Mail,database:Database,document:FileText,cloud:Cloud};
function lines(text:string,max:number){
 const rows:string[]=[];let row='',width=0;
 for(const ch of Array.from(text)){const weight=/[\x20-\x7e]/.test(ch)?.55:1;if(width+weight>max){rows.push(row);row='';width=0;}row+=ch;width+=weight;}
 if(row)rows.push(row);if(rows.length>2)return [rows[0],rows[1].slice(0,-1)+'…'];return rows;
}
export function FlowDiagram({flow,color,duration,enabled=false,playing=true}:{flow:Flow;color:string;duration:number;enabled?:boolean;playing?:boolean}){
 const root=useRef<SVGSVGElement>(null),play=useRef(playing);play.current=playing;const arrow=useId().replace(/:/g,'');
 const signature=JSON.stringify(flow);
 useEffect(()=>{
  const svg=root.current;if(!svg)return;const graph=JSON.parse(signature) as Flow;
  const paths=graph.edges.map(e=>flowCurve(graph.nodes.find(n=>n.id===e.from)!,graph.nodes.find(n=>n.id===e.to)!));
  const packets=svg.querySelectorAll<SVGCircleElement>('[data-flow-packet]'),traces=svg.querySelectorAll<SVGPathElement>('[data-flow-trace]'),cards=svg.querySelectorAll<SVGGElement>('[data-flow-node]');
  const media=matchMedia('(prefers-reduced-motion: reduce)');let elapsed=0,last=0,raf=0;
  const paint=(staticMode:boolean)=>{
   const progress=staticMode?graph.edges.map(()=>1):flowProgress(graph,elapsed,duration);
   svg.dataset.flowState=staticMode?'static':!play.current?'paused':!graph.loop&&elapsed>=duration*1000?'complete':'playing';
   graph.edges.forEach((e,i)=>{const t=progress[i],p=paths[i].point(t);packets[i].setAttribute('cx',String(p.x));packets[i].setAttribute('cy',String(p.y));packets[i].setAttribute('opacity',!staticMode&&graph.effect==='signal'&&t>0&&t<1?'1':'0');traces[i].setAttribute('stroke-dashoffset',String(graph.effect==='signal'?0:1-t));traces[i].setAttribute('opacity',graph.effect==='signal'?'.45':t>0?'1':'.12');});
   graph.nodes.forEach((n,i)=>{const incoming=graph.edges.map((e,j)=>e.to===n.id?j:-1).filter(j=>j>=0);const reached=staticMode||!incoming.length||incoming.some(j=>progress[j]>=1);cards[i].setAttribute('opacity',graph.effect==='steps'&&!reached?'.28':'1');cards[i].querySelector('[data-flow-border]')?.setAttribute('stroke-opacity',reached?'1':'.25');});
  };
  const tick=(now:number)=>{if(last&&play.current&&!document.hidden&&!media.matches)elapsed+=Math.min(now-last,80);last=now;paint(!enabled||media.matches);if(enabled)raf=requestAnimationFrame(tick);};
  const resetClock=()=>{last=0;paint(!enabled||media.matches);};
  paint(!enabled||media.matches);if(enabled)raf=requestAnimationFrame(tick);
  media.addEventListener('change',resetClock);document.addEventListener('visibilitychange',resetClock);
  return()=>{cancelAnimationFrame(raf);media.removeEventListener('change',resetClock);document.removeEventListener('visibilitychange',resetClock);};
 },[signature,duration,enabled]);
 return <svg ref={root} data-flow-diagram viewBox="0 0 1000 500" width="100%" height="100%" role="img" aria-label={describeFlow(flow)}>
 <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill={color}/></marker></defs>
 {flow.edges.map(e=>{const curve=flowCurve(flow.nodes.find(n=>n.id===e.from)!,flow.nodes.find(n=>n.id===e.to)!);const middle=curve.point(.5);return <g key={e.id}><path d={curve.d} fill="none" stroke={color} strokeWidth="2" opacity=".2" markerEnd={`url(#${arrow})`}/><path data-flow-trace d={curve.d} pathLength="1" strokeDasharray="1" fill="none" stroke={color} strokeWidth="3"/><circle data-flow-packet r="6" fill={color} opacity="0"/>{e.label&&<text x={middle.x} y={middle.y-15} textAnchor="middle" fontSize="15" fill={color} stroke="white" strokeWidth="4" paintOrder="stroke">{e.label}</text>}</g>;})}
 {flow.nodes.map(n=>{const Icon=n.icon==='none'?null:icons[n.icon];const title=lines(n.label,Math.max(6,Math.floor((n.w-24)/20))),detail=lines(n.detail,Math.max(8,Math.floor((n.w-24)/13)));const scale=Math.min(1,(n.h-20)/((Icon?32:0)+title.length*23+detail.length*16));const top=10+((Icon?32:0)+18)*scale;const lineHeight=23*scale;const detailTop=10+((Icon?32:0)+title.length*23+12)*scale;return <g key={n.id} data-flow-node transform={`translate(${n.x} ${n.y})`}><title>{n.label}{n.detail?`：${n.detail}`:''}</title><rect data-flow-border width={n.w} height={n.h} rx="14" fill="#ffffff" stroke={color} strokeWidth="2.5"/>{Icon&&<Icon x={n.w/2-12*scale} y="10" width={24*scale} height={24*scale} color={color} strokeWidth="1.8"/>}{title.map((line,i)=><text key={i} x={n.w/2} y={top+i*lineHeight} textAnchor="middle" fontSize={20*scale} fontWeight="700" fill="#18243b">{line}</text>)}{detail.map((line,i)=><text key={i} x={n.w/2} y={detailTop+i*16*scale} textAnchor="middle" fontSize={13*scale} fill="#53647d">{line}</text>)}</g>;})}
 </svg>;
}
