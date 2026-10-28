import { describe, expect, it } from 'vitest';
import vi from './vi';
import { readableImportError, readableImportWarning } from './player-import-copy';

describe('player import onboarding copy', () => {
  it('turns common parser failures into actionable user guidance', () => {
    expect(readableImportError(new Error('Name/Player column not found in export.')))
      .toBe('The export is missing player names. Include the Name column, then try again.');
    expect(readableImportError(new Error('Unclosed quote in player export.')))
      .toContain('formatting issue');
    expect(readableImportError(new Error('No player table found in the HTML export.')))
      .toContain('find a player table');
  });

  it('turns every parser warning into translated next-step guidance', () => {
    const warnings = [
      ['No recognized attribute columns. Player names are imported but role analysis is unavailable.', 'No player attributes were found. Include passing, pace and other 1–20 columns when exporting.'],
      ['No position column. Position familiarity cannot be assessed.', 'Your list is missing a Position column. Add it to compare roles and plan a lineup.'],
      ['CA/PA-like export columns were not accepted as verified hidden game values.', 'We do not treat values labeled CA/PA in an exported list as verified hidden game values.'],
      ['2 rows without a player name were skipped.', 'Some rows had no player name and were skipped.'],
      ['3 unavailable or unrecognized attribute cells were left unknown.', 'Some attributes were hidden or unavailable and were left blank rather than guessed.'],
      ['An unfamiliar warning.', 'Some columns could not be read. Check the exported view and try again.']
    ] as const;

    for (const [warning, expected] of warnings) {
      expect(readableImportWarning(warning)).toBe(expected);
      expect(vi[expected as keyof typeof vi]).toBeTruthy();
    }
  });

  it('uses a helpful fallback instead of exposing raw technical errors', () => {
    const message = readableImportError(new Error('Unexpected internal parser detail'));
    expect(message).toContain('Use an HTML table or CSV/TSV');
    expect(message).not.toContain('Unexpected internal parser detail');
  });

  it('provides Vietnamese copy for every user-facing import error and CA distinction', () => {
    const keys = [
      'The export is missing player names. Include the Name column, then try again.',
      'This CSV/TSV file has a formatting issue. Export it again from Football Manager or your spreadsheet, then retry.',
      "We couldn't read this player list. Use an HTML table or CSV/TSV file that includes player names, then try again.",
      "These weights only explain ManagerHub's role-fit score. They are not Football Manager's CA costs.",
      'From your export (not game-verified)'
    ];
    for (const key of keys) expect(vi[key as keyof typeof vi]).toBeTruthy();
  });
});
