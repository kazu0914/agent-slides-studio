import assert from 'node:assert/strict';import {accountStatus,connectionError} from '../local/codex-status.mjs';
assert.equal(accountStatus({account:null},null).state,'signed_out');
assert.equal(connectionError({code:'ENOENT'}).state,'missing');
assert.equal(connectionError({}).state,'connection_error');
assert.equal(accountStatus({account:{type:'chatgpt',planType:'free'}},{rateLimits:{primary:{usedPercent:10}}}).available,true);
assert.equal(accountStatus({account:{type:'chatgpt'}},{rateLimits:{primary:{usedPercent:100,resetsAt:Date.now()/1000+1000}}}).state,'limited');
assert.equal(accountStatus({account:{type:'apiKey'}},null).available,true);
assert.equal(accountStatus({account:{type:'chatgpt'}},null,true).state,'ready');
console.log('Codex status classifications PASS');
