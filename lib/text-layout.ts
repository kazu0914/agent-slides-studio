import type {SlideObject} from './objects';

export function textLayout(object: SlideObject, imported = false) {
  // 旧版で取り込んだ文字枠には、PowerPointの既定のはみ出し表示を適用する。
  return object.textLayout ?? {
    wrap: true, autoFit: 'none' as const,
    overflowX: imported ? 'visible' as const : 'clip' as const,
    overflowY: imported ? 'visible' as const : 'clip' as const,
  };
}
