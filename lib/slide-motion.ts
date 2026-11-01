import {z} from 'zod';
export const slideMotionSchema=z.object({
 entrance:z.enum(['none','rise','zoom','wipe']),
 transition:z.enum(['none','fade','push','zoom']),
 intensity:z.enum(['gentle','standard','bold']).default('standard'),
 tempo:z.enum(['slow','normal','fast']).default('normal'),
});
export type SlideMotion=z.infer<typeof slideMotionSchema>;
export const motionLooks:{id:string;name:string;description:string;value:SlideMotion}[]=[
 {id:'clear',name:'すっきり',description:'軽く浮かび上がり、フェードで切り替え',value:{entrance:'rise',transition:'fade',intensity:'gentle',tempo:'normal'}},
 {id:'dynamic',name:'ダイナミック',description:'文字とカードを順にズームイン',value:{entrance:'zoom',transition:'zoom',intensity:'bold',tempo:'normal'}},
 {id:'cinema',name:'シネマ',description:'横から現れ、スライドも横に切り替え',value:{entrance:'wipe',transition:'push',intensity:'standard',tempo:'slow'}},
];
export const noSlideMotion:SlideMotion={entrance:'none',transition:'none',intensity:'standard',tempo:'normal'};
export function motionTiming(m:SlideMotion){return {duration:{slow:900,normal:600,fast:380}[m.tempo],distance:{gentle:24,standard:54,bold:90}[m.intensity],startScale:{gentle:.97,standard:.91,bold:.82}[m.intensity]};}
