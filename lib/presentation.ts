import {type Slide} from './model';
export function steps(slide:Slide){return [...new Set([...Object.values(slide.revealSteps||{}),...(slide.objects||[]).filter(o=>!o.hidden).map(o=>o.appearAt||0)])].filter((n):n is number=>typeof n==='number'&&n>0).sort((a,b)=>a-b);}
export function nextStep(slide:Slide,step:number){return steps(slide).find(n=>n>step);}
export function previousStep(slide:Slide,step:number){return [...steps(slide)].reverse().find(n=>n<step)||0;}
