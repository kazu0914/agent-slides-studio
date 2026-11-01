import {backgroundTest} from './background-e2e.mjs';
import {clipboardDeleteTest} from './clipboard-delete-e2e.mjs';
import {spawn} from 'node:child_process';import {mkdtemp,symlink,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {browserOptions} from '../local/browser.mjs';
const release=resolve(process.argv[2]||'.'),origin='http://127.0.0.1:9192';let proc,browser;const dirs=[];
async function start(dir){proc=spawn(process.execPath,[join(release,'dist-local/server.mjs')],{cwd:dir,env:{...process.env,FRAME_PORT:'9192',FRAME_CODEX_BIN:join(dir,'missing-codex')},stdio:'pipe'});await new Promise((ok,bad)=>{proc.stdout.on('data',d=>{if(String(d).includes(origin))ok();});proc.on('exit',()=>bad(Error('server startup failed')));});}
async function stop(){if(proc){const p=proc;proc=null;if(p.exitCode===null)await new Promise(r=>{p.on('exit',r);p.kill();});}}
async function space(){const d=await mkdtemp(join(tmpdir(),'agent-slides-release-'));dirs.push(d);for(const n of ['dist-local','drizzle'])await symlink(join(release,n),join(d,n));return d;}
async function api(path,body,method){const r=await fetch(origin+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json();assert(r.ok,JSON.stringify(j));return j;}
try{await start(await space());const initial=(await api('/api/deck')).deck;browser=await chromium.launch({headless:true,...browserOptions()});await backgroundTest(browser,api,origin,initial);}finally{await browser?.close();await stop();for(const d of dirs)await rm(d,{recursive:true,force:true});}
