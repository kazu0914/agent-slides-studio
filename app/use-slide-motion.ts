'use client';
import {useLayoutEffect,useRef,type RefObject} from 'react';
import type {Slide} from '@/lib/model';
import {motionTiming} from '@/lib/slide-motion';
// 配置用transformを上書きせず、再生中だけ独立したtranslate/scaleを適用する。
export function useSlideMotion(host:RefObject<HTMLDivElement|null>,slide:Slide,enabled:boolean,playing:boolean,step:number){
 const engine=useRef<{scan:()=>void;animations:Animation[]}|null>(null);
 const play=useRef(playing);play.current=playing;
 const settings=JSON.stringify(slide.motion);
 useLayoutEffect(()=>{
  const root=host.current,m=slide.motion;if(!root||!enabled||!m)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const animations:Animation[]=[],seen=new Set<Element>(),active=new WeakMap<Element,Animation>();
  const cancel=()=>animations.forEach(a=>a.cancel());
  const {duration,distance,startScale}=motionTiming(m);
  const move=distance*root.getBoundingClientRect().width/1600;
  const run=(el:HTMLElement,frames:Keyframe[],delay=0)=>{
   active.get(el)?.cancel();
   const a=el.animate(frames,{duration,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
   active.set(el,a);a.id='slide-motion';animations.push(a);if(!play.current)a.pause();
  };
  const scan=()=>{
   if(reduced.matches)return;
   const targets=Array.from(root.querySelectorAll<HTMLElement>('.slide-eyebrow,.hero-copy>h2,.hero-copy>p,.slide-item,.free-object,.side-image-panel,.artwork-position,.statement-arrow'));
   const visible=targets.filter(el=>{const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none'||!el.getClientRects().length){seen.delete(el);active.get(el)?.cancel();return false;}return !seen.has(el);});
   visible.forEach((el,i)=>{
    seen.add(el);if(m.entrance==='none')return;
    const opacity=Number(getComputedStyle(el).opacity);
    const frames:Keyframe[]=m.entrance==='rise'?[{opacity:0,translate:`0 ${move}px`},{opacity,translate:'0 0'}]:m.entrance==='zoom'?[{opacity:0,scale:startScale},{opacity,scale:1}]:[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity,clipPath:'inset(0 0% 0 0)'}];
    run(el,frames,i*Math.min(duration*.16,800/Math.max(1,visible.length-1)));
   });
  };
  if(!reduced.matches&&m.transition!=='none'){
   const frames:Keyframe[]=m.transition==='push'?[{opacity:0,translate:`${move}px 0`},{opacity:1,translate:'0 0'}]:m.transition==='zoom'?[{opacity:0,scale:startScale},{opacity:1,scale:1}]:[{opacity:0},{opacity:1}];
   run(root,frames);
  }
  const onPreference=()=>{cancel();if(!reduced.matches)scan();};
  reduced.addEventListener('change',onPreference);
  engine.current={scan,animations};scan();
  return()=>{cancel();reduced.removeEventListener('change',onPreference);engine.current=null;};
 },[host,slide.id,settings,enabled]);
 // クリックで新たに現れた要素だけを再生する。既存要素は動かさない。
 useLayoutEffect(()=>{engine.current?.scan();},[step,slide.objects]);
 useLayoutEffect(()=>{engine.current?.animations.forEach(a=>{if(a.playState==='finished'||a.playState==='idle')return;if(playing)a.play();else a.pause();});},[playing]);
}
