import type {CSSProperties} from 'react';
export const extraMotionPresets=[
 ['holo-database','3D データベース','積層したデータが上下に循環'],
 ['holo-server','3D サーバー','機器が浮遊しインジケーターが点灯'],
 ['holo-target','3D ターゲット','同心円が奥行き方向に波打つ'],
 ['holo-funnel','3D ファネル','段階的に絞り込む流れ'],
 ['holo-pyramid','3D ピラミッド','階層が分離して再集合'],
 ['holo-solar','3D 軌道システム','中心を巡る複数の衛星'],
 ['holo-gears','3D ギア','連動して回転する歯車'],
 ['holo-platform','3D プラットフォーム','基盤の上に機能層が浮遊'],
 ['holo-honeycomb','3D ハニカム','六角形のユニットが順に浮上'],
 ['holo-equalizer','3D イコライザー','音や情報に見立てた立体の波'],
 ['holo-prism','3D プリズム','透明な結晶が回転し光が移る'],
] as const;
export function ExtraMotion({kind}:{kind:string}){
 const count:Record<string,number>={'holo-database':4,'holo-server':4,'holo-target':4,'holo-funnel':5,'holo-pyramid':4,'holo-solar':4,'holo-gears':3,'holo-platform':4,'holo-honeycomb':7,'holo-equalizer':11,'holo-prism':6};
 return <div className={`extra-stage extra-${kind}`}>
 {Array.from({length:count[kind]},(_,i)=><div key={i} className="extra-part" style={{'--i':i,'--x':Math.cos(i*Math.PI/3),'--y':Math.sin(i*Math.PI/3)} as CSSProperties}>
 {kind==='holo-gears'?<svg viewBox="0 0 120 120"><path d="M50 7h20l3 15 10 5 14-5 10 17-11 11v12l11 11-10 17-14-5-10 5-3 15H50l-3-15-10-5-14 5-10-17 11-11V50L13 39l10-17 14 5 10-5Z"/><circle cx="60" cy="56" r="20"/></svg>:<><span className="extra-face"/><span className="extra-edge"/><span className="extra-light"/></>}
 </div>)}
 </div>;
}
