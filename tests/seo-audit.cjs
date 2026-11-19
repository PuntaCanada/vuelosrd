// VuelosRD SEO audit: server-rendered language pages and crawl signals.
// Does not assert that Google has indexed or ranked the pages.
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = 'https://vuelosrd.pages.dev/';
const paths = {es:'index.html',en:'en/index.html',de:'de/index.html',fr:'fr/index.html',ht:'ht/index.html'};
const urls = Object.fromEntries(Object.keys(paths).map(lang=>[lang,base+(lang==='es'?'':lang+'/')]));
const alternate = {...urls,'x-default':urls.es};
const robots = fs.readFileSync('robots.txt','utf8');
const sitemap = fs.readFileSync('sitemap.xml','utf8');
assert.ok(robots.includes('User-agent: *') && robots.includes('Allow: /'),'robots allows crawling');
assert.ok(!robots.includes('Disallow: /'),'robots does not block the root');
assert.ok(robots.includes('Sitemap: '+base+'sitemap.xml'),'robots points to sitemap');
assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),'sitemap declares hreflang namespace');
assert.equal(sitemap.split('<url>').length-1,5,'sitemap has five language URLs');
for(const [lang,path] of Object.entries(paths)){
 const html = fs.readFileSync(path,'utf8');
 assert.ok(html.toLowerCase().startsWith('<!doctype html>'),'HTML doctype: '+lang);
 assert.ok(html.includes('<html lang="'+lang+'">'),'HTML language: '+lang);
 assert.ok(html.includes('<link rel="canonical" href="'+urls[lang]+'">'),'self-canonical: '+lang);
 assert.ok(/<title>[^<]{15,}<\/title>/.test(html),'descriptive title: '+lang);
 assert.ok(/<meta name="description" content="[^"]{40,}">/.test(html),'nonempty meta description: '+lang);
 assert.ok(!/name="robots"[^>]*noindex/i.test(html),'no accidental noindex: '+lang);
 assert.ok(html.includes('property="og:url" content="'+urls[lang]+'"'),'social URL: '+lang);
 for(const [alternateLang,url] of Object.entries(alternate)){
  const link='<link rel="alternate" hreflang="'+alternateLang+'" href="'+url+'">';
  assert.ok(html.includes(link),'reciprocal HTML hreflang '+alternateLang+' on '+lang);
  const xml='<xhtml:link rel="alternate" hreflang="'+alternateLang+'" href="'+url+'" />';
  assert.equal(sitemap.split(xml).length-1,5,'reciprocal sitemap hreflang '+alternateLang);
 }
 assert.ok(sitemap.includes('<loc>'+urls[lang]+'</loc>'),'sitemap canonical: '+lang);
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert.ok(match,'JSON-LD present: '+lang);
 const schema=JSON.parse(match[1]);
 assert.equal(schema['@context'],'https://schema.org','schema context: '+lang);
 assert.equal(schema['@type'],lang==='es'?'WebSite':'WebPage','schema type: '+lang);
 assert.equal(schema.url,urls[lang],'schema URL: '+lang);
 assert.ok(html.includes('VuelosRD'),'brand in visible HTML: '+lang);
 if(lang!=='es'){
  assert.ok(html.includes('/?lang='+lang+'#flight-board'),'landing links to interactive portal: '+lang);
  assert.ok(html.includes('PUJ')&&html.includes('SDQ'),'substantive airport content: '+lang);
 }
}
console.log('SEO audit OK: 5 self-canonical language pages, reciprocal hreflang, XML sitemap, structured data and crawl rules.');
