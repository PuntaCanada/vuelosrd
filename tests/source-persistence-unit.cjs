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
// Complete fixture: 13 unique warnings, matching the report's counters.
base.warnings.push(...Array.from({length:12},(_,i)=>({url:'https://example.org/source/'+i,status:i<10?403:'23',outcome:'uncertain',category:i<10?'access-restricted':'network-error',actionable:false,independentReview:i<8?{reviewedOn:'2026-11-20',result:'readable'}:null})));
const initial=derive(base,[],Date.parse(timestamp));
assert.equal(initial.latest.total,47);
assert.equal(initial.latest.warnings.length,13);
assert.equal(initial.latest.warnings[0].independentReview.result,'readable');
assert.equal(initial.history.entries.length,1);
assert.equal(derive(base,initial.history.entries,Date.parse(timestamp)).history.entries.length,1,'same run idempotent');
const prior=Array.from({length:70},(_,i)=>({...initial.history.entries[0],checkedAt:new Date(Date.UTC(2026,8,1+i)).toISOString()}));
const repeated=derive(base,prior,Date.parse(timestamp));
assert.equal(repeated.history.entries.length,60,'never store unlimited runs');
assert.equal(repeated.history.entries.at(-1).checkedAt,timestamp,'history sorted and current');
assert.throws(()=>derive({...base,total:46}),/47/);
assert.throws(()=>derive({...base,ok:35}),/count consistency/);
assert.throws(()=>derive({...base,actionableAlertCount:3}),/actionable warning count/);
assert.throws(()=>derive({...base,monitorStatus:'unknown'}),/monitor state known/);
console.log('PERSISTENCE UNIT PASS: all 47 source counters, dated evidence, idempotence, last 60 actual checks, and fail-closed data validation.');

assert.throws(()=>derive({...base,ok:-1,uncertain:48}),/nonnegative integer/);
assert.throws(()=>derive({...base,warnings:base.warnings.slice(1)}),/warning count consistency/);
assert.throws(()=>derive({...base,checkedAt:'2026-02-30T17:00:00.000Z'}),/valid non-future/);
assert.throws(()=>derive({...base,checkedAt:'2099-01-01T00:00:00.000Z'}),/valid non-future/);
assert.throws(()=>derive({...base,warningCategories:{'access-restricted':9,'network-error':4}}),/category count/);
assert.throws(()=>derive({...base,independentlyReadableUncertainCount:8}),/independent review count/);
assert.throws(()=>derive({...base,warnings:base.warnings.map((w,i)=>i===0?{...w,actionable:'false'}:w)}),/warning actionable flag/);
assert.equal(derive(base,[{...initial.history.entries[0],checkedAt:'2099-01-01T00:00:00.000Z'}],Date.parse(timestamp)).history.entries.length,1);
console.log('Strict snapshot validation regression checks passed');
