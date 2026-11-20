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
    // LIVE release verification: never substitute a CI fixture for the public JSON feed.
    assert.equal(await page.locator('#sourceHealthPanel').isVisible(),true,'published source monitoring status panel');
    await page.locator('#sourceHealthMetrics strong').first().waitFor({timeout:12000});
    const liveFeed=await page.evaluate(async()=>{
      const paths=[
       '/data/source-health-latest.json',
       'https://raw.githubusercontent.com/PuntaCanada/vuelosrd/main/data/source-health-latest.json',
       '/data/source-health-history.json',
       'https://raw.githubusercontent.com/PuntaCanada/vuelosrd/main/data/source-health-history.json'
      ];
      const results=await Promise.all(paths.map(async url=>{
       try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});
        return r.ok?await r.json():null;
       }catch{return null}
      }));
      const candidates=results.slice(0,2).filter(x=>x?.total===47&&Number.isFinite(Date.parse(x.checkedAt)));
      const latest=candidates.sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt))[0]||null;
      const timelines=results.slice(2).filter(x=>Array.isArray(x?.entries));
      const timeline=timelines.sort((a,b)=>Date.parse(b.entries.at(-1)?.checkedAt||0)-Date.parse(a.entries.at(-1)?.checkedAt||0))[0]||null;
      return {latest,timeline,sameOriginStatusAvailable:!!results[0],githubMirrorAvailable:!!results[1]};
    });
    assert.ok(liveFeed.latest,'actual public JSON must be readable from Cloudflare or repository mirror');
    assert.equal(liveFeed.latest.schemaVersion,1,'published schema version');
    assert.equal(liveFeed.latest.total,47,'47 official sources in public report');
    assert.equal(liveFeed.latest.ok+liveFeed.latest.uncertain+liveFeed.latest.broken,47,'public counts consistent');
    assert.ok(Number.isFinite(Date.parse(liveFeed.latest.checkedAt)),'verified check timestamp in public status');
    assert.ok(liveFeed.timeline?.entries?.length>=1,'at least one real check in public history');
    assert.match(await page.locator('#sourceHealthDate').innerText(),/Última comprobación automática/,'public UI displays real datestamp');
    assert.equal(await page.locator('#sourceHealthMetrics strong').first().innerText(),String(liveFeed.latest.ok),'public UI renders latest genuine count');
    assert.equal(await page.locator('#airlineCards .source-alternative').count(),3,'three independently validated official alternate pages are visible');

    // Independent release verification: real Cloudflare page, not checked-out PR source.
    // The new VuelosRD 2.0 console first appears in main commit 66dca01a.
    await page.locator('#v2-console').waitFor({timeout:8000});
    assert.equal(await page.locator('#v2-console').isVisible(),true,'66dca01a dashboard actually served by Cloudflare');
    assert.equal(await page.locator('#v2-airport option').count(),7,'66dca01a seven-airport selector published');
    await page.locator('#v2-airport').selectOption('STI');
    assert.equal(await page.locator('#journeyAirport').inputValue(),'STI','published 2.0 console syncs journey airport');
    assert.equal(await page.locator('#v2-guide').getAttribute('href'),'/airports/sti/','published 2.0 links correct SEO page');
    await page.locator('#v2-arrival').click();
    assert.equal(await page.locator('#journeyStage').inputValue(),'arrival','published 2.0 stage selection works');
    await page.locator('#v2-airline-search').fill('Arajet');
    await page.locator('#v2-airline-search').press('Enter');
    assert.equal(await page.locator('#journeyAirline').inputValue(),'DM','published 2.0 integrates active airline');
    assert.equal(await page.locator('#v2-airline-link').isVisible(),true,'published 2.0 shows official airline source');
    await page.locator('#v2-airline-search').fill('');
    await page.locator('#v2-airline').selectOption('');
    await page.locator('#v2-departure').click();
    await page.locator('#v2-airport').selectOption('PUJ');

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
