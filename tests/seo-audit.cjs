// VuelosRD SEO integrity for five locale hubs and 35 static airport guides.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const base='https://vuelosrd.pages.dev/',langs=['es','en','de','fr','ht'],codes=['puj','sdq','sti','pop','lrm','azs','jbq'];
const url=(lang,code)=>base+(lang==='es'?'':lang+'/')+(code?'airports/'+code+'/':'');
const path=(lang,code)=>(lang==='es'?'':lang+'/')+(code?'airports/'+code+'/':'')+'index.html';
const sitemap=fs.readFileSync('sitemap.xml','utf8'),robots=fs.readFileSync('robots.txt','utf8');
const registry=JSON.parse(fs.readFileSync('data/airport-source-registry.json','utf8'));
assert.ok(robots.includes('User-agent: *')&&robots.includes('Allow: /'),'crawlers allowed');
assert.ok(!robots.includes('Disallow: /'),'root not excluded');
assert.ok(robots.includes('Sitemap: '+base+'sitemap.xml'),'correct sitemap URI');
assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),'alternate namespace');
assert.equal((sitemap.match(/<url>/g)||[]).length,40,'all five hubs and 35 airport pages in sitemap');
const groups=[null,...codes];
let checked=0;
for(const code of groups){
 for(const lang of langs){
  const canonical=url(lang,code),html=fs.readFileSync(path(lang,code),'utf8');
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'),'HTML doctype '+canonical);
  assert.ok(html.includes('<html lang="'+lang+'">'),'language identified '+canonical);
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),'self canonical '+canonical);
  assert.ok(/<title>[^<]{15,}<\/title>/.test(html),'title '+canonical);
  assert.ok(/<meta name="description" content="[^"]{40,}">/.test(html),'description '+canonical);
  assert.ok(!/name="robots"[^>]*noindex/i.test(html),'not marked noindex '+canonical);
  assert.ok(html.includes('property="og:url" content="'+canonical+'"'),'social canonical '+canonical);
  const entry='<loc>'+canonical+'</loc>';
  assert.equal(sitemap.split(entry).length-1,1,'sitemap entry appears once '+canonical);
  const sm=sitemap.match(new RegExp('<url>\\s*<loc>'+canonical.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'<\\/loc>([\\s\\S]*?)<\\/url>'));
  assert.ok(sm,'sitemap group for '+canonical);
  for(const target of [...langs,'x-default']){
   const href=url(target==='x-default'?'es':target,code);
   assert.ok(html.includes('<link rel="alternate" hreflang="'+target+'" href="'+href+'">'),'HTML hreflang '+target+' '+canonical);
   assert.ok(sm[1].includes('<xhtml:link rel="alternate" hreflang="'+target+'" href="'+href+'" />'),'sitemap hreflang '+target+' '+canonical);
  }
  const structured=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(structured,'JSON-LD '+canonical);
  const schema=JSON.parse(structured[1]);
  assert.equal(schema['@context'],'https://schema.org','JSON-LD context');
  assert.equal(schema.url,canonical,'structured URL '+canonical);
  if(code){
   assert.equal(schema['@type'],'WebPage','airport page schema');
   assert.equal(schema.about['@type'],'Airport','airport is about airport');
   assert.equal(schema.about.iataCode,code.toUpperCase(),'airport IATA in schema');
   assert.equal(schema.inLanguage,lang,'language in schema');
   assert.ok(html.includes('href="/?lang='+lang+'&amp;airport='+code.toUpperCase()+'#journey-wizard"'),'working portal deep-link');
   assert.ok(html.includes('href="'+registry.airports[code.toUpperCase()].official+'"'),'official operator for '+code);
   assert.ok(html.includes('class="source missing"')||code==='puj'||code==='sti'||code==='lrm','no invented source completeness '+code);
   assert.ok(html.includes('href="'+url(lang,null)+'"'),'locale hub backlink');
   assert.ok(html.includes('id="quick-travel"')&&html.includes('class="quick-flight-form"'),'airport travel shortcuts visible '+canonical);
   assert.ok(html.includes('action="/#flightTitle" method="get"'),'no-cost first-party GET flight preparation '+canonical);
   assert.ok(html.includes('name="lang" value="'+lang+'"'),'language sent through flight form '+canonical);
   assert.ok(html.includes('name="airport" value="'+code.toUpperCase()+'"'),'airport sent through flight form '+canonical);
   assert.ok(html.includes('name="flight"')&&html.includes('pattern="[A-Za-z0-9]{2,3}'),'bounded flight entry '+canonical);
   for(const hash of ['#journey-wizard','#passenger-help-title','#travel-assist']){
    assert.ok(html.includes('/?lang='+lang+'&amp;airport='+code.toUpperCase()+hash),'guide link to appropriate live app section '+hash+' '+canonical);
   }
   assert.ok(html.includes('href="#airport-sources"')&&html.includes('id="airport-sources"'),'source navigation resolved '+canonical);

  }else{
   assert.equal(schema['@type'],lang==='es'?'WebSite':'WebPage','home schema');
   assert.ok(html.includes('VuelosRD'),'site brand');
  }
  checked++;
 }
}
assert.equal(checked,40);
for(const code of codes){
 const item=registry.airports[code.toUpperCase()];
 assert.ok(item&&item.official.startsWith('https://'),'official source listed '+code);
 for(const key of ['services','transport','lostProperty','baggage','arrivals','departures']){
  assert.ok(item[key]===null||(typeof item[key]==='string'&&item[key].startsWith('https://')),'grounded link or explicit unknown '+code+' '+key);
 }
}
// The interactive portal and all 35 SEO guides must share the same official airport profiles.
const home=fs.readFileSync('index.html','utf8');
const registryNames=Object.keys(registry.airports);
assert.equal(registryNames.length,7,'one registry record per airport');
assert.ok(home.includes('function airportGuidePath(code)'),'internal dynamic airport guide route exists');
assert.ok(home.includes('id="airport-orientation"'),'first-time visitor orientation exists');
assert.ok(home.includes('airportSeoLabels[current].guide'),'airport guide is linked from the cards');
assert.ok(home.includes('id="mobileGoJourney"')&&home.includes('href="#journey-wizard" id="mobileGoJourney"'),'mobile shortcut to travel assistant');
assert.ok(home.includes('id="journey-flight-link" href="#flightTitle"'),'assistant has flight-search exit');
assert.ok(home.includes('const mobileNavLabels=')&&home.includes("journey:'Meine Reise'"),'all mobile nav destinations have translations');
assert.ok(home.includes("function prepareAirlineFlight(code)")&&home.includes("$('passengerAirline').value=code"),'airline choice synchronizes baggage helper');

for(const code of registryNames){
 const pattern=new RegExp('\\n'+code+':\\{desc:\\{[^\\n]+\\},url:\\x27([^\\x27]+)\\x27');
 const found=home.match(pattern);
 assert.ok(found,'airportInfo '+code+' found');
 assert.equal(found[1],registry.airports[code].official,'portal must use same verified airport operator as static guide: '+code);
 const target='/airports/'+code.toLowerCase()+'/';
 const landing=fs.readFileSync('airports/'+code.toLowerCase()+'/index.html','utf8');
 assert.ok(landing.includes('href="'+registry.airports[code].official+'"'),'SEO page uses canonical operator source '+code);
}
console.log('SEO PASS: 40 canonical pages, reciprocal 5-language hreflang (HTML + sitemap), 35 Airport JSON-LD schemas and official-source completeness.');
