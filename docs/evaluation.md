# Initial runner evaluation

Verified locally with Node.js 24 and Playwright Chromium using `npm test` and `npm run demo`.

| Check | Result |
| --- | --- |
| Input validation test | Passed |
| Browser integration test | Passed |
| Seeded missing submit confirmation | Detected by step 4 assertion and console evidence |
| Seeded broken shipping link | Detected by HTTP 404 evidence |
| Healthy journey | Passed, zero findings |
| Evidence generation | PNG signatures and HTML contents verified by integration test |
| Model calls | 0 |

The two seeded bugs were detected (2/2). This fixture result is not a general detection-rate claim. The negative control is one journey, not a representative false-positive benchmark. Re-run `npm run demo` to produce current evidence and timings in `reports/`.
