import { describe, expect, it } from 'vitest';
import vi from './vi';
import { readableImportError } from './player-import-copy';

describe('player import onboarding copy', () => {
  it('turns common parser failures into actionable user guidance', () => {
    expect(readableImportError(new Error('Name/Player column not found in export.')))
      .toBe('The export is missing player names. Include the Name column, then try again.');
    expect(readableImportError(new Error('Unclosed quote in player export.')))
      .toContain('formatting issue');
    expect(readableImportError(new Error('No player table found in the HTML export.')))
      .toContain('find a player table');
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
