// Targeted real-Chromium regression for the planner/flight-board overlap.
// Also covers all five interface languages and 200% browser-zoom equivalent reflow.
const {chromium}=require('playwright');
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
   const page=await browser.newPage({viewport:{width:spec.width,height:spec.height},reducedMotion:'reduce'});
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
     assert.ok(d.overflow<=2,'horizontal document overflow: '+label+' '+d.overflow);
     assert.ok(d.title.length>8,'planner title translated: '+label);
     count++;
    }
   }finally{await page.close();}
  }
  console.log('LAYOUT/ZOOM PASS: '+count+' checks across five languages, 320–1440 CSS px, including 200% reflow equivalents.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
