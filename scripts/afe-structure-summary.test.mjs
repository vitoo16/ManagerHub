import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNestedStructure } from './afe-structure-summary.mjs';

test('groups named competition members and aggregates recurrent sizes', () => {
  const members = [
    { filename: 'comp_65010780.dat', storedBytes: 131, reportedUncompressedBytes: 200 },
    { filename: 'comp_65010781.dat', storedBytes: 131, reportedUncompressedBytes: 200 },
    { filename: 'comp_65010782.dat', storedBytes: 131, reportedUncompressedBytes: 200 },
    { filename: 'player_stats.dat', storedBytes: 300, reportedUncompressedBytes: 1800 },
    { filename: 'rgman.dat', storedBytes: 30, reportedUncompressedBytes: 100 }
  ];
  const [summary] = summarizeNestedStructure({ groups: [{ groupName: 'rgman', members }] });
  assert.equal(summary.group, 'rgman');
  assert.equal(summary.members, 5);
  assert.equal(summary.numberedCompetitionNames, 3);
  assert.equal(summary.otherNames, 2);
  assert.deepEqual(summary.topSizePairs[0], {
    storedBytes: 131, reportedUncompressedBytes: 200, count: 3
  });
  assert.equal(summary.storedTotalBytes, 723);
  assert.equal(summary.reportedTotalBytes, 2500);
  assert.equal(JSON.stringify(summary).includes('player_stats.dat'), false);
});

test('does not confuse similarly named files with numbered competition names', () => {
  const [summary] = summarizeNestedStructure({
    groups: [{ groupName: 'rgman', members: [
      { filename: 'comp_man.dat', storedBytes: 45, reportedUncompressedBytes: 99 },
      { filename: 'comp_12.dat', storedBytes: 45, reportedUncompressedBytes: 99 },
      { filename: 'comp_12.dat.bak', storedBytes: 45, reportedUncompressedBytes: 99 }
    ] }]
  });
  assert.equal(summary.numberedCompetitionNames, 1);
  assert.equal(summary.otherNames, 2);
});
test('handles an empty grouped directory without division or data leakage', () => {
  assert.deepEqual(summarizeNestedStructure({ groups: [{ groupName: 'empty', members: [] }] }), [{
    group: 'empty', members: 0, numberedCompetitionNames: 0, otherNames: 0,
    storedTotalBytes: 0, reportedTotalBytes: 0, topSizePairs: []
  }]);
});
