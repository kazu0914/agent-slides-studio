import {DOMParser, type Element} from '@xmldom/xmldom';
import {unzipSync} from 'fflate';
import {posix} from 'node:path';
import {randomUUID} from 'node:crypto';
import {deckSchema} from '../lib/model';
import {objectSchema, fontFamilies, type SlideObject} from '../lib/objects';

const children=(el:Element|null|undefined,name?:string):Element[]=>el?Array.from(el.childNodes).filter((n):n is Element=>n.nodeType===1&&(!name||(n as Element).localName===name)):[];
const child=(el:Element|null|undefined,name:string)=>children(el,name)[0];
const descendants=(el:Element|undefined,name:string):Element[]=>el?Array.from(el.getElementsByTagName('*')).filter(n=>n.localName===name):[];
const attr=(el:Element|undefined,name:string,fallback='')=>el?.getAttribute(name)||fallback;
const num=(el:Element|undefined,name:string,fallback=0)=>Number(attr(el,name,String(fallback)));
const color=(el:Element|undefined,fallback='#17233b')=>{const v=attr(child(el,'srgbClr'),'val')||attr(child(el,'sysClr'),'lastClr');return /^[0-9a-f]{6}$/i.test(v)?'#'+v:fallback;};
const text=(el:Element|undefined)=>children(el,'p').map(p=>children(p).map(r=>r.localName==='br'?'\n':r.localName==='r'||r.localName==='fld'?child(r,'t')?.textContent||'':'').join('')).join('\n');

// ZIPは展開前に件数と宣言サイズを制限し、外部参照は読み込まない。
export function importPptx(bytes:Uint8Array,name:string,saveImage:(data:string)=>string){
 if(!bytes.length||bytes.length>50*1024*1024)throw Error('PPTXは50MBまでです');
 let total=0,count=0;
 const files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(++count>5000||f.originalSize>30*1024*1024||total>200*1024*1024)throw Error('展開後のPPTXが大きすぎます');return true;}});
 const xml=(path:string)=>{const b=files[path];if(!b)throw Error('PPTX内の必要なファイルがありません: '+path);if(b.length>10*1024*1024)throw Error('XMLが大きすぎます');const s=new TextDecoder().decode(b);if(/<!DOCTYPE|<!ENTITY/i.test(s))throw Error('特殊なXML宣言には対応していません');return new DOMParser({onError:()=>{throw Error('PPTXのXMLが不正です');}}).parseFromString(s,'application/xml').documentElement!;};
 const rels=(path:string)=>{const rp=posix.join(posix.dirname(path),'_rels',posix.basename(path)+'.rels');return files[rp]?children(xml(rp)).filter(r=>attr(r,'TargetMode')!=='External').map(r=>({id:attr(r,'Id'),type:attr(r,'Type'),path:attr(r,'Target').startsWith('/')?attr(r,'Target').slice(1):posix.normalize(posix.join(posix.dirname(path),attr(r,'Target')))})):[];};
 const presentation=xml('ppt/presentation.xml'),size=child(presentation,'sldSz');const sw=num(size,'cx'),sh=num(size,'cy');if(sw<=0||sh<=0)throw Error('スライドサイズを読み取れません');
 const scale=Math.min(1600/sw,900/sh),ox=(1600-sw*scale)/2,oy=(900-sh*scale)/2;
 const warnings=new Set<string>();if(Math.abs(sw/sh-16/9)>.01)warnings.add('元の縦横比を保って16:9の中央に配置しています。');
 const refs=rels('ppt/presentation.xml');const ids=children(child(presentation,'sldIdLst'),'sldId');if(!ids.length||ids.length>50)throw Error('PPTXは1〜50枚に対応しています');
 const media=new Map<string,string>();
 const slides=ids.map((id,index)=>{
  const path=refs.find(r=>r.id===attr(id,'r:id'))?.path;if(!path)throw Error('スライドの参照が不正です');const root=xml(path),cs=child(root,'cSld'),tree=child(cs,'spTree'),relationships=rels(path);const objects:SlideObject[]=[];
  const warn=(message:string)=>warnings.add(`${index+1}枚目: ${message}`);
  const add=(value:Record<string,unknown>)=>{if(objects.length>=100)throw Error(`${index+1}枚目の要素数が100を超えています`);objects.push(objectSchema.parse({id:randomUUID(),...value}));};
  const walk=(parent:Element|undefined,tx=ox,ty=oy,sx=scale,sy=scale,groupId?:string,depth=0)=>{
   if(depth>32)throw Error('PPTXのグループ階層が深すぎます');
   for(const node of children(parent)){
    const kind=node.localName||'';if(['nvGrpSpPr','grpSpPr'].includes(kind))continue;
    const sp=child(node,'spPr'),xf=child(sp,'xfrm')||child(node,'xfrm');
    if(kind==='grpSp'){const gx=child(child(node,'grpSpPr'),'xfrm'),off=child(gx,'off'),ext=child(gx,'ext'),co=child(gx,'chOff'),ce=child(gx,'chExt');const nsx=sx*num(ext,'cx',1)/num(ce,'cx',1),nsy=sy*num(ext,'cy',1)/num(ce,'cy',1);if(num(gx,'rot'))warn('グループの回転は再現されません。');walk(node,tx+num(off,'x')*sx-num(co,'x')*nsx,ty+num(off,'y')*sy-num(co,'y')*nsy,nsx,nsy,randomUUID(),depth+1);continue;}
    if(!['sp','pic','cxnSp','graphicFrame'].includes(kind)){warn(`${kind}は未対応のため省略しました。`);continue;}
    if(!xf){warn('マスター由来の位置情報を持つ要素を省略しました。');continue;}
    const off=child(xf,'off'),ext=child(xf,'ext');const box={x:tx+num(off,'x')*sx,y:ty+num(off,'y')*sy,w:Math.max(1,num(ext,'cx')*sx),h:Math.max(1,num(ext,'cy')*sy),rotation:num(xf,'rot')/60000,groupId};
    if(attr(xf,'flipH')==='1'||attr(xf,'flipV')==='1')warn('要素の反転は再現されません。');
    const objectName=attr(descendants(node,'cNvPr')[0],'name')||`要素 ${objects.length+1}`;
    const fill=child(sp,'solidFill'),line=child(sp,'ln');
    if(descendants(node,'schemeClr').length)warn('テーマ色の一部を標準色に置き換えています。');
    if(descendants(node,'gradFill').length||descendants(node,'effectLst').some(e=>children(e).length))warn('グラデーション・影などの効果は簡略化しています。');
    if(kind==='pic'){
     const rid=attr(descendants(node,'blip')[0],'r:embed'),mp=relationships.find(r=>r.id===rid)?.path;const data=mp&&files[mp];const extension=mp?.split('.').pop()?.toLowerCase();
     if(!data||!['png','jpg','jpeg','webp'].includes(extension||'')){warn('対応していない画像または外部リンク画像を省略しました。');continue;}
     let src=media.get(mp!);if(!src){src=saveImage(`data:image/${extension==='jpg'?'jpeg':extension};base64,${Buffer.from(data).toString('base64')}`);media.set(mp!,src);}
     const crop=descendants(node,'srcRect')[0];if(crop&&['l','t','r','b'].some(k=>num(crop,k)>100))warn('画像のトリミングは中央寄せで近似しています。');
     add({...box,name:objectName,kind:'image',src,fit:'cover'});continue;
    }
    if(kind==='graphicFrame'){
     const tbl=descendants(node,'tbl')[0];if(tbl){const cells=children(tbl,'tr').map(row=>children(row,'tc').map(c=>text(child(c,'txBody'))));add({...box,name:objectName,kind:'table',cells,style:{fontSize:16},fill:'#e8efff'});warn('表の罫線・結合・書式は標準スタイルに置き換えています。');}else warn('グラフ・SmartArt・埋め込みオブジェクトは未対応です。');continue;
    }
    const txBody=child(node,'txBody'),value=text(txBody),geometry=attr(child(sp,'prstGeom'),'prst','rect');
    if(fill||kind==='cxnSp'||(line&&!child(line,'noFill'))){const shape=geometry==='ellipse'?'ellipse':geometry==='line'||kind==='cxnSp'?'line':geometry==='rightArrow'?'arrow':'rectangle';if(!['rect','roundRect','ellipse','line','rightArrow'].includes(geometry)||child(sp,'custGeom'))warn('一部の図形を四角形に置き換えています。');add({...box,name:objectName,kind:'shape',shape,fill:color(fill,'#ffffff'),fillOpacity:fill?num(child(child(fill,'srgbClr'),'alpha'),'val',100000)/100000:0,stroke:color(child(line,'solidFill'),'#17233b'),strokeWidth:line&&!child(line,'noFill')?num(line,'w',12700)*scale:0});}
    if(value){
     const p=children(txBody,'p')[0],pp=child(p,'pPr'),rp=child(child(p,'r'),'rPr')||child(pp,'defRPr');const body=child(txBody,'bodyPr');const originalFont=attr(child(rp,'ea'),'typeface')||attr(child(rp,'latin'),'typeface')||'Arial';const font=fontFamilies.includes(originalFont as typeof fontFamilies[number])?originalFont:'Hiragino Sans';if(font!==originalFont)warn(`フォント「${originalFont}」をHiragino Sansに置き換えました。`);
     const formats=new Set(descendants(txBody,'rPr').map(r=>r.toString()));if(formats.size>1)warn('同じテキスト枠内の混在書式は先頭の書式に統一しています。');
     const left=num(body,'lIns',91440)*sx,right=num(body,'rIns',91440)*sx,top=num(body,'tIns',45720)*sy,bottom=num(body,'bIns',45720)*sy;
     add({...box,x:box.x+left,y:box.y+top,w:Math.max(1,box.w-left-right),h:Math.max(1,box.h-top-bottom),name:value.slice(0,60),kind:'text',text:value,verticalAlign:attr(body,'anchor')==='ctr'?'center':attr(body,'anchor')==='b'?'bottom':'top',style:{fontFamily:font,fontSize:Math.max(6,Math.min(160,num(rp,'sz',1800)/100*12700*scale*.75)),bold:attr(rp,'b')==='1',italic:attr(rp,'i')==='1',underline:!!attr(rp,'u')&&attr(rp,'u')!=='none',color:color(child(rp,'solidFill')),align:attr(pp,'algn')==='ctr'?'center':attr(pp,'algn')==='r'?'right':'left',lineHeight:1.2}});
    }
   }
  };
  walk(tree);
  if(child(root,'timing')||child(root,'transition'))warn('アニメーション・画面切り替えは取り込まれません。');
  const layout=relationships.find(r=>r.type.endsWith('/slideLayout'));if(layout&&files[layout.path]){const lr=xml(layout.path);if(children(child(child(lr,'cSld'),'spTree')).some(n=>['sp','pic','grpSp'].includes(n.localName||'')&&!descendants(n,'ph').length))warn('スライドマスター／レイアウトの装飾は取り込まれません。');}
  const notesRef=relationships.find(r=>r.type.endsWith('/notesSlide'));let notes='';if(notesRef&&files[notesRef.path])notes=descendants(xml(notesRef.path),'sp').filter(n=>!['sldNum','hdr','ftr','dt','sldImg'].includes(attr(descendants(n,'ph')[0],'type'))).map(n=>text(child(n,'txBody'))).filter(Boolean).join('\n');
  if(notes.length>4000)throw Error(`${index+1}枚目のノートが4000文字を超えています`);
  return {id:randomUUID(),title:(objects.filter(o=>o.kind==='text').sort((a,b)=>(b.style.fontSize||0)-(a.style.fontSize||0))[0]?.text||`スライド ${index+1}`).slice(0,90),body:'',eyebrow:'',layout:'statement',theme:'white',animation:'none',artworkKind:'none',imported:true,backgroundColor:color(child(child(child(cs,'bg'),'bgPr'),'solidFill'),'#ffffff'),notes,objects,items:[],strokes:[]};
 });
 return {deck:deckSchema.parse({title:name.replace(/\.pptx$/i,'').slice(0,100)||'インポートしたスライド',slides}),warnings:[...warnings]};
}
