import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateRcaManifest, errorMetrics } from './rca-validation.mjs';

const fixture = () => JSON.parse(readFileSync(new URL('../docs/research/fmrte/fixtures/rca-synthetic-manifest.json', import.meta.url), 'utf8'));

test('independently expected errors match runtime rounded predictions; counts reconcile', () => {
  const report = validateRcaManifest(fixture());
  assert.equal(report.status, 'synthetic-only');
  assert.deepEqual(report.overlaps, { playerIdentity: 0, careerGroup: 0, sourceGroup: 0 });
  assert.equal(report.partitions.calibration.included, 2);
  assert.equal(report.partitions.holdout.included, 5);
  for (const counts of Object.values(report.partitions)) {
    assert.equal(counts.input, counts.included + Object.values(counts.excluded).reduce((a,b) => a+b, 0));
    assert.equal(counts.included, Object.values(counts.byArchetype).reduce((a,b) => a+b, 0));
  }
  // Independent expected rounded outputs: ST 122, partial 117/122, AML 124, GK 127.
  // Labels 120,115,122,130,130 are synthetic, NOT native observations.
  assert.deepEqual(report.holdout.all.runtime, errorMetrics([2,2,0,-6,-3]));
  assert.equal(report.holdout.all.runtime.mae, 2.6);
  assert.equal(report.holdout.all.runtime.bias, -1);
  assert.equal(report.holdout.all.runtime.maxAbs, 6);
  assert.equal(report.holdout.perArchetype.Striker.runtime.n, 3);
  assert.equal(report.holdout.perArchetype.WingBack.runtime.n, 0);
  assert.equal(report.calibration.fittedUniversal.n, 2);
  assert.notDeepEqual(report.holdout.all.runtime, report.holdout.all.universalHistorical);
});

test('blocks overlapping identity, career, or source lineage even with distinct source hashes', () => {
  for (const key of ['identity','careerGroup','sourceGroup']) {
    const data = fixture();
    const [a,b] = data.sources;
    if (key === 'identity') b.records[0].identity = a.records[0].identity;
    else b[key] = a[key];
    const result = validateRcaManifest(data);
    assert.equal(result.status, 'overlap-blocked');
    assert.equal(result.holdout, null);
    assert.equal(result.overlaps[key === 'identity' ? 'playerIdentity' : key], 1);
  }
});

test('excludes every repeated identity in a partition and refuses absent real corpus', () => {
  const data = fixture();
  data.sources[1].records.push(data.sources[1].records[0]);
  const result = validateRcaManifest(data);
  assert.equal(result.partitions.holdout.excluded['duplicate-identity'], 2);
  assert.equal(result.partitions.holdout.included, 4);
  assert.equal(validateRcaManifest({ schema: 1, kind: 'empirical', sources: [] }).status, 'missing-corpus');
});

test('version-controlled synthetic receipt matches the exact model source and manifest', () => {
  const raw = readFileSync(new URL('../docs/research/fmrte/fixtures/rca-synthetic-manifest.json', import.meta.url), 'utf8');
  const receipt = JSON.parse(readFileSync(new URL('../docs/research/fmrte/fixtures/rca-synthetic-results.json', import.meta.url), 'utf8'));
  assert.deepEqual(receipt, { manifestSha256: createHash('sha256').update(raw).digest('hex'), ...validateRcaManifest(JSON.parse(raw)) });
  assert.deepEqual(errorMetrics([2,2,0,-6,-3]), {
    n: 5, mae: 2.6, rmse: Math.sqrt(10.6), bias: -1, p50: 2, p90: 6, p95: 6, p99: 6, maxAbs: 6, within3: 4, within5: 4
  });
});
