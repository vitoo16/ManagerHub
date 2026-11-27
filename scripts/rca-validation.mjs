#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// Node 24 type stripping; resolve the domain's extensionless TS imports without new dependencies.
const domain = new URL('../packages/domain/src/', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(domain) && specifier.startsWith('./') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(specifier + '.ts', context);
    }
    return nextResolve(specifier, context);
  }
});
const { evaluatePlayerRca, FM2013_ADVISORY_COEFFICIENTS, FM2013_HISTORICAL_UNIVERSAL } =
  await import('../packages/domain/src/rca-engine.ts');

const { ATTRIBUTE_GROUP_BY_KEY } = await import('../packages/domain/src/rca-weights.ts');
const modelFiles = ['rca-engine.ts','rca-editions.ts','rca-weights.ts','rca-diagnostics.ts','rca-types.ts'];
const modelSourceSha256 = createHash('sha256').update(modelFiles.map(name =>
  name + '\n' + readFileSync(new URL(name, domain), 'utf8').replace(/\r\n/g, '\n')
).join('\n')).digest('hex');
const archetypes = Object.keys(FM2013_ADVISORY_COEFFICIENTS);
const positions = ['GK','SW','DL','DC','DR','WBL','WBR','DM','ML','MC','MR','AML','AMC','AMR','ST'];
const attributeKeys = Object.keys(ATTRIBUTE_GROUP_BY_KEY);
const digest = /^[a-f0-9]{64}$/;
const token = value => typeof value === 'string' && digest.test(value);
const rating = value => Number.isInteger(value) && value >= 1 && value <= 20;
const caValid = value => Number.isInteger(value) && value >= 1 && value <= 200;
const clamp = value => Math.min(200, Math.max(1, Math.round(value)));
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const countOverlap = (left, right) => [...left].filter(value => right.has(value)).length;
const increment = (counts, key) => { counts[key] = (counts[key] ?? 0) + 1; };
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, allowed) => plainObject(value) && Object.keys(value).every(key => allowed.includes(key));

export function errorMetrics(errors) {
  if (!errors.length) return { n: 0, mae: null, rmse: null, bias: null, p50: null, p90: null, p95: null,
    p99: null, maxAbs: null, within3: 0, within5: 0 };
  const abs = errors.map(Math.abs).sort((a, b) => a - b);
  const percentile = q => abs[Math.ceil(q * abs.length) - 1];
  return { n: errors.length, mae: average(abs), rmse: Math.sqrt(average(errors.map(e => e * e))),
    bias: average(errors), p50: percentile(.5), p90: percentile(.9), p95: percentile(.95),
    p99: percentile(.99), maxAbs: abs.at(-1),
    within3: abs.filter(e => e <= 3).length, within5: abs.filter(e => e <= 5).length };
}

function fit(rows) {
  if (rows.length < 2) return { n: rows.length, intercept: null, slope: null, r2: null };
  const x = rows.map(row => row.mean), y = rows.map(row => row.ca);
  const mx = average(x), my = average(y);
  const ssx = x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const ssy = y.reduce((s, v) => s + (v - my) ** 2, 0);
  if (!ssx || !ssy) return { n: rows.length, intercept: null, slope: null, r2: null };
  const slope = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / ssx;
  const intercept = my - slope * mx;
  const residual = x.reduce((s, v, i) => s + (y[i] - (intercept + slope * v)) ** 2, 0);
  return { n: rows.length, intercept, slope, r2: 1 - residual / ssy };
}

function byArchetype(rows, measure) {
  return Object.fromEntries(archetypes.map(archetype => [archetype, measure(rows.filter(row => row.archetype === archetype))]));
}

function strictSingle(row) {
  const values = Object.values(row.positions);
  return positions.every(pos => rating(row.positions[pos])) && values.filter(v => v === 20).length === 1 && !values.some(v => v >= 15 && v < 20);
}

/** Validate sanitized normalized inputs; no names, raw saves, paths or external lookups. */
function checkManifest(manifest) {
  if (!exactKeys(manifest, ['schema', 'kind', 'sources']) || manifest.schema !== 1 ||
      !['empirical', 'synthetic'].includes(manifest.kind) || !Array.isArray(manifest.sources)) throw Error('Invalid manifest');
  const ids = new Set(), hashes = new Set();
  for (const source of manifest.sources) {
    if (!exactKeys(source, ['id','sourceSha256','sourceGroup','careerGroup','split','edition','build','records']) ||
        !token(source.id) || !token(source.sourceSha256) || !token(source.sourceGroup) || !token(source.careerGroup) ||
        ids.has(source.id) || hashes.has(source.sourceSha256) || !['calibration','holdout'].includes(source.split) ||
        source.edition !== 'FM2013' || source.build !== '13.3.3f359652' || !Array.isArray(source.records)) {
      throw Error('Invalid or duplicate source manifest (exact FM2013 build required)');
    }
    ids.add(source.id); hashes.add(source.sourceSha256);
    for (const row of source.records) {
      if (!exactKeys(row, ['identity','actualCa','attributes','positions','leftFoot','rightFoot']) ||
          !token(row.identity) || !exactKeys(row.attributes, attributeKeys) || !exactKeys(row.positions, positions) ||
          (row.actualCa != null && typeof row.actualCa !== 'number') ||
          Object.values(row.attributes).some(value => value !== null && !rating(value)) ||
          Object.values(row.positions).some(value => value !== null && !rating(value)) ||
          [row.leftFoot,row.rightFoot].some(value => value != null && !rating(value))) {
        throw Error('Invalid sanitized player record');
      }
    }
  }
}

export function validateRcaManifest(manifest) {
  checkManifest(manifest);
  const partitions = Object.fromEntries(['calibration','holdout'].map(split => [split, manifest.sources.filter(s => s.split === split)]));
  const collect = (split, key) => new Set(partitions[split].map(s => s[key]));
  const identities = split => new Set(partitions[split].flatMap(s => s.records.map(row => row.identity)));
  const overlaps = { playerIdentity: countOverlap(identities('calibration'), identities('holdout')),
    careerGroup: countOverlap(collect('calibration','careerGroup'), collect('holdout','careerGroup')),
    sourceGroup: countOverlap(collect('calibration','sourceGroup'), collect('holdout','sourceGroup')) };
  const result = { schema: 1, kind: manifest.kind, model: 'FM2013-research-v2', modelSourceSha256, overlaps,
    status: 'unverified', partitions: {}, calibration: null, holdout: null };
  const accepted = { calibration: [], holdout: [] };
  for (const split of ['calibration','holdout']) {
    const sources = partitions[split];
    const identityFrequency = new Map();
    for (const source of sources) for (const row of source.records) {
      identityFrequency.set(row.identity, (identityFrequency.get(row.identity) ?? 0) + 1);
    }
    const counts = { sources: sources.length, input: 0, included: 0, excluded: {}, byArchetype: {}, strictSingleIncluded: 0 };
    for (const source of sources) for (const row of source.records) {
      counts.input++;
      // Exclude every duplicate rather than selecting an arbitrary career/date observation.
      if (identityFrequency.get(row.identity) !== 1) { increment(counts.excluded, 'duplicate-identity'); continue; }
      if (!caValid(row.actualCa) || (split === 'calibration' && row.actualCa < 10)) {
        increment(counts.excluded, 'invalid-or-below-calibration-ca'); continue;
      }
      if (split === 'calibration' && !strictSingle(row)) { increment(counts.excluded, 'not-strict-single'); continue; }
      const report = evaluatePlayerRca(row, { edition: source.edition, build: source.build });
      if (report.status !== 'evaluated') { increment(counts.excluded, report.status); continue; }
      const winner = report.candidateScores[0];
      if (split === 'calibration' && report.observedWeightCoverage !== 1) {
        increment(counts.excluded, 'incomplete-calibration-weight'); continue;
      }
      // Preserve the exact observed denominator and unrounded mean, not the UI's 4dp display mean.
      const mean = winner.rawWeightedSum / winner.observedWeight;
      // Universal baseline evaluates the SAME candidate set, but with its own coefficients.
      const universal = report.candidateScores.map(candidate => {
        const candidateMean = candidate.rawWeightedSum / candidate.observedWeight;
        return clamp(FM2013_HISTORICAL_UNIVERSAL.intercept + FM2013_HISTORICAL_UNIVERSAL.slope * candidateMean);
      });
      accepted[split].push({ archetype: winner.archetype, mean, ca: row.actualCa,
        prediction: winner.advisoryRca, universal: Math.max(...universal), strictSingle: strictSingle(row),
        complete: report.observedWeightCoverage === 1 });
      counts.included++;
      if (strictSingle(row)) counts.strictSingleIncluded++;
    }
    counts.byArchetype = byArchetype(accepted[split], rows => rows.length);
    result.partitions[split] = counts;
  }
  if (Object.values(overlaps).some(n => n > 0)) { result.status = 'overlap-blocked'; return result; }
  if (!accepted.calibration.length || !accepted.holdout.length) { result.status = 'missing-corpus'; return result; }
  const train = accepted.calibration;
  const holdout = accepted.holdout;
  const metrics = rows => ({
    runtime: errorMetrics(rows.map(row => row.prediction - row.ca)),
    universalHistorical: errorMetrics(rows.map(row => row.universal - row.ca))
  });
  result.calibration = { fittedUniversal: fit(train), fittedPerArchetype: byArchetype(train, fit),
    committedUniversal: FM2013_HISTORICAL_UNIVERSAL, committedPerArchetype: FM2013_ADVISORY_COEFFICIENTS };
  result.holdout = { all: metrics(holdout), perArchetype: byArchetype(holdout, metrics),
    strictSingle: metrics(holdout.filter(row => row.strictSingle)),
    strictSinglePerArchetype: byArchetype(holdout.filter(row => row.strictSingle), metrics),
    other: metrics(holdout.filter(row => !row.strictSingle)),
    partial: metrics(holdout.filter(row => !row.complete)) };
  // Even a successful empirical run is not a certification; source identity and label provenance need independent review.
  result.status = manifest.kind === 'synthetic' ? 'synthetic-only' : 'empirical-computed-review-required';
  return result;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const path = process.argv[2];
  if (!path) { console.error('Usage: node scripts/rca-validation.mjs <sanitized-manifest.json>'); process.exitCode = 2; }
  else {
    try {
      const raw = readFileSync(path, 'utf8');
      const report = validateRcaManifest(JSON.parse(raw));
      console.log(JSON.stringify({ manifestSha256: createHash('sha256').update(raw).digest('hex'), ...report }, null, 2));
      if (['overlap-blocked','missing-corpus'].includes(report.status)) process.exitCode = 2;
    } catch (error) { console.error(String(error)); process.exitCode = 2; }
  }
}
