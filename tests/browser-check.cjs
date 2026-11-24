'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async()=>{
  const base = process.env.VUELOSRD_URL || 'https://vuelosrd.pages.dev/';
  const browser = await chromium.launch({headless:true,...(process.env.VUELOSRD_CHROME_PATH ? {executablePath:process.env.VUELOSRD_CHROME_PATH} : {channel:'chrome'})});
  const errors = [];
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'?lang=de#airlines',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#airlineCards .airline-card').first().waitFor({timeout:15000});
    await page.locator('#goAirlines').waitFor();
    // Public Cloudflare airport pages: real Chrome mobile layout, canonical, languages, links.
    for(const [lang,code,width] of [['en','puj',320],['de','sti',390],['ht','jbq',320]]){
      const guide=await context.newPage();guide.on('pageerror',e=>errors.push('airport '+code+': '+e.message));
      await guide.setViewportSize({width,height:760});
      const path='/'+lang+'/airports/'+code+'/',url=new URL(path,base).href;
      const response=await guide.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(response.status(),200,'public airport page status '+path);
      assert.equal(await guide.locator('html').getAttribute('lang'),lang,'public airport language');
      assert.equal(await guide.locator('link[rel="canonical"]').getAttribute('href'),new URL(path,'https://vuelosrd.pages.dev/').href,'public airport canonical');
      assert.equal(await guide.locator('link[rel="alternate"][hreflang]').count(),6,'public reciprocal language guide links');
      assert.equal(await guide.locator('nav.airports a').count(),7,'seven airport cross-links');
      assert.equal(await guide.locator('h1').count(),1,'one guide heading');
      assert.ok((await guide.locator('.source').first().locator('a').getAttribute('href')).startsWith('https://'),'official source');
      const overflow=await guide.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=2,'public airport page mobile overflow '+path+' '+width);
      assert.equal(await guide.locator('#quick-travel').count(),1,'published guide quick travel available');
      assert.equal(await guide.locator('.quick-flight-form input[name="airport"]').inputValue(),code.toUpperCase(),'published form airport');
      assert.equal(await guide.locator('.quick-flight-form input[name="lang"]').inputValue(),lang,'published form language');
      assert.equal(await guide.locator('.quick-travel-links a').count(),4,'four guide shortcuts');
      assert.equal(await guide.locator('#airport-sources').count(),1,'official source anchor resolves');
      if(code==='puj')await guide.screenshot({path:'airlines-airport-seo.png',fullPage:true});
      if(code==='sti'&&lang==='de'){
        await guide.locator('#quick-flight-number').fill('DE 1234');
        await guide.locator('.quick-flight-form button').click();
        await guide.waitForURL(u=>u.pathname==='/'&&u.searchParams.get('flight')==='DE 1234',{timeout:15000});
        assert.equal(await guide.locator('html').getAttribute('lang'),'de','published guide search keeps German');
        assert.equal(await guide.locator('#airport').inputValue(),'STI','published guide search keeps airport');
        assert.equal(await guide.locator('#flight').inputValue(),'DE1234','published guide search normalizes flight');
        assert.equal(await guide.locator('#track').getAttribute('aria-disabled'),'false','prepared external flight lookup only');
      }
      await guide.close();
    }
    // Journey assistant in real system Chrome: airport, airline, stage, external sources and privacy.
    assert.equal(await page.locator('#journeyAirport option').count(),7);
    assert.equal(await page.locator('#journeyAirline option').count(),29);
    await page.locator('#journeyAirport').selectOption('LRM');
    assert.equal(await page.locator('#airport').inputValue(),'LRM');
    assert.ok((await page.locator('#journey-airport-source').getAttribute('href')).includes('romanaairport.com'));
    await page.locator('#journeyAirline').selectOption('B6');
    await page.locator('#journey-flight-link').click();
    assert.equal(await page.locator('#flight').inputValue(),'B6 ','selecting an airline pre-fills flight search');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
    assert.ok((await page.locator('#journey-airline-source').getAttribute('href')).includes('jetblue.com'));
    await page.locator('#journeyStage').selectOption('arrival');
    assert.equal(await page.locator('#passenger-arrival').getAttribute('aria-pressed'),'true');
    await page.locator('#journeyStage').selectOption('departure');
    await page.locator('#journeyAirport').selectOption('PUJ');
    await page.locator('#journey-wizard').screenshot({path:'airlines-journey-assistant.png'});
    // Actual Chrome passenger hub: local checklist and airline / airport routing.
    assert.equal(await page.locator('#passenger-checklist input').count(),5,'departure checklist');
    await page.locator('#passenger-checklist input').first().check();
    assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'1','progress is updated');
    await page.locator('#passenger-arrival').click();
    assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'0','arrival checklist independent');
    await page.locator('#passenger-departure').click();
    assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'1','departure progress retained');
    await page.locator('#passenger-reset').click();
    assert.equal(await page.locator('#passenger-progress-bar').getAttribute('value'),'0','reset clears departure ticks');
    await page.locator('#passengerIssue').selectOption('item');
    await page.locator('#passengerAirport').selectOption('PUJ');
    assert.ok((await page.locator('#passenger-issue-link').getAttribute('href')).includes('airport-services/item/lost-found'));
    await page.locator('#passengerAirport').selectOption('LRM');
    assert.ok((await page.locator('#passenger-issue-link').getAttribute('href')).includes('romanaairport.com/lost-and-found'));
    await page.locator('#passengerAirport').selectOption('JBQ');
    assert.ok((await page.locator('#passenger-issue-link').getAttribute('href')).includes('aerodom.com'),'operator overview fallback');
    await page.locator('#passengerIssue').selectOption('checked');
    await page.locator('#passengerAirline').selectOption('B6');
    assert.ok((await page.locator('#passenger-airline-link').getAttribute('href')).includes('jetblue.com'));
    await page.locator('#passenger-hub').screenshot({path:'airlines-passenger-hub.png'});
    // Verify the seven-airport comparison using system Chrome, including selection and source filters.
    assert.equal(await page.locator('#compare-grid .compare-card').count(),7);
    await page.locator('#compareSearch').fill('PUJ');
    assert.equal(await page.locator('#compare-grid .compare-card').count(),1);
    await page.locator('#compareSearch').fill('no-airport-123');
    assert.equal(await page.locator('#compare-empty').isVisible(),true);
    await page.locator('#compare-reset').click();
    assert.equal(await page.locator('#compare-grid .compare-card').count(),7);
    await page.locator('#compareFilter').selectOption('detail');
    assert.equal(await page.locator('#compare-grid .compare-card').count(),3);
    await page.locator('#compareFilter').selectOption('overview');
    assert.equal(await page.locator('#compare-grid .compare-card').count(),4);
    await page.locator('#compareFilter').selectOption('all');
    await page.locator('#compare-grid button[data-airport="STI"]').click();
    assert.equal(await page.locator('#airport').inputValue(),'STI');
    await page.locator('#compare-grid button[data-airport="PUJ"]').click();
    await page.locator('#airport-compare').screenshot({path:'airlines-airport-compare.png'});
    // Practical travel assistance: real desktop Chrome, seven-airport navigation and real sources.
    assert.equal(await page.locator('#travelAssistAirport option').count(),7);
    assert.match(await page.locator('#travel-assist-title').innerText(),/Flughafenführer/);
    await page.locator('#travelAssistAirport').selectOption('STI');
    assert.equal(await page.locator('#airport').inputValue(),'STI');
    assert.ok((await page.locator('#assist-operator-link').getAttribute('href')).includes('aeropuertocibao.com.do'));
    assert.equal(await page.locator('#assist-sti-arrivals').isVisible(),true);
    assert.equal(await page.locator('#assist-sti-departures').isVisible(),true);
    await page.locator('#travelAssistAirport').selectOption('LRM');
    assert.equal(await page.locator('#assist-sti-arrivals').isVisible(),false);
    assert.ok((await page.locator('#assist-operator-link').getAttribute('href')).includes('romanaairport.com'));
    await page.locator('#travelAssistAirport').selectOption('PUJ');
    assert.ok((await page.locator('#assist-transport-link').getAttribute('href')).includes('puntacanainternationalairport.com'));
    assert.equal(await page.locator('#airport-deep-guide article').count(),3,'three airport detail source cards');
    assert.ok((await page.locator('#deep-access-link').getAttribute('href')).includes('wheelchair-service'),'PUJ accessibility source');
    await page.locator('#travelAssistAirport').selectOption('STI');
    assert.ok((await page.locator('#deep-service-link').getAttribute('href')).includes('servicios-a-pasajeros'),'STI passenger services source');
    await page.locator('#travelAssistAirport').selectOption('LRM');
    assert.ok((await page.locator('#deep-transfer-link').getAttribute('href')).includes('romanaairport.com/taxi-services/'),'LRM official taxis');
    await page.locator('#travelAssistAirport').selectOption('PUJ');
    await page.locator('#travel-assist').screenshot({path:'airlines-travel-guide.png'});
    console.log('Desktop document loaded; cards:',await page.locator('.airline-card').count());
    assert.equal(await page.locator('.airline-card').count(),28);
    const imageResults=await page.locator('.airline-card').evaluateAll(async cards=>{
      return await Promise.all(cards.map(async card=>{
        const name=card.querySelector('h3')?.textContent;
        const img=card.querySelector('img');
        // All directory cards may be below the fold: explicitly trigger lazy images in Chrome.
        if(img)img.loading='eager';
        if(!img)return {name,state:'text-only'};
        if(!img.complete)await new Promise(resolve=>{
          img.addEventListener('load',resolve,{once:true});
          img.addEventListener('error',resolve,{once:true});
          setTimeout(resolve,15000);
        });
        const rect=img.getBoundingClientRect();
        const good=img.complete&&img.naturalWidth>0&&img.naturalHeight>0&&!img.hidden;
        return {name,state:good?'loaded':'fallback',naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,source:img.currentSrc};
      }));
    });
    console.log('Airline logo browser results:',JSON.stringify(imageResults,null,2));
    for (const item of imageResults) {
      if(item.name==='Air Canada'||item.name==='Sun Country Airlines')assert.equal(item.state,'text-only',item.name+' uses text-only branding');
      else assert.equal(item.state,'loaded',item.name+' logo failed browser load');
    }
    assert.equal(await page.locator('#flightAirlineShortcutButtons button[data-airline]').count(),28);
    assert.equal(await page.locator('#flightAirlineShortcutTitle').innerText(),'Flug mit Airline-Code suchen');
    await page.locator('#flightAirlineShortcutButtons button[data-airline="AC"]').click();
    assert.equal(await page.locator('#flight').getAttribute('placeholder'),'AC 1234');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
    assert.equal(await page.locator('#flight').inputValue(),'AC ','Airline shortcut must prefill only its code, not invent a flight number');
    await page.locator('#flight').fill('AA');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true','Airline code alone is not a flight number');
    assert.equal(await page.locator('#statusTrackLink').getAttribute('href'),null);
    await page.locator('#flight').fill('de-2228');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false','Hyphenated flight number should normalize');
    assert.match(await page.locator('#track').getAttribute('href'),/\/data\/flights\/de2228$/);
    const flightShared=await page.evaluate(()=>makeShareLink());
    assert.equal(new URL(flightShared).searchParams.get('flight'),'DE2228');
    await page.locator('#flight').fill('DE 2228');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false');
    assert.match(await page.locator('#track').getAttribute('href'),/\/data\/flights\/de2228$/);
    assert.match(await page.locator('#airlineMatchText').innerText(),/Condor/i);
    assert.equal(await page.locator('#flightAirlineShortcutButtons button[aria-pressed="true"]').count(),1,'Only the matching airline is selected');
    assert.equal(await page.locator('#flightAirlineShortcutButtons button[data-airline="DE"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#statusAirlineSuggestion').isVisible(),true);
    assert.match(await page.locator('#statusAirlineHint').innerText(),/Condor/i);
    assert.match(await page.locator('#statusAirlineLink').getAttribute('href'),/condor\.com/);
    assert.equal(await page.locator('#statusSourceTitle').innerText(),'Vor der Reise überprüfen');
    assert.match(await page.locator('#statusSourceInstructions').innerText(),/Flugdatum/i);
    assert.match(await page.locator('#statusAirportOfficialLink').getAttribute('href'),/^https:\/\//);
    assert.equal(await page.locator('#statusAirportOfficialLink').getAttribute('target'),'_blank');
    assert.match(await page.locator('#flight').getAttribute('aria-describedby'),/flightSearchHint/);
    await page.locator('#flight').press('Escape');
    assert.equal(await page.locator('#flight').inputValue(),'','Escape clears flight input');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true');
    await page.locator('#flight').fill('?');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true');
    assert.equal(await page.locator('#statusTrackLink').getAttribute('aria-disabled'),'true');
    assert.equal(await page.locator('#statusAirlineSuggestion').isVisible(),false,'No airline hint for invalid flight');
    assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'true');
    assert.equal(await page.locator('#flightAirlineShortcutButtons button[aria-pressed="true"]').count(),0,'Invalid flights must not mark an airline');
    await page.locator('#clearFlight').click();
    assert.equal(await page.locator('#flight').inputValue(),'');
    assert.equal(await page.locator('#statusTrackLink').getAttribute('href'),null);
    await page.locator('#airlineFilter').fill('  iBeRiA  ');
    assert.equal(await page.locator('.airline-card').count(),1);
    assert.match(await page.locator('.airline-card h3').innerText(),/Iberia/);
    await page.locator('#airlineFilter').press('Escape');
    assert.equal(await page.locator('#airlineFilter').inputValue(),'');
    assert.equal(await page.locator('.airline-card').count(),28);
    await page.locator('#airlineFilter').fill('unfindableAirlineQuery');
    assert.equal(await page.locator('.airline-card').count(),0);
    assert.equal(await page.locator('#airlineEmptyReset').isVisible(),true);
    assert.equal(await page.locator('#airlineEmptyReset').innerText(),'Alle anzeigen');
    await page.locator('#airlineEmptyReset').click();
    assert.equal(await page.locator('.airline-card').count(),28);
    assert.equal(await page.locator('#airlineFilter').inputValue(),'');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'airlineFilter');
    await page.locator('#airlineFilter').fill('JetBlue');
    assert.equal(await page.locator('.airline-card').count(),1);
    assert.match(await page.locator('.airline-card h3').innerText(),/JetBlue/);
    await page.locator('.airline-card .airline-start-search').click();
    assert.equal(await page.locator('#flight').getAttribute('placeholder'),'B6 1234');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
    await page.locator('#flight').fill('B6123');
    assert.match(await page.locator('#statusAirlineHint').innerText(),/JetBlue/);
    assert.match(await page.locator('#airlineMatchText').innerText(),/JetBlue/i);
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false');
    await page.locator('#airlineFilter').fill('');
    await page.locator('[data-lang="en"]').click();
    assert.equal(await page.locator('#mobileGoBoard').getAttribute('aria-label'),'Flight board');
    assert.equal(await page.locator('#mobileGoSearch').getAttribute('aria-label'),'Find flight');
    assert.equal(await page.locator('#mobileGoAirlines').getAttribute('aria-label'),'Airlines');
    assert.equal(await page.locator('#mobileGoJourney').getAttribute('aria-label'),'My trip');
    assert.equal(await page.locator('#journey-flight-link').innerText(),'Find flight');
    assert.equal(await page.locator('#airlines-title').innerText(),'Check with your airline');
    await page.screenshot({path:'airlines-desktop.png',fullPage:false});
    const langs=[['es','Consulta con tu aerolínea'],['de','Flugstatus bei der Airline prüfen'],['en','Check with your airline'],['fr','Vérifier auprès de la compagnie'],['ht','Verifye vòl la ak konpayi avyon an']];
    const sourceTitles={es:'Llegadas y salidas',en:'Arrivals and departures',de:'Ankünfte und Abflüge',fr:'Arrivées et départs',ht:'Arive ak depa'};
    for(const [lang,title] of Object.entries(sourceTitles)){
      await page.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('#boardTitle').innerText(),title);
      assert.equal(await page.locator('#boardRows').count(),0);
    }
    await page.goto(base+'?airport=SDQ&view=departures&lang=de#flight-board',{waitUntil:'domcontentloaded'});
    await page.locator('#boardAirport').waitFor();
    assert.equal(await page.locator('#boardAirport').inputValue(),'SDQ');
    assert.match(await page.locator('#statusAirportOfficialLink').getAttribute('href'),/^https:\/\//);
    assert.notEqual(await page.locator('#statusAirport').innerText(),'Punta Cana · PUJ','Status airport must synchronize from shortcuts');
    assert.equal(await page.locator('#boardDepartures').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#boardProviderLink').getAttribute('href'),/sdq\/departures$/);
    // The demo route's geographic flag must load in a real browser, not merely appear in HTML.
    await page.goto(base+'?lang=de&airport=PUJ#flight-board',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#boardAirportOfficialLink').getAttribute('href'),'https://www.puntacanainternationalairport.com/en/#flight-info');
    assert.equal(await page.locator('#boardAirlinesLink').getAttribute('href'),'#airlines');
    await page.locator('#boardStatusLink').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
    await page.locator('#boardAirportShortcuts button').filter({hasText:'PUJ'}).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#boardAirport').inputValue(),'SDQ','Right arrow should select next airport');
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'SDQ','Airport focus must survive re-render');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#boardAirport').inputValue(),'PUJ');
    await page.locator('#boardAirportShortcuts button').filter({hasText:'SDQ'}).click();
    assert.equal(await page.locator('#boardAirport').inputValue(),'SDQ');
    assert.equal(await page.locator('#airport').inputValue(),'SDQ','Board and flight search airport synchronized');
    assert.equal(await page.locator('#boardAirportShortcuts button[aria-pressed="true"]').innerText(),'SDQ');
    await page.locator('#boardAirportShortcuts button').filter({hasText:'PUJ'}).click();
    await page.locator('#boardDepartures').click();
    const sharedView=await page.evaluate(()=>boardUrl());
    await page.goto(sharedView,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#boardAirport').inputValue(),'PUJ');
    assert.equal(await page.locator('#boardDepartures').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#boardRealTitle').innerText(),'Abflüge · PUJ');
    await page.goto(base+'?lang=en#airlines',{waitUntil:'domcontentloaded'});
    await page.locator('.airline-card').first().waitFor();
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.locator('#mobileBottomNav').isVisible(),true);
      assert.equal(await page.locator('#mobileBottomNav a').count(),4,'four mobile destinations including trip');
      const mobileNavMetrics=await page.locator('#mobileBottomNav').evaluate(e=>({bottom:Math.round(e.getBoundingClientRect().bottom),height:e.getBoundingClientRect().height,viewport:window.innerHeight}));
      assert.ok(mobileNavMetrics.height>=55,'Bottom navigation must have readable touch areas');
      assert.ok(Math.abs(mobileNavMetrics.viewport-mobileNavMetrics.bottom)<=2,'Bottom nav should remain at viewport bottom');
      await page.locator('#mobileGoSearch').click();
      await page.waitForFunction(()=>document.querySelector('#mobileGoSearch').getAttribute('aria-current')==='location',{timeout:15000});
      assert.equal(await page.evaluate(()=>document.activeElement.id),'flight','Mobile search shortcut must focus input');
      assert.equal(await page.locator('#flight').isVisible(),true);
      await page.locator('#mobileGoBoard').click();
      assert.equal(await page.locator('#flight-board').isVisible(),true);
      await page.locator('#mobileGoJourney').click();
      await page.waitForFunction(()=>document.querySelector('#mobileGoJourney').getAttribute('aria-current')==='location',{timeout:15000});
      assert.equal(await page.evaluate(()=>location.hash),'#journey-wizard','mobile journey link correct');
      await page.locator('#mobileGoAirlines').click();
      await page.waitForFunction(()=>document.querySelector('#mobileGoAirlines').getAttribute('aria-current')==='location',{timeout:15000});
      assert.equal(await page.locator('#airlines').isVisible(),true);
      await page.locator('#airlines').scrollIntoViewIfNeeded();
      await page.screenshot({path:'airlines-mobile-'+width+'.png'});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      console.log('Mobile width',width,'overflow:',overflow);
      assert.ok(overflow<=2,'Unexpected horizontal page overflow at '+width+'px: '+overflow);
      assert.equal(await page.locator('.airline-card').count(),28);
      await page.locator('#flightTitle').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#flightAirlineShortcutButtons button[data-airline]').count(),28);
      const airlineWidth=await page.locator('#flightAirlineShortcutButtons').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));
      assert.ok(airlineWidth.scroll>=airlineWidth.client,'Mobile airline chips must fit or scroll at '+width);
      await page.locator('#flightAirlineShortcutButtons button[data-airline="IB"]').click();
      assert.equal(await page.locator('#flight').getAttribute('placeholder'),'IB 1234');
      await page.locator('#flight-status').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#statusAirportOfficialLink').isVisible(),true);
      const sourceOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(sourceOverflow<=2,'Status panel must not overflow at '+width);
      await page.locator('#flight-board').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#boardAirportShortcuts button').count(),7);
      assert.ok(await page.locator('#boardAirportShortcuts').evaluate(e=>e.scrollWidth>=e.clientWidth),'Shortcut strip should fit or scroll horizontally');
      await page.locator('#boardAirportShortcuts button').last().click();
      assert.equal(await page.locator('#boardAirport').inputValue(),'JBQ');
      await page.locator('#boardAirportShortcuts button').first().click();
      assert.equal(await page.locator('#boardAirportOfficialLink').isVisible(),true);
      assert.ok((await page.locator('#boardAirportOfficialLink').boundingBox()).height>=44);
      const boardOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(boardOverflow<=2,'Flight sources cause page overflow at '+width+'px');
    }
    // Wider mobile/tablet and reduced-motion regressions: ensure the board stays usable.
    for(const width of [768,844]){
      await page.setViewportSize({width,height:390});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      console.log('Landscape/tablet width',width,'overflow:',overflow);
      assert.ok(overflow<=2,'Landscape/tablet horizontal page overflow at '+width+'px');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.emulateMedia({reducedMotion:'no-preference'});
    // Run actual WCAG 2.0/2.1 A and AA checks in the system Chrome browser.
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+'?lang=de&airport=PUJ#flight-board',{waitUntil:'domcontentloaded'});
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const audit=await page.evaluate(async()=>{
      const checks=[];
      for(const target of ['#flight-board','#mobileBottomNav']){
        const result=await axe.run(document.querySelector(target),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
        checks.push({target,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.slice(0,3).map(n=>n.target)})),passes:result.passes.length});
      }
      return checks;
    });
    console.log('Axe WCAG board/mobile results:',JSON.stringify(audit));
    const serious=audit.flatMap(item=>item.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>({target:item.target,...v})));
    assert.deepEqual(serious,[],'Axe found serious/critical WCAG failures in board or mobile navigation');
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base+'?lang=en#flight-status',{waitUntil:'domcontentloaded'});
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const desktopAudits=await page.evaluate(async()=>{
      const result=[];
      for(const target of ['#flight-status','#airlines']){
        const audit=await axe.run(document.querySelector(target),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
        result.push({target,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.slice(0,3).map(n=>n.target)})),passes:audit.passes.length});
      }
      return result;
    });
    console.log('Axe WCAG status/airline results:',JSON.stringify(desktopAudits));
    assert.deepEqual(desktopAudits.flatMap(item=>item.violations.filter(v=>['serious','critical'].includes(v.impact))),[],'Axe serious/critical WCAG failure in desktop flight or airline sections');

    assert.deepEqual(errors,[],'JS runtime errors');
    console.log('PASS: desktop/mobile logo loads, inputs, translations, keyboard-accessible cards.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
