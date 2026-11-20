// VuelosRD free official-source health check. Node.js built-ins only.
// HTTP 403/429/5xx/timeouts may mean bot protection or temporary service disruption,
// NOT that an official operator URL is definitively dead. Report as warnings.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const data=JSON.parse(fs.readFileSync('data/airport-source-registry.json','utf8'));
const found=new Set(), origins=new Map();
function register(url,origin){
 found.add(url);
 if(!origins.has(url))origins.set(url,new Set());
 origins.get(url).add(origin);
}
register('https://eticket.migracion.gob.do/','Dominican immigration E-Ticket');
register('https://www.aduanas.gob.do/manual-del-viajero/','Dominican customs passenger guide');
for(const [code,item] of Object.entries(data.airports)){
 assert.ok(/^[A-Z]{3}$/.test(code),'IATA code metadata');
 for(const k of ['official','services','transport','lostProperty','baggage','arrivals','departures'])if(item[k])register(item[k],code+' airport / '+k);
}
// Also check 28 existing official airline-directory links.
const html=fs.readFileSync('index.html','utf8'),at=html.indexOf('const airlineDirectory=[');
const end=html.indexOf('];',at);
assert.ok(at>=0&&end>at,'official airline directory present');
const airlineUrls=[...html.slice(at,end).matchAll(/\{code:'([A-Z0-9]{2})',name:'[^']+',url:'(https:\/\/[^']+)'/g)];
assert.equal(airlineUrls.length,28,'expected 28 official airline pages');
for(const entry of airlineUrls)register(entry[2],entry[1]+' airline / official website');
const urls=[...found].sort();
const allowedHosts=new Set(["www.puntacanainternationalairport.com","aeropuertocibao.com.do","www.romanaairport.com","aerodom.com","eticket.migracion.gob.do","www.aduanas.gob.do","www.condor.com","www.jetblue.com","www.iberia.com","www.aa.com","www.aircanada.com","www.arajet.com","www.copaair.com","www.delta.com","www.united.com","www.airtransat.com","www.aireuropa.com","www.discover-airlines.com","www.avianca.com","www.airfrance.com","www.britishairways.com","www.flyfrontier.com","www.southwest.com","www.westjet.com","www.spirit.com","www.aerolineas.com.ar","www.aeromexico.com","www.latamairlines.com","www.w2fly.es","www.iberojet.com","www.wingo.com","www.skyairline.com","www.voegol.com.br","www.suncountry.com"]);
for(const url of urls)assert.ok(allowedHosts.has(new URL(url).hostname),'Only vetted operator/authority hosts: '+url);
async function probe(url,fetcher=fetch){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const headers={'user-agent':'VuelosRD-SourceHealth/1.0 (public official link monitoring; no scraping)'};
   let response=await fetcher(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(12000),headers});
   // Some sites reject HEAD with 404/410 while the ordinary page is available.
   // Confirm apparent missing pages with GET before classifying them as broken.
   if([403,404,405,410,501].includes(response.status)){response=await fetcher(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(12000),headers:{...headers,Range:'bytes=0-0'}});}
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
 const checkedAt=new Date().toISOString(),lastReviewed=data.verifiedOn||'not documented';
 const ok=results.length-broken-unknown;
 const reasonFor=x=>{
  if(x.outcome==='broken')return 'repeated HTTP 404/410 after GET confirmation';
  if([401,403,429].includes(x.status))return 'access denied or rate limited (possible bot protection)';
  if(typeof x.status==='number')return 'HTTP response inconclusive (temporary/server-side)';
  return 'connection, timeout or TLS/network error (inconclusive)';
 };
 const warning=results.filter(x=>x.outcome!=='ok').map(x=>({
  ...x,reason:reasonFor(x),usedBy:[...(origins.get(x.url)||[])]
 }));
 const report={
  schemaVersion:1,checkedAt,sourceCatalogLastReviewed:lastReviewed,
  total:urls.length,ok,uncertain:unknown,broken,
  limitations:'Automated 403/401/429/timeout responses do not prove a broken URL; 200 confirms HTTP reachability only, not accuracy of travel content.',
  warnings:warning
 };
 const summaryPath=process.env.GITHUB_STEP_SUMMARY;
 if(summaryPath){
  const rows=warning.map(x=>'| '+x.outcome.toUpperCase()+' | '+String(x.status).replace(/\\|/g,'/')+' | '+x.reason+' | '+x.usedBy.join(', ').replace(/\\|/g,'/')+' | '+x.url.replace(/\\|/g,'%7C')+' |');
  const markdown=[
   '## VuelosRD official link health',
   '',
   '| Checked | HTTP reachable | Uncertain | Confirmed 404/410 |',
   '|---:|---:|---:|---:|',
   '| '+report.total+' | '+report.ok+' | '+report.uncertain+' | '+report.broken+' |',
   '',
   'Source catalog last human-reviewed: '+lastReviewed+'; automated run: '+checkedAt,
   '',
   ...(warning.length?['| Outcome | HTTP / error | Interpretation | Used by | URL |','|---|---|---|---|---|',...rows]:['No URL warnings.']),
   '',
   '**Interpretation:** 401/403/429 and network errors may indicate bot blocking. Manually investigate uncertain results; a successful HTTP response does not prove current schedules or services.',
   ''
  ].join('\n');
  fs.appendFileSync(summaryPath,markdown+'\n');
 }
 if(process.env.VUELOSRD_HEALTH_REPORT)fs.writeFileSync(process.env.VUELOSRD_HEALTH_REPORT,JSON.stringify(report,null,2)+'\n');

 if(broken){console.error('Official source URLs returned confirmed 404/410 on repeated checks. Investigate before changing user-facing source claims.');process.exitCode=1;}
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={probe};
