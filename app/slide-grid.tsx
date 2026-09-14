'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {X} from 'lucide-react';
import type {Slide} from '@/lib/model';
export default function SlideGrid({slides,selected,onClose,onSelect,thumbnail}:{slides:Slide[];selected:number;onClose:()=>void;onSelect:(index:number)=>void;thumbnail:(slide:Slide,index:number)=>ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [size,setSize]=useState(260);
 useEffect(()=>{const el=dialog.current;const previous=document.activeElement as HTMLElement|null;el?.showModal();el?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();return()=>{el?.close();previous?.focus();};},[]);
 return <dialog ref={dialog} className="slide-grid-dialog" aria-modal="true" aria-labelledby="slide-grid-title" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()} onCopy={e=>e.stopPropagation()} onPaste={e=>e.stopPropagation()}>
  <header className="slide-grid-header"><div><h2 id="slide-grid-title">スライド一覧</h2><p>{slides.length}枚 · クリックで選択し、閉じると編集に戻ります</p></div><label>表示サイズ<input aria-label="一覧の表示サイズ" type="range" min="180" max="380" step="20" value={size} onChange={e=>setSize(Number(e.target.value))}/></label><button type="button" onClick={onClose} aria-label="グリッドビューを閉じる"><X size={20}/>グリッドビューを閉じる</button></header>
  <div className="slide-grid-list" style={{'--grid-thumbnail-size':`${size}px`} as CSSProperties}>
   {slides.map((slide,index)=><button type="button" className="slide-grid-card" key={slide.id} aria-pressed={selected===index} aria-current={selected===index?'true':undefined} aria-label={`スライド ${index+1} を選択: ${slide.title.replaceAll('\n',' ')}`} onClick={()=>onSelect(index)}>{thumbnail(slide,index)}<span className="slide-grid-caption"><b>{index+1}</b><span>{slide.title.replaceAll('\n',' ')||'無題のスライド'}</span></span></button>)}
  </div>
 </dialog>;
}
