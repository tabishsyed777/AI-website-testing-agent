import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validate(base, journey) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('This release only accepts local HTTP(S) targets.');
  if (!journey || typeof journey.name !== 'string' || !Array.isArray(journey.steps) || journey.steps.length > 30) throw new Error('Journey requires a name and at most 30 steps.');
  if (new URL(journey.startPath || '/', url).origin !== url.origin) throw new Error('Start path must stay on the target origin.');
  for (const step of journey.steps) {
    if (!['fill','click','expectText'].includes(step.action) || typeof step.selector !== 'string' || !step.selector) throw new Error('Invalid journey step.');
    if (step.action !== 'click' && typeof step.value !== 'string') throw new Error('Step requires a string value.');
  }
}
export async function runJourney({base, journey, out}) {
  validate(base, journey);
  await mkdir(out, {recursive:true});
  const started = Date.now();
  const report = {name:journey.name, target:base, startedAt:new Date().toISOString(), steps:[], findings:[]};
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1280,height:800}, serviceWorkers:'block'});
    const origin = new URL(base).origin;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === origin ? route.continue() : route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(2000);
    let currentStep = 0;
    const finding = (kind, message) => report.findings.push({kind, message, step:currentStep, url:page.url()});
    page.on('console', msg => {if(msg.type()==='error') finding('console',msg.text());});
    page.on('pageerror', err => finding('javascript',err.message));
    page.on('response', response => {if(response.status()>=400) finding('http',`${response.status()} ${response.url()}`);});
    page.on('requestfailed', request => finding('network',`${request.url()}: ${request.failure()?.errorText}`));
    await page.goto(new URL(journey.startPath || '/', base).href, {waitUntil:'load',timeout:10000});
    await page.screenshot({path:path.join(out,'00-start.png'),fullPage:true});
    for (const [index, step] of journey.steps.entries()) {
      currentStep = index + 1;
      const result = {number:currentStep,...step,status:'passed', screenshot:`${String(currentStep).padStart(2,'0')}.png`};
      const tick = Date.now();
      try {
        const locator = page.locator(step.selector);
        if(step.action==='fill') await locator.fill(step.value);
        if(step.action==='click') await locator.click();
        if(step.action==='expectText') await page.waitForFunction(({selector,value})=>document.querySelector(selector)?.textContent.includes(value), {selector:step.selector,value:step.value},{timeout:2000});
      } catch(error) {
        result.status='failed'; result.error=error.message;
        finding(step.action==='expectText'?'assertion':'action',error.message);
      }
      result.durationMs = Date.now()-tick;
      await page.screenshot({path:path.join(out,result.screenshot),fullPage:true});
      report.steps.push(result);
    }
  } catch(error) {report.findings.push({kind:'runner',message:error.message,step:0});}
  finally {await browser.close();}
  report.durationMs = Date.now()-started;
  report.status = report.findings.length ? 'failed' : 'passed';
  report.modelCalls = 0;
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  const cards = report.steps.map(s=>`<article><h3>${s.number}. ${escape(s.action)} — ${escape(s.status)}</h3><p><code>${escape(s.selector)}</code> ${escape(s.value || '')}</p>${s.error?`<pre>${escape(s.error)}</pre>`:''}<a href="${s.screenshot}"><img src="${s.screenshot}" alt="Screenshot after step ${s.number}"></a></article>`).join('');
  await writeFile(path.join(out,'report.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pathfinder report</title><style>body{font:16px system-ui;background:#0c1324;color:#e5edff;max-width:1000px;margin:40px auto;padding:24px}h1{color:#91f0d1}article{background:#172239;padding:20px;margin:20px 0;border-radius:12px}img{max-width:100%;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#ffb3b3}a{color:#91f0d1}li{margin:12px 0;overflow-wrap:anywhere}</style><h1>Pathfinder / ${escape(report.name)}</h1><p>${escape(report.status.toUpperCase())} · ${report.durationMs} ms · ${report.findings.length} findings · 0 model calls</p><p>Target: ${escape(base)}</p><p>Steps continue after failures to collect evidence. Later failures may be consequences of an earlier failure. Findings are observations, not distinct root causes.</p><a href="report.json">Download JSON</a><h2>Findings</h2><ul>${report.findings.map(f=>`<li><strong>${escape(f.kind)}</strong> · step ${f.step}<pre>${escape(f.message)}</pre></li>`).join('') || '<li>No findings</li>'}</ul><h2>Journey evidence</h2>${cards}</html>`);
  return report;
}
