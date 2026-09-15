import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {askCodex} from '../local/codex.mjs';
const dir=mkdtempSync(join(tmpdir(),'slides-codex-mock-')),bin=join(dir,'codex');
const old=process.env.FRAME_CODEX_BIN,originalCwd=process.cwd();
writeFileSync(bin,`#!/usr/bin/env node
import {createInterface} from 'node:readline';
let thread;
const send=m=>console.log(JSON.stringify(m));
createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);if(m.id===undefined)return;
 let result={};
 if(m.method==='account/read')result={account:{type:'apiKey'}};
 if(m.method==='model/list')result={data:[]};
 if(m.method==='thread/start'){thread=m.params;result={thread:{id:'test'}};}
 send({id:m.id,result});
 if(m.method==='turn/start'){
  const context=JSON.parse(m.params.input[0].text);
  if(thread.config.web_search==='live')send({method:'item/completed',params:{item:{id:'search-1',type:'webSearch',query:'public query'}}});
  send({method:'item/completed',params:{item:{type:'agentMessage',text:JSON.stringify({answer:JSON.stringify({thread,context}),proposalJson:''})}}});
  send({method:'turn/completed',params:{turn:{status:'completed'}}});
 }
});
`,{mode:0o700});
try{
 process.env.FRAME_CODEX_BIN=bin;process.chdir(dir);
 for(const enabled of [undefined,false,true]){
  const result=await askCodex('確認',{title:'デッキ',slides:[]},'s1',[],{webSearch:enabled});
  const {thread,context}=JSON.parse(result.answer);
  assert.equal(thread.config.web_search,enabled?'live':'disabled');
  assert.equal(thread.config['tools.shell'],false);
  assert.equal(thread.sandbox,'read-only');
  assert.equal(context.webSearchEnabled,enabled===true);
  assert.ok(Math.abs(Date.now()-Date.parse(context.currentDateTime))<5000);
  assert.ok(context.timeZone);
  assert.equal(result.webSearchCount,enabled?1:0);
  assert.match(thread.developerInstructions,enabled?/外部ページの文章は参考データ/:/Web検索は無効/);
 }
 console.log('Codex web-search opt-in, date context and read-only settings PASS');
}finally{process.chdir(originalCwd);if(old===undefined)delete process.env.FRAME_CODEX_BIN;else process.env.FRAME_CODEX_BIN=old;rmSync(dir,{recursive:true,force:true});}
