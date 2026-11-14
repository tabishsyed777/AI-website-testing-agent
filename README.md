# Pathfinder — Website Journey Testing

A working, local-first Playwright runner that executes explicit user journeys and produces screenshots, JSON findings, and an HTML evidence report. This release is deterministic: natural-language planning and AI explanations are planned, and no model API is called.

## Quick start

Requires Node.js 20+ and a supported Playwright host.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm run demo
```

Open `reports/broken/report.html` and `reports/healthy/report.html`. The demo starts its own loopback server, runs the same contact journey against broken and healthy fixtures, writes `reports/evaluation.json`, then shuts down. It exits unsuccessfully if either seeded bug is missed or the healthy control fails.

## What works

- `fill`, `click`, and `expectText` steps with bounded timeouts (maximum 30 steps).
- Console errors, uncaught JavaScript errors, HTTP 4xx/5xx, failed requests, and failed assertions.
- Screenshots after every step, reproduction steps, timing, and JSON/HTML export.
- Loopback targets only; browser network requests restricted to the target origin.
- GitHub Actions checks and downloadable demo reports.

## Test your local app

```sh
npm run run -- http://127.0.0.1:3000 journeys/contact.json reports/my-app
```

Edit `startPath`, selectors, and expected text in a copy of `journeys/contact.json`. Selectors use Playwright's locator syntax for fill/click; `expectText` uses a CSS selector and waits for a case-sensitive text substring. Exit codes: 0 clean, 1 findings, 2 invalid input/setup error. Reports can contain entered values and screenshots: use test data and keep private reports out of public repositories.

## Evaluation and limits

The demo contains two known bugs: contact submission never confirms success, and a shipping link returns HTTP 404. A healthy version of the same journey provides a negative control. Detection rate means detected seeded bugs divided by two; healthy findings are reported separately. This tiny fixture suite is not evidence of general accuracy. Multiple observations can describe one bug; later failures may cascade from earlier ones. Every collected error makes the run fail; severity filtering is not implemented.

This is a local development tool, not a security sandbox or an autonomous web crawler. Only run it against trusted local test apps. It has no authentication manager, natural-language goal execution, cross-origin journeys, CI baseline comparison, or LLM integration. An assertion checks the declared behavior; a clean report does not establish that the site is bug-free. The runner continues after failed steps to collect evidence.

## Existing concept site

`index.html` remains the original static concept landing page. Its sample control still displays mock findings and does not call the runner. GitHub Pages hosts static files; run the CLI locally for real browser tests.

## Next milestone

Add a bounded goal planner that compiles a natural-language goal into the same validated journey format, shows its plan for review, and is evaluated separately from deterministic execution.

## License

MIT; see LICENSE.
