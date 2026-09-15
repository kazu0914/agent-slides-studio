'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {MessageSquareText,X} from 'lucide-react';

// 公開用Googleフォームの回答URLを設定する。空欄の場合は準備中の案内を表示する。
export const feedbackFormUrl = 'https://forms.gle/fMm5EBzB4p49AE5w6';

export default function FeedbackButton(){
 const [open,setOpen]=useState(false);
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopImmediatePropagation();setOpen(false);button.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
 },[open]);
 return <div className="feedback-widget" ref={root}>
  {open&&<div id={id} className="feedback-popover" role="region" aria-label="フィードバックのご案内">
   <button type="button" className="feedback-close" aria-label="案内を閉じる" onClick={()=>{setOpen(false);button.current?.focus();}}><X size={16}/></button>
   <strong>不具合・要望を送る</strong><p>お問い合わせフォームは準備中です。</p><small>公開後はGoogleフォームを別タブで開きます。</small>
  </div>}
  {feedbackFormUrl?<a className="feedback-trigger" href={feedbackFormUrl} target="_blank" rel="noopener noreferrer" aria-label="不具合・要望を送る（Googleフォームを別タブで開く）"><MessageSquareText size={18}/></a>:<button ref={button} type="button" className="feedback-trigger" aria-label="不具合・要望を送る" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}><MessageSquareText size={18}/></button>}
  {!open&&<span className="feedback-hint">不具合・要望を送る</span>}
 </div>;
}
