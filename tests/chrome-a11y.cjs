// Chromium browser regression and automated axe checks. No flight API or paid service.
const { chromium } = require('playwright');
const {newTrackingFreePage,blockCloudflareAnalytics}=require('./block-cloudflare-analytics.cjs');
const axe = require('axe-core');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
 const failures=[];
 for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]) {
  const page=await newTrackingFreePage(browser,{viewport, reducedMotion:'reduce'});
  try {
   // Mock only within Chromium regression: this is never published as live data.
   const checkedAt=new Date().toISOString();
   const sample={schemaVersion:1,checkedAt,total:47,ok:34,uncertain:13,broken:0,
    monitorStatus:'partial-or-complete',actionableAlertCount:0,monitorLimitationCount:13,
    warnings:[{url:'https://www.airfrance.com/',status:403,category:'access-restricted',actionable:false}]};
   const history={schemaVersion:1,entries:[{checkedAt,total:47,ok:34,actionableAlertCount:0}]};
   const fallback=viewport.width===320;
   const local='http://127.0.0.1:8765/data/';
   const mirror='https://raw.githubusercontent.com/PuntaCanada/vuelosrd/main/data/';
   await page.route(local+'source-health-latest.json',route=>route.fulfill({status:fallback?404:200,contentType:'application/json',body:fallback?'missing':JSON.stringify(sample)}));
   await page.route(local+'source-health-history.json',route=>route.fulfill({status:fallback?404:200,contentType:'application/json',body:fallback?'missing':JSON.stringify(history)}));
   await page.route(mirror+'source-health-latest.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sample)}));
   await page.route(mirror+'source-health-history.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(history)}));

   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.locator('#sourceHealthMetrics span').first().waitFor();
   // Santo Domingo crosses midnight at 04:00 UTC.
   await page.clock.setFixedTime(new Date('2026-11-24T03:59:00Z'));
   await page.evaluate(()=>clock());
   assert.equal(await page.locator('#boardClock').innerText(),'23:59');
   assert.equal(await page.locator('#boardDate').innerText(),'23 de noviembre de 2026');
   await page.clock.setFixedTime(new Date('2026-11-24T04:00:00Z'));
   await page.evaluate(()=>clock());
   assert.equal(await page.locator('#boardClock').innerText(),'00:00');
   assert.equal(await page.locator('#boardDate').innerText(),'24 de noviembre de 2026');
   assert.match(await page.locator('#sourceHealthDate').innerText(),/Última comprobación automática/,'dated live source data shown');
   assert.match(await page.locator('#sourceHealthMetrics').innerText(),/34/,'actual automated counts in snapshot');
   assert.equal(await page.locator('#sourceHealthHistory li').count(),1,'only genuine stored snapshots shown');
   if(viewport.width===320)assert.match(await page.locator('#sourceHealthDate').innerText(),/Última comprobación automática/,'GitHub mirror recovers dated source status when Cloudflare JSON is missing');
   assert.match(await page.locator('#airlineCards .airline-card').filter({has:page.locator('h3',{hasText:'Air France'})}).locator('.airline-source-check').innerText(),/Acceso automático limitado/,'request failure is not labelled a broken link');
   assert.equal(await page.locator('.source-alternative').count(),3,'only three verified first-party alternative links');

   // Users see explicit dated verification notes, not blanket 'broken link' warnings.
   assert.equal(await page.locator('#airlineCards .airline-source-check').count(),12,'12 reviewed airline URLs have visible notes');
   const airFrance=page.locator('#airlineCards .airline-card').filter({has:page.locator('h3', {hasText:'Air France'})});
   assert.equal(await airFrance.locator('.airline-source-check').getAttribute('data-status'),'restricted','Air France has documented automated access restriction');
   assert.match(await airFrance.locator('.airline-source-check').innerText(),/2026-11-20/,'source notes show human review date');
   const spiritCard=page.locator('#airlineCards .airline-card').filter({has:page.locator('h3', {hasText:'Spirit'})});
   assert.equal(await spiritCard.locator('.airline-source-check').getAttribute('data-status'),'timeout','historical Spirit timeout is not disguised');
   const unitedCard=page.locator('#airlineCards .airline-card').filter({has:page.locator('h3', {hasText:'United Airlines'})});
   assert.equal(await unitedCard.locator('.airline-source-check').getAttribute('data-status'),'readable','United was independently readable');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.match(await airFrance.locator('.airline-source-check').innerText(),/Automatische Prüfung eingeschränkt/,'German visitor note');
   await page.locator('[data-lang="es"]').click();

   // VuelosRD 2.0: a single visible journey workflow, not merely isolated links.
   const consolePanel=page.locator('#v2-console');
   assert.equal(await consolePanel.isVisible(),true,'2.0 console visible at '+viewport.width);
   assert.equal(await page.locator('#v2-airport option').count(),7,'all seven airports in unified trip selector');
   const consolePosition=await consolePanel.boundingBox(),boardPosition=await page.locator('#flight-board').boundingBox();
   assert.ok(consolePosition.y<boardPosition.y,'new trip workflow is visibly ahead of flight sources');
   await page.locator('#v2-airport').selectOption('STI');
   assert.equal(await page.locator('#airport').inputValue(),'STI','2.0 airport syncs flight search');
   assert.equal(await page.locator('#boardAirport').inputValue(),'STI','2.0 airport syncs board');
   assert.equal(await page.locator('#journeyAirport').inputValue(),'STI','2.0 airport syncs trip assistant');
   assert.equal(await page.locator('#v2-guide').getAttribute('href'),'/airports/sti/','2.0 links to correct SEO guide');
   assert.match(await page.locator('#v2-official').getAttribute('href'),/aeropuertocibao.com.do/,'2.0 official operator');
   await page.locator('#v2-arrival').click();
   assert.equal(await page.locator('#journeyStage').inputValue(),'arrival','2.0 arrival step drives checklist');
   assert.equal(await page.locator('#v2-arrival').getAttribute('aria-pressed'),'true','2.0 stage state accessible');
   await page.locator('#v2-airline-search').fill('arajet');
   await page.locator('#v2-airline-search').press('Enter');
   assert.equal(await page.locator('#journeyAirline').inputValue(),'DM','2.0 airline filter selects active carrier');
   assert.equal(await page.locator('#passengerAirline').inputValue(),'DM','2.0 airline selects baggage helper');
   assert.match(await page.locator('#v2-airline-link').getAttribute('href'),/arajet.com/,'2.0 exposes official airline website');
   assert.match(await page.locator('#v2-summary').innerText(),/Arajet/,'2.0 visibly summarizes carrier');
   await page.locator('#v2-airline-search').fill('Spirit');
   assert.equal(await page.locator('#v2-airline').locator('option[value="NK"]').count(),0,'ceased operator cannot be selected');
   await page.locator('#v2-airline-search').fill('');
   await page.locator('#v2-airline').selectOption('');
   await page.locator('#v2-departure').click();
   await page.locator('#v2-airport').selectOption('PUJ');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.match(await page.locator('#v2-title').innerText(),/Plane deine Reise/,'2.0 title localized into German');
   assert.equal(await page.locator('#v2-guide').getAttribute('href'),'/de/airports/puj/','2.0 uses selected language');
   await page.locator('[data-lang="es"]').click();

   assert.match(await page.locator('#boardWarning').innerText(),/no publica datos de vuelo en tiempo real/i);
   // Search is accent-insensitive, has useful live results and synchronizes the flight, board, and journey.
   await page.locator('#airportQuickFilter').fill('samana');
   assert.equal(await page.locator('#airportQuickResults button').count(),1,'accent-free airport search yields one result');
   await page.locator('#airportQuickFilter').press('Enter');
   assert.equal(await page.locator('#airport').inputValue(),'AZS','airport search Enter updates main airport');
   assert.equal(await page.locator('#journeyAirport').inputValue(),'AZS','airport search updates journey');
   assert.equal(await page.locator('#boardAirport').inputValue(),'AZS','airport search updates flight board');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'airport','airport picker returns keyboard focus');
   await page.locator('#airportQuickFilter').fill('no-such-airport');
   assert.equal(await page.locator('#airportQuickResults button').count(),0,'no imaginary airports');
   await page.locator('#airportQuickFilter').press('Escape');
   assert.equal(await page.locator('#airportQuickFilter').inputValue(),'','Escape clears airport search');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.match(await page.locator('#airportQuickLabel').innerText(),/Flughafen/,'airport search localized');
   await page.locator('#airportQuickFilter').fill('Cibao');
   await page.locator('#airportQuickResults [data-airport="STI"]').click();
   assert.equal(await page.locator('#flightAirportGuide').getAttribute('href'),'/de/airports/sti/','search routes to localized guide');
   await page.locator('#airportQuickFilter').fill('');
   await page.locator('[data-lang="es"]').click();

   // Single-match airline search supports hardware/soft keyboard Enter without selecting retired carriers.
   await page.locator('#flightAirlineQuickFilter').fill('Arajet');
   assert.match(await page.locator('#flightAirlineShortcutNote').innerText(),/Intro|Enter|Entrée|Antre/,'single result announces Enter shortcut');
   await page.locator('#flightAirlineQuickFilter').press('Enter');
   assert.equal(await page.locator('#flight').inputValue(),'DM ','one matching active airline selected with Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'flight','Enter selection focuses flight number');
   await page.locator('#flightAirlineQuickFilter').fill('Spirit');
   await page.locator('#flightAirlineQuickFilter').press('Enter');
   assert.equal(await page.locator('#flight').inputValue(),'DM ','retired airline never changes flight number');
   await page.locator('#flightAirlineQuickFilter').fill('');

   // Visible mobile-friendly actions connect flight search, airline code search and the journey assistant.
   assert.equal(await page.locator('#flightFocusAirline').isVisible(),true,'flight-to-airline action visible');
   assert.equal(await page.locator('#flightFocusJourney').isVisible(),true,'flight-to-journey action visible');
   await page.locator('#flightFocusAirline').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'flightAirlineQuickFilter','airline quick search is keyboard-ready');
   await page.locator('#flightAirlineQuickFilter').fill('Arajet');
   assert.equal(await page.locator('#flightAirlineShortcutButtons [data-airline]').count(),1,'quick search filters airline codes');
   await page.locator('#flightAirlineQuickFilter').fill('');
   await page.locator('#flightFocusJourney').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'journeyAirport','journey shortcut focuses airport selector');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.equal(await page.locator('#flightFocusAirline').innerText(),'Airline suchen','German quick link translation');
   await page.locator('[data-lang="es"]').click();

   await page.locator('#boardAirport').selectOption('SDQ');
   assert.equal(await page.locator('#airport').inputValue(),'SDQ');
   assert.equal(new URL(await page.locator('#flightAirportGuide').getAttribute('href'),'http://127.0.0.1:8765').pathname,'/airports/sdq/','flight quick guide follows airport selection');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="de"]').click();
   assert.equal(new URL(await page.locator('#flightAirportGuide').getAttribute('href'),'http://127.0.0.1:8765').pathname,'/de/airports/sdq/','flight quick guide localized');
   assert.match(await page.locator('#flightAirportGuide').innerText(),/Flughafenführer/,'guide label translated');
   await page.locator('[data-lang="es"]').click();
   await page.locator('#boardDepartures').click();
   assert.equal(await page.locator('#boardDepartures').getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#boardRealDesc').innerText(),/no tenemos un enlace verificado/i);
   assert.match(await page.locator('#boardAirportOfficialLink').getAttribute('href'),/aerodom\.com/);
   await page.locator('#boardAirport').selectOption('STI');
   assert.equal(await page.locator('#boardAirportOfficialLink').getAttribute('href'),'https://aeropuertocibao.com.do/en/salidas/');
   await page.locator('#boardArrivals').click();
   assert.equal(await page.locator('#boardAirportOfficialLink').getAttribute('href'),'https://aeropuertocibao.com.do/en/llegadas/');
   // Five-language journey assistant: synchronizes existing airport, airline and stage controls.
   assert.equal(await page.locator('#journeyAirport option').count(),7);
   assert.equal(await page.locator('#journeyAirline option').count(),29,'28 official airlines plus optional choice');
   await page.locator('#journeyAirport').selectOption('STI');
   assert.equal(await page.locator('#airport').inputValue(),'STI','journey synchronized to primary airport');
   assert.equal(await page.locator('#boardAirport').inputValue(),'STI','journey synchronized to board');
   assert.equal(await page.locator('#passengerAirport').inputValue(),'STI','journey synchronized to baggage routing');
   assert.equal(await page.locator('#journey-guide-link').getAttribute('href'),'/airports/sti/','journey guide follows selected airport');
   await page.locator('#langMenu summary').click();
   await page.locator('[data-choose-lang="fr"]').click();
   assert.equal(await page.locator('#journey-guide-link').getAttribute('href'),'/fr/airports/sti/','journey guide follows selected locale');
   await page.locator('[data-lang="es"]').click();
   assert.ok((await page.locator('#journey-airport-source').getAttribute('href')).includes('aeropuertocibao.com.do'));
   await page.locator('#journeyAirline').selectOption('DE');
   assert.equal(await page.locator('#passengerAirline').inputValue(),'DE','airline synchronized to baggage helper');
   assert.ok((await page.locator('#journey-airline-source').getAttribute('href')).includes('condor.com'));
   assert.equal(await page.locator('#journey-airline-source').isVisible(),true);
   assert.equal(await page.locator('#journey-flight-link').getAttribute('href'),'#flightTitle','flight shortcut provided');
   await page.locator('#journey-flight-link').click();
   assert.equal(await page.locator('#flight').inputValue(),'DE ','flight helper prefills selected airline without claiming live data');
   assert.equal(await page.locator('#journeyAirline').inputValue(),'DE','selected airline preserved');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'flight','keyboard focus enters flight search');
   await page.locator('#journeyAirline').selectOption('');
   assert.equal(await page.locator('#journey-airline-source').isVisible(),false,'unspecified airline has no broken action');
   assert.ok((await page.locator('#journey-summary').innerText()).includes('STI'),'selected airport in summary');
   await page.locator('#journeyStage').selectOption('arrival');
   assert.equal(await page.locator('#passenger-arrival').getAttribute('aria-pressed'),'true');
   await page.locator('#passenger-departure').click();
   assert.equal(await page.locator('#journeyStage').inputValue(),'departure','reverse-stage synchronization');
   await page.locator('#journeyAirport').selectOption('PUJ');
   assert.equal(await page.locator('#mobileGoJourney').getAttribute('href'),'#journey-wizard','mobile journey deep link');
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

   // A ceased carrier must remain transparently documented without offering new flight preparation.
   await page.locator('#flightAirlineQuickFilter').fill('Spirit');
   assert.equal(await airlineButtons.count(),1,'historic carrier still documented');
   assert.equal(await airlineButtons.first().isDisabled(),true,'ceased carrier cannot start a new flight');
   await page.locator('#airlineFilter').fill('Spirit');
   assert.equal(await page.locator('#airlineCards .airline-inactive-notice').count(),1,'historical status warning shown');
   assert.match(await page.locator('#airlineCards .airline-inactive-notice').innerText(),/2026/);
   assert.equal(await page.locator('#airlineCards .airline-start-search').count(),0,'ceased carrier has no new-flight action');
   assert.match(await page.locator('#airlineCards a[href*="spiritrestructuring.com"]').first().getAttribute('href'),/spiritrestructuring/);
   await page.locator('#airlineFilter').fill('');
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
    assert.equal(await page.locator('#mobileBottomNav a').count(),4,'four thumb-friendly mobile navigation destinations');
    await page.locator('#mobileGoJourney').click();
    assert.equal(await page.evaluate(()=>location.hash),'#journey-wizard','mobile journey shortcut navigates to assistant');
    await page.waitForFunction(()=>document.getElementById('mobileGoJourney').getAttribute('aria-current')==='location',{timeout:10000});
    assert.equal(await page.locator('#mobileGoJourney').getAttribute('aria-current'),'location','mobile destination has current state');
    const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
    assert.equal(overflows,false,'document has horizontal overflow');
   }
  } catch(e){failures.push(viewport.width+': '+e.stack);}
  await page.close();
 }
 // Independently crawl real static multilingual airport guides in Chromium.
 const airportCases=[['puj','es',320],['sdq','en',390],['sti','de',390],['pop','fr',320],['lrm','ht',390],['azs','es',1440],['jbq','de',320]];
 for(const [code,lang,width] of airportCases){
  const page=await newTrackingFreePage(browser,{viewport:{width,height:780},reducedMotion:'reduce'});
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
   assert.equal(await page.locator('#quick-travel').count(),1,'one guide quick-navigation region');
   assert.equal(await page.locator('.quick-flight-form input[name="airport"]').inputValue(),code.toUpperCase(),'guide flight form airport');
   assert.equal(await page.locator('.quick-flight-form input[name="lang"]').inputValue(),lang,'guide flight form language');
   assert.equal(await page.locator('.quick-travel-links a').count(),4,'journey, baggage, transport and official sources');
   const link=await page.locator('.quick-travel-links a').nth(1).getAttribute('href');
   assert.equal(link,'/?lang='+lang+'&airport='+code.toUpperCase()+'#passenger-help-title','localized baggage deep link');
   assert.equal(await page.locator('#airport-sources').count(),1,'real official-source anchor');

   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,'airport landing page mobile overflow '+code+' '+lang+' '+width+'px: '+overflow);
   if(width<=390){
    const findings=await page.evaluate(source=>{eval(source);return window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})},axe.source);
    const severe=findings.violations.filter(v=>['serious','critical'].includes(v.impact));
    assert.deepEqual(severe.map(v=>v.id),[],'serious/critical WCAG in guide '+code+' '+lang);
   }
   console.log('Airport guide PASS: '+code+' '+lang+' '+width+'px');
   if(code==='sti'&&lang==='de'){
     await page.locator('#quick-flight-number').fill('DE 1234');
     await page.locator('.quick-flight-form button[type="submit"]').click();
     await page.waitForURL(url=>url.pathname==='/'&&url.searchParams.get('flight')==='DE 1234',{timeout:10000});
     assert.equal(await page.locator('html').getAttribute('lang'),'de','guide flight form preserves German');
     assert.equal(await page.locator('#airport').inputValue(),'STI','guide flight form preserves Cibao airport');
     assert.equal(await page.locator('#flight').inputValue(),'DE1234','guide flight form normalizes number');
     await page.waitForFunction(()=>document.getElementById('track')?.getAttribute('aria-disabled')==='false',null,{timeout:10000});
     assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false','valid flight search may open external verification');
   }
  }catch(e){failures.push('Airport guide '+code+' '+lang+': '+e.stack);}
  await page.close();
 }
 await browser.close();
 if(failures.length){console.error(failures.join('\n\n'));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
