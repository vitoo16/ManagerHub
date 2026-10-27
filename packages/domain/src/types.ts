import type { ArchiveIndex } from './archive';
export type SourceStatus = 'verified' | 'provisional' | 'unsupported';
export type MissingReason = 'not_present' | 'not_decoded' | 'incompatible_build' | 'redacted' | 'not_applicable';
export type SourceKind = 'decoded_save' | 'game_export' | 'manual' | 'derived_model' | 'scenario';

export interface EvidenceField<T> {
  readonly value: T | null;
  readonly source: SourceKind;
  readonly verification: SourceStatus;
  readonly edition: string | null;
  readonly build: string | null;
  readonly missingReason: MissingReason | null;
}

export interface SaveIdentity {
  readonly id: string;
  readonly name: string;
  readonly importedAt: string;
  readonly lastModified: number;
  readonly size: number;
  readonly sha256: string | null;
  readonly signature: string;
  readonly detectedFamily: string | null;
  readonly edition: string | null;
  readonly build: string | null;
  readonly support: 'signature_only' | 'unrecognized';
  readonly inspectionStatus: 'inspected' | 'rejected';
  readonly warnings: readonly string[];
  readonly archiveIndex: ArchiveIndex | null;
}

export type MetricKind = 'actual_ca' | 'estimated_ca' | 'role_fit' | 'tactical_fit' | 'performance';
export interface DerivedMetric {
  readonly kind: MetricKind;
  readonly value: number | null;
  readonly version: string;
  readonly coverage: number;
  readonly source: SourceKind;
  readonly explanation: readonly string[];
}

export type WorkspaceKey = 'overview' | 'saves' | 'players' | 'squad' | 'architecture' | 'modules';
export type CapabilityStatus = 'available' | 'not_implemented' | 'unsupported';
