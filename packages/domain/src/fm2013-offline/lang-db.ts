import { deflateZlib, inflateZlibBounded, readSlice, type BinarySliceSource } from './afe-container';
import { Fm2013BinaryReader } from './binary-reader';
import {
  FM2013DecodeError,
  OBSERVED_FM2013_GAME_DB_VERSIONS,
  type DecodedSaveDatabase
} from './types';

export const MAX_LANG_DB_BYTES = 128 * 1024 * 1024;
const MAX_LANG_BLOCK_DECOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_LANG_RECORDS = 250_000;
const ENGLISH_LANGUAGE_ID = 8;

export interface Fm2013LangDbLookup {
  readonly version: number;
  readonly languageId: number;
  readonly cities: ReadonlyMap<number, string>;
  readonly clubs: ReadonlyMap<number, { readonly fullName: string; readonly shortName: string }>;
  readonly injuries: ReadonlyMap<number, string>;
  readonly nations: ReadonlyMap<number, string>;
  readonly awards: ReadonlyMap<number, string>;
  readonly stadiums: ReadonlyMap<number, string>;
  readonly stageNames: ReadonlyMap<number, string>;
  readonly competitions: ReadonlyMap<number, { readonly fullName: string; readonly shortName: string }>;
  readonly regions: ReadonlyMap<number, string>;
}

function sourceSize(source: BinarySliceSource): number {
  return source instanceof Uint8Array ? source.byteLength : source.size;
}

/**
 * Parse an FM2013 `lang_db.dat` file (`0x163b520` / `0x188e490` in `fm.exe`).
 * Slices only the ~1.9 MB English language stream from the ~39 MB container
 * and verifies exact EOF (`remaining === 0`) across all 15 static string tables.
 */
export async function parseFm2013LangDb(
  input: BinarySliceSource,
  preferredLanguageId = ENGLISH_LANGUAGE_ID
): Promise<Fm2013LangDbLookup> {
  const total = sourceSize(input);
  if (total < 20 || total > MAX_LANG_DB_BYTES) {
    throw new FM2013DecodeError('INVALID_FILE', 'Selected file is not a valid FM2013 lang_db.dat file.');
  }

  const headerProbe = await readSlice(input, 0, Math.min(total, 2060));
  if (
    headerProbe[0] !== 0x02 || headerProbe[1] !== 0x01 ||
    headerProbe[2] !== 0x74 || headerProbe[3] !== 0x61 || headerProbe[4] !== 0x64 || headerProbe[5] !== 0x2e
  ) {
    throw new FM2013DecodeError('INVALID_SIGNATURE', 'lang_db.dat does not start with the SI .dat header.');
  }

  const hr = new Fm2013BinaryReader(headerProbe);
  hr.cursor = 6;
  const version = hr.u16();
  hr.u8(); // flag (0)
  if (!(OBSERVED_FM2013_GAME_DB_VERSIONS as readonly number[]).includes(version)) {
    throw new FM2013DecodeError('UNSUPPORTED_DB_VERSION', `Unsupported lang_db.dat version 0x${version.toString(16)}.`);
  }

  const langCount = hr.u8();
  if (langCount < 1 || langCount > 128 || 10 + langCount * 8 > total) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', 'Invalid language table directory in lang_db.dat.');
  }

  const entries: { readonly langId: number; readonly absStart: number }[] = [];
  for (let i = 0; i < langCount; i++) {
    const langId = hr.u32();
    const relOffset = hr.u32();
    const absStart = 9 + relOffset;
    if (absStart < 10 + langCount * 8 || absStart >= total) {
      throw new FM2013DecodeError('CORRUPT_DATABASE', 'Language block offset is out of bounds in lang_db.dat.');
    }
    entries.push({ langId, absStart });
  }

  let chosenIdx = entries.findIndex(e => e.langId === preferredLanguageId);
  if (chosenIdx < 0) chosenIdx = 0;
  const chosen = entries[chosenIdx]!;
  const blockEnd = chosenIdx + 1 < entries.length ? entries[chosenIdx + 1]!.absStart : total;
  if (blockEnd <= chosen.absStart) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', 'Language block bounds are non-monotonic in lang_db.dat.');
  }

  const compressedBlock = await readSlice(input, chosen.absStart, blockEnd);
  const decompressed = await inflateZlibBounded(compressedBlock, MAX_LANG_BLOCK_DECOMPRESSED_BYTES);
  const r = new Fm2013BinaryReader(decompressed);

  const readCount = (label: string): number => {
    const cnt = r.u32();
    if (cnt > MAX_LANG_RECORDS) {
      throw new FM2013DecodeError('CORRUPT_DATABASE', `Implausible ${label} count (${cnt}) in lang_db.dat.`);
    }
    return cnt;
  };

  // T00: CITY (u32 uid, siStr name, u8, siStr inhabitant, u8)
  const cities = new Map<number, string>();
  const cityCount = readCount('T00_CITY');
  for (let i = 0; i < cityCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    r.siStr();
    r.u8();
    if (name) cities.set(uid, name);
  }

  // T01: CLUB (u32 uid, siStr fullName, u8, siStr shortName, u8, siStr, u8, siStr, u8, siStr)
  const clubs = new Map<number, { readonly fullName: string; readonly shortName: string }>();
  const clubCount = readCount('T01_CLUB');
  for (let i = 0; i < clubCount; i++) {
    const uid = r.u32();
    const fullName = r.siStr();
    r.u8();
    const shortName = r.siStr();
    r.u8();
    r.siStr(); r.u8();
    r.siStr(); r.u8();
    r.siStr();
    if (fullName || shortName) clubs.set(uid, { fullName, shortName: shortName || fullName });
  }

  // T02: CONTINENT
  const contCount = readCount('T02_CONTINENT');
  for (let i = 0; i < contCount; i++) {
    r.u32(); r.siStr(); r.u8(); r.siStr(); r.siStr(); r.siStr(); r.u8(); r.siStr(); r.u8();
    const sub = r.u8();
    for (let j = 0; j < sub; j++) r.siStr();
  }

  // T03: INJURY (u32 uid, siStr name, u8, siStr sentenceName, u8)
  const injuries = new Map<number, string>();
  const injCount = readCount('T03_INJURY');
  for (let i = 0; i < injCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    r.siStr();
    r.u8();
    if (name) injuries.set(uid, name);
  }

  // T04: NATION
  const nations = new Map<number, string>();
  const natCount = readCount('T04_NATION');
  for (let i = 0; i < natCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    r.siStr();
    r.u8();
    r.siStr();
    r.siStr();
    const sub = r.u8();
    for (let j = 0; j < sub; j++) r.siStr();
    if (name) nations.set(uid, name);
  }

  // T05: AWARD (u32 uid, siStr name, u8, siStr shortName, u8)
  const awards = new Map<number, string>();
  const awardCount = readCount('T05_AWARD');
  for (let i = 0; i < awardCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    const short = r.siStr();
    r.u8();
    if (name || short) awards.set(uid, name || short);
  }

  // T06: STADIUM (u32 uid, siStr name, u8)
  const stadiums = new Map<number, string>();
  const stadCount = readCount('T06_STADIUM');
  for (let i = 0; i < stadCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    if (name) stadiums.set(uid, name);
  }

  // T07: STAGE_NAME
  const stageNames = new Map<number, string>();
  const stageCount = readCount('T07_STAGE_NAME');
  for (let i = 0; i < stageCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    r.siStr(); r.u8();
    r.siStr(); r.u8();
    if (name) stageNames.set(uid, name);
  }

  // T08: COMPETITION (u32 uid, siStr fullName, u8, siStr shortName, u8, siStr threeLetter)
  const competitions = new Map<number, { readonly fullName: string; readonly shortName: string }>();
  const compCount = readCount('T08_COMPETITION');
  for (let i = 0; i < compCount; i++) {
    const uid = r.u32();
    const fullName = r.siStr();
    r.u8();
    const shortName = r.siStr();
    r.u8();
    r.siStr();
    if (fullName || shortName) competitions.set(uid, { fullName: fullName || shortName, shortName: shortName || fullName });
  }

  // T09
  const t9Count = readCount('T09');
  for (let i = 0; i < t9Count; i++) {
    r.u32();
    r.siStr();
    const sub = r.u8();
    for (let j = 0; j < sub; j++) r.siStr();
  }

  // T10
  const t10Count = readCount('T10');
  for (let i = 0; i < t10Count; i++) {
    r.u32();
    r.u8();
    const n1 = r.u8();
    for (let j = 0; j < n1; j++) r.siStr();
    r.u8();
    const n2 = r.u8();
    for (let j = 0; j < n2; j++) r.siStr();
  }

  // T11: MEDIA_SOURCE
  const t11Count = readCount('T11_MEDIA');
  for (let i = 0; i < t11Count; i++) {
    r.u32(); r.siStr(); r.u8();
  }

  // T12: REGION
  const regions = new Map<number, string>();
  const regCount = readCount('T12_REGION');
  for (let i = 0; i < regCount; i++) {
    const uid = r.u32();
    const name = r.siStr();
    r.u8();
    r.siStr();
    r.u8();
    if (name) regions.set(uid, name);
  }

  // T13: LOCAL_REGION
  const lregCount = readCount('T13_LOCAL_REGION');
  for (let i = 0; i < lregCount; i++) {
    r.u32(); r.siStr(); r.siStr(); r.siStr(); r.siStr();
    r.u8(); r.u8(); r.u8(); r.u8();
  }

  // T14: AGREEMENT
  const agrCount = readCount('T14_AGREEMENT');
  for (let i = 0; i < agrCount; i++) {
    r.u32(); r.siStr(); r.u8();
  }

  if (r.remaining !== 0) {
    throw new FM2013DecodeError(
      'CORRUPT_DATABASE',
      `lang_db.dat language block did not end cleanly at EOF (${r.remaining} bytes left).`
    );
  }

  return {
    version,
    languageId: chosen.langId,
    cities,
    clubs,
    injuries,
    nations,
    awards,
    stadiums,
    stageNames,
    competitions,
    regions
  };
}

/**
 * Purely enrich a `DecodedSaveDatabase` with static base names resolved from `lang_db.dat`
 * (unedited stadiums, competitions, and city names), keeping inline save names authoritative.
 */
export function applyLangDbToSaveDatabase(
  db: DecodedSaveDatabase,
  langDb: Fm2013LangDbLookup
): DecodedSaveDatabase {
  const stadiums = db.stadiums.map(stadium => {
    const cityName = stadium.cityUid !== null ? (langDb.cities.get(stadium.cityUid) ?? stadium.cityName ?? null) : null;
    if (stadium.nameProvenance === 'decoded_save' && stadium.customName) {
      return cityName !== stadium.cityName ? { ...stadium, cityName } : stadium;
    }
    const baseName = langDb.stadiums.get(stadium.uid) ?? null;
    return {
      ...stadium,
      customName: baseName ?? stadium.customName,
      nameProvenance: baseName ? ('lang_db' as const) : stadium.nameProvenance,
      cityName
    };
  });

  const competitions = db.competitions.map(comp => {
    if (comp.nameProvenance === 'decoded_save' && comp.customName) {
      return comp;
    }
    const resolved = langDb.competitions.get(comp.uid);
    if (!resolved) return comp;
    return {
      ...comp,
      customName: resolved.fullName,
      shortName: resolved.shortName,
      nameProvenance: 'lang_db' as const
    };
  });

  const clubs = db.clubs.map(club => {
    const cityName = club.cityUid !== null ? (langDb.cities.get(club.cityUid) ?? club.cityName ?? null) : null;
    return cityName !== club.cityName ? { ...club, cityName } : club;
  });

  const players = db.players.map(player => {
    const birthCityName = player.birthCityUid !== null
      ? (langDb.cities.get(player.birthCityUid) ?? player.birthCityName ?? null)
      : null;
    return birthCityName !== player.birthCityName ? { ...player, birthCityName } : player;
  });

  return {
    ...db,
    source: {
      ...db.source,
      langDbAttached: true
    },
    stadiums,
    competitions,
    clubs,
    players
  };
}

/** Deterministic synthetic `lang_db.dat` builder for unit and E2E testing. */
export async function buildSyntheticFm2013LangDb(spec: {
  readonly version?: number;
  readonly cities?: ReadonlyArray<readonly [number, string]>;
  readonly stadiums?: ReadonlyArray<readonly [number, string]>;
  readonly competitions?: ReadonlyArray<readonly [number, string, string]>;
} = {}): Promise<Uint8Array> {
  const version = spec.version ?? 0x774;
  const cities = spec.cities ?? [[500, 'Northbridge'], [501, 'Harborport']];
  const stadiums = spec.stadiums ?? [[8000, 'Northbridge Road'], [8001, 'Harbor Arena']];
  const comps = spec.competitions ?? [[7001, 'Premier Synthetic Division', 'PSD']];

  const chunks: Uint8Array[] = [];
  let total = 0;
  const push = (b: Uint8Array) => { chunks.push(b); total += b.byteLength; };
  const u8 = (v: number) => push(Uint8Array.of(v & 0xff));
  const u32 = (v: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v >>> 0, true);
    push(b);
  };
  const s = (text: string) => {
    if (!text) { u32(0); return; }
    u32(text.length);
    const b = new Uint8Array(text.length * 2 + 2);
    const dv = new DataView(b.buffer);
    for (let i = 0; i < text.length; i++) dv.setUint16(i * 2, text.charCodeAt(i), true);
    dv.setUint16(text.length * 2, 0, true);
    push(b);
  };

  // T00 CITY
  u32(cities.length);
  for (const [uid, name] of cities) { u32(uid); s(name); u8(0); s(''); u8(0); }
  // T01..T05 empty
  u32(0); u32(0); u32(0); u32(0); u32(0);
  // T06 STADIUM
  u32(stadiums.length);
  for (const [uid, name] of stadiums) { u32(uid); s(name); u8(0); }
  // T07 empty
  u32(0);
  // T08 COMPETITION
  u32(comps.length);
  for (const [uid, full, short] of comps) { u32(uid); s(full); u8(0); s(short); u8(0); s(''); }
  // T09..T14 empty
  for (let i = 0; i < 6; i++) u32(0);

  const rawBlock = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { rawBlock.set(c, pos); pos += c.byteLength; }
  const compressedBlock = await deflateZlib(rawBlock);

  const out = new Uint8Array(18 + compressedBlock.byteLength);
  out.set([0x02, 0x01, 0x74, 0x61, 0x64, 0x2e], 0);
  const dv = new DataView(out.buffer);
  dv.setUint16(6, version, true);
  out[8] = 0;
  out[9] = 1; // 1 language
  dv.setUint32(10, ENGLISH_LANGUAGE_ID, true);
  dv.setUint32(14, 9, true); // 9 + 9 = 18
  out.set(compressedBlock, 18);
  return out;
}
