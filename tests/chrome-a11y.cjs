// Chromium browser regression and automated axe checks. No flight API or paid service.
const { chromium } = require('playwright');
const axe = require('axe-core');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
 const failures=[];
 for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]) {
  const page=await browser.newPage({viewport, reducedMotion:'reduce'});
  try {
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.locator('#boardRows tr').first().waitFor();
   assert.match(await page.locator('#boardWarning').innerText(),/DEMO|DEMOSTRA|fictici/i);
   assert.ok((await page.locator('#boardRows tr').count())>0,'demo board rendered');
   await page.locator('#boardAirport').selectOption('SDQ');
   assert.equal(await page.locator('#airport').inputValue(),'SDQ');
   await page.locator('#boardDepartures').click();
   assert.equal(await page.locator('#boardDepartures').getAttribute('aria-pressed'),'true');
   await page.locator('#boardFilter').fill('NO-MATCH-XYZ');
   assert.equal(await page.locator('#boardRows tr').count(),1);
   await page.locator('#boardClearFilters').click();
   assert.ok((await page.locator('#boardRows tr').count())>1);
   // Five-language journey assistant: synchronizes existing airport, airline and stage controls.
   assert.equal(await page.locator('#journeyAirport option').count(),7);
   assert.equal(await page.locator('#journeyAirline option').count(),29,'28 official airlines plus optional choice');
   await page.locator('#journeyAirport').selectOption('STI');
   assert.equal(await page.locator('#airport').inputValue(),'STI','journey synchronized to primary airport');
   assert.equal(await page.locator('#boardAirport').inputValue(),'STI','journey synchronized to board');
   assert.equal(await page.locator('#passengerAirport').inputValue(),'STI','journey synchronized to baggage routing');
   assert.ok((await page.locator('#journey-airport-source').getAttribute('href')).includes('aeropuertocibao.com.do'));
   await page.locator('#journeyAirline').selectOption('DE');
   assert.equal(await page.locator('#passengerAirline').inputValue(),'DE','airline synchronized to baggage helper');
   assert.ok((await page.locator('#journey-airline-source').getAttribute('href')).includes('condor.com'));
   assert.equal(await page.locator('#journey-airline-source').isVisible(),true);
   await page.locator('#journeyAirline').selectOption('');
   assert.equal(await page.locator('#journey-airline-source').isVisible(),false,'unspecified airline has no broken action');
   assert.ok((await page.locator('#journey-summary').innerText()).includes('STI'),'selected airport in summary');
   await page.locator('#journeyStage').selectOption('arrival');
   assert.equal(await page.locator('#passenger-arrival').getAttribute('aria-pressed'),'true');
   await page.locator('#passenger-departure').click();
   assert.equal(await page.locator('#journeyStage').inputValue(),'departure','reverse-stage synchronization');
   await page.locator('#journeyAirport').selectOption('PUJ');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.equal(await page.locator('#journey-title').innerText(),'Dein Reiseassistent');
   assert.ok((await page.locator('#journey-summary').innerText()).includes('Abflug'),'German journey summary');
   await page.locator('[data-lang="es"]').click();
   // Local-only travel checklist: separate trip stages, persistence, reset, and source routing.
   assert.equal(await page.locator('#passenger-checklist input[type="checkbox"]').count(),5);
   assert.equal(await page.locator('#passenger-departure').getAttribute('aria-pressed'),'true');
   await page.locator('#passenger-checklist input').first().check();
   assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'1','departure progress');
   await page.locator('#passenger-arrival').click();
   assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'0','arrival independent');
   await page.locator('#passenger-checklist input').nth(1).check();
   assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'1');
   await page.locator('#passenger-departure').click();
   assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'1','departure retained');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'1','checkmark persisted in browser');
   await page.locator('#passenger-reset').click();
   assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'0','reset cleared current checklist');
   await page.locator('#passengerIssue').selectOption('item');
   await page.locator('#passengerAirport').selectOption('PUJ');
   assert.ok((await page.locator('#passenger-issue-link').getAttribute('href')).includes('airport-services/item/lost-found'),'Punta Cana airport lost property');
   await page.locator('#passengerAirport').selectOption('LRM');
   assert.ok((await page.locator('#passenger-issue-link').getAttribute('href')).includes('romanaairport.com/lost-and-found'),'La Romana airport lost property');
   await page.locator('#passengerAirport').selectOption('AZS');
   assert.ok((await page.locator('#passenger-issue-link').getAttribute('href')).includes('aerodom.com'),'unverified lost property handled by official operator');
   await page.locator('#passengerIssue').selectOption('checked');
   assert.ok((await page.locator('#passenger-issue-result').innerText()).includes('aerolínea'),'checked bags handled by airline');
   assert.equal(await page.locator('#passengerAirline option').count(),29,'all 28 official airline choices');
   assert.equal(await page.locator('#passenger-airline-link').isVisible(),false,'no airline selected');
   await page.locator('#passengerAirline').selectOption('DE');
   assert.equal(await page.locator('#passenger-airline-link').isVisible(),true,'selected airline official link');
   assert.ok((await page.locator('#passenger-airline-link').getAttribute('href')).includes('condor.com'),'Condor official airline route');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.ok((await page.locator('#passenger-hub-title').innerText()).includes('Reise'));
   assert.ok((await page.locator('#passenger-issue-result').innerText()).includes('Airline'),'localized baggage explanation');
   await page.locator('[data-lang="es"]').click();
   // Airport detail sources: verified operator links, translated and synchronized across selectors.
   await page.locator('#travelAssistAirport').selectOption('PUJ');
   assert.ok((await page.locator('#deep-access-link').getAttribute('href')).includes('wheelchair-service'),'PUJ airline-requested wheelchair source');
   assert.ok((await page.locator('#deep-transfer-link').getAttribute('href')).includes('transportations'),'PUJ transport source');
   await page.locator('#travelAssistAirport').selectOption('LRM');
   assert.ok((await page.locator('#deep-transfer-link').getAttribute('href')).includes('romanaairport.com/taxi-services/'),'La Romana taxi operator source');
   await page.locator('#travelAssistAirport').selectOption('STI');
   assert.ok((await page.locator('#deep-service-link').getAttribute('href')).includes('/servicios-a-pasajeros/'),'STI passenger services');
   await page.locator('#travelAssistAirport').selectOption('SDQ');
   assert.ok((await page.locator('#deep-service-link').getAttribute('href')).includes('aerodom.com'),'Aerodom general source');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.equal(await page.locator('#deep-transfer-title').innerText(),'Abholung und Transfer');
   await page.locator('[data-lang="es"]').click();
   assert.equal(await page.locator('#deep-transfer-title').innerText(),'Transporte y recogida');
   // Browser comparison: seven airports, free-text query, source completeness and detail navigation.
   assert.equal(await page.locator('#compare-grid .compare-card').count(),7,'seven airports compared');
   await page.locator('#compareSearch').fill('Samaná');
   assert.equal(await page.locator('#compare-grid .compare-card').count(),1,'accent insensitive airport lookup');
   assert.equal(await page.locator('#compare-grid .compare-card').first().getAttribute('data-airport'),'AZS');
   await page.locator('#compareSearch').fill('xxxxx-not-an-airport');
   assert.equal(await page.locator('#compare-empty').isVisible(),true,'comparison empty state');
   await page.locator('#compare-reset').click();
   assert.equal(await page.locator('#compare-grid .compare-card').count(),7);
   await page.locator('#compareFilter').selectOption('detail');
   assert.equal(await page.locator('#compare-grid .compare-card').count(),3,'specific airport sources only');
   await page.locator('#compareFilter').selectOption('overview');
   assert.equal(await page.locator('#compare-grid .compare-card').count(),4,'overview-only sources clearly distinguished');
   await page.locator('#compareFilter').selectOption('all');
   await page.locator('#compare-grid button[data-airport="LRM"]').click();
   assert.equal(await page.locator('#airport').inputValue(),'LRM','comparison updates airport detail');
   assert.equal(await page.locator('#travelAssistAirport').inputValue(),'LRM','comparison updates travel guide');
   assert.equal(await page.locator('#compare-grid .compare-card.selected').count(),1,'selected airport highlighted');
   await page.locator('#compare-grid button[data-airport="PUJ"]').click();
   // Practical airport travel guide, official external links, selection and localized content.
   assert.equal(await page.locator('#travelAssistAirport option').count(),7,'seven supported airports');
   await page.locator('#travelAssistAirport').selectOption('STI');
   assert.equal(await page.locator('#airport').inputValue(),'STI','travel guide synchronized');
   assert.ok((await page.locator('#assist-operator-link').getAttribute('href')).includes('aeropuertocibao.com.do'));
   assert.ok((await page.locator('#assist-flight-link').getAttribute('href')).includes('/data/airports/sti'));
   assert.equal(await page.locator('#assist-sti-arrivals').isVisible(),true,'Cibao operator arrival board available');
   assert.ok((await page.locator('#assist-sti-arrivals').getAttribute('href')).includes('aeropuertocibao.com.do/llegadas'));
   assert.ok((await page.locator('#assist-sti-departures').getAttribute('href')).includes('aeropuertocibao.com.do/salidas'));

   await page.locator('#travelAssistAirport').selectOption('LRM');
   assert.equal(await page.locator('#assist-sti-arrivals').isVisible(),false,'other airports do not get wrong STI operator board');

   assert.ok((await page.locator('#assist-operator-link').getAttribute('href')).includes('romanaairport.com'));
   await page.locator('#travelAssistAirport').selectOption('PUJ');
   assert.ok((await page.locator('#assist-transport-link').getAttribute('href')).includes('puntacanainternationalairport.com'));
   assert.ok((await page.locator('#assist-baggage-link').getAttribute('href')).includes('aduanas.gob.do'));
   assert.ok((await page.locator('#assist-eticket-link').getAttribute('href')).includes('eticket.migracion.gob.do'));
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.ok((await page.locator('#travel-assist-title').innerText()).includes('Flughafenführer'));
   await page.locator('[data-lang="es"]').click();
   // Real Chrome smoke test: the full airline selection is visible, filterable and keyboard-operable.
   const airlineButtons=page.locator('#flightAirlineShortcutButtons [data-airline]');
   assert.equal(await airlineButtons.count(),28,'all directory airlines displayed initially');
   assert.equal(await page.evaluate(()=>airlineDirectory.filter(a=>a.logo).length),26,'airline images have source URLs');
   await page.locator('#flightAirlineQuickFilter').fill('Arajet');
   assert.equal(await airlineButtons.count(),1,'airline name search');
   await page.locator('#flightAirlineQuickFilter').fill('DM');
   assert.equal(await airlineButtons.count(),1,'airline code search');
   await airlineButtons.first().click();
   assert.equal(await page.locator('#flight').getAttribute('placeholder'),'DM 1234','airline chip opens number entry');
   assert.equal(await page.locator('#flight').inputValue(),'DM ','airline chip pre-fills code');
   assert.equal(await page.locator('#airlineMatch').isVisible(),true,'recognized airline code is explained before digits');
   assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'false','partial code is not an error');
   assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true','partial number cannot open tracking');
   await page.locator('#flight').fill('DM1234');
   assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false','complete number enables external link');
   assert.match(await page.locator('#track').getAttribute('href'),/\/data\/flights\/dm1234/);

   await page.locator('#flightAirlineQuickFilter').fill('not-an-airline');
   assert.equal(await airlineButtons.count(),0,'empty state');
   await page.locator('#flightAirlineQuickFilter').fill('');
   assert.equal(await airlineButtons.count(),28,'clearing search shows all again');
   await page.locator('.airline-more-toggle').first().click();
   assert.equal(await airlineButtons.count(),5,'collapse the list');
   await page.locator('.airline-more-toggle').first().click();
   assert.equal(await airlineButtons.count(),28,'expand the list');
   await page.locator('#flight').fill('not-a-flight');
   assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'true');
   await page.locator('#flight').fill('DE 2228');
   assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'false');
   assert.match(await page.locator('#track').getAttribute('href'),/flightradar24\.com/);
   await page.locator('#flight').fill('');
   await page.locator('body').click({position:{x:5,y:5}});
   await page.keyboard.press('/');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
   // Language navigation remains operable after filtering and search.
   await page.locator('[data-lang="en"]').click();
   await page.locator('#flight').fill('DM ');
   assert.match(await page.locator('#flightSearchHint').innerText(),/Enter the flight digits after DM/);

   assert.equal(await page.locator('#flightAirlineQuickFilter').getAttribute('placeholder'),'Search 28 airlines');
   await page.locator('[data-lang="es"]').click();
   const results=await page.evaluate(axeSource=>{eval(axeSource);return window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})},axe.source);
   const critical=results.violations.filter(v=>v.impact==='critical');
   if(critical.length)throw new Error('Critical axe violations: '+critical.map(x=>x.id).join(','));
   console.log(viewport.width+'px: '+results.violations.length+' axe findings ('+critical.length+' critical), '+results.passes.length+' passes');
   if(viewport.width<=390){
    assert.equal(await page.locator('#mobileBottomNav').isVisible(),true);
    const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
    assert.equal(overflows,false,'document has horizontal overflow');
   }
  } catch(e){failures.push(viewport.width+': '+e.stack);}
  await page.close();
 }
 // Independently crawl real static multilingual airport guides in Chromium.
 const airportCases=[['puj','es',320],['sdq','en',390],['sti','de',390],['pop','fr',320],['lrm','ht',390],['azs','es',1440],['jbq','de',320]];
 for(const [code,lang,width] of airportCases){
  const page=await browser.newPage({viewport:{width,height:780},reducedMotion:'reduce'});
  try{
   const uri='http://127.0.0.1:8765/'+(lang==='es'?'':lang+'/')+'airports/'+code+'/';
   const result=await page.goto(uri,{waitUntil:'domcontentloaded'});
   assert.equal(result.status(),200,'airport guide loads: '+uri);
   assert.equal(await page.locator('html').getAttribute('lang'),lang,'guide language');
   assert.equal(await page.locator('h1').count(),1,'one visible airport heading');
   const canonical='https://vuelosrd.pages.dev/'+(lang==='es'?'':lang+'/')+'airports/'+code+'/';
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),canonical);
   assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(),6,'five reciprocal locale links plus fallback');
   assert.equal(await page.locator('nav.airports a').count(),7,'seven cross-linked airport guides');
   const official=await page.locator('.source').first().locator('a').getAttribute('href');
   assert.ok(official.startsWith('https://'),'official operator source');
   const portal=await page.locator('a.button').first().getAttribute('href');
   assert.ok(portal.includes('airport='+code.toUpperCase()),'deep link opens selected airport');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,'airport landing page mobile overflow '+code+' '+lang+' '+width+'px: '+overflow);
   if(width<=390){
    const findings=await page.evaluate(source=>{eval(source);return window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})},axe.source);
    const severe=findings.violations.filter(v=>['serious','critical'].includes(v.impact));
    assert.deepEqual(severe.map(v=>v.id),[],'serious/critical WCAG in guide '+code+' '+lang);
   }
   console.log('Airport guide PASS: '+code+' '+lang+' '+width+'px');
  }catch(e){failures.push('Airport guide '+code+' '+lang+': '+e.stack);}
  await page.close();
 }
 await browser.close();
 if(failures.length){console.error(failures.join('\n\n'));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
