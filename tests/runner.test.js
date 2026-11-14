import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validate, runJourney } from '../src/runner.js';
import { startFixture } from '../src/fixture.js';

test('rejects remote targets, escaping start paths, and unsupported actions',()=>{
  const journey={name:'test',steps:[]};
  assert.throws(()=>validate('https://example.com',journey),/local/);
  assert.throws(()=>validate('http://localhost:3000',{...journey,startPath:'https://example.com'}),/origin/);
  assert.throws(()=>validate('http://localhost:3000',{...journey,steps:[{action:'eval',selector:'body'}]}),/Invalid/);
});

test('detects both seeded bugs, preserves evidence, and passes the healthy control',async()=>{
  const fixture=await startFixture();
  const out=await mkdtemp(path.join(os.tmpdir(),'pathfinder-test-'));
  try {
    const journey=JSON.parse(await readFile(new URL('../journeys/contact.json',import.meta.url)));
    const broken=await runJourney({base:fixture.base,journey,out:path.join(out,'broken')});
    assert.equal(broken.status,'failed');
    assert.ok(broken.findings.some(f=>f.kind==='assertion' && f.step===4));
    assert.ok(broken.findings.some(f=>f.kind==='console' && f.message.includes('CONTACT_SUBMIT_FAILED')));
    assert.ok(broken.findings.some(f=>f.kind==='http' && f.message.startsWith('404')));
    assert.equal(broken.steps.length,6);
    const png=await readFile(path.join(out,'broken','04.png'));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.match(await readFile(path.join(out,'broken','report.html'),'utf8'),/CONTACT_SUBMIT_FAILED/);
    const healthy=await runJourney({base:fixture.base,journey:{...journey,startPath:'/healthy'},out:path.join(out,'healthy')});
    assert.equal(healthy.status,'passed');
    assert.equal(healthy.findings.length,0);
  } finally {await fixture.close();await rm(out,{recursive:true,force:true});}
});
