import assert from 'node:assert/strict';
import {slideSchema} from '../lib/model';
const slide={id:'side',title:'タイトル',body:'本文',eyebrow:'',layout:'image-right',theme:'white',animation:'none',notes:'',items:[],strokes:[]};
assert(slideSchema.safeParse(slide).success);
assert.equal(slideSchema.parse({...slide,sideImage:{src:'/api/assets/ab12.png'}}).sideImage?.position,50);
assert(!slideSchema.safeParse({...slide,sideImage:{src:'https://example.com/image.png'}}).success);
assert(!slideSchema.safeParse({...slide,sideImage:{src:'/api/assets/ab12.png',position:101}}).success);
assert.equal(slideSchema.parse({...slide,sideImage:null}).sideImage,null);
console.log('Side image layout: legacy, local assets, crop limits and removal PASS');
