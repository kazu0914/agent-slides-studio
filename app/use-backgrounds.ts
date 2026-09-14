'use client';
import {useEffect,useState} from 'react';
export type BackgroundId='bg_1'|'bg_2'|'bg_3'|'bg_4'|'bg_5'|'bg_6';
export function useBackgrounds(){const [ids,setIds]=useState<BackgroundId[]>([]);useEffect(()=>{const c=new AbortController();fetch('/api/backgrounds',{signal:c.signal}).then(r=>r.json()).then(data=>{if(Array.isArray(data))setIds(data.filter((s):s is BackgroundId=>typeof s==='string'&&/^bg_[1-6]$/.test(s)));}).catch(()=>{});return()=>c.abort();},[]);return ids;}
