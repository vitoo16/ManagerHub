import type { EvidenceField } from './types';
import type { HistoricalSnapshotRecord } from './historical-live-snapshot';
import type { LivePlayer } from './live-snapshot';

export interface HistoricalObservationDifference {
  readonly key: string;
  readonly label: string;
  readonly first: EvidenceField<number>;
  readonly second: EvidenceField<number> | null;
  /** Second observation minus first. Null when either observation is unknown or redacted. */
  readonly difference: number | null;
}

export interface HistoricalObservationComparison {
  readonly attributes: readonly HistoricalObservationDifference[];
  readonly positions: readonly HistoricalObservationDifference[];
}

/**
 * Compares explicitly selected snapshot-local records. The caller must collect
 * confirmation of the pairing. The output does not assert shared identity,
 * career lineage, elapsed game time, or actual player development.
 */
export function compareHistoricalObservations(
  firstRecord: HistoricalSnapshotRecord,
  secondRecord: HistoricalSnapshotRecord,
  firstPlayer: LivePlayer,
  secondPlayer: LivePlayer
): HistoricalObservationComparison | null {
  const first = firstRecord.snapshot;
  const second = secondRecord.snapshot;
  if (firstRecord.id === secondRecord.id || firstRecord.sourceSha256 === secondRecord.sourceSha256 ||
      firstRecord.mode !== secondRecord.mode || first.edition !== second.edition ||
      first.build !== second.build || first.readerVersion !== second.readerVersion ||
      first.sourceIdentity.binarySha256 !== second.sourceIdentity.binarySha256 ||
      !first.players.some(player => player.id === firstPlayer.id && player === firstPlayer) ||
      !second.players.some(player => player.id === secondPlayer.id && player === secondPlayer)) return null;

  function differences(
    left: Readonly<Record<string, EvidenceField<number> & { sourceName?: string; nativeCode?: string }>>,
    right: Readonly<Record<string, EvidenceField<number> & { sourceName?: string; nativeCode?: string }>>,
    position: boolean
  ): HistoricalObservationDifference[] {
    return Object.entries(left).map(([key, field]) => {
      const other = right[key];
      const comparable = other && field.source === 'live_game' && other.source === 'live_game' &&
        field.verification === 'provisional' && other.verification === 'provisional' &&
        field.value !== null && other.value !== null;
      return {
        key,
        label: position ? field.nativeCode ?? key : field.sourceName ?? key,
        first: field,
        second: other ?? null,
        difference: comparable ? other.value! - field.value! : null
      };
    });
  }

  return {
    attributes: differences(firstPlayer.attributes, secondPlayer.attributes, false),
    positions: differences(firstPlayer.positions, secondPlayer.positions, true)
  };
}
