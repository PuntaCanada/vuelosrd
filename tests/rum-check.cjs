const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({serviceWorkers:'block'});
 const page=await ctx.newPage();
 let all=[];
 page.on('request',req=>{if(/cloudflareinsights|\/cdn-cgi\/rum/i.test(req.url()))all.push({type:'request',method:req.method(),url:req.url().split('?')[0]});});
 page.on('response',res=>{if(/cloudflareinsights|\/cdn-cgi\/rum/i.test(res.url()))all.push({type:'response',status:res.status(),method:res.request().method(),url:res.url().split('?')[0]});});
 page.on('requestfailed',req=>{if(/cloudflareinsights|\/cdn-cgi\/rum/i.test(req.url()))all.push({type:'failure',method:req.method(),reason:req.failure()?.errorText,url:req.url().split('?')[0]});});
 for(const u of ['https://vuelosrd.pages.dev/','https://vuelosrd.pages.dev/de/']){
  try{
   const r=await page.goto(u,{waitUntil:'load',timeout:30000});
   await page.waitForTimeout(7000);
   const html=await page.content();
   console.log('PAGE',JSON.stringify({url:u,status:r?.status(),htmlHasCloudflareInsights:html.includes('cloudflareinsights'),htmlHasPlannerFix:html.includes('#v2-console + .air-board{margin-top:24px}'),beaconScripts:await page.locator('script[src*="cloudflareinsights"]').count()}));
  }catch(e){console.log('PAGE_ERROR',u,String(e).slice(0,350));}
 }
 await page.goto('about:blank');
 await page.waitForTimeout(1500);
 console.log('RUM_EVENTS',JSON.stringify(all));
 const posts=all.filter(e=>e.type==='response'&&e.method==='POST'&&e.url.includes('/cdn-cgi/rum'));
 console.log('RUM_POST_RESULTS',JSON.stringify(posts));
 console.log('CONCLUSION',posts.some(e=>e.status>=200&&e.status<300)?'SUCCESSFUL_POST_OBSERVED':'NO_SUCCESSFUL_POST_OBSERVED');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
