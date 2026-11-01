'use client';
import {useRef,useState} from 'react';
export function FlowNumberInput({label,value,min,max,integer=false,onChange}:{label:string;value:number;min:number;max:number;integer?:boolean;onChange:(value:number)=>void}){
 const [input,setInput]=useState<{base:number;text:string}|null>(null);const cancel=useRef(false);
 const draft=input?.base===value?input.text:null;
 const setDraft=(text:string|null)=>setInput(text===null?null:{base:value,text});
 const normalize=(n:number)=>Math.min(max,Math.max(min,integer?Math.round(n):n));
 return <input aria-label={label} type="text" inputMode={integer?'numeric':'decimal'} role="spinbutton" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} title={`${min}〜${max}。Enterまたは欄の外をクリックして確定`} value={draft??String(value)}
  onFocus={()=>{cancel.current=false;setDraft(String(value));}} onChange={e=>setDraft(e.target.value)}
  onBlur={()=>{const text=draft?.trim();if(!cancel.current&&text&&/^-?\d+(?:\.\d*)?$/.test(text)){const n=Number(text);if(Number.isFinite(n)&&normalize(n)!==value)onChange(normalize(n));}cancel.current=false;setDraft(null);}}
  onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel.current=true;e.currentTarget.blur();}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const n=Number(draft);setDraft(String(normalize((draft?.trim()&&Number.isFinite(n)?n:value)+(e.key==='ArrowUp'?1:-1))));}}}/>;
}
