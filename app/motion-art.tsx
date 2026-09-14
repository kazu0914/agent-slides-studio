import {RichLayers,layerPresets} from './rich-layers';
import type { CSSProperties } from 'react';
export const motionPresets = [
  ...layerPresets,
  ['orbit','オービット','軌道が交差する'], ['cube','3D キューブ','透明な立方体が回転'],
  ['globe','3D グローブ','緯線・経線の球体'], ['rings','3D リング','立体リングが交差'],
  ['helix','3D ヘリックス','二重らせんが回転'], ['crystal','3D クリスタル','光る結晶が浮遊'],
  ['wave','ウェーブ','波が連続して流れる'], ['particles','パーティクル','光の粒子が浮遊'],
  ['pulse','パルス','同心円が広がる'], ['bars','スペクトラム','バーがリズミカルに動く'],
  ['arrow','矢印','方向を示す'], ['none','なし','装飾を非表示'],
] as const;
export function MotionArt({kind,strokeWidth=6}:{kind:string;strokeWidth?:number}) {
 if(kind.startsWith('holo-'))return <RichLayers kind={kind}/>;
 if(kind==='arrow')return <svg viewBox="0 0 200 120" style={{width:'100%',height:'100%',display:'block',color:'var(--art-color,#2454ef)'}} aria-hidden="true"><path d="M20 60H178M140 24L178 60 140 96" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/></svg>;
 if(kind==='orbit')return <div className="orbit-art" style={{inset:0,width:'100%',height:'100%'}}><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="orbit-dot"/><div className="orbit-core">F<span>FRAME</span></div></div>;
 return <div className={`motion-object object-${kind}`} aria-hidden="true">
  <div className="motion-space">
   {Array.from({length:kind==='cube'?6:kind==='crystal'?8:kind==='globe'?12:kind==='rings'?5:kind==='helix'?48:24},(_,i)=><i key={i} style={{'--i':i,'--j':i%24,'--side':i<24?0:180} as CSSProperties}/>)}
  </div>
 </div>;
}
