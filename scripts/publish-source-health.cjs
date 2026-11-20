// Transform a completed 47-source monitor report into a small deployable status snapshot
// and a bounded, persistent history. Node built-ins only; no network, no fabricated data.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function derive(report,history=[]){
 assert.equal(report.schemaVersion,1,'monitor report version');
 assert.match(report.checkedAt,/^20\d\d-\d\d-\d\dT/,'real checkedAt');
 assert.ok(Number.isFinite(Date.parse(report.checkedAt)),'valid checkedAt');
 assert.equal(report.total,47,'all 47 official URLs checked');
 assert.equal(report.ok+report.uncertain+report.broken,report.total,'count consistency');
 assert.ok(Array.isArray(report.warnings),'warning details present');
 assert.ok(['network-unavailable','partial-or-complete'].includes(report.monitorStatus),'monitor state known');
 const warnings=report.warnings.map(w=>{
  assert.ok(/^https:\/\//.test(w.url),'official https only');
  return {url:w.url,status:w.status,outcome:w.outcome,category:w.category,
   actionable:!!w.actionable,
   independentReview:w.independentReview?{result:w.independentReview.result,reviewedOn:w.independentReview.reviewedOn}:null};
 });
 const unique=new Set(warnings.map(w=>w.url));assert.equal(unique.size,warnings.length,'no duplicate warnings');
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
 for(const item of [...previous,entry])if(item&&Number.isFinite(Date.parse(item.checkedAt)))dedup.set(item.checkedAt,item);
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
