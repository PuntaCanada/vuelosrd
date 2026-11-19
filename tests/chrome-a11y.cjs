// Chromium browser regression and automated axe checks. No flight API or paid service.
const { chromium } = require('playwright');
const axe = require('axe-core');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
 const failures=[];
 for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]) {
  const page=await browser.newPage({viewport, reducedMotion:'reduce'});
  try {
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.locator('#boardRows tr').first().waitFor();
   assert.match(await page.locator('#boardWarning').innerText(),/DEMO|DEMOSTRA|fictici/i);
   assert.ok((await page.locator('#boardRows tr').count())>0,'demo board rendered');
   await page.locator('#boardAirport').selectOption('SDQ');
   assert.equal(await page.locator('#airport').inputValue(),'SDQ');
   await page.locator('#boardDepartures').click();
   assert.equal(await page.locator('#boardDepartures').getAttribute('aria-pressed'),'true');
   await page.locator('#boardFilter').fill('NO-MATCH-XYZ');
   assert.equal(await page.locator('#boardRows tr').count(),1);
   await page.locator('#boardClearFilters').click();
   assert.ok((await page.locator('#boardRows tr').count())>1);
   await page.locator('#flight').fill('not-a-flight');
   assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'true');
   await page.locator('#flight').fill('DE 2228');
   assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'false');
   assert.match(await page.locator('#track').getAttribute('href'),/flightradar24\.com/);
   await page.locator('#flight').fill('');
   await page.locator('body').click({position:{x:5,y:5}});
   await page.keyboard.press('/');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
   const results=await page.evaluate(axeSource=>{eval(axeSource);return window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})},axe.source);
   const critical=results.violations.filter(v=>v.impact==='critical');
   if(critical.length)throw new Error('Critical axe violations: '+critical.map(x=>x.id).join(','));
   console.log(viewport.width+'px: '+results.violations.length+' axe findings ('+critical.length+' critical), '+results.passes.length+' passes');
   if(viewport.width<=390){
    assert.equal(await page.locator('#mobileBottomNav').isVisible(),true);
    const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
    assert.equal(overflows,false,'document has horizontal overflow');
   }
  } catch(e){failures.push(viewport.width+': '+e.stack);}
  await page.close();
 }
 await browser.close();
 if(failures.length){console.error(failures.join('\n\n'));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
