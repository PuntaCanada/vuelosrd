// Offline safety/integrity check for curated travel links and translations.
// Source references are maintained in docs. No live flight data or scraping.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const required=['PUJ','SDQ','STI','POP','LRM','AZS','JBQ'];
assert.ok(html.includes('id="travel-assist"'),'practical guide section exists');
assert.ok(html.includes('id="travelAssistAirport"'),'airport dropdown exists');
assert.ok(html.includes('id="assist-eticket-link"'),'direct official entry form exists');
assert.ok(html.includes('id="assist-baggage-link"'),'customs reference exists');
assert.ok(html.includes('id="assist-transport-link"'),'transfer reference exists');
assert.ok(html.includes('https://eticket.migracion.gob.do/'),'free official e-ticket link');
assert.ok(html.includes('https://www.aduanas.gob.do/manual-del-viajero/'),'Dominican customs traveler guide');
assert.ok(html.includes('https://www.godominicanrepublic.com/travel/getting-around'),'official tourism transfer guidance');
assert.ok(html.includes('https://www.puntacanainternationalairport.com/en/services/transportations'),'PUJ official transfer guidance');
assert.ok(html.includes('https://aeropuertocibao.com.do/en/'),'STI official airport website');
assert.ok(html.includes('https://aeropuertocibao.com.do/llegadas/'),'STI operator arrivals link');
assert.ok(html.includes('https://aeropuertocibao.com.do/salidas/'),'STI operator departures link');
assert.ok(html.includes('https://www.romanaairport.com/'),'LRM official airport website');
for(const code of required)assert.ok(html.includes('<option value="'+code+'">'),'airport selector includes '+code);
const start=html.indexOf('const travelAssistWords=');
const end=html.indexOf(';\nconst travelAssistFlightLinks=',start);
assert.ok(start>=0&&end>start,'guide locale dataset present');
const locales=JSON.parse(html.slice(start+'const travelAssistWords='.length,end));
for(const lang of ['es','en','de','fr','ht']){
 assert.ok(Array.isArray(locales[lang]),'locale '+lang);
 assert.equal(locales[lang].length,19,'full guidance translation for '+lang);
 assert.ok(locales[lang].every(x=>typeof x==='string'&&x.length>=5),'nonempty guide labels in '+lang);
}
assert.ok(!html.includes('liveFlightAPI'),'must not introduce fictional live API');
// Operator-documented airport detail source links and localizations.
const startDeep=html.indexOf('const airportDeepSources=');
const endDeep=html.indexOf(';\nfunction renderAirportDeepGuide',startDeep);
assert.ok(startDeep>0&&endDeep>startDeep,'structured airport sources');
const deepSources=JSON.parse(html.slice(startDeep+'const airportDeepSources='.length,endDeep));
assert.equal(Object.keys(deepSources).length,7,'sources for all seven airports');
for(const code of required){
 const src=deepSources[code];
 for(const key of ['service','access','transfer']){
  assert.ok(src[key].startsWith('https://'),'safe official source for '+code+' '+key);
  const host=new URL(src[key]).hostname;
  assert.ok(['www.puntacanainternationalairport.com','aeropuertocibao.com.do','www.romanaairport.com','aerodom.com'].includes(host),'trusted airport operator for '+code);
 }
}
assert.ok(deepSources.PUJ.access.includes('wheelchair-service'),'PUJ wheelchair reference');
assert.ok(deepSources.LRM.transfer.includes('taxi-services'),'LRM taxi reference');
const startText=html.indexOf('const airportDeepWords='),endText=html.indexOf(';\nconst airportDeepSources=',startText);
assert.ok(startText>0&&endText>startText,'translated airport guides');
const deepWords=JSON.parse(html.slice(startText+'const airportDeepWords='.length,endText));
for(const lang of ['es','en','de','fr','ht']){
 assert.equal(deepWords[lang].head.length,3,'three service headings '+lang);
 assert.equal(deepWords[lang].general.length,3,'three fallback descriptions '+lang);
 assert.equal(deepWords[lang].puj.length,3,'PUJ descriptions '+lang);
 assert.equal(deepWords[lang].sti.length,3,'STI descriptions '+lang);
 assert.equal(deepWords[lang].lrm.length,3,'LRM descriptions '+lang);
}
// Comparison uses only the same operator sources already vetted for the detail cards.
assert.ok(html.includes('id="airport-compare"')&&html.includes('id="compareSearch"')&&html.includes('id="compareFilter"'),'accessible comparison controls');
assert.ok(html.includes("const airportCompareDetailed=['PUJ','STI','LRM'];"),'verified source group, not inferred airport features');
const compareBegin=html.indexOf('const airportCompareWords=');
const compareEnd=html.indexOf(';\nconst airportCompareDetailed=',compareBegin);
assert.ok(compareBegin>0&&compareEnd>compareBegin,'comparison translations present');
const compareLocales=JSON.parse(html.slice(compareBegin+'const airportCompareWords='.length,compareEnd));
for(const lang of ['es','en','de','fr','ht']){
 assert.equal(compareLocales[lang].length,21,'all comparison labels localized '+lang);
 assert.ok(compareLocales[lang].every(x=>typeof x==='string'&&x.length>2),'nonempty comparison translations '+lang);
}
assert.ok(html.includes("hasDetails?w[16]:w[15]"),'unverified services clearly labeled');
console.log('Travel assistant audit OK: seven airports, five translated languages and grounded free source links.');
