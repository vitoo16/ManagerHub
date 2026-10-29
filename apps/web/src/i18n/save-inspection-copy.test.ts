import { describe, expect, it } from 'vitest';
import vi from './vi';
import { readableSaveInspectionError } from './save-inspection-copy';

describe('save inspection onboarding copy', () => {
  it('maps known file validation and worker errors to actionable guidance', () => {
    expect(readableSaveInspectionError(new Error('Select a Football Manager .fm save file.')))
      .toBe('Choose a Football Manager .fm save file.');
    expect(readableSaveInspectionError(new Error('File must be between 1 byte and 256 MB for this browser inspection.')))
      .toContain('larger than 256 MB');
    expect(readableSaveInspectionError(new Error('Background save inspection failed. Please try the file again.')))
      .toBe('Background save inspection failed. Please try the file again.');
    expect(readableSaveInspectionError(new Error('Unable to start background save inspection.')))
      .toBe('Unable to start background save inspection.');
  });

  it('does not expose unknown technical exceptions as user-facing errors', () => {
    const message = readableSaveInspectionError(new Error('DataView offset is outside the bounds of the DataView'));
    expect(message).toContain('Check that it is a valid .fm file');
    expect(message).not.toContain('DataView');
  });

  it('provides Vietnamese translations for every save inspection guidance key', () => {
    const keys = [
      'Choose a Football Manager .fm save file.',
      'This file is empty or larger than 256 MB. Choose a valid .fm save file up to 256 MB and try again.',
      'Background save inspection failed. Please try the file again.',
      'Unable to start background save inspection.',
      "We couldn't inspect this save file. Check that it is a valid .fm file and try again."
    ];
    for (const key of keys) expect(vi[key as keyof typeof vi]).toBeTruthy();
  });
});
