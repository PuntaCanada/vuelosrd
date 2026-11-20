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
const end=html.indexOf(';\nconst travelAssistTransport=',start);
assert.ok(start>=0&&end>start,'guide locale dataset present');
const locales=JSON.parse(html.slice(start+'const travelAssistWords='.length,end));
for(const lang of ['es','en','de','fr','ht']){
 assert.ok(Array.isArray(locales[lang]),'locale '+lang);
 assert.equal(locales[lang].length,19,'full guidance translation for '+lang);
 assert.ok(locales[lang].every(x=>typeof x==='string'&&x.length>=5),'nonempty guide labels in '+lang);
}
assert.ok(!html.includes('liveFlightAPI'),'must not introduce fictional live API');
console.log('Travel assistant audit OK: seven airports, five translated languages and grounded free source links.');
