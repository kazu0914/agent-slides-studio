import type {CSSProperties} from 'react';
export const layerPresets = [
 ['holo-cards','3D カード','情報を整理するカード'],
 ['holo-chart','3D グラフ','成長や実績の説明'],
 ['holo-network','3D ネットワーク','連携・チーム・AIの構成'],
 ['holo-flow','3D フロー','処理や業務の流れ'],
 ['holo-grid','3D モジュール','機能やサービスの組み合わせ'],
 ['holo-document','3D ドキュメント','資料・知識・情報の整理'],
 ['holo-shield','3D セキュリティ','保護・信頼・安全性'],
 ['holo-cloud','3D クラウド','クラウド基盤・データ連携'],
 ['holo-compare','3D 比較','2つの選択肢や改善前後'],
 ['holo-timeline','3D タイムライン','計画・進捗・ロードマップ'],
] as const;
function Drawing({kind}:{kind:string}) {
 switch(kind){
 case 'holo-chart':return <><path d="M55 40V180H350"/><path className="layer-draw" d="M70 154L130 131L190 142L250 89L330 46"/><g className="layer-fill">{[52,81,114,144].map((h,i)=><rect key={i} x={85+i*65} y={180-h} width="32" height={h} rx="5" style={{animationDelay:`${i*-.7}s`}}/>)}</g></>;
 case 'holo-network':return <><g className="layer-draw"><path d="M200 110L90 55M200 110L315 55M200 110L95 170M200 110L310 170M90 55L315 55M95 170L310 170"/></g>{[[200,110,29],[90,55,17],[315,55,17],[95,170,17],[310,170,17]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} className="layer-node" style={{animationDelay:`${i*-.8}s`}}/>)}</>;
 case 'holo-flow':return <>{[40,155,270].map((x,i)=><g key={x}><rect x={x} y="70" width="88" height="80" rx="12" className="layer-node" style={{animationDelay:`${i*-1}s`}}/><path d={`M${x+22} 100h44m-44 18h28`}/>{i<2&&<path className="layer-draw" d={`M${x+94} 110h17m-6-6 6 6-6 6`}/>}</g>)}</>;
 case 'holo-grid':return <>{Array.from({length:6},(_,i)=><g key={i} className="layer-node" style={{animationDelay:`${i*-.5}s`}}><rect x={66+i%3*95} y={40+Math.floor(i/3)*82} width="76" height="65" rx="10"/><path d={`M${91+i%3*95} ${72+Math.floor(i/3)*82}h26m-13-13v26`}/></g>)}</>;
 case 'holo-document':return <>{[0,1,2].map(i=><g key={i} transform={`translate(${70+i*85} ${52-i*9})`}><rect width="100" height="126" rx="7" className="layer-solid"/><path className="layer-draw" d="M20 30h60m-60 22h50m-50 22h60m-60 22h36"/></g>)}</>;
 case 'holo-shield':return <><path className="layer-node" d="M200 30L275 58V110Q274 163 200 194Q126 163 125 110V58Z"/><path className="layer-draw" d="M163 111l25 25 49-53"/><path opacity=".3" d="M92 62v98m-15-83h30m201-15v98m-15-23h30"/></>;
 case 'holo-cloud':return <><path className="layer-node" d="M130 125C79 125 77 69 116 65C126 18 198 19 216 62C258 34 298 67 282 95C320 106 300 139 274 139H133"/><path className="layer-draw" d="M150 140v33H92m108-33v46m50-46v33h58"/>{[80,188,296].map(x=><rect key={x} x={x} y="180" width="24" height="18" rx="4"/>)}</>;
 case 'holo-compare':return <>{[65,225].map((x,i)=><g key={x}><rect x={x} y="38" width="110" height="144" rx="10"/><path d={`M${x+20} 65h70`}/>{[0,1,2].map(j=><rect key={j} className="layer-fill" x={x+20} y={85+j*26} width={i?70-j*7:30+j*8} height="10" rx="4"/>)}</g>)}<path opacity=".4" d="M200 40v140"/></>;
 case 'holo-timeline':return <><path className="layer-draw" d="M50 110H350"/>{[75,155,235,315].map((x,i)=><g key={x}><circle className="layer-node" cx={x} cy="110" r="12" style={{animationDelay:`${i*-.7}s`}}/><path d={`M${x} ${i%2?125:95}v${i%2?30:-30}m-20 0h40`}/></g>)}</>;
 default:return <>{[0,1,2].map(i=><g key={i} transform={`translate(${65+i*88} ${66-i*9})`}><rect className="layer-solid" width="105" height="105" rx="10"/><rect className="layer-fill" x="15" y="17" width="30" height="22" rx="4"/><path className="layer-draw" d="M15 58h75m-75 16h52"/></g>)}</>;
 }
}
export function RichLayers({kind}:{kind:string}) {
 return <div className="rich-layer-scene" aria-hidden="true"><div className="rich-layer-stack">{[2,1,0].map(layer=><div className="rich-layer-card" key={layer} style={{'--layer':layer} as CSSProperties}>{layer===0&&<><div className="rich-layer-dots"><i/><i/><i/></div><svg viewBox="0 0 400 220" className="rich-layer-drawing"><Drawing kind={kind}/></svg><div className="rich-layer-sheen"/></>}</div>)}</div></div>;
}
