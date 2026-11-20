// All 40 public page templates tested in real Chromium at desktop/mobile sizes.
// Uses only local static files and checks navigation without requesting external travel sites.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const languages=['es','en','de','fr','ht'];
const airports=['puj','sdq','sti','pop','lrm','azs','jbq'];
const site='http://127.0.0.1:8765';
const path=(lang,code)=>'/'+(lang==='es'?'':lang+'/')+(code?'airports/'+code+'/':'');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let checked=0;
 try{
  for(const width of [320,1280]){
   const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'});
   try{
    for(const lang of languages){
     for(const code of [null,...airports]){
      const location=path(lang,code);
      const response=await page.goto(site+location,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,'page reachable '+location);
      assert.equal(await page.locator('html').getAttribute('lang'),lang,'language '+location);
      assert.equal(await page.locator('h1').count(),1,'one page heading '+location);
      if(lang==='es'&&!code){
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
      }else if(lang!=='es'){
       assert.equal(await page.locator('.airport-links a').count(),7,'localized airport index '+location);
       const shortcuts=page.locator('nav.hub-shortcuts a');
       assert.equal(await shortcuts.count(),3,'localized journey/airline/baggage shortcuts '+location);
       assert.deepEqual(await shortcuts.evaluateAll(links=>links.map(x=>new URL(x.href).hash)),['#journey-wizard','#airlines','#passenger-help-title'],'hub actions target supported sections '+location);
       for(const link of await shortcuts.all()){
        assert.ok((await link.boundingBox()).height>=44,'keyboard/touch friendly hub action '+location);
       }
      }else{
       assert.ok(await page.locator('#journey-wizard').count(),'main journey assistant available');
       assert.ok(await page.locator('#flightTitle').count(),'main flight search available');
      }
      const root=lang==='es'&&!code;
      const first=root?page.locator('.languages [data-lang]').first():page.locator('nav.languages a').first();
      await first.focus();
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),root?'BUTTON':'A','keyboard focus '+location);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),root?'BUTTON':'A','tab navigation '+location);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
      assert.equal(overflow,false,'no horizontal overflow '+width+'px '+location);
      checked++;
     }
    }
   }finally{await page.close();}
  }
 }finally{await browser.close();}
 assert.equal(checked,80);
 console.log('CHROME NAVIGATION PASS: 40 pages x desktop/mobile, 35 guide flight handoffs, language links, keyboard focus, source jumps and no horizontal overflow.');
})().catch(error=>{console.error(error);process.exitCode=1;});
