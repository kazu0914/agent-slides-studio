import {z} from 'zod';
export const fontFamilies=['Hiragino Sans','Noto Sans JP','Arial','Georgia','Times New Roman','Courier New'] as const;
export const textStyleSchema=z.object({fontFamily:z.enum(fontFamilies).optional(),fontSize:z.number().min(6).max(160).optional(),bold:z.boolean().optional(),italic:z.boolean().optional(),underline:z.boolean().optional(),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),align:z.enum(['left','center','right']).optional(),lineHeight:z.number().min(.8).max(3).optional()});
export type TextStyle=z.infer<typeof textStyleSchema>;
export const objectSchema=z.object({
 id:z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),name:z.string().max(100),kind:z.enum(['text','image','shape','table','chart','motion']),
 x:z.number().min(-1600).max(3200),y:z.number().min(-900).max(1800),w:z.number().min(1).max(3200),h:z.number().min(1).max(1800),
 rotation:z.number().min(-360).max(360).default(0),opacity:z.number().min(0).max(1).default(1),locked:z.boolean().default(false),hidden:z.boolean().default(false),groupId:z.string().max(80).optional(),
 customSvg:z.string().max(100000).optional(),
 appearAt:z.number().int().min(0).max(100).optional(),
 fillOpacity:z.number().min(0).max(1).optional(),strokeWidth:z.number().min(0).max(100).optional(),verticalAlign:z.enum(['top','center','bottom']).optional(),
 text:z.string().max(12000).default(''),style:textStyleSchema.default({}),
 src:z.string().regex(/^\/api\/assets\/[a-f0-9-]+\.(png|jpg|webp)$/).optional(),fit:z.enum(['contain','cover']).default('contain'),cropX:z.number().min(0).max(100).default(50),cropY:z.number().min(0).max(100).default(50),
 shape:z.enum(['rectangle','ellipse','arrow','line']).default('rectangle'),fill:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#e8efff'),stroke:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2454ef'),
 cells:z.array(z.array(z.string().max(2000)).min(1).max(12)).max(30).default([]),
 chartType:z.enum(['bar','line','pie']).default('bar'),motion:z.enum(['holo-cards','holo-database','holo-server','holo-target','holo-funnel','holo-pyramid','holo-solar','holo-gears','holo-platform','holo-honeycomb','holo-equalizer','holo-prism','holo-chart','holo-network','holo-flow','holo-grid','holo-document','holo-shield','holo-cloud','holo-compare','holo-timeline','orbit','arrow','cube','globe','rings','helix','crystal','wave','particles','pulse','bars']).default('cube'),duration:z.number().min(2).max(120).default(16)
}).superRefine((o,c)=>{if(o.kind==='image'&&!o.src)c.addIssue({code:'custom',message:'画像がありません'});if((o.kind==='table'||o.kind==='chart')&&(!o.cells.length||o.cells.some(r=>r.length!==o.cells[0].length)))c.addIssue({code:'custom',message:'表の列数を揃えてください'});if(o.kind==='chart'&&(o.cells.length<2||o.cells[0].length<2||o.cells.slice(1).some(r=>r.slice(1).some(v=>!v.trim()||!Number.isFinite(Number(v))))))c.addIssue({code:'custom',message:'グラフの2行目以降には数値を入力してください'});});
export type SlideObject=z.infer<typeof objectSchema>;
export function makeObject(kind:SlideObject['kind']):SlideObject {return objectSchema.parse({id:crypto.randomUUID(),name:{text:'テキスト',image:'画像',shape:'図形',table:'表',chart:'グラフ',motion:'アニメーション'}[kind],kind,x:320,y:230,w:kind==='text'?700:600,h:kind==='text'?160:360,text:kind==='text'?'テキストを入力':'',style:{fontSize:kind==='text'?32:16,color:'#17233b'},fill:kind==='motion'?'#2454ef':'#e8efff',...(kind==='table'||kind==='chart'?{cells:[['項目','値'],['A','0'],['B','0'],['C','0']]}:{})});}
export function parseGrid(value:string):string[][]{
 const sep=value.includes('\t')?'\t':',';const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<value.length;i++){const ch=value[i];if(ch==='"'){if(quoted&&value[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(ch===sep&&!quoted){row.push(field);field='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&value[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}else field+=ch;}
 if(quoted)throw Error('CSVの引用符が閉じられていません');if(field||row.length){row.push(field);rows.push(row);}if(!rows.length)throw Error('データを入力してください');const width=Math.max(...rows.map(r=>r.length));if(width>12||rows.length>30)throw Error('表は30行・12列までです');return rows.map(r=>[...r,...Array(width-r.length).fill('')]);
}
