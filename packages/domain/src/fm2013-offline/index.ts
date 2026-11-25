import { getSignature } from '../save';
import { resolveSaveCompatibility } from '../save-compatibility';
import {
  extractFm2013Member,
  MAX_FM_SAVE_BYTES,
  mergeHumanManagers,
  parseFm2013Container,
  parseHumansMember,
  parseSaveGameSummary,
  verifyGameDbHmacSha512,
  type BinarySliceSource
} from './afe-container';
import { parseFm2013GameDb } from './game-db-parser';
import { applyLangDbToSaveDatabase, type Fm2013LangDbLookup } from './lang-db';
import {
  DECODED_SAVE_DB_SCHEMA_VERSION,
  FM2013_OFFLINE_ADAPTER_VERSION,
  FM2013DecodeError,
  type DecodedSaveDatabase,
  type FM2013DecodeProgress
} from './types';

export * from './types';
export * from './binary-reader';
export * from './afe-container';
export * from './game-db-parser';
export * from './lang-db';
export * from './projection';
export * from './validation';
export * from './editor-transactions';
export * from './writer';

export interface DecodeFm2013SaveOptions {
  readonly fileName?: string;
  readonly lastModified?: number;
  readonly signingKey?: Uint8Array;
  readonly langDb?: Fm2013LangDbLookup;
  readonly onProgress?: (progress: FM2013DecodeProgress) => void;
}

export async function computeSha256Hex(source: BinarySliceSource): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new FM2013DecodeError('CRYPTO_UNAVAILABLE', 'Web Crypto API is unavailable for SHA-256 hashing.');
  }
  const buffer = source instanceof Uint8Array
    ? (source.byteOffset === 0 && source.byteLength === source.buffer.byteLength
        ? (source.buffer as ArrayBuffer)
        : source.slice().buffer)
    : await source.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function readHeadSignature(source: BinarySliceSource): Promise<string> {
  const head = source instanceof Uint8Array
    ? source.subarray(0, 12)
    : new Uint8Array(await source.slice(0, 12).arrayBuffer());
  return getSignature(head);
}

/**
 * End-to-end, read-only offline FM2013 `.fm` save decoder.
 * Never mutates the original file, requires zero running FM process or CSV export,
 * enforces exact member sizes + 64-byte footer structure (+ optional HMAC-SHA512 verification),
 * and derives verified domain claims strictly from `resolveSaveCompatibility`.
 */
export async function decodeFm2013Save(
  input: File | Uint8Array,
  options: DecodeFm2013SaveOptions = {}
): Promise<DecodedSaveDatabase> {
  const isFile = !(input instanceof Uint8Array);
  const fileName = options.fileName ?? (isFile ? input.name : 'save.fm');
  const fileSize = isFile ? input.size : input.byteLength;
  const lastModified = options.lastModified ?? (isFile ? input.lastModified : 0);

  if (!fileName.toLowerCase().endsWith('.fm')) {
    throw new FM2013DecodeError('INVALID_FILE', 'Select a Football Manager .fm save file.');
  }
  if (fileSize === 0 || fileSize > MAX_FM_SAVE_BYTES) {
    throw new FM2013DecodeError(
      'SIZE_LIMIT_EXCEEDED',
      'File must be between 1 byte and 256 MB for offline save decoding.'
    );
  }

  options.onProgress?.({ stage: 'hashing', percent: 5 });
  const [sha256, signature] = await Promise.all([
    computeSha256Hex(input),
    readHeadSignature(input)
  ]);

  options.onProgress?.({ stage: 'reading_container', percent: 15 });
  const container = await parseFm2013Container(input);

  options.onProgress?.({ stage: 'decrypting_database', percent: 30 });
  const [summaryBytes, humansBytes, gameDbBytes] = await Promise.all([
    extractFm2013Member(input, container, 'save_game_summary.dat'),
    extractFm2013Member(input, container, 'humans.dat'),
    extractFm2013Member(input, container, 'game_db.dat')
  ]);

  if (!gameDbBytes) {
    throw new FM2013DecodeError('MISSING_GAME_DB', 'Archive does not contain a game_db.dat database member.');
  }

  if (options.signingKey) {
    const validHmac = await verifyGameDbHmacSha512(gameDbBytes, options.signingKey);
    if (!validHmac) {
      throw new FM2013DecodeError(
        'TAMPERED_CHECKSUM',
        'game_db.dat failed 64-byte HMAC-SHA512 cryptographic checksum verification.'
      );
    }
  }

  const summary = summaryBytes ? parseSaveGameSummary(summaryBytes) : null;
  const humanRowIds = humansBytes ? parseHumansMember(humansBytes) : [];

  options.onProgress?.({ stage: 'parsing_tables', percent: 45 });
  const parsedDb = parseFm2013GameDb(
    gameDbBytes,
    summary?.gameDate ?? null,
    (pct, tableName) => {
      options.onProgress?.({
        stage: 'parsing_tables',
        percent: Math.min(92, 45 + Math.round(pct * 0.47)),
        detail: tableName
      });
    }
  );

  options.onProgress?.({ stage: 'indexing_database', percent: 96 });
  const humans = mergeHumanManagers(
    summary?.humans ?? [],
    humanRowIds,
    rowId => {
      const staff = parsedDb.staffByRowId.get(rowId);
      if (!staff) return null;
      return {
        uid: staff.uid,
        displayName: staff.displayName,
        clubUid: staff.clubUid,
        clubName: staff.clubName
      };
    }
  );

  const summaryBuild = summary?.gameVersion?.trim() || null;
  const compatibility = resolveSaveCompatibility({
    detectedFamily: container.family,
    edition: summaryBuild ? 'FM2013' : null,
    build: summaryBuild
  });

  const build = summaryBuild ?? `game_db-0x${parsedDb.gameDbVersion.toString(16)}`;
  const gameDate = summary?.gameDate ?? parsedDb.headerGameDate;
  const verifiedDomains = compatibility.status === 'verified'
    ? [...compatibility.profile.readableDomains]
    : [];

  options.onProgress?.({ stage: 'indexing_database', percent: 100 });

  const baseDatabase: DecodedSaveDatabase = {
    schemaVersion: DECODED_SAVE_DB_SCHEMA_VERSION,
    source: {
      saveId: sha256,
      fileName,
      fileSize,
      lastModified,
      sha256,
      signature,
      family: container.family,
      compressed: container.compressed,
      edition: 'FM2013',
      build,
      compatibilityStatus: compatibility.status,
      checksumStatus: options.signingKey ? 'verified_hmac_sha512' : 'structural_64b_unverified',
      langDbAttached: Boolean(options.langDb),
      gameDbVersion: parsedDb.gameDbVersion,
      gameDbVersionHex: `0x${parsedDb.gameDbVersion.toString(16)}`,
      gameDbBytes: gameDbBytes.byteLength,
      dbString: summary?.dbString ?? null,
      gameDate,
      memberCount: container.members.length,
      totalArchiveMemberCount: container.allMembers.length,
      decodedAt: new Date().toISOString(),
      adapterVersion: FM2013_OFFLINE_ADAPTER_VERSION,
      writeCapability: false
    },
    counts: parsedDb.counts,
    coverage: {
      verifiedDomains,
      notStoredInSave: [
        'Unedited base-DB localized names for stadiums, competitions, cities, awards, and injuries reside in FM2013 lang_db.dat rather than inside .fm (attach local lang_db.dat to resolve).'
      ],
      notDecoded: [
        'tactics',
        'matches'
      ],
      gameDbExactEof: parsedDb.exactEof
    },
    humans,
    players: parsedDb.players,
    staff: parsedDb.staff,
    clubs: parsedDb.clubs,
    teams: parsedDb.teams,
    stadiums: parsedDb.stadiums,
    nations: parsedDb.nations,
    competitions: parsedDb.competitions
  };

  return options.langDb ? applyLangDbToSaveDatabase(baseDatabase, options.langDb) : baseDatabase;
}
