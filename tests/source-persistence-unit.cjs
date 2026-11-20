'use strict';
const assert=require('node:assert/strict');
const {derive}=require('../scripts/publish-source-health.cjs');
const timestamp='2026-11-20T17:00:00.000Z';
const base={schemaVersion:1,checkedAt:timestamp,total:47,ok:34,uncertain:13,broken:0,
  monitorStatus:'partial-or-complete',actionableAlertCount:0,monitorLimitationCount:13,
  independentlyReadableUncertainCount:9,independentEvidenceReviewedOn:'2026-11-20',
  warningCategories:{'access-restricted':10,'network-error':3},
  warnings:[{url:'https://www.united.com/en/us/flightstatus',status:'23',outcome:'uncertain',category:'network-error',
    actionable:false,independentReview:{reviewedOn:'2026-11-20',result:'readable',note:'Exact source manually checked'}}]};
const initial=derive(base);
assert.equal(initial.latest.total,47);
assert.equal(initial.latest.warnings.length,1);
assert.equal(initial.latest.warnings[0].independentReview.result,'readable');
assert.equal(initial.history.entries.length,1);
assert.equal(derive(base,initial.history.entries).history.entries.length,1,'same run idempotent');
const prior=Array.from({length:70},(_,i)=>({...initial.history.entries[0],checkedAt:new Date(Date.UTC(2026,8,1+i)).toISOString()}));
const repeated=derive(base,prior);
assert.equal(repeated.history.entries.length,60,'never store unlimited runs');
assert.equal(repeated.history.entries.at(-1).checkedAt,timestamp,'history sorted and current');
assert.throws(()=>derive({...base,total:46}),/47/);
assert.throws(()=>derive({...base,ok:35}),/count consistency/);
assert.throws(()=>derive({...base,actionableAlertCount:3}),/triage counts/);
assert.throws(()=>derive({...base,monitorStatus:'unknown'}),/monitor state known/);
console.log('PERSISTENCE UNIT PASS: all 47 source counters, dated evidence, idempotence, last 60 actual checks, and fail-closed data validation.');
