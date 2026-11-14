import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { startFixture } from './fixture.js';
import { runJourney } from './runner.js';
const fixture = await startFixture();
try {
  const journey = JSON.parse(await readFile(new URL('../journeys/contact.json',import.meta.url)));
  const broken = await runJourney({base:fixture.base,journey,out:'reports/broken'});
  const healthy = await runJourney({base:fixture.base,journey:{...journey,startPath:'/healthy'},out:'reports/healthy'});
  const detected = [broken.findings.some(f=>f.kind==='assertion' && f.step===4),broken.findings.some(f=>f.kind==='http' && f.message.startsWith('404'))];
  const evaluation = {seededBugs:2,detectedBugs:detected.filter(Boolean).length,detectionRate:detected.filter(Boolean).length/2,healthyJourneyStatus:healthy.status,healthyFindings:healthy.findings.length,modelCalls:0,scope:'Two seeded bugs and one healthy control; not a general accuracy estimate.'};
  await mkdir('reports',{recursive:true});
  await writeFile('reports/evaluation.json',JSON.stringify(evaluation,null,2));
  console.log(JSON.stringify(evaluation,null,2));
  console.log('Open reports/broken/report.html and reports/healthy/report.html');
  if(evaluation.detectedBugs!==2 || healthy.status!=='passed') process.exitCode=1;
} finally {await fixture.close();}
