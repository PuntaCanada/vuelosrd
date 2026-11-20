// Deterministic HTTP classification regression: no external requests.
'use strict';
const assert=require('node:assert/strict');
const {probe,probeBatch,classifyWarning}=require('./source-health.cjs');
const response=status=>({status,ok:status>=200&&status<300,body:null});
async function scenario(name,statuses,expected,methods){
 let calls=0,seen=[];
 const fetcher=async(url,options)=>{seen.push(options.method);const next=statuses[calls++];if(next instanceof Error)throw next;assert.notEqual(next,undefined,'unexpected network call for '+name);return response(next);};
 const result=await probe('https://www.condor.com/',fetcher);
 assert.equal(result.outcome,expected,name);
 assert.equal(calls,statuses.length,name+' request count');
 if(methods)assert.deepEqual(seen,methods,name+' method sequencing');
}
(async()=>{
 const cases=[
  [{outcome:'uncertain',status:403},'access-restricted'],
  [{outcome:'uncertain',status:401},'access-restricted'],
  [{outcome:'uncertain',status:429},'access-restricted'],
  [{outcome:'uncertain',status:503},'temporary-server'],
  [{outcome:'uncertain',status:502},'temporary-server'],
  [{outcome:'uncertain',status:'ENOTFOUND'},'dns-failure'],
  [{outcome:'uncertain',status:'EAI_AGAIN'},'dns-failure'],
  [{outcome:'uncertain',status:'ENETUNREACH'},'network-error'],
  [{outcome:'uncertain',status:'CERT_HAS_EXPIRED'},'tls-failure'],
  [{outcome:'uncertain',status:'ERR_TLS_CERT_ALTNAME_INVALID'},'tls-failure'],
  [{outcome:'uncertain',status:'AbortError'},'timeout'],
  [{outcome:'uncertain',status:'ETIMEDOUT'},'timeout'],
  [{outcome:'uncertain',status:'23'},'network-error'],
  [{outcome:'broken',status:404},'confirmed-missing']
 ];
 for(const [input,category] of cases)assert.equal(classifyWarning(input).category,category,'source classification '+JSON.stringify(input));
 const seen=[];
 const batched=await probeBatch(['https://example.org/a','https://example.org/b'],async(...args)=>{
  assert.equal(args.length,1,'do not pass Array.map index as the HTTP fetcher');
  seen.push(args[0]);return args[0];
 });
 assert.deepEqual(batched,seen,'batch preserves URLs and order');
 await scenario('ordinary reachable',[200],'ok',['HEAD']);
 await scenario('HEAD-only missing but GET works',[404,200],'ok',['HEAD','GET']);
 await scenario('HEAD-only gone but GET works',[410,200],'ok',['HEAD','GET']);
 await scenario('confirmed missing twice',[404,404,404,404],'broken',['HEAD','GET','HEAD','GET']);
 await scenario('transient missing',[404,404,200],'ok');
 await scenario('403 bot block',[403,403],'uncertain',['HEAD','GET']);
 await scenario('401 access denied',[401],'uncertain',['HEAD']);
 await scenario('429 throttling',[429],'uncertain',['HEAD']);
 await scenario('503 server failure repeated',[503,503],'uncertain',['HEAD','HEAD']);
 await scenario('503 recovers',[503,200],'ok',['HEAD','HEAD']);
 await scenario('connection error',[new Error('network'),new Error('network')],'uncertain',['HEAD','HEAD']);
 console.log('SOURCE HEALTH UNIT PASS: 11 HTTP/network scenarios plus 14 warning categories and array-map argument regression, including false-404 prevention and safe bot-block classification.');
})().catch(e=>{console.error(e);process.exitCode=1;});
