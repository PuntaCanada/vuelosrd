// Smoke test against the publicly published Cloudflare Pages site.
// Never assumes the demo departure board is live operational flight data.
// Run: node tests/production-smoke.cjs (requires Playwright Chromium).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const base=process.env.VUELOSRD_PRODUCTION_URL||'https://vuelosrd.pages.dev/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let failed=false;
 try{
  for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport,locale:'es-DO'});
   try{
    const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:20000});
    assert.ok(response&&response.status()===200,'production page must return HTTP 200');
    await page.locator('#flightAirlineQuickFilter').waitFor({timeout:8000});
    assert.equal(await page.locator('#flightAirlineShortcutButtons [data-airline]').count(),28,'production must contain latest 28-airline directory');
    assert.equal(await page.locator('#boardWarning').isVisible(),true,'fictional board clearly disclosed');
    // Published main must include the prior de7c6d6 navigation and 34663a36 safety changes.
    assert.equal(await page.locator('#journey-wizard').count(),1,'published five-language assistant');
    // Verify that the independently published d8e0d747 release really supports the airport finder.
    assert.equal(await page.locator('#airportQuickFilter').isVisible(),true,'prior d8e0d747 airport search actually published');
    await page.locator('#airportQuickFilter').fill('samana');
    assert.equal(await page.locator('#airportQuickResults [data-airport="AZS"]').count(),1,'deployed accent-free search works');
    await page.locator('#airportQuickFilter').press('Enter');
    assert.equal(await page.locator('#airport').inputValue(),'AZS','deployed airport quick search syncs selection');
    await page.locator('#airportQuickFilter').fill('');
    await page.locator('#airport').selectOption('PUJ');
    await page.locator('#boardAirport').selectOption('PUJ');

    // Verify the exact prior 050d82f7 user-visible airline keyboard feature on Cloudflare.
    await page.locator('#flightAirlineQuickFilter').fill('Arajet');
    assert.match(await page.locator('#flightAirlineShortcutNote').innerText(),/Intro|Enter|Entrée|Antre/,'050d82f7 keyboard hint published');
    await page.locator('#flightAirlineQuickFilter').press('Enter');
    assert.equal(await page.locator('#flight').inputValue(),'DM ','050d82f7 Enter airline selection published');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flight','050d82f7 Enter focuses flight input');
    await page.locator('#flightAirlineQuickFilter').fill('');

    // The prior b371ae2c release includes selected-airport guides at both entry points.
    assert.equal(await page.locator('#flightAirportGuide').count(),1,'b371ae2c flight-to-guide control deployed');
    assert.equal(await page.locator('#journey-guide-link').count(),1,'b371ae2c journey-to-guide control deployed');
    await page.locator('#airport').selectOption('SDQ');
    assert.equal(await page.locator('#flightAirportGuide').getAttribute('href'),'/airports/sdq/','published guide follows airport change');
    await page.locator('#journeyAirport').selectOption('STI');
    assert.equal(await page.locator('#journey-guide-link').getAttribute('href'),'/airports/sti/','published guide follows journey airport');

    assert.equal(await page.locator('#flightFocusAirline').isVisible(),true,'a7227cd9 airline shortcut published');
    assert.equal(await page.locator('#flightFocusJourney').isVisible(),true,'a7227cd9 journey shortcut published');
    await page.locator('#flightFocusAirline').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flightAirlineQuickFilter','published airline shortcut focuses mobile search');
    await page.locator('#flightFocusJourney').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'journeyAirport','published journey shortcut focuses airport selector');
    await page.locator('#flightAirlineQuickFilter').fill('Spirit');
    const spirit=page.locator('#flightAirlineShortcutButtons [data-airline="NK"]');
    assert.equal(await spirit.count(),1,'historical Spirit entry published');
    assert.equal(await spirit.isDisabled(),true,'deployed 34663a36 safety change: Spirit flight search disabled');
    await page.locator('#flightAirlineQuickFilter').fill('');
    if(viewport.width>600){
     for(const lang of ['en','de','fr','ht']){
      const hub=await browser.newPage({viewport,locale:'es-DO'});
      try{
       const url=new URL('/'+lang+'/',base).href;
       const result=await hub.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
       assert.equal(result.status(),200,'published language hub '+lang);
       assert.equal(await hub.locator('nav.hub-shortcuts a').count(),3,'de7c6d6 localized navigation published: '+lang);
      }finally{await hub.close();}
     }
    }

    await page.locator('#flightAirlineQuickFilter').fill('Arajet');
    assert.equal(await page.locator('#flightAirlineShortcutButtons [data-airline]').count(),1,'production airline search');
    await page.locator('#flightAirlineShortcutButtons [data-airline]').click();
    assert.equal(await page.locator('#flight').inputValue(),'DM ','production airline code prefill');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true','partial flight does not masquerade as verified data');
    if(viewport.width<600){
     assert.equal(await page.locator('#mobileBottomNav').isVisible(),true,'mobile navigation visible');
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
     assert.equal(overflow,false,'no horizontal page overflow');
    }
    if(viewport.width>600){
     // A real browser must successfully decode logo images. Mere source URLs are not enough.
     // Request each unique logo independently to bypass lazy-rendering below the fold.
     const logos=await page.evaluate(async()=>{
      const carriers=airlineDirectory.filter(x=>x.logo);
      return await Promise.all(carriers.map(carrier=>new Promise(resolve=>{
       const img=new Image();
       const timer=setTimeout(()=>resolve({code:carrier.code,ok:false,reason:'timeout'}),12000);
       img.onload=()=>{clearTimeout(timer);resolve({code:carrier.code,ok:img.naturalWidth>0,reason:img.naturalWidth>0?'loaded':'empty'})};
       img.onerror=()=>{clearTimeout(timer);resolve({code:carrier.code,ok:false,reason:'image failed'})};
       img.src=carrier.logo;
      })));
     });
     assert.equal(logos.length,26,'all expected logo sources checked');
     const broken=logos.filter(x=>!x.ok);
     console.log('Live logo verification: '+(logos.length-broken.length)+'/'+logos.length+' rendered');
     if(broken.length)throw new Error('Airline logos not loading: '+broken.map(x=>x.code+' ('+x.reason+')').join(', '));
    }
    console.log('Cloudflare production smoke OK, '+viewport.width+'px, HTTP '+response.status()+', '+page.url());
   }catch(e){failed=true;console.error('Cloudflare production smoke FAILED '+viewport.width+'px: '+e.stack);}
   finally{await page.close();}
  }
 }finally{await browser.close();}
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
