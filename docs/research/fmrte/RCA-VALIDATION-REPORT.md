# RCA validation report — independent remediation

**Empirical reproduction: blocked (no row-level permissioned corpus available in this checkout).**
The previous report is historical, not current verified accuracy. See baseline c9f35c9672daa93539b752c302280d1541b498c7 for the original reported table. No new empirical MAE, RMSE, bias, percentiles or maximum error is asserted.

## Reconciliation of historical claims

| Quantity | Historical claim | Audit |
|---|---:|---|
| Tutorial distinct players | 10,882 | identities and source groups not supplied |
| Tutorial strict single-natural calibration | 5,211 | table totals 3,796; 1,415 unexplained |
| Holdout all | 4,058 | identity overlap and provenance unknown |
| Holdout strict single-natural | 1,818 in overview; 1,808 in results | table totals 1,807; discrepancies 11 and 1 respectively |
| Holdout other | 2,240 | only equals total minus 1,818, not evidence of filter reconciliation |
| Universal fit | intercept -101.239, slope 18.6731, R² 0.9800 | claimed training statistic, not established out-of-sample R² |
| All holdout MAE/RMSE | 4.87 / 6.43 | not reproducible; no error distribution, rounding/filters or exact executed algorithm receipt |

| Archetype | Historical train n | Historical holdout n |
|---|---:|---:|
| Goalkeeper | 817 | 420 |
| DefenderCentral | 793 | 407 |
| FullBack | 397 | 139 |
| WingBack | not reported | not reported |
| DefensiveMidfielder | 37 | 29 |
| MidfielderCentral | 548 | 227 |
| WideMidfielder | 88 | 13 |
| AttackingMidfielderCentral | 53 | 30 |
| Winger | 100 | 19 |
| Striker | 963 | 523 |
| **Reported row sum** | **3,796** | **1,807** |

The original MAE range also omitted reported WideMidfielder 6.15 and Winger 6.74. These are not current confidence bounds. Distinct filenames cannot prove disjoint data: tutorial careers may share the same database/player identities. The prior purported corpus SHA was the FM2013 executable SHA, not a manifest hash.

## Version-controlled research protocol

Run Node 24, from repository root:

```sh
npm run research:rca:validate -- docs/research/fmrte/fixtures/rca-synthetic-manifest.json
npm run research:rca:validate -- docs/research/fmrte/fixtures/rca-empirical-manifest.json
node --test scripts/rca-validation.test.mjs
```

The first manifest is explicitly synthetic (fictional hashes, identities, attributes and labels). The second is an empty admission manifest and exits 2 with missing-corpus, deliberately unable to produce empirical metrics. It is not a claim of zero overlap in real data.

To reproduce on the authorized local corpus, populate a **private** manifest with the same schema; export only normalized 1–20 attribute/foot and position ratings, observed actual CA, exact build, stable HMAC-SHA256 player identities (same key/domain across the entire corpus, including base-database IDs and career-scoped generated player IDs), source SHA-256, opaque sanitized source and career lineage group IDs. Source groups must identify the underlying common database/derivation lineage, not file names. Record the identity mapping and label provenance privately for independent audit. Never commit actual private saves or player rows; share approved aggregate receipts and sanitized source manifest digests.

The runner first validates the manifest, rejects duplicate source hashes and blocks *any* calibration/holdout intersection by identity, career group or source group (before filtering). Every repeated identity within a split is excluded rather than arbitrarily choosing a snapshot. It accounts for each input, inclusion, and single exclusion reason. Calibration requires CA 10–200, all 15 observed position ratings, exactly one natural position, no accomplished secondary, 100% weighted coverage. Holdout requires CA 1–200, supported position/build and >=70% candidate weight coverage; reports separate strict-single, other, and partial strata. Missing data stays missing. These explicit rules replace the ambiguous historical cohort definitions; mismatched counts must be investigated rather than edited to fit.

The receipt includes normalized-LF source text SHA-256 over the model modules and the raw manifest SHA-256. The runtime metric calls the committed evaluatePlayerRca with exact source build and normalized inputs, including its per-position coefficients, max natural candidate, observed denominator, rounding, clamping and no surcharge. Separately the historical universal regression is applied to the same candidate set with the unrounded observed mean and rounded/clamped maximum. The runner also fits universal and per-archetype OLS on the admitted calibration split (null if insufficient/zero variance) for comparison; neither fit changes production coefficients. WingBack and WideMidfielder use rounded historical universal parameters in the current implementation. Percentiles are nearest-rank absolute error; bias is prediction minus actual, RMSE is root mean squared error. All ten archetypes appear even when n=0 (metrics null). Synthetic monotonicity and independent decimal calculation test the implementation, not FMRTE integer parity.

## Reproducible synthetic receipt (not empirical)

See [synthetic manifest](fixtures/rca-synthetic-manifest.json) and [machine-readable result](fixtures/rca-synthetic-results.json). Training 5 input / 2 admitted / 3 excluded; holdout 6 input / 5 admitted / 1 excluded. No synthetic identity/group overlap. Independent expected runtime errors [2, 2, 0, -6, -3] give n=5, MAE=2.6, RMSE=sqrt(53/5)=3.255764..., bias=-1, absolute p50=2, p90/p95/p99=6, max=6. No real-save accuracy or confidence interval follows from this fixture.

**Disposition:** retained historical FM2013 coefficients are INFERRED, advisory only; FM2026 is reference-only with no numeric fit. Actual FMRTE numeric parity, exact-build RCA and native CA/PA writing certification remain unproven. Auto Match stays disabled, and PA never changes automatically.
