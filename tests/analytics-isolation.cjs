'use strict';
// Proves analytics requests are blocked in test-only Playwright pages/contexts.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {newTrackingFreePage,blockCloudflareAnalytics,ANALYTICS_URL}=require('./block-cloudflare-analytics.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const kind of ['page','context']){
   let context=null;
   let page;
   if(kind==='page')page=await newTrackingFreePage(browser,{viewport:{width:390,height:844}});
   else{
    context=await browser.newContext();
    await blockCloudflareAnalytics(context);
    page=await context.newPage();
   }
   try{
    const blocked=[];
    page.on('requestfailed',req=>{if(ANALYTICS_URL.test(req.url()))blocked.push({url:req.url(),method:req.method(),failure:req.failure()?.errorText});});
    const result=await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    assert.equal(result.status(),200,'non-tracking VuelosRD resources must load');
    await page.evaluate(async()=>{
      const urls=['https://static.cloudflareinsights.com/beacon.min.js','https://cloudflareinsights.com/cdn-cgi/rum','/cdn-cgi/rum'];
      await Promise.all(urls.map((url,i)=>fetch(url,{method:i?'POST':'GET',mode:'no-cors'}).catch(()=>{})));
    });
    assert.equal(blocked.length,3,kind+' should prevent both analytics JS and RUM uploads, including same-origin beacon');
    assert.ok(blocked.every(x=>x.failure?.includes('ERR_BLOCKED_BY_CLIENT')),kind+' must abort the HTTP requests');
    console.log('ANALYTICS ISOLATION PASS: '+kind+', 3 analytics requests blocked; site still loads.');
   }finally{if(context)await context.close();else await page.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
