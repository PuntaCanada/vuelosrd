// VuelosRD traveler hub audit: source provenance, language coverage and privacy.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
function getJson(name,endMarker){
 const prefix='const '+name+'=',start=html.indexOf(prefix),end=html.indexOf(endMarker,start);
 assert.ok(start>0&&end>start,'missing JSON metadata: '+name);
 return JSON.parse(html.slice(start+prefix.length,end).trim().replace(/;$/,''));
}
const lang=['es','en','de','fr','ht'],airports=['PUJ','SDQ','STI','POP','LRM','AZS','JBQ'];
const words=getJson('passengerWords',';\nconst passengerOperatorLabels=');
const operator=getJson('passengerOperatorContact',';\nconst passengerSources=');
const sources=getJson('passengerSources',';\nlet passengerMode=');
const labels=getJson('passengerOperatorLabels',';\nconst passengerOperatorContact=');
assert.deepEqual(Object.keys(operator).sort(),airports.slice().sort(),'one official operator route for every airport');
assert.deepEqual(Object.keys(sources).sort(),airports.slice().sort(),'complete verified-source coverage');
for(const code of airports){
 for(const [kind,url] of Object.entries(sources[code])){
  assert.ok(['checked','item'].includes(kind),'only known baggage and item issue routes');
  assert.ok(url.startsWith('https://'),'https source '+code);
  const host=new URL(url).hostname;
  assert.ok(['www.puntacanainternationalairport.com','www.romanaairport.com','aeropuertocibao.com.do','aerodom.com'].includes(host),'operator-owned sources only '+code);
 }
 assert.ok(operator[code].startsWith('https://'),'official contact source '+code);
}
assert.ok(sources.PUJ.item.endsWith('/lost-found'),'PUJ dedicated terminal lost property');
assert.ok(sources.LRM.item.endsWith('/lost-and-found/'),'LRM dedicated terminal lost property');
assert.ok(sources.LRM.checked.endsWith('/luggage/'),'LRM dedicated checked luggage guidance');
assert.ok(sources.SDQ.item.includes('aerodom.com/en/airports/'),'SDQ must not imply dedicated lost-found desk');
for(const key of lang){
 const w=words[key];assert.ok(w,'missing locale '+key);
 for(const k of ['title','departure','arrival','progress','reset','checkedCopy','itemCopy','generalCopy','caution','airlineNote'])
  assert.ok(typeof w[k]==='string'&&w[k].length>=4,'translation '+key+' '+k);
 for(const k of ['depart','arrive']){
  assert.ok(Array.isArray(w[k])&&w[k].length===5&&w[k].every(x=>x.length>24),'five substantive '+key+' '+k+' steps');
 }
 assert.ok(typeof labels[key]==='string'&&labels[key].length>5,'operator contact translation '+key);
}
assert.ok(html.includes('localStorage.getItem(\'vuelosrd_check_v1\')'),'optional local browser storage');
assert.ok(html.includes('savePassengerChecks()'),'progress persistence');
assert.ok(html.includes('id="passenger-checklist"'),'accessible checklist');
assert.ok(html.includes('id="passengerIssue"'),'baggage versus terminal selector');
assert.ok(html.includes('id="passengerAirline"'),'airline contact selector');
assert.ok(!html.includes('fetch(passenger'),'no external personal-data requests');
// Integrated journey guide uses the already curated airport and airline source lists.
const journey=getJson('journeyWords',';\nfunction renderJourneyAssistant()');
for(const lang of ['es','en','de','fr','ht']){
 const w=journey[lang];assert.ok(w,'journey translation '+lang);
 for(const key of ['title','intro','airport','airline','stage','choose','departure','arrival','withoutAirline','airportSource','airlineSource','checklist','transfer','baggage','notice']){
  assert.ok(typeof w[key]==='string'&&w[key].length>4,'missing journey text '+lang+' '+key);
 }
}
for(const id of ['journey-wizard','journeyAirport','journeyAirline','journeyStage','journey-summary','journey-airport-source','journey-airline-source','journey-transfer-link','journey-baggage-link','journey-checklist-link']){
 assert.ok(html.includes('id="'+id+'"'),'journey control missing '+id);
}
assert.ok(html.includes('chosen.url'),'airline links originate from existing official directory');
assert.ok(html.includes('airportInfo[airport].url'),'airport links originate from existing official directory');
assert.ok(!html.includes('localStorage.setItem(\'journey'),'no personal journey choices stored');
console.log('PASS: 5 languages x 10 checklist items; 7 airports, official baggage / lost-property routes and local-only checkmarks.');
