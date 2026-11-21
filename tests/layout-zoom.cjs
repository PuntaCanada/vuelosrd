// Targeted real-Chromium regression for the planner/flight-board overlap.
// Also covers all five interface languages and 200% browser-zoom equivalent reflow.
const {chromium}=require('playwright');
const {newTrackingFreePage,blockCloudflareAnalytics}=require('./block-cloudflare-analytics.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let count=0;
 try {
  for(const spec of [
   {width:1440,height:900,zoom:1},{width:1024,height:800,zoom:1},
   {width:768,height:900,zoom:1},{width:390,height:844,zoom:1},
   {width:320,height:700,zoom:1},
   {width:720,height:900,zoom:2},{width:512,height:800,zoom:2},
   {width:390,height:900,zoom:2},{width:320,height:900,zoom:2}
  ]) {
   const page=await newTrackingFreePage(browser,{viewport:{width:spec.width,height:spec.height},reducedMotion:'reduce'});
   try {
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    for(const lang of ['es','en','de','fr','ht']) {
     if(lang==='es') await page.locator('[data-lang="es"]').click();
     else if(lang==='en') await page.locator('[data-lang="en"]').click();
     else {await page.locator('#langMenu summary').click();await page.locator('[data-choose-lang="'+lang+'"]').click();}
     const d=await page.evaluate(()=>{
      const rect=id=>document.getElementById(id).getBoundingClientRect();
      const panel=rect('v2-console'),board=rect('flight-board'),warning=rect('v2-warning');
      const link=rect('v2-guide');
      const target=document.elementFromPoint(Math.min(innerWidth-1,warning.x+warning.width/2),
       Math.min(innerHeight-1,Math.max(0,warning.y+warning.height/2)));
      return {gap:board.top-panel.bottom,warningEnd:warning.bottom,boardTop:board.top,
       warningHeight:warning.height,linkHeight:link.height,
       overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
       warningText:document.getElementById('v2-warning').textContent.trim(),
       title:document.getElementById('v2-title').textContent.trim(),
       warningVisible:getComputedStyle(document.getElementById('v2-warning')).visibility!=='hidden',
       hitTarget:target?.id||''};
     });
     const label=lang+'/'+spec.width+'/zoom '+spec.zoom;
     assert.ok(d.gap>=-1,'planner and board must not overlap: '+label+' '+JSON.stringify(d));
     assert.ok(d.warningEnd<=d.boardTop+1,'disclaimer must stay above board: '+label);
     assert.ok(d.warningHeight>=12&&d.warningVisible&&d.warningText.length>40,'warning must be visible and translated: '+label);
     assert.ok(d.linkHeight>=40,'planner guide link must remain a usable tap target: '+label);
     // At 200% zoom the usable CSS viewport is smaller; do not clip the key planner.
     if(d.overflow>2){const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,60),right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left)})).filter(x=>x.right>innerWidth+2||x.left< -2).slice(0,15));console.error('OVERFLOW DETAILS '+label,JSON.stringify(offenders));const dimensions=await page.evaluate(()=>[...document.querySelectorAll('body,body > *, main,main > *, .wrap,.air-board,.board-scroll,.board-table,.board-table thead,.site-links,.v2-console')].map(e=>({tag:e.tagName,id:e.id,cl:String(e.className).slice(0,35),scroll:e.scrollWidth,client:e.clientWidth,right:Math.round(e.getBoundingClientRect().right)})).filter(x=>x.scroll>x.client+5||x.right>innerWidth+2).slice(0,25));console.error('SCROLL DETAILS '+label,JSON.stringify(dimensions));const inner=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(e=>e.scrollWidth>e.clientWidth+10&&getComputedStyle(e).overflowX==='visible').map(e=>({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,45),scroll:e.scrollWidth,client:e.clientWidth,left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)})).slice(0,65));console.error('INNER OVERFLOW '+label,JSON.stringify(inner));}
     assert.ok(d.overflow<=2,'horizontal document overflow: '+label+' '+d.overflow);
     assert.ok(d.title.length>8,'planner title translated: '+label);
     count++;
    }
   }finally{await page.close();}
  }
  console.log('LAYOUT/ZOOM PASS: '+count+' checks across five languages, 320–1440 CSS px, including 200% reflow equivalents.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
