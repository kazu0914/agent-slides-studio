import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
export const assetDir=resolve('.local-data/assets');mkdirSync(assetDir,{recursive:true});
export function decodeImage(data:string){const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);if(!m)throw Error('PNG・JPEG・WebP形式の画像が必要です');const bytes=Buffer.from(m[2],'base64');if(!bytes.length||bytes.length>10*1024*1024)throw Error('画像は10MBまでです');const valid=m[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)throw Error('画像ファイルの形式を確認してください');return {bytes,ext:m[1]==='jpeg'?'jpg':m[1]};}
export function storeImage(data:string){const {bytes,ext}=decodeImage(data);const name=createHash('sha256').update(bytes).digest('hex')+'.'+ext;const path=resolve(assetDir,name);if(!existsSync(path))writeFileSync(path,bytes);return '/api/assets/'+name;}
export function assetPath(src:string){if(!/^\/api\/assets\/[a-f0-9-]+\.(png|jpg|webp)$/.test(src))throw Error('画像のパスが不正です');return resolve(assetDir,src.split('/').pop()!);}
export function readAsset(src:string){return readFileSync(assetPath(src));}
export function imageData(src:string){const ext=src.split('.').pop();return `data:image/${ext==='jpg'?'jpeg':ext};base64,${readAsset(src).toString('base64')}`;}
