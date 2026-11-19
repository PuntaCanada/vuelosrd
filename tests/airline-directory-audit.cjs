// Offline airline directory audit: no network requests, no fees, no fake flight data.
// Guarantees code uniqueness, trusted logo-host syntax and attribution metadata.
// Does not assert remote images are online; browser has a text-code fallback.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const beginning=html.indexOf('const airlineDirectory=[');
const ending=html.indexOf('];',beginning);
assert.ok(beginning>0&&ending>beginning,'airline directory found');
const listing=html.slice(beginning,ending);
const entries=[...listing.matchAll(/\{code:'([A-Z0-9]{2})',name:'([^']+)',url:'([^']+)'(?:,logo:'([^']+)',credit:'([^']+)')?\}/g)]
 .map(([,code,name,url,logo,credit])=>({code,name,url,logo,credit}));
assert.equal(entries.length,28,'expected 28 airline entries');
assert.equal(new Set(entries.map(x=>x.code)).size,entries.length,'duplicate airline codes');
for(const item of entries){
 assert.ok(item.name.trim(),'nonempty airline name: '+item.code);
 assert.equal(new URL(item.url).protocol,'https:','secure external destination: '+item.code);
 if(item.logo){
  const logo=new URL(item.logo),credit=new URL(item.credit);
  assert.equal(logo.protocol,'https:');
  assert.equal(logo.hostname,'commons.wikimedia.org','allowlisted image host '+item.code);
  assert.ok(logo.pathname.startsWith('/wiki/Special:FilePath/'),'expected Commons file URL '+item.code);
  assert.equal(credit.hostname,'commons.wikimedia.org');
  assert.ok(credit.pathname.startsWith('/wiki/File:'),'Commons credit URL '+item.code);
  assert.equal(decodeURIComponent(logo.pathname.split('/').pop()),decodeURIComponent(credit.pathname.split('/').pop()).replace(/^File:/,''),'image attribution matches file: '+item.code);
 }
}
assert.equal(entries.filter(x=>x.logo).length,26,'logo references documented');
assert.ok(!entries.find(x=>x.code==='AC').logo,'Air Canada is text-only pending brand permission');
assert.match(html,/img\.addEventListener\('error',\(\)=>img\.remove\(\)\)/,'shortcut image failure fallback');
console.log('Airline directory audit OK: '+entries.length+' codes, '+entries.filter(x=>x.logo).length+' attributed image references, 2 code fallbacks.');
