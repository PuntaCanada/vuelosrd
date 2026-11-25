// Transform a completed 47-source monitor report into a small deployable status snapshot
// and a bounded, persistent history. Node built-ins only; no network, no fabricated data.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function validTimestamp(value){return typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
function derive(report,history=[],now=Date.now()){
 assert.equal(report.schemaVersion,1,'monitor report version');
 assert.match(report.checkedAt,/^20\d\d-\d\d-\d\dT/,'real checkedAt');
 assert.ok(validTimestamp(report.checkedAt)&&Date.parse(report.checkedAt)<=now,'valid non-future checkedAt');
 for(const k of ['total','ok','uncertain','broken','actionableAlertCount','monitorLimitationCount','independentlyReadableUncertainCount'])assert.ok(Number.isSafeInteger(report[k])&&report[k]>=0,'nonnegative integer '+k);
 assert.equal(report.total,47,'all 47 official URLs checked');
 assert.equal(report.ok+report.uncertain+report.broken,report.total,'count consistency');
 assert.ok(Array.isArray(report.warnings),'warning details present');
 assert.ok(['network-unavailable','partial-or-complete'].includes(report.monitorStatus),'monitor state known');
 const warnings=report.warnings.map(w=>{
  assert.ok(['uncertain','broken'].includes(w.outcome),'warning outcome');
  assert.equal(typeof w.actionable,'boolean','warning actionable flag');
  assert.ok(['access-restricted','temporary-server','dns-failure','tls-failure','timeout','network-error','confirmed-missing','other-http'].includes(w.category),'warning category');
  assert.equal(w.outcome==='broken',w.category==='confirmed-missing','broken classification');
  assert.equal(w.actionable,['confirmed-missing','temporary-server','dns-failure','tls-failure'].includes(w.category),'warning triage classification');
  assert.ok(/^https:\/\//.test(w.url),'official https only');
  return {url:w.url,status:w.status,outcome:w.outcome,category:w.category,
   actionable:!!w.actionable,
   independentReview:w.independentReview?{result:w.independentReview.result,reviewedOn:w.independentReview.reviewedOn}:null};
 });
 const unique=new Set(warnings.map(w=>w.url));assert.equal(unique.size,warnings.length,'no duplicate warnings');
 assert.equal(warnings.length,report.uncertain+report.broken,'warning count consistency');
 assert.equal(warnings.filter(w=>w.outcome==='broken').length,report.broken,'broken warning count');
 assert.equal(warnings.filter(w=>w.actionable).length,report.actionableAlertCount,'actionable warning count');
 assert.equal(warnings.filter(w=>['readable','redirect-readable'].includes(w.independentReview?.result)).length,report.independentlyReadableUncertainCount,'independent review count');
 assert.ok(report.warningCategories&&typeof report.warningCategories==='object'&&!Array.isArray(report.warningCategories),'category counts present');
 for(const k of new Set([...Object.keys(report.warningCategories),...warnings.map(w=>w.category)]))assert.equal(report.warningCategories[k],warnings.filter(w=>w.category===k).length,'category count '+k);
 const latest={schemaVersion:1,checkedAt:report.checkedAt,monitorStatus:report.monitorStatus,
   total:report.total,ok:report.ok,uncertain:report.uncertain,broken:report.broken,
   actionableAlertCount:report.actionableAlertCount,monitorLimitationCount:report.monitorLimitationCount,
   independentlyReadableUncertainCount:report.independentlyReadableUncertainCount,
   independentEvidenceReviewedOn:report.independentEvidenceReviewedOn,
   warningCategories:report.warningCategories,warnings,
   meaning:'HTTP accessible indicates response only; blocked automated checks do not establish visitor browser failure. Independent reviews are dated, not live.'};
 assert.equal(latest.actionableAlertCount+latest.monitorLimitationCount,latest.uncertain+latest.broken,'triage counts');
 const entry={checkedAt:latest.checkedAt,monitorStatus:latest.monitorStatus,total:latest.total,
  ok:latest.ok,uncertain:latest.uncertain,broken:latest.broken,
  actionableAlertCount:latest.actionableAlertCount,monitorLimitationCount:latest.monitorLimitationCount,
  warningCategories:latest.warningCategories};
 const previous=Array.isArray(history)?history:[];
 const dedup=new Map();
 for(const item of [...previous,entry])if(item&&validTimestamp(item.checkedAt)&&Date.parse(item.checkedAt)<=now)dedup.set(item.checkedAt,item);
 const bounded=[...dedup.values()].sort((a,b)=>a.checkedAt.localeCompare(b.checkedAt)).slice(-60);
 return {latest,history:{schemaVersion:1,retention:'60 observed checks maximum; actual dates, not simulated history',entries:bounded}};
}
function main(){
 const [input,latestPath,historyPath]=process.argv.slice(2);
 if(!input||!latestPath||!historyPath)throw Error('Usage: node scripts/publish-source-health.cjs INPUT LATEST HISTORY');
 const history=fs.existsSync(historyPath)?readJson(historyPath).entries:[];
 const data=derive(readJson(input),history);
 fs.mkdirSync(require('node:path').dirname(latestPath),{recursive:true});
 fs.writeFileSync(latestPath,JSON.stringify(data.latest,null,2)+'\n');
 fs.writeFileSync(historyPath,JSON.stringify(data.history,null,2)+'\n');
 console.log('PERSISTENT SOURCE STATUS: '+data.latest.total+' checked at '+data.latest.checkedAt+'; '+data.history.entries.length+' real historical checkpoints');
}
if(require.main===module){try{main()}catch(error){console.error(error);process.exitCode=1}}
module.exports={derive};
