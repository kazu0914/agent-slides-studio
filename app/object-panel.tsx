import {motionPresets} from './motion-art';
'use client';
import {useEffect,useId,useRef,useState,type ButtonHTMLAttributes} from 'react';
import {createPortal} from 'react-dom';
import {type SlideObject,type TextStyle,fontFamilies,makeObject,parseGrid,objectSchema,safeLink} from '@/lib/objects';
function LayerAction({hint,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{hint:string}){
 const id=useId();
 const [anchor,setAnchor]=useState<{right:number;top:number;below:boolean}|null>(null);
 const show=(button:HTMLButtonElement)=>{const rect=button.getBoundingClientRect();setAnchor({right:Math.max(8,Math.min(window.innerWidth-rect.right,window.innerWidth-168)),top:rect.top<64?rect.bottom+8:rect.top-8,below:rect.top<64});};
 useEffect(()=>{
  if(!anchor)return;
  const close=()=>setAnchor(null);
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();close();}};
  window.addEventListener('scroll',close,true);window.addEventListener('resize',close);window.addEventListener('keydown',escape,true);
  return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);window.removeEventListener('keydown',escape,true);};
 },[anchor]);
 return <><button {...props} aria-describedby={anchor?id:undefined} onMouseEnter={e=>show(e.currentTarget)} onMouseLeave={()=>setAnchor(null)} onFocus={e=>show(e.currentTarget)} onBlur={()=>setAnchor(null)}/>{anchor&&createPortal(<div id={id} role="tooltip" className="layer-action-tooltip" style={{right:anchor.right,top:anchor.top,transform:anchor.below?'none':'translateY(-100%)'}}>{hint}</div>,document.body)}</>;
}
export async function uploadImage(file:File):Promise<string>{if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('PNG・JPEG・WebPを選んでください');if(file.size>10*1024*1024)throw Error('画像は10MBまでです');const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result as string);r.onerror=reject;r.readAsDataURL(file);});const r=await fetch('/api/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});const result=await r.json() as {src:string;error?:string};if(!r.ok)throw Error(result.error);return result.src;}
function FontSizeInput({value,onChange}:{value:number;onChange:(value:number)=>void}){
 const [input,setInput]=useState<string|null>(null);
 const cancel=useRef(false);
 const normalize=(n:number)=>Math.min(160,Math.max(6,n));
 return <input aria-label="文字サイズ (pt)" type="text" inputMode="decimal" role="spinbutton" aria-valuemin={6} aria-valuemax={160} aria-valuenow={value} title="6〜160 pt。Enterまたは欄の外をクリックして確定" value={input??String(value)}
  onFocus={()=>{cancel.current=false;setInput(String(value));}}
  onChange={e=>setInput(e.target.value)}
  onBlur={()=>{const raw=input?.trim();if(!cancel.current&&raw&&/^\d+(?:\.\d*)?$/.test(raw)){const n=Number(raw);if(Number.isFinite(n)&&normalize(n)!==value)onChange(normalize(n));}cancel.current=false;setInput(null);}}
  onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel.current=true;e.currentTarget.blur();}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const n=Number(input);setInput(String(normalize((input?.trim()&&Number.isFinite(n)?n:value)+(e.key==='ArrowUp'?1:-1))));}}}/>
}
function LinkControl({value,onChange}:{value:string;onChange:(href:string|undefined)=>void}){
 const [draft,setDraft]=useState(value),[error,setError]=useState('');
 useEffect(()=>{setDraft(value);setError('');},[value]);
 const apply=()=>{const raw=draft.trim(),url=raw&&!/^[a-z][a-z0-9+.-]*:/i.test(raw)?'https://'+raw:raw;if(url&&!safeLink(url)){setError('https://、http://、mailto: のURLを入力してください');return;}setError('');setDraft(url);onChange(url||undefined);};
 return <div><label>リンク先URL<input aria-label="リンク先URL" type="text" value={draft} maxLength={2048} placeholder="https://example.com" onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply();}}}/></label><div className="object-button-row"><button type="button" onClick={apply}>リンクを適用</button><button type="button" disabled={!value} onClick={()=>onChange(undefined)}>リンクを解除</button>{value&&<a href={value} target="_blank" rel="noopener noreferrer">リンクを開く ↗</a>}</div>{error&&<p role="alert">{error}</p>}<small>テキストボックス全体に設定します。プレゼン中にクリックで開けます。</small></div>;
}
export function TextStyleControls({style,onChange}:{style:TextStyle;onChange:(s:TextStyle)=>void}){return <div className="text-style-controls">
 <label>フォント<select aria-label="フォント" value={style.fontFamily||'Hiragino Sans'} onChange={e=>onChange({...style,fontFamily:e.target.value as TextStyle['fontFamily']})}>{fontFamilies.map(f=><option key={f}>{f}</option>)}</select></label>
 <div className="object-field-pair"><label>サイズ (pt)<FontSizeInput value={style.fontSize||32} onChange={fontSize=>onChange({...style,fontSize})}/></label><label>文字色<input aria-label="文字色" type="color" value={style.color||'#17233b'} onChange={e=>onChange({...style,color:e.target.value})}/></label></div>
 <div className="object-button-row">{(['bold','italic','underline'] as const).map((key,i)=><button type="button" key={key} aria-label={['太字','斜体','下線'][i]} aria-pressed={!!style[key]} onClick={()=>onChange({...style,[key]:!style[key]})}>{['B','I','U'][i]}</button>)}{(['left','center','right'] as const).map((align,i)=><button type="button" key={align} aria-label={['左揃え','中央揃え','右揃え'][i]} aria-pressed={(style.align||'left')===align} onClick={()=>onChange({...style,align})}>{['左','中','右'][i]}</button>)}</div>
 <label>行間<input type="range" aria-label="行間" min=".8" max="3" step=".1" value={style.lineHeight||1.5} onChange={e=>onChange({...style,lineHeight:Number(e.target.value)})}/></label>
 </div>;}
export function ObjectPanel({objects,selected,onSelect,onChange,onError,onImage}:{objects:SlideObject[];selected:string[];onSelect:(ids:string[])=>void;onChange:(objects:SlideObject[])=>void;onError:(message:string)=>void;onImage:(file:File,replaceId?:string)=>Promise<void>}){
 const [insertOpen,setInsertOpen]=useState(true),[layersOpen,setLayersOpen]=useState(true);
 const svgFile=useRef<HTMLInputElement>(null);
 const file=useRef<HTMLInputElement>(null),replace=useRef(false);const [busy,setBusy]=useState(false),[csv,setCsv]=useState('');const object=objects.find(o=>o.id===selected[0]);
 function change(patch:Partial<SlideObject>){onChange(objects.map(o=>selected.includes(o.id)&&!o.locked?{...o,...patch}:o));}
 function add(kind:SlideObject['kind']){const o=makeObject(kind);o.x+=Math.min(objects.length,12)*24;o.y+=Math.min(objects.length,12)*16;onChange([...objects,o]);onSelect([o.id]);}
 async function addSvg(file:File){
  try{
   if(file.size>100000)throw Error('SVGは100KB以下にしてください');
   const source=await file.text();const xml=new DOMParser().parseFromString(source,'image/svg+xml');
   if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg')throw Error('有効なSVGファイルを選んでください');
   if(xml.querySelector('script,foreignObject')||/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('スクリプトや外部文書を含まないSVGを選んでください');
   for(const el of Array.from(xml.querySelectorAll('*')))for(const attr of Array.from(el.attributes)){if(/^on/i.test(attr.name)||((attr.localName==='href')&&!attr.value.startsWith('#')))throw Error('イベント処理や外部参照を含まないSVGを選んでください');}
   if(objects.length>=100)throw Error('要素は100個までです');
   const o={...makeObject('motion'),name:file.name.replace(/\.svg$/i,'').slice(0,100),customSvg:source,w:640,h:360};onChange([...objects,o]);onSelect([o.id]);
  }catch(e){onError((e as Error).message);}
 }
 function layer(direction:number){if(!object)return;const next=[...objects],i=next.findIndex(o=>o.id===object.id),j=Math.max(0,Math.min(next.length-1,i+direction));[next[i],next[j]]=[next[j],next[i]];onChange(next);}
 async function image(file:File){setBusy(true);try{await onImage(file,replace.current?object?.id:undefined);}catch(e){onError((e as Error).message);}finally{setBusy(false);replace.current=false;}}
 return <section className="object-panel">
 <details className="object-section" open={insertOpen} onToggle={e=>setInsertOpen(e.currentTarget.open)}><summary>要素を追加</summary>
 <button type="button" onClick={()=>svgFile.current?.click()} disabled={objects.length>=100}>自作SVGアニメーションを追加</button><input ref={svgFile} type="file" accept=".svg,image/svg+xml" hidden aria-label="自作SVGファイル" onChange={e=>{if(e.target.files?.[0])void addSvg(e.target.files[0]);e.target.value='';}}/><p>SVGの動きをそのまま取り込みます。<a href="/samples/custom-motion.svg" download>サンプルSVG</a>を編集して作成できます。</p>
 <p>画像はキャンバスへドロップ、または ⌘V で貼り付け。文字はダブルクリックで直接編集できます。</p>
 <button type="button" className="object-image-upload" disabled={busy||objects.length>=100} onClick={()=>{replace.current=false;file.current?.click();}}><span>＋</span><span>{busy?"画像を読み込み中…":"画像を選んで追加"}<small>PNG・JPEG・WebP / ドロップ・⌘V にも対応</small></span></button>
 <div className="object-insert">{(['text','shape','table','chart','motion'] as const).map((kind,i)=><button type="button" key={kind} disabled={objects.length>=100} onClick={()=>add(kind)}>{['＋ テキスト','＋ 図形','＋ 表','＋ グラフ','＋ アニメーション'][i]}</button>)}<button type="button" disabled={busy||objects.length>=100} onClick={()=>{replace.current=false;file.current?.click();}}>{busy?'画像読込中…':'＋ 画像'}</button></div>
 </details>
 <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e=>{if(e.target.files?.[0])void image(e.target.files[0]);e.target.value='';}}/>
 <details className="object-section" open={layersOpen} onToggle={e=>setLayersOpen(e.currentTarget.open)}><summary>レイヤー（{objects.length}）</summary>
 {!objects.length&&<p>追加した要素がここに表示されます。</p>}
 {!!objects.length&&<><div className="layer-list" aria-label="レイヤー一覧">{[...objects].reverse().map(o=><div key={o.id} className={selected.includes(o.id)?'selected':''}><button type="button" onClick={e=>onSelect(e.shiftKey?[...new Set([...selected,o.id])]:o.groupId?objects.filter(x=>x.groupId===o.groupId).map(x=>x.id):[o.id])}>{o.groupId?'▣ ':''}{o.name}</button><LayerAction type="button" hint={o.hidden?'表示する':'非表示にする'} aria-label={`${o.name}を${o.hidden?'表示':'非表示'}`} onClick={()=>onChange(objects.map(x=>x.id===o.id?{...x,hidden:!x.hidden}:x))}>{o.hidden?'○':'●'}</LayerAction><LayerAction type="button" hint={o.locked?'ロックを解除':'ロックする'} aria-label={`${o.name}のロックを${o.locked?'解除':'設定'}`} onClick={()=>onChange(objects.map(x=>x.id===o.id?{...x,locked:!x.locked}:x))}>{o.locked?'🔒':'◇'}</LayerAction></div>)}</div>
 <div className="object-button-row"><button type="button" disabled={!object} onClick={()=>layer(1)}>前面へ</button><button type="button" disabled={!object} onClick={()=>layer(-1)}>背面へ</button><button type="button" disabled={!selected.length} onClick={()=>onChange(objects.filter(o=>!selected.includes(o.id)||o.locked))}>削除</button><button type="button" disabled={!object} onClick={()=>{const copy=objects.filter(o=>selected.includes(o.id)).map(o=>({...o,id:crypto.randomUUID(),groupId:undefined,x:o.x+24,y:o.y+24,locked:false}));onChange([...objects,...copy]);onSelect(copy.map(o=>o.id));}}>複製</button></div>
 <div className="object-button-row"><button type="button" disabled={selected.length<2} onClick={()=>change({groupId:crypto.randomUUID()})}>グループ化</button><button type="button" disabled={!object?.groupId} onClick={()=>change({groupId:undefined})}>解除</button><button type="button" disabled={!object} onClick={()=>onChange(objects.map(o=>selected.includes(o.id)&&!o.locked?{...o,x:(1600-o.w)/2}:o))}>左右中央</button><button type="button" disabled={!object} onClick={()=>onChange(objects.map(o=>selected.includes(o.id)&&!o.locked?{...o,y:(900-o.h)/2}:o))}>上下中央</button></div></>}
 </details>
 {object&&<fieldset disabled={object.locked} className="object-properties"><label>要素名<input aria-label="要素名" value={object.name} onChange={e=>change({name:e.target.value.slice(0,100)})}/></label>
 <label>クリック表示の順番（0＝最初から）<input aria-label="要素の表示順番" type="number" min="0" max="100" value={object.appearAt||0} onChange={e=>change({appearAt:Math.max(0,Math.min(100,Math.round(Number(e.target.value))))})}/></label><div className="object-geometry">{(['x','y','w','h','rotation','opacity'] as const).map((key,i)=><label key={key}>{['X','Y','幅','高さ','回転','不透明度'][i]}<input aria-label={`要素の${['X','Y','幅','高さ','回転','不透明度'][i]}`} type="number" step={key==='opacity'?'.05':'1'} value={Math.round(object[key]*100)/100} onChange={e=>{const value=Number(e.target.value);const test=objectSchema.safeParse({...object,[key]:value});if(test.success)change({[key]:value});}}/></label>)}</div>
 {object.kind==='text'&&<><LinkControl key={object.id} value={object.href||''} onChange={href=>change({href})}/><textarea aria-label="自由テキスト" value={object.text} rows={4} maxLength={12000} onChange={e=>change({text:e.target.value})}/><button type="button" onClick={()=>change({text:object.text.split('\n').map(t=>t.startsWith('• ')?t.slice(2):`• ${t}`).join('\n')})}>箇条書きを切替</button><TextStyleControls style={object.style} onChange={style=>change({style})}/><button type="button" onClick={()=>{const el=document.querySelector<HTMLElement>(`[data-free-object="${CSS.escape(object.id)}"] .free-object-body`);if(el){const ratio=Math.min(1,el.clientHeight/Math.max(el.scrollHeight,1),el.clientWidth/Math.max(el.scrollWidth,1));change({style:{...object.style,fontSize:Math.max(6,Math.floor((object.style.fontSize||32)*ratio*.95))}});}}}>文字を枠内に収める</button></>}
 {object.kind==='image'&&<><button type="button" onClick={()=>{replace.current=true;file.current?.click();}}>画像を差し替え</button><label>画像の表示<select aria-label="画像の表示" value={object.fit} onChange={e=>change({fit:e.target.value as 'cover'|'contain'})}><option value="contain">全体を表示</option><option value="cover">枠に合わせて切り抜く</option></select></label>{object.fit==='cover'&&<>{(['cropX','cropY'] as const).map((k,i)=><label key={k}>{i?'切り抜き位置・上下':'切り抜き位置・左右'}<input aria-label={i?'切り抜き位置・上下':'切り抜き位置・左右'} type="range" min="0" max="100" value={object[k]} onChange={e=>change({[k]:Number(e.target.value)})}/></label>)}</>}</>}
 {(object.kind==='shape'||object.kind==='motion'||object.kind==='table')&&<label>塗りの色<input aria-label="塗りの色" type="color" value={object.fill} onChange={e=>change({fill:e.target.value})}/></label>}
 {object.kind==='shape'&&<><label>形<select aria-label="図形の種類" value={object.shape} onChange={e=>change({shape:e.target.value as SlideObject['shape']})}><option value="rectangle">四角形</option><option value="ellipse">楕円</option><option value="arrow">矢印</option><option value="line">線</option></select></label><label>線の色<input aria-label="線の色" type="color" value={object.stroke} onChange={e=>change({stroke:e.target.value})}/></label></>}
 {(object.kind==='motion'&&object.motion==='arrow'&&!object.customSvg)&&<label>矢印の太さ<input type="range" aria-label="矢印の太さ" min="1" max="24" step="1" value={object.strokeWidth??6} onChange={e=>change({strokeWidth:Number(e.target.value)})}/><output>{object.strokeWidth??6}</output></label>}
 {object.kind==='motion'&&object.customSvg&&<p>自作SVG：色・動き・速度はSVGファイル内で指定します。位置・サイズ・回転は下の項目で調整できます。</p>}
 {object.kind==='motion'&&!object.customSvg&&<><label>種類<select value={object.motion} onChange={e=>change({motion:e.target.value as SlideObject['motion']})}>{motionPresets.filter(([kind])=>kind!=='none').map(([kind,name])=><option key={kind} value={kind}>{name}</option>)}</select></label><label>周期 (秒)<input type="range" min="2" max="120" value={object.duration} onChange={e=>change({duration:Number(e.target.value)})}/>{object.duration}</label></>}
 {(object.kind==='table'||object.kind==='chart')&&<>
 {object.kind==='chart'&&<label>グラフの種類<select aria-label="グラフの種類" value={object.chartType} onChange={e=>change({chartType:e.target.value as SlideObject['chartType']})}><option value="bar">棒グラフ</option><option value="line">折れ線グラフ</option><option value="pie">円グラフ</option></select></label>}
 <p>1行目は見出し。グラフは2列目以降を数値にします。円グラフは2列目の正数を使用します。</p>
 <div className="cell-editor"><table><tbody>{object.cells.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}><input aria-label={`セル ${i+1}-${j+1}`} value={v} onChange={e=>{const cells=object.cells.map(r=>[...r]);cells[i][j]=e.target.value;if(object.kind==='chart'&&i>0&&j>0&&(!e.target.value.trim()||!Number.isFinite(Number(e.target.value))))return;change({cells});}}/></td>)}</tr>)}</tbody></table></div>
 <div className="object-button-row"><button type="button" disabled={object.cells.length>=30} onClick={()=>change({cells:[...object.cells,object.cells[0].map((_,j)=>object.kind==='chart'&&j>0?'0':'')]})}>行＋</button><button type="button" disabled={object.cells.length<=2} onClick={()=>change({cells:object.cells.slice(0,-1)})}>行−</button><button type="button" disabled={object.cells[0].length>=12} onClick={()=>change({cells:object.cells.map((r,i)=>[...r,object.kind==='chart'&&i>0?'0':''])})}>列＋</button><button type="button" disabled={object.cells[0].length<=2} onClick={()=>change({cells:object.cells.map(r=>r.slice(0,-1))})}>列−</button></div>
 <textarea aria-label="CSV・表データ" placeholder="CSV または Excelからコピーした表を貼り付け" value={csv} onChange={e=>setCsv(e.target.value)} rows={3}/><button type="button" onClick={()=>{try{const cells=parseGrid(csv);const parsed=objectSchema.parse({...object,cells});change({cells:parsed.cells});setCsv('');onError('');}catch(e){onError(e instanceof Error?e.message:'データを確認してください');}}}>表データを適用</button>
 {object.kind==='table'&&<TextStyleControls style={object.style} onChange={style=>change({style})}/>}
 </>}
 </fieldset>}
 </section>;
}
