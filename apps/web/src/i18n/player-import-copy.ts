const IMPORT_ERROR_GUIDANCE: readonly (readonly [RegExp, string])[] = [
  [/Choose an HTML, CSV, TSV or TXT export with player columns/i,
    'Choose a player list exported as HTML, CSV, TSV or TXT.'],
  [/Player export must be between 1 byte and 12 MB/i,
    'This file is empty or larger than 12 MB. Choose a smaller player export and try again.'],
  [/No delimited columns found/i,
    'We could not find columns in this file. Export your player list as CSV or TSV.'],
  [/export is too large for safe in-browser analysis|export exceeds safe inspection limits/i,
    'This file is too large to analyze safely in your browser. Export a smaller list and try again.'],
  [/HTML export exceeds safe row|Too many columns in player export/i,
    'This export has too many rows or columns. Choose a smaller player list and export again.'],
  [/Too many player rows in export/i,
    'This list is too large to analyze at once. Export a smaller group of players and try again.'],
  [/Malformed quoted CSV field|Unexpected quote inside CSV field|Unclosed quote in player export/i,
    'This CSV/TSV file has a formatting issue. Export it again from Football Manager or your spreadsheet, then retry.'],
  [/HTML imports require browser DOM parsing/i,
    'This browser cannot read HTML tables. Export the player list as CSV or TSV instead.'],
  [/No player table found in the HTML export/i,
    'We could not find a player table in this HTML file. Export a table that includes player names, or use CSV/TSV.'],
  [/The export must include a header and at least one player/i,
    'The file is empty or has no player rows. Export a list with column headings and at least one player.'],
  [/Name.*Player column not found in export/i,
    'The export is missing player names. Include the Name column, then try again.'],
  [/No valid player names found in export/i,
    'No player names were found. Check the Name column and try again.']
];

/**
 * Converts parser and file-selection failures into plain-language guidance.
 * Keep the returned English copy as the i18n key; never expose parser wording
 * directly as the primary message shown to the player.
 */
export function readableImportError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
  for (const [pattern, guidance] of IMPORT_ERROR_GUIDANCE) {
    if (pattern.test(message)) return guidance;
  }
  return "We couldn't read this player list. Use an HTML table or CSV/TSV file that includes player names, then try again.";
}

/** Translate parser warnings into next steps rather than exposing internal flags. */
export function readableImportWarning(warning: string): string {
  if (warning.startsWith('No recognized attribute columns')) return 'No player attributes were found. Include passing, pace and other 1–20 columns when exporting.';
  if (warning.startsWith('No position column')) return 'Your list is missing a Position column. Add it to compare roles and plan a lineup.';
  if (warning.startsWith('CA/PA-like export columns')) return 'We do not treat values labeled CA/PA in an exported list as verified hidden game values.';
  if (warning.includes('rows without a player name')) return 'Some rows had no player name and were skipped.';
  if (warning.includes('unavailable or unrecognized attribute cells')) return 'Some attributes were hidden or unavailable and were left blank rather than guessed.';
  return 'Some columns could not be read. Check the exported view and try again.';
}
