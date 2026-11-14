import { readFile } from 'node:fs/promises';
import { runJourney } from './runner.js';
const [base, file, out='reports/custom'] = process.argv.slice(2);
if(!base || !file) {console.error('Usage: npm run run -- http://127.0.0.1:3000 journey.json [report-directory]');process.exitCode=2;}
else {
  try {
    const report=await runJourney({base,journey:JSON.parse(await readFile(file,'utf8')),out});
    console.log(`${report.status}: ${report.findings.length} findings. Report: ${out}/report.html`);
    if(report.status==='failed') process.exitCode=1;
  } catch(error) {console.error(error.message);process.exitCode=2;}
}
