// Zero-dependency static performance budgets. These are not field Core Web Vitals.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const languages=['es','en','de','fr','ht'];
const codes=['puj','sdq','sti','pop','lrm','azs','jbq'];
const html=fs.readFileSync('index.html','utf8');
const bytes=x=>Buffer.byteLength(x,'utf8');
const size=bytes(html);
assert.ok(size<250*1024,'Interactive home >250 KiB uncompressed: review assets/code before further expansion, now '+size);
assert.ok(html.includes("img.loading='lazy'"),'airline logos must lazy-load');
assert.ok(html.includes("img.fetchPriority='low'"),'below-the-fold airline logos should have low fetch priority');
assert.ok(html.includes('img.width=120;img.height=64'),'airline directory intrinsic dimensions required');
assert.ok(html.includes('img.width=42;img.height=25'),'airline chip intrinsic dimensions required');
// Only local, deferred scripts are allowed: no synchronous third-party render blockers.
const externalScripts=[...html.matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["'][^>]*>/g)];
for(const match of externalScripts){
 assert.ok(match[0].includes(' defer'), 'External script must be deferred: '+match[1]);
 assert.ok(match[1].startsWith('/js/')&&!match[1].includes('..'),'Only same-origin /js/ assets permitted: '+match[1]);
}
assert.ok(externalScripts.length<=1,'Limit deferred JS dependencies on the homepage');
const results=[{path:'index.html',bytes:size}],limit=16*1024;
for(const lang of languages){
 for(const code of codes){
  const path=(lang==='es'?'':lang+'/')+'airports/'+code+'/index.html';
  const document=fs.readFileSync(path,'utf8'),n=bytes(document);
  assert.ok(n<limit,'Airport HTML exceeds 16KiB, consider trimming markup: '+path+' '+n);
  assert.ok(!/<script[^>]*src=/.test(document),'no blocking external JavaScript in '+path);
  assert.ok(!/<img[^>]+src=/.test(document),'no unoptimized image in static guide '+path);
  assert.ok(!/@import\s/.test(document),'no blocking CSS imports '+path);
  assert.ok(document.includes('name="viewport"'),'mobile viewport '+path);
  results.push({path,bytes:n});
 }
}
for(const lang of languages.filter(x=>x!=='es')){
 const path=lang+'/index.html',document=fs.readFileSync(path,'utf8');
 // Locale routes now provide the same complete application, not static guides.
 assert.ok(bytes(document)<250*1024,'Interactive locale exceeds same 250KiB budget '+path);
 const normalizeLocaleBody=s=>s.slice(s.indexOf('<style>')).replace(/(<span id="project-network-label">)[^<]*(<\/span>)/g,'$1LOCALIZED$2').replace(/(<a id="project-network-link" href=")[^"]*(">)[^<]*(<\/a>)/g,'$1LOCALIZED$2LOCALIZED$3');
 assert.equal(normalizeLocaleBody(document),normalizeLocaleBody(html),'identical application body except localized static network link '+path);
 assert.ok(document.includes('id="project-network-link" href="/'+lang+'/partners.html"'),'localized static network link '+path);
 const scripts=[...document.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)];
 assert.ok(scripts.length<=1,'same deferred dependency budget '+path);
 for(const script of scripts)assert.ok(script[0].includes(' defer')&&script[1].startsWith('/js/'),'only deferred local JS '+path);
}
const largest=Math.max(...results.filter(r=>r.path!=='index.html').map(r=>r.bytes));
console.log('PERF BUDGETS PASS: home '+size+' B (<250KiB), '+(results.length-1)+' guides each <16KiB (largest '+largest+' B), no blocking external scripts on any static SEO guide (homepage allows one deferred same-origin source monitor), intrinsic lazy airline logos.');
console.log('These static budgets are not measurements of real-user LCP, INP or CLS; use Chrome lab observations and Search Console for that.');
