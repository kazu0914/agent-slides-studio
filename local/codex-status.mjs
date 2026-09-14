export function accountStatus(info, limits, limitsFailed=false){
 if(!info?.account)return {available:false,state:'signed_out',message:'Codexにログインしてください。ターミナルで codex login を実行し、再確認してください。'};
 const buckets=limits?.rateLimitsByLimitId?Object.values(limits.rateLimitsByLimitId):limits?.rateLimits?[limits.rateLimits]:[];
 const active=buckets.filter(b=>!b.limitId||b.limitId==='codex');
 const exhausted=active.flatMap(b=>[b.primary,b.secondary]).filter(w=>w&&w.usedPercent>=100&&(!w.resetsAt||w.resetsAt*1000>Date.now()));
 if(exhausted.length)return {available:false,state:'limited',message:'Codexの利用上限に達しています。利用枠の回復後に再確認してください。',resetsAt:Math.max(...exhausted.map(w=>w.resetsAt||0))||null};
 return {available:true,state:'ready',message:info.account.type==='apiKey'?'APIキーで接続済み（API料金が発生します）':limitsFailed?'Codexにログイン済み（利用枠は取得できませんでした）':'Codexに接続済み',authMode:info.account.type,planType:info.account.planType||null};
}
export function connectionError(error){return {available:false,state:error.code==='ENOENT'?'missing':'connection_error',message:error.code==='ENOENT'?'Codex CLIが見つかりません。インストール後に再確認してください。':'Codexの接続を確認できません。CLIのログイン状態・バージョン・通信を確認してください。'};}
