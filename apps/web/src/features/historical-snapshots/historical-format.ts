import type { EvidenceField, MissingReason } from '@managerhub/domain';

const MISSING_COPY: Record<MissingReason, string> = {
  not_present: 'Not present in this capture',
  not_decoded: 'Not decoded',
  not_verified: 'Not verified',
  incompatible_build: 'Incompatible build',
  redacted: 'Hidden in Realism mode',
  not_applicable: 'Not applicable'
};

export function fieldText<T>(field: EvidenceField<T>, t: (key: string) => string, format: (value: T) => string = String): string {
  return field.value === null ? t(MISSING_COPY[field.missingReason ?? 'not_decoded']) : format(field.value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function formatDate(value: string, language = 'en'): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language.startsWith('vi') ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(date) : value;
}
