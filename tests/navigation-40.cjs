// All 40 public page templates tested in real Chromium at desktop/mobile sizes.
// Uses only local static files and checks navigation without requesting external travel sites.
'use strict';
const {chromium}=require('playwright');
const {newTrackingFreePage,blockCloudflareAnalytics}=require('./block-cloudflare-analytics.cjs');
const assert=require('node:assert/strict');
const languages=['es','en','de','fr','ht'];
const airports=['puj','sdq','sti','pop','lrm','azs','jbq'];
const site='http://127.0.0.1:8765';
const path=(lang,code)=>'/'+(lang==='es'?'':lang+'/')+(code?'airports/'+code+'/':'');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let checked=0;
 try{
  for(const width of [320,390,1280]){
   const page=await newTrackingFreePage(browser,{viewport:{width,height:800},reducedMotion:'reduce'});
   try{
    for(const lang of languages){
     for(const code of [null,...airports]){
      const location=path(lang,code);
      const response=await page.goto(site+location,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,'page reachable '+location);
      assert.equal(await page.locator('html').getAttribute('lang'),lang,'language '+location);
      assert.equal(await page.locator('h1').count(),1,'one page heading '+location);
      if(!code){
       assert.equal(await page.locator('.languages [data-lang]').count(),2,'main language shortcut buttons');
       assert.ok(await page.locator('#langMenu').count(),'main additional language menu');
      }else{
       assert.equal(await page.locator('nav.languages a').count(),5,'five language choices '+location);
       assert.equal(await page.locator('nav.languages a[aria-current="page"]').count(),1,'current language '+location);
      }
      if(code){
       assert.equal(await page.locator('nav.airports a').count(),7,'seven airport shortcuts '+location);
       assert.equal(await page.locator('nav.airports a[aria-current="page"]').count(),1,'current airport '+location);
       assert.equal(await page.locator('.quick-travel-links a').count(),4,'travel/baggage/transport/source actions '+location);
       assert.equal(await page.locator('a[href="#airport-sources"]').count(),1,'verified source section jump '+location);
       assert.equal(await page.locator('#airport-sources').count(),1,'official source target '+location);
       assert.equal(await page.locator('.quick-flight-form input[name="airport"]').inputValue(),code.toUpperCase(),'airport parameter '+location);
       assert.equal(await page.locator('.quick-flight-form input[name="lang"]').inputValue(),lang,'language parameter '+location);
       await page.locator('#quick-flight-number').fill('DE1234');
       assert.ok(await page.locator('.quick-flight-form').evaluate(form=>form.checkValidity()),'prepared flight format '+location);
       const inputs=await page.locator('nav.languages a').evaluateAll(links=>links.map(x=>new URL(x.href).pathname));
       assert.deepEqual(inputs,languages.map(l=>path(l,code)),'five correct locale guide routes '+location);
      }else{
       assert.equal(await page.locator('#cards .airport-card').count(),7,'seven interactive airport cards '+location);
       assert.equal(await page.locator('#cards .airport-card-actions a').count(),21,'all airport actions '+location);
       for(const id of ['journey-wizard','flightTitle','airlines','passenger-help-title'])assert.equal(await page.locator('#'+id).count(),1,'interactive target '+id+' '+location);
       assert.equal(await page.locator('#langMenu [data-choose-lang]').count(),3,'three further language choices '+location);
       assert.equal(await page.locator('.languages [data-lang]').count(),2,'two direct language choices '+location);
      }
      const root=!code;
      const first=root?page.locator('.languages [data-lang]').first():page.locator('nav.languages a').first();
      await first.focus();
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),root?'BUTTON':'A','keyboard focus '+location);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),root?'BUTTON':'A','tab navigation '+location);
      if(root){await page.locator('#langMenu summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#langMenu').getAttribute('open'),'');await page.keyboard.press('Escape');assert.equal(await page.locator('#langMenu').getAttribute('open'),null);}
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
      assert.equal(overflow,false,'no horizontal overflow '+width+'px '+location);
      checked++;
     }
    }
   }finally{await page.close();}
  }
  const networkPage=await newTrackingFreePage(browser,{viewport:{width:320,height:800},reducedMotion:'reduce'});
  try{for(const lang of languages){const prefix=lang==='es'?'':lang+'/';await networkPage.goto(site+'/'+prefix,{waitUntil:'domcontentloaded'});await networkPage.locator('#project-network-link').click();assert.equal(new URL(networkPage.url()).pathname,'/'+prefix+'partners.html');assert.equal(await networkPage.locator('#partner-cards li').count(),14);assert.equal(await networkPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}}finally{await networkPage.close();}
  // Follow a real guide flight form through to the interactive assistant in all five languages.
  const handoff=await newTrackingFreePage(browser,{viewport:{width:390,height:844},reducedMotion:'reduce'});
  try{
   for(const [lang,code] of [['es','puj'],['en','sdq'],['de','sti'],['fr','pop'],['ht','lrm']]){
    await handoff.goto(site+path(lang,code),{waitUntil:'domcontentloaded'});
    await handoff.locator('#quick-flight-number').fill('DE1234');
    await Promise.all([handoff.waitForURL(u=>u.pathname==='/'&&u.searchParams.has('flight')),handoff.locator('.quick-flight-form button').click()]);
    const result=new URL(handoff.url());
    assert.equal(result.searchParams.get('lang'),lang,'flight handoff language');
    assert.equal(result.searchParams.get('airport'),code.toUpperCase(),'flight handoff airport');
    assert.equal(result.searchParams.get('flight'),'DE1234','flight number preserved');
    assert.equal(await handoff.locator('#flight').inputValue(),'DE1234','interactive flight input populated');
    assert.equal(await handoff.locator('#airport').inputValue(),code.toUpperCase(),'interactive airport synchronized');
    assert.equal(await handoff.locator('#track').getAttribute('aria-disabled'),'false','only valid flight numbers enable external lookup');
   }
  }finally{await handoff.close();}
 }finally{await browser.close();}
 assert.equal(checked,120);
 console.log('CHROME NAVIGATION PASS: 40 pages x three desktop/mobile widths, 35 guide forms plus five real five-language flight handoffs, language links, keyboard focus, source jumps and no horizontal overflow.');
})().catch(error=>{console.error(error);process.exitCode=1;});
