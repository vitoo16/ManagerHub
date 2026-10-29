const SAVE_ERROR_GUIDANCE: readonly (readonly [RegExp, string])[] = [
  [/Select a Football Manager \.fm save file/i,
    'Choose a Football Manager .fm save file.'],
  [/File must be between 1 byte and 256 MB/i,
    'This file is empty or larger than 256 MB. Choose a valid .fm save file up to 256 MB and try again.'],
  [/Background save inspection failed/i,
    'Background save inspection failed. Please try the file again.'],
  [/Unable to start background save inspection/i,
    'Unable to start background save inspection.'],
  [/Unable to inspect file/i,
    "We couldn't inspect this save file. Check that it is a valid .fm file and try again."]
];

/**
 * Turn save-inspection failures into translated, actionable guidance.
 * Unknown exceptions are deliberately not surfaced verbatim to avoid exposing
 * browser, parser, or implementation details in the primary UI.
 */
export function readableSaveInspectionError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
  for (const [pattern, guidance] of SAVE_ERROR_GUIDANCE) {
    if (pattern.test(message)) return guidance;
  }
  return "We couldn't inspect this save file. Check that it is a valid .fm file and try again.";
}
