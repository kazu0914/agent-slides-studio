import type {SlideObject} from './objects';
export function resizeImage(o:SlideObject,dx:number,dy:number,corner:string):SlideObject {
 const a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const sx=corner.includes('w')?-1:1,sy=corner.includes('n')?-1:1;
 const lx=c*dx+s*dy,ly=-s*dx+c*dy;
 const maxFactor=Math.min(3200/o.w,1800/o.h);
 // Very thin images cannot satisfy a 20px minimum on both axes while preserving their ratio.
 let low=Math.min(maxFactor,Math.max(20/o.w,20/o.h)),high=maxFactor;
 const kx=(-o.w+c*sx*o.w-s*sy*o.h)/2,ky=(-o.h+s*sx*o.w+c*sy*o.h)/2;
 for(const [value,k,min,max] of [[o.x,kx,-1600,3200],[o.y,ky,-900,1800]]){
  if(Math.abs(k)<1e-9)continue;
  const f1=1+(min-value)/k,f2=1+(max-value)/k;
  low=Math.max(low,Math.min(f1,f2));high=Math.min(high,Math.max(f1,f2));
 }
 if(low>high)return o;
 const factor=Math.max(low,Math.min(high,1+(sx*lx*o.w+sy*ly*o.h)/(o.w*o.w+o.h*o.h)));
 const w=o.w*factor,h=o.h*factor;
 return {...o,w,h,x:Math.max(-1600,Math.min(3200,o.x+kx*(factor-1))),y:Math.max(-900,Math.min(1800,o.y+ky*(factor-1)))};
}
