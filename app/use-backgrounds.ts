'use client';
import {useEffect,useState} from 'react';
export type BackgroundId='bg_1'|'bg_2'|'bg_3'|'bg_4'|'bg_5'|'bg_6'|'public-blue'|'public-green'|'public-orange'|'public-sunshine'|'public-hearts';
export function useBackgrounds(){const [ids,setIds]=useState<BackgroundId[]>([]);useEffect(()=>{const c=new AbortController();fetch('/api/backgrounds',{signal:c.signal}).then(r=>r.json()).then(data=>{if(Array.isArray(data))setIds(data.filter((s):s is BackgroundId=>typeof s==='string'&&/^(bg_[1-6]|public-(blue|green|orange|sunshine|hearts))$/.test(s)));}).catch(()=>{});return()=>c.abort();},[]);return ids;}

export const backgroundLabels:Record<string,string>={'public-blue':'ブルーウェーブ','public-green':'グリーンウェーブ','public-orange':'オレンジジオメトリ','public-sunshine':'サンシャイン','public-hearts':'ピンクハート'};

export function defaultBackground(ids:BackgroundId[]):BackgroundId|'none'{return ids.includes('bg_2')?'bg_2':ids.includes('public-blue')?'public-blue':'none';}
