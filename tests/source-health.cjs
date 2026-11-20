// VuelosRD free official-source health check. Node.js built-ins only.
// HTTP 403/429/5xx/timeouts may mean bot protection or temporary service disruption,
// NOT that an official operator URL is definitively dead. Report as warnings.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const data=JSON.parse(fs.readFileSync('data/airport-source-registry.json','utf8'));
const found=new Set(['https://eticket.migracion.gob.do/','https://www.aduanas.gob.do/manual-del-viajero/']);
for(const [code,item] of Object.entries(data.airports)){
 assert.ok(/^[A-Z]{3}$/.test(code),'IATA code metadata');
 for(const k of ['official','services','transport','lostProperty','baggage','arrivals','departures'])if(item[k])found.add(item[k]);
}
const urls=[...found].sort();
const allowedHosts=new Set(['www.puntacanainternationalairport.com','aeropuertocibao.com.do','www.romanaairport.com','aerodom.com','eticket.migracion.gob.do','www.aduanas.gob.do']);
for(const url of urls)assert.ok(allowedHosts.has(new URL(url).hostname),'Only vetted operator/authority hosts: '+url);
async function probe(url){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const headers={'user-agent':'VuelosRD-SourceHealth/1.0 (public official link monitoring; no scraping)'};
   let response=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(12000),headers});
   if([403,405,501].includes(response.status)){response=await fetch(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(12000),headers:{...headers,Range:'bytes=0-0'}});}
   if(response.body)await response.body.cancel();
   if([404,410].includes(response.status)){if(attempt===0)continue;return {url,status:response.status,outcome:'broken'};}
   if(response.ok||response.status===206)return {url,status:response.status,outcome:'ok'};
   return {url,status:response.status,outcome:'uncertain'};
  }catch(e){if(attempt===0)continue;return {url,status:String(e.name||e),outcome:'uncertain'};}
 }
}
async function run(){
 const results=[];
 for(let i=0;i<urls.length;i+=3){results.push(...await Promise.all(urls.slice(i,i+3).map(probe)));}
 let broken=0,unknown=0;
 for(const x of results){console.log(x.outcome.toUpperCase()+' ['+x.status+'] '+x.url);if(x.outcome==='broken')broken++;if(x.outcome==='uncertain')unknown++;}
 console.log('OFFICIAL LINK HEALTH: '+urls.length+' checked; '+broken+' confirmed missing (404/410); '+unknown+' uncertain (site blocks or transient failures).');
 if(broken){console.error('Official source URLs returned confirmed 404/410 on repeated checks. Investigate before changing user-facing source claims.');process.exitCode=1;}
}
run().catch(e=>{console.error(e);process.exitCode=1});
