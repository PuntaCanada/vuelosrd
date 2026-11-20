// Lab-only Chrome timing and layout-shift sampling, not real-user Core Web Vitals.
// 4G-style throttled local static server; no Lighthouse, API keys or paid service.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const scenarios=[
   {name:'mobile home',path:'/',width:390,height:844},
   {name:'small-phone guide',path:'/de/airports/puj/',width:320,height:700},
   {name:'desktop home',path:'/',width:1440,height:900},
   {name:'desktop guide',path:'/en/airports/sdq/',width:1440,height:900}
  ];
  for(const sc of scenarios){
   const context=await browser.newContext({viewport:{width:sc.width,height:sc.height},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage();
   await page.addInitScript(()=>{
    window.__vuelosLab={lcp:0,cls:0};
    try{new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__vuelosLab.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
    try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__vuelosLab.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});}catch{}
   });
   const session=await context.newCDPSession(page);
   await session.send('Network.enable');
   await session.send('Network.emulateNetworkConditions',{offline:false,latency:130,downloadThroughput:200000,uploadThroughput:80000});
   const result=await page.goto('http://127.0.0.1:8765'+sc.path,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(result.status(),200,sc.name+' HTML is served');
   await page.waitForTimeout(900);
   const values=await page.evaluate(()=>{
    const nav=performance.getEntriesByType('navigation')[0];
    const paint=performance.getEntriesByType('paint');
    const fcp=paint.find(x=>x.name==='first-contentful-paint');
    const overflow=document.documentElement.scrollWidth-document.documentElement.clientWidth;
    return {domContentLoadedMs:Math.round(nav?.domContentLoadedEventEnd||0),fcpMs:fcp?Math.round(fcp.startTime):null,lcpMs:window.__vuelosLab?.lcp?Math.round(window.__vuelosLab.lcp):null,cls:Number((window.__vuelosLab?.cls||0).toFixed(4)),overflowPx:overflow};
   });
   assert.ok(values.domContentLoadedMs>0,sc.name+' navigation timing must exist');
   assert.ok(values.overflowPx<=2,sc.name+' unexpected horizontal page overflow: '+values.overflowPx);
   // Broad safety bound for a small local static site; real CWV performance needs CrUX/RUM.
   assert.ok(values.domContentLoadedMs<15000,sc.name+' slow page initialization');
   console.log('Chrome lab / throttled local site: '+sc.name+' '+JSON.stringify(values));
   await context.close();
  }
  console.log('LAB PASS: 4 mobile/desktop navigation, paint, LCP and CLS samples recorded. NOT actual field Core Web Vitals or INP.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
