import type {Slide} from './model';
export function chooseBackground(slide:Slide,choice:{theme:Slide['theme']}|{template:NonNullable<Slide['backgroundTemplate']>}):Slide{
 const objects=slide.objects||[];
 const first=objects.find(o=>!o.hidden);
 const covered=slide.imported&&first&&(first.kind==='image'||first.kind==='shape'&&first.shape==='rectangle'&&first.fill!=='none'&&(first.fillOpacity??1)===1)&&Math.abs(first.x)<1&&Math.abs(first.y)<1&&Math.abs(first.w-1600)<1&&Math.abs(first.h-900)<1&&!first.rotation&&first.opacity===1;
 const original=slide.backgroundOriginal??{theme:slide.theme,color:slide.backgroundColor,template:slide.backgroundTemplate,hiddenIds:covered?[first.id]:[]};
 return {...slide,backgroundOriginal:original,backgroundColor:undefined,...('theme'in choice?{theme:choice.theme,backgroundTemplate:'none' as const}:{backgroundTemplate:choice.template}),objects:objects.map(o=>original.hiddenIds.includes(o.id)?{...o,hidden:true}:o)};
}
export function restoreBackground(slide:Slide):Slide{
 const original=slide.backgroundOriginal;
 if(!original)return {...slide,backgroundTemplate:'none'};
 return {...slide,theme:original.theme,backgroundColor:original.color,backgroundTemplate:original.template,backgroundOriginal:undefined,objects:(slide.objects||[]).map(o=>original.hiddenIds.includes(o.id)?{...o,hidden:false}:o)};
}
