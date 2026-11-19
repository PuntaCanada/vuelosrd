'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async()=>{
  const base = process.env.VUELOSRD_URL || 'https://vuelosrd.pages.dev/';
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  const errors = [];
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'?lang=de#airlines',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#airlineCards .airline-card').first().waitFor({timeout:15000});
    await page.locator('#goAirlines').waitFor();
    console.log('Desktop document loaded; cards:',await page.locator('.airline-card').count());
    assert.equal(await page.locator('.airline-card').count(),5);
    const imageResults=await page.locator('.airline-card').evaluateAll(async cards=>{
      return await Promise.all(cards.map(async card=>{
        const name=card.querySelector('h3')?.textContent;
        const img=card.querySelector('img');
        if(!img)return {name,state:'text-only'};
        if(!img.complete)await new Promise(resolve=>{
          img.addEventListener('load',resolve,{once:true});
          img.addEventListener('error',resolve,{once:true});
          setTimeout(resolve,15000);
        });
        const rect=img.getBoundingClientRect();
        const good=img.complete&&img.naturalWidth>0&&img.naturalHeight>0&&!img.hidden&&rect.width>0&&rect.height>0;
        return {name,state:good?'loaded':'fallback',naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,source:img.currentSrc};
      }));
    });
    console.log('Airline logo browser results:',JSON.stringify(imageResults,null,2));
    for (const item of imageResults) {
      if(item.name==='Air Canada')assert.equal(item.state,'text-only','Air Canada logo must remain text-only without authorization');
      else assert.equal(item.state,'loaded',item.name+' logo failed browser load');
    }
    await page.locator('#flight').fill('AA');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true','Airline code alone is not a flight number');
    assert.equal(await page.locator('#statusTrackLink').getAttribute('href'),null);
    await page.locator('#flight').fill('DE 2228');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false');
    assert.match(await page.locator('#track').getAttribute('href'),/\/data\/flights\/de2228$/);
    assert.match(await page.locator('#airlineMatchText').innerText(),/Condor/i);
    await page.locator('#flight').fill('?');
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'true');
    assert.equal(await page.locator('#statusTrackLink').getAttribute('aria-disabled'),'true');
    assert.equal(await page.locator('#flight').getAttribute('aria-invalid'),'true');
    await page.locator('#clearFlight').click();
    assert.equal(await page.locator('#flight').inputValue(),'');
    assert.equal(await page.locator('#statusTrackLink').getAttribute('href'),null);
    await page.locator('#airlineFilter').fill('Jet');
    assert.equal(await page.locator('.airline-card').count(),1);
    assert.match(await page.locator('.airline-card h3').innerText(),/JetBlue/);
    await page.locator('.airline-card .airline-start-search').click();
    assert.equal(await page.locator('#flight').getAttribute('placeholder'),'B6 1234');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'flight');
    await page.locator('#flight').fill('B6123');
    assert.match(await page.locator('#airlineMatchText').innerText(),/JetBlue/i);
    assert.equal(await page.locator('#track').getAttribute('aria-disabled'),'false');
    await page.locator('#airlineFilter').fill('');
    await page.locator('[data-lang="en"]').click();
    assert.equal(await page.locator('#airlines-title').innerText(),'Check with your airline');
    await page.screenshot({path:'airlines-desktop.png',fullPage:false});
    const langs=[['es','Consulta con tu aerolínea'],['de','Flugstatus bei der Airline prüfen'],['en','Check with your airline'],['fr','Vérifier auprès de la compagnie'],['ht','Verifye vòl la ak konpayi avyon an']];
    for(const [lang,heading] of langs){
      await page.goto(base+'?lang='+lang+'#airlines',{waitUntil:'domcontentloaded'});
      await page.locator('#airlines-title').waitFor();
      assert.equal(await page.locator('#airlines-title').innerText(),heading);
      assert.equal(await page.locator('.airline-card').count(),5);
    }
    await page.goto(base+'?airport=SDQ&view=departures&lang=de#flight-board',{waitUntil:'domcontentloaded'});
    await page.locator('#boardAirport').waitFor();
    assert.equal(await page.locator('#boardAirport').inputValue(),'SDQ');
    assert.equal(await page.locator('#boardDepartures').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#boardProviderLink').getAttribute('href'),/sdq\/departures$/);
    // The demo route's geographic flag must load in a real browser, not merely appear in HTML.
    await page.goto(base+'?lang=de&airport=PUJ#flight-board',{waitUntil:'domcontentloaded'});
    await page.locator('#boardRows tr').first().waitFor();
    assert.equal(await page.locator('#boardRows tr').count(),5);
    const flags=await page.locator('#boardRows td .board-country-flag').evaluateAll(async images=>{
      return await Promise.all(images.map(async img=>{
        if(!img.complete)await new Promise(resolve=>{
          img.addEventListener('load',resolve,{once:true});
          img.addEventListener('error',resolve,{once:true});
          setTimeout(resolve,10000);
        });
        return {file:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,alt:img.alt};
      }));
    });
    console.log('Demo country flag browser results:',JSON.stringify(flags));
    assert.equal(flags.length,5,'Expected five route flags');
    assert.ok(flags.every(f=>f.loaded),'Country flag image failed to load');
    assert.deepEqual(flags.map(f=>f.file),['/assets/flags/de.svg','/assets/flags/us.svg','/assets/flags/es.svg','/assets/flags/ca.svg','/assets/flags/do.svg']);
    assert.equal(flags[0].alt,'Deutschland');
    await page.locator('#boardFilter').fill('Spanien');
    assert.equal(await page.locator('#boardRows tr').count(),1,'Country name should filter routes');
    assert.match(await page.locator('#boardRows tr').innerText(),/Madrid/);
    await page.locator('#boardFilter').fill('');
    await page.locator('#boardDepartures').click();
    assert.equal(await page.locator('#boardRows .board-country-flag').count(),5,'Departure board still shows flags');
    await page.locator('#boardAirport').selectOption('JBQ');
    assert.equal(await page.locator('#boardRows .board-country-flag').count(),5,'Local routes show DR flags');
    assert.equal(await page.locator('#boardRows .board-country-flag').first().getAttribute('src'),'/assets/flags/do.svg');
    await page.goto(base+'?lang=en#airlines',{waitUntil:'domcontentloaded'});
    await page.locator('.airline-card').first().waitFor();
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      await page.locator('#airlines').scrollIntoViewIfNeeded();
      await page.screenshot({path:'airlines-mobile-'+width+'.png'});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      console.log('Mobile width',width,'overflow:',overflow);
      assert.ok(overflow<=2,'Unexpected horizontal page overflow at '+width+'px: '+overflow);
      assert.equal(await page.locator('.airline-card').count(),5);
      await page.locator('#flight-board').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#boardRows .board-country-flag').count(),5);
      const boardOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(boardOverflow<=2,'Board flags cause page overflow at '+width+'px');
    }
    assert.deepEqual(errors,[],'JS runtime errors');
    console.log('PASS: desktop/mobile logo loads, inputs, translations, keyboard-accessible cards.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
