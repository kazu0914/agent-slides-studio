import type {Slide} from './model';
export const layoutPatterns = [
 ['image-right','右画像・70/30','左に文章、右3割に画像を配置'],
 ['hero','表紙','大きなタイトルとビジュアル'],['statement','メッセージ','ひとつの主張を伝える'],
 ['cards','カード','複数のポイントを並列に'],['flow','フロー','作業の流れや手順'],
 ['comparison','比較','選択肢やBefore / After'],['metrics','数値・実績','指標を大きく見せる'],
 ['timeline','タイムライン','予定や変化を時系列で'],['agenda','目次・要点','項目を縦に整理'],
 ['quote','引用・結論','言葉を中央で強調'],['section','章扉','話題の切り替え'],
] as const;
export const hasLayoutItems=(layout:string)=>['cards','flow','comparison','metrics','timeline','agenda'].includes(layout);
export function defaultLayoutItems(layout:Slide['layout']) {
 const titles=layout==='comparison'?['選択肢 A','選択肢 B']:layout==='metrics'?['指標 1','指標 2','指標 3']:layout==='timeline'?['時期 1','時期 2','時期 3','時期 4']:layout==='agenda'?['テーマ 1','テーマ 2','テーマ 3','テーマ 4']:['ポイント 1','ポイント 2','ポイント 3'];
 return titles.map(title=>({title,body:layout==='metrics'?'数値・単位と説明を入力':'説明を入力'}));
}
