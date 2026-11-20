const SAVE_ERROR_GUIDANCE: readonly (readonly [RegExp, string])[] = [
  [/Select a Football Manager \.fm save file/i,
    'Choose a Football Manager .fm save file.'],
  [/File must be between 1 byte and 256 MB/i,
    'This file is empty or larger than 256 MB. Choose a valid .fm save file up to 256 MB and try again.'],
  [/Background save inspection requires Web Workers/i,
    'This browser cannot run background save inspection. Use a current browser with Web Worker support.'],
  [/Background save inspection exceeded 45 seconds/i,
    'Save inspection timed out after 45 seconds. Try a smaller .fm file or select the file again.'],
  [/Background save inspection returned an invalid result/i,
    'Background save inspection returned invalid data. Select the .fm file again.'],
  [/Background save inspection failed/i,
    'Background save inspection failed. Please try the file again.'],
  [/Unable to start background save inspection/i,
    'Unable to start background save inspection.'],
  [/Cryptographic random IDs are unavailable/i,
    'This browser cannot create a safe inspection ID. Use a browser with cryptographic random number support.'],
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
