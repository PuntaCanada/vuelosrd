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
