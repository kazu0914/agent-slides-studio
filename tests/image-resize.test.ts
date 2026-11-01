import assert from 'node:assert/strict';
import {objectSchema} from '../lib/objects';
import {resizeImage} from '../lib/image-resize';
const image=objectSchema.parse({id:'test',name:'test',kind:'image',src:'/api/assets/abcd.png',x:300,y:200,w:400,h:200});
const anchor=(o:typeof image,corner:string)=>{const a=o.rotation*Math.PI/180;const x=(corner.includes('w')?1:-1)*o.w/2,y=(corner.includes('n')?1:-1)*o.h/2;return [o.x+o.w/2+Math.cos(a)*x-Math.sin(a)*y,o.y+o.h/2+Math.sin(a)*x+Math.cos(a)*y];};
for(const rotation of [0,30,90,180])for(const corner of ['nw','ne','sw','se'])for(const delta of [-100,100,100000]){
 const o={...image,rotation};const n=resizeImage(o,delta,delta,corner);objectSchema.parse(n);assert(Math.abs(n.w/n.h-2)<1e-9);const a=anchor(o,corner),b=anchor(n,corner);assert(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8);
}
for(const [w,h] of [[3200,1],[1,1800],[1,1]])objectSchema.parse(resizeImage({...image,w,h},-100,-100,'se'));
for(const [x,y] of [[-1600,-900],[3200,1800]])for(const corner of ['nw','ne','sw','se'])objectSchema.parse(resizeImage({...image,x,y},10000,10000,corner));
console.log('PASS: image resize corners, rotation, opposite anchor, extreme ratios and coordinate limits');
