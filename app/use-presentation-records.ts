"use client";
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {strokeSchema,type Stroke} from '@/lib/model';
const recordSchema=z.record(z.object({memo:z.string().max(10000),ink:z.array(strokeSchema).max(100)}));
export type PresentationRecords=z.infer<typeof recordSchema>;
export function usePresentationRecords(deckId:string){
  const key=`studio-presentation-v1:${deckId}`;
  const [records,setRecords]=useState<PresentationRecords>({});
  const [status,setStatus]=useState('読込中…');
  const current=useRef<PresentationRecords>({});
  const ready=useRef(false);
  useEffect(()=>{
    ready.current=false;
    try {const value=recordSchema.parse(JSON.parse(localStorage.getItem(key)||'{}'));current.current=value;setRecords(value);setStatus('このブラウザに自動保存');ready.current=true;}
    catch {setStatus('保存データを読み込めません。ブラウザの保存設定を確認してください。');}
  },[key]);
  useEffect(()=>{
    const before=(e:BeforeUnloadEvent)=>{if(status.startsWith('保存できません')){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',before);
    return()=>window.removeEventListener('beforeunload',before);
  },[status]);
  function update(id:string,patch:{memo?:string;ink?:Stroke[]}){
    if(!ready.current)return;
    // Reactの状態更新と分け、入力直後の再読み込みでも失われないよう同期保存する。
    const value={...current.current,[id]:{...(current.current[id]||{memo:'',ink:[]}),...patch}};
    current.current=value;setRecords(value);
    try{localStorage.setItem(key,JSON.stringify(value));setStatus('このブラウザに保存済み');}
    catch{setStatus('保存できませんでした。画面を閉じずにメモをコピーしてください。');}
  }
  return {records,update,status};
}
