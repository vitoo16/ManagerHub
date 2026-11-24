import type { AttributeKey } from '../player-import';
import { calculateCalendarAge } from '../fm2013-calendar-age';
import { Fm2013BinaryReader, siDateToIso } from './binary-reader';
import {
  FM2013DecodeError,
  FM2013_MAX_GAME_DB_VERSION,
  FM2013_MIN_GAME_DB_VERSION,
  type DecodedPlayerContract,
  type DecodedPositionRatings,
  type DecodedSaveClub,
  type DecodedSaveCompetition,
  type DecodedSaveEntityCounts,
  type DecodedSaveNation,
  type DecodedSavePlayer,
  type DecodedSaveStaff,
  type DecodedSaveStadium,
  type DecodedSaveTeam
} from './types';

const MAX_RECORDS_PER_TABLE = 2_000_000;

/** Scale FM2013 1–100 raw attribute byte to 1–20 display rating (4,058/4,058 verified exact). */
function scaleAttr(rawByte: number): number {
  const scaled = Math.floor((rawByte + 2) / 5);
  return scaled < 1 ? 1 : scaled > 20 ? 20 : scaled;
}

function clampPosition(rawByte: number): number {
  return rawByte < 1 ? 1 : rawByte > 20 ? 20 : rawByte;
}

/** Format a Football Manager position string compatible with ManagerHub's Squad Optimizer. */
export function formatPositionSummary(pos: DecodedPositionRatings): string {
  if (pos.GK >= 15) return 'GK';
  const tokens: string[] = [];
  const pushGroup = (prefix: string, left: number, center: number, right: number) => {
    const sides: string[] = [];
    if (right >= 15) sides.push('R');
    if (left >= 15) sides.push('L');
    if (center >= 15) sides.push('C');
    if (sides.length > 0) tokens.push(`${prefix} (${sides.join('')})`);
  };
  if (pos.SW >= 15) tokens.push('SW');
  pushGroup('D', pos.DL, pos.DC, pos.DR);
  pushGroup('WB', pos.WBL, 0, pos.WBR);
  if (pos.DM >= 15) tokens.push('DM');
  pushGroup('M', pos.ML, pos.MC, pos.MR);
  pushGroup('AM', pos.AML, pos.AMC, pos.AMR);
  if (pos.ST >= 15) tokens.push('ST (C)');

  if (tokens.length > 0) return tokens.join(', ');

  // Fallback to single highest positional rating if no slot reached >= 15.
  const ranked: readonly [string, number][] = [
    ['GK', pos.GK], ['D (C)', pos.DC], ['D (L)', pos.DL], ['D (R)', pos.DR],
    ['WB (L)', pos.WBL], ['WB (R)', pos.WBR], ['DM', pos.DM], ['M (C)', pos.MC],
    ['M (L)', pos.ML], ['M (R)', pos.MR], ['AM (C)', pos.AMC], ['AM (L)', pos.AML],
    ['AM (R)', pos.AMR], ['ST (C)', pos.ST], ['SW', pos.SW]
  ];
  let best = ranked[0]!;
  for (const candidate of ranked) {
    if (candidate[1] > best[1]) best = candidate;
  }
  return best[0];
}

// --- SIOS Generic Variant / Property Helpers ---

function skipVariantValue(r: Fm2013BinaryReader): void {
  const tag = r.u8();
  if (tag === 0x11 || tag === 0x13) { r.u8(); return; }
  if (tag === 0x12 || tag === 0x14) { r.i16(); return; }
  if (tag === 0x15) { r.i32(); return; }
  switch (tag) {
    case 0: return;
    case 1: r.i32(); return;
    case 2: r.u32(); return;
    case 3: r.u8(); return;
    case 4: r.u32(); return;
    case 5: r.skip(8); return;
    case 6: r.siStr(); return;
    case 7: r.i32(); return;
    case 8: r.skip(4); return;
    case 9: r.skip(8); return;
    case 10: skipVariantMap(r); return;
    case 11:
    case 12: skipVariantList(r); return;
    case 13: r.date5(); return;
    case 14: r.siStr(); return;
    case 15: r.skip(8); return;
    case 16: {
      const len = r.u32();
      r.skip(len);
      return;
    }
    case 22: r.skip(8); return;
    default:
      throw new FM2013DecodeError('CORRUPT_DATABASE', `Unknown SIOS variant tag ${tag} at offset ${r.cursor - 1}.`);
  }
}

function skipVariantList(r: Fm2013BinaryReader): void {
  const count = r.i32();
  if (count < 0 || count > 200_000) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', `Invalid variant list count ${count} at offset ${r.cursor - 4}.`);
  }
  for (let i = 0; i < count; i++) skipVariantValue(r);
}

function skipVariantMap(r: Fm2013BinaryReader): void {
  const count = r.i32();
  if (count < 0 || count > 200_000) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', `Invalid variant map count ${count} at offset ${r.cursor - 4}.`);
  }
  for (let i = 0; i < count; i++) {
    r.u32();
    skipVariantValue(r);
  }
}

function skip1871120(r: Fm2013BinaryReader): void {
  const iters = r.ver >= 0x732 ? 26 : 25;
  for (let i = 0; i < iters; i++) {
    const f0 = r.u8();
    r.u8();
    if (f0 !== 0) { r.i32(); r.i32(); }
    else { r.i32(); }
  }
}

function skipRefI32Save(r: Fm2013BinaryReader): void {
  if (r.i32() === -2) r.i32();
}

function skipRefI16Save(r: Fm2013BinaryReader): void {
  if (r.i16() === -2) r.i32();
}

function skipRefTeamSave(r: Fm2013BinaryReader): void {
  const mode = r.u8();
  if (mode === 2) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', `Unsupported team reference mode 2 at offset ${r.cursor - 1}.`);
  }
  const value = r.i32();
  if (value !== -1 && mode === 1) r.i32();
}

function skip186de10(r: Fm2013BinaryReader, flag: boolean): void {
  r.skip(88); r.u8(); r.u8(); r.date4(); r.date4();
  if (flag) {
    const cnt = r.i16();
    if (cnt > 0) r.skip(cnt * 2);
  }
  const n = r.i8();
  for (let i = 0; i < n; i++) {
    r.date4(); r.i32(); r.u8(); r.u8();
    if (r.ver >= 0x762) r.u8();
  }
}

function skip16c0f30(r: Fm2013BinaryReader): void {
  r.u8();
  const m = r.i16();
  for (let i = 0; i < m; i++) {
    const v = r.i8();
    r.skip(13); r.date4(); r.i32();
    if (v >= 3) r.u8();
  }
}

function skip1b61d00(r: Fm2013BinaryReader): void {
  r.i32(); r.i16(); r.i32(); r.i32(); r.i32();
  if (r.ver >= 0x740) r.i32();
  r.i32(); r.i32(); r.i32(); r.i32(); r.u8();
}

function skip161a4e0(r: Fm2013BinaryReader): void {
  const v = r.i32();
  if (((v >>> 23) & 1) !== 0) skipVariantValue(r);
}

// --- Finance & Club Helpers ---

interface ParsedClubFinance {
  readonly financeType: 'basic' | 'full' | 'none';
  readonly balanceGbp: number | null;
  readonly transferBudgetGbp: number | null;
  readonly transferBudgetSeasonGbp: number | null;
  readonly weeklyWageBillGbp: number | null;
  readonly weeklyWageBudgetGbp: number | null;
}

function parseFinanceBasic(r: Fm2013BinaryReader): number {
  const balance = r.i32();
  r.skip(4); r.date4(); r.date4(); r.date4();
  if (r.ver >= 0x768) r.u8();
  if (r.ver < 0x748) { r.i32(); r.date4(); }
  r.i32(); r.skip(2); r.i32(); r.i32(); r.skip(5 * 4); r.i32();
  return balance;
}

function parseFinanceFull(r: Fm2013BinaryReader): ParsedClubFinance {
  const transferBudgetGbp = r.i32();
  const transferBudgetSeasonGbp = r.i32();
  r.skip(21 * 4);
  if (r.ver < 0x748) r.u8();
  r.u8();
  r.i32();
  const weeklyWageBillGbp = r.i32();
  r.skip(3 * 4);
  if (r.ver >= 0x748) { r.i32(); r.u8(); }
  r.skip(4 * 4);
  const weeklyWageBudgetGbp = r.i32();
  r.skip(4 * 33 * 4); r.skip(4 * 4); r.skip(2);
  r.i32(); r.skip(8); r.skip(5); r.i32(); r.skip(3); r.date4(); r.date4();
  const n1 = r.i8();
  if (n1 > 0) r.skip(n1 * 33 * 4);
  const n2 = r.i8();
  if (n2 > 0) r.skip(n2 * 5 * 4);
  r.date4(); r.u8(); r.skip(13 * 4);
  if (r.ver < 0x770) r.u8();
  r.date4(); r.i32();
  if (r.ver >= 0x735) r.i32();
  if (r.ver >= 0x770) r.i32();
  const balanceGbp = parseFinanceBasic(r);
  return {
    financeType: 'full',
    balanceGbp,
    transferBudgetGbp,
    transferBudgetSeasonGbp,
    weeklyWageBillGbp,
    weeklyWageBudgetGbp
  };
}

function skipClubInfoItem(r: Fm2013BinaryReader, tag: number): void {
  switch (tag) {
    case 0: case 2: case 13: case 14: case 18: case 19: case 20: case 21:
      r.u8(); r.i32(); return;
    case 1: case 17: case 27: case 32:
      r.u8(); return;
    case 3: case 31:
      r.skip(8); r.date4(); return;
    case 4:
      r.skip(16); r.date4(); return;
    case 5: r.skip(24); return;
    case 6: r.skip(19); return;
    case 7: r.skip(16); return;
    case 8: case 16: {
      const n = r.i8();
      if (n > 0) r.skip(n * 4);
      return;
    }
    case 9:
      r.skip(8); r.i16(); r.skip(8); r.i16();
      r.siStr(); r.siStr(); r.siStr(); r.siStr();
      return;
    case 10: r.i32(); r.date4(); r.i32(); r.skip(2); return;
    case 12: r.skip(16); return;
    case 15: r.i32(); r.u8(); return;
    case 22: {
      const rc = r.i32();
      for (let i = 0; i < rc; i++) {
        r.i16();
        const rt = r.u8();
        if (rt === 0x66) { r.u8(); r.u32(); r.i32(); r.i32(); }
        else if (rt === 0x65) { r.u8(); skipVariantMap(r); r.i32(); }
        else { r.i32(); }
      }
      const b1 = r.u8();
      const ver22 = b1 === 0xff ? r.u8() : 1;
      if (ver22 >= 2) r.i32();
      const nv = r.i8();
      if (nv > 0) r.skip(nv * 4);
      if (r.u8() !== 0) {
        const nw = r.i32();
        if (nw > 0) r.skip(nw * 4);
      }
      r.u8(); r.u8(); r.date5(); r.i32();
      return;
    }
    case 23: r.i32(); r.i16(); return;
    case 24: r.i32(); r.date4(); r.u8(); return;
    case 25: case 26: case 29: r.i32(); return;
    case 28: {
      const n = r.i32();
      if (n > 0) r.skip(n * 4);
      r.u8();
      return;
    }
    case 30: {
      const n = r.i16();
      if (n > 0) r.skip(n * 5);
      return;
    }
    case 33: return;
    default:
      throw new FM2013DecodeError('CORRUPT_DATABASE', `Unknown CLUB_INFO tag ${tag} at offset ${r.cursor - 1}.`);
  }
}

function parseClubBase(r: Fm2013BinaryReader): {
  fullName: string; shortName: string; sixLetterName: string;
  rowId: number; uid: number; dbId: number;
} {
  r.skip(4);
  const fullName = r.siStr();
  const shortName = r.siStr();
  const sixLetterName = r.siStr();
  const nKits = r.i8();
  if (nKits > 0) r.skip(nKits * 25);
  r.u16();
  for (let i = 0; i < 4; i++) {
    const n = r.i8();
    if (n > 0) r.skip(n * 4);
  }
  let n = r.i8();
  if (n > 0) r.skip(n * 9);
  n = r.i16();
  if (n > 0) r.skip(n * 27);
  n = r.i16();
  if (n > 0) r.skip(n * 18);
  n = r.i8();
  if (n > 0) r.skip(n * 6);
  r.skip(17 + 12);
  const nInfo = r.i16();
  for (let i = 0; i < nInfo; i++) skipClubInfoItem(r, r.u8());
  if (r.u8() !== 0) skip1871120(r);
  const rec = r.dbRecord();
  return { fullName, shortName, sixLetterName, ...rec };
}

// --- Contract, Person, and Human Sub-Parsers ---

interface RawContractRecord {
  readonly ctag: number;
  readonly weeklyWageGbp: number | null;
  readonly expiresAt: string | null;
  readonly joinedAt: string | null;
  readonly teamRowId: number | null;
  readonly jobType: number;
  readonly squadNumber: number | null;
}

function parseContractBase(r: Fm2013BinaryReader, ctag: number): RawContractRecord {
  const wage = r.i32();
  r.i32();
  if (r.ver >= 0x753) r.i32();
  const exp = r.date4();
  r.date4();
  r.skip(3);
  const nc = r.i32();
  if (nc > 0) r.skip(nc * 22);
  r.u8();
  const join = r.date4();
  const b0 = r.u8(); const b1 = r.u8(); const squadByte = r.u8();
  void b0; void b1;
  r.skip(3);
  if (r.ver >= 0x75b) r.u16();
  else r.u8();
  r.i16();
  // BASIC_CONTRACT tail
  r.i32(); // personRowId
  const teamRowId = r.i32();
  const jobType = r.u8();
  r.u8();
  return {
    ctag,
    weeklyWageGbp: wage >= 0 ? wage : null,
    expiresAt: siDateToIso(exp.dayOfYear, exp.year),
    joinedAt: siDateToIso(join.dayOfYear, join.year),
    teamRowId: teamRowId >= 0 ? teamRowId : null,
    jobType,
    squadNumber: squadByte >= 1 && squadByte <= 99 ? squadByte : null
  };
}

function parseContractObj(r: Fm2013BinaryReader, ctag: number): RawContractRecord | null {
  if (ctag === 0) {
    r.skip(2); r.i16(); r.i32(); r.i32(); r.skip(2);
    const n1 = r.i8();
    if (n1 > 0) r.skip(n1 * 6);
    const n2 = r.i8();
    if (n2 > 0) r.skip(n2 * 5);
    r.u8();
    return parseContractBase(r, ctag);
  }
  if (ctag === 1) {
    r.i16(); r.i32(); r.u8(); r.u16(); r.u8(); r.u32(); r.i32();
    return parseContractBase(r, ctag);
  }
  if (ctag === 2 || ctag === 3 || ctag === 6) {
    return parseContractBase(r, ctag);
  }
  if (ctag === 7) {
    r.i32();
    const teamRowId = r.i32();
    const jobType = r.u8();
    r.u8();
    return {
      ctag,
      weeklyWageGbp: null,
      expiresAt: null,
      joinedAt: null,
      teamRowId: teamRowId >= 0 ? teamRowId : null,
      jobType,
      squadNumber: null
    };
  }
  return null;
}

function skip183b0f0(r: Fm2013BinaryReader): void {
  const ct = r.u8();
  r.skip(2); r.i32(); r.i32();
  if (ct !== 7) {
    parseContractObj(r, ct);
    r.u8(); r.i32(); r.u8(); r.date4(); r.i16();
    if (r.u8() !== 0) {
      r.skip(16);
      const m = r.i16();
      if (m > 0) r.skip(m * 8);
    }
  }
  r.i32();
}

interface RawPersonJob {
  readonly intCaps: number;
  readonly intGoals: number;
  readonly currentTeamRowId: number;
  readonly contracts: readonly RawContractRecord[];
}

function parsePersonJob(r: Fm2013BinaryReader): RawPersonJob {
  r.i16();
  r.i32();
  const intCaps = r.u8();
  const intGoals = r.u8();
  r.skip(2);
  r.i32(); r.date4();
  const currentTeamRowId = r.i32();
  r.date4(); r.u8();
  const n = r.u8();
  if (n > 0) r.skip(n * 4);
  r.i32(); r.i32();
  const nc = r.i8();
  const contracts: RawContractRecord[] = [];
  for (let i = 0; i < nc; i++) {
    const ct = r.u8();
    const rec = parseContractObj(r, ct);
    if (rec) contracts.push(rec);
  }
  const n2 = r.i8();
  for (let i = 0; i < n2; i++) skip183b0f0(r);
  const n3 = r.i8();
  if (n3 > 0) r.skip(n3 * 5);
  const n4 = r.i32();
  if (n4 > 0) r.skip(n4 * 11);
  if (r.u8() !== 0) {
    r.skip(8);
    if (r.ver < 0x74a) r.skip(2);
    r.skip(2);
  }
  const n5 = r.i16();
  if (n5 > 0) r.skip(n5 * 4);
  r.i16(); r.date4(); r.u8(); r.date4(); r.date4();
  r.i32(); r.i32(); r.date4(); r.u8(); r.date4();
  if (r.ver >= 0x73a) r.skip(8);
  return { intCaps, intGoals, currentTeamRowId, contracts };
}

function skipIntlBase(r: Fm2013BinaryReader): void {
  r.i16(); r.date4(); r.u8(); r.date4(); r.i32(); r.date4(); r.i32();
}

function skipIntlPlayer(r: Fm2013BinaryReader): void {
  const ver = r.i16();
  r.u8();
  if (ver >= 0x13) {
    const n = r.i32();
    for (let i = 0; i < n; i++) {
      r.i16(); r.u8(); r.i32(); r.u8();
      skip161a4e0(r); skip161a4e0(r);
      r.date4(); r.date4();
    }
  } else {
    r.u8(); r.date4(); r.i32();
  }
  let n = r.i8();
  for (let i = 0; i < n; i++) skipRefI16Save(r);
  n = r.i32();
  if (n > 0) r.skip(n * 7);
  skipRefI16Save(r);
  n = r.i8();
  if (n > 0) r.skip(n);
  r.date4(); r.i16(); r.u8();
  if (ver < 0x14) r.u8();
  else r.date4();
  r.date4(); r.date4(); r.skip(4); r.i32();
  if (ver >= 0x11) {
    r.i32(); r.date4(); r.date4(); r.skip(3);
    if (ver >= 0x12) r.i32();
    else r.u8();
    if (ver >= 0x15) r.u8();
    r.i32(); r.date4(); r.u8();
  }
  skipIntlBase(r);
}

interface RawPlayerBody {
  readonly homeRep: number;
  readonly currentRep: number;
  readonly worldRep: number;
  readonly actualCa: number;
  readonly potentialAbility: number;
  readonly playingDataRowId: number;
  readonly marketValueGbp: number;
  readonly morale: number;
  readonly weightKg: number;
  readonly heightCm: number;
}

function parseActualPlayerBody(r: Fm2013BinaryReader): RawPlayerBody {
  const homeRep = r.i16();
  const currentRep = r.i16();
  const worldRep = r.i16();
  const actualCa = r.i16();
  const potentialAbility = r.i16();
  const playingDataRowId = r.i32();
  const marketValueGbp = r.i32();
  const morale = r.u8();
  r.date4();
  r.skip(5 * 2);
  r.u8();
  const weightKg = r.i16();
  const heightCm = r.i16();
  r.skip(8); r.u8();
  let n = r.i32();
  if (n > 0) r.skip(n);
  r.i32();
  r.skip(9);
  let m = r.i8();
  if (m > 0) r.skip(m * 12);
  m = r.i32();
  if (m > 0) r.skip(m * 8);
  r.u8(); r.i16(); r.i16(); r.u8();
  r.skip(21);
  r.u8(); r.i32(); r.u8(); r.i32(); r.u8(); r.i32(); r.i32(); r.u8();
  if (r.ver >= 0x73f) r.u8();
  r.date4(); r.date4(); r.date4(); r.date4();
  r.siStr();
  if (r.u8() !== 0) {
    r.i16(); r.u8(); r.date4(); r.u8(); r.date4(); r.u8();
  }
  r.i32();
  if (r.ver < 0x73a) r.skip(8);
  r.i32(); r.date4(); r.i32();
  if (r.u8() !== 0) r.skip(18);
  if (r.u8() !== 0) {
    m = r.i8();
    if (m > 0) r.skip(m * 44);
    m = r.i8();
    for (let i = 0; i < m; i++) {
      r.skip(21);
      if (r.u8() !== 0) r.skip(23);
    }
    if (r.u8() !== 0) {
      r.i32();
      if (r.ver >= 0x75c) r.i32();
      r.skip(16);
      if (r.ver >= 0x750) r.skip(3);
      if (r.ver >= 0x746) r.u8();
      r.date4();
    }
    if (r.u8() !== 0) {
      r.i32();
      if (r.ver >= 0x75d) r.i32();
      r.i32(); r.i32(); r.skip(2); r.skip(12); r.u8(); r.skip(4); r.skip(24); r.skip(2); r.i32();
    }
    if (r.u8() !== 0) { r.i32(); skipRefI32Save(r); r.date4(); }
    if (r.u8() !== 0) { r.i32(); skipRefI32Save(r); skipRefI32Save(r); r.date4(); }
  }
  if (r.u8() !== 0) {
    r.u8(); r.i32(); r.date4();
    if (r.ver >= 0x76a) r.date4();
    r.u8();
    if (r.ver < 0x75f) r.u8();
    r.u8(); r.i32(); r.u16(); r.i16(); r.skip(6); r.date4();
    if (r.ver >= 0x74d) r.u8();
  }
  if (r.u8() !== 0) skipIntlPlayer(r);
  m = r.i8();
  for (let i = 0; i < m; i++) {
    const bt = r.u8();
    if (bt === 0xff) continue;
    if (bt === 0) r.skip(4);
    else if (bt >= 1 && bt <= 4) r.skip(6);
    else throw new FM2013DecodeError('CORRUPT_DATABASE', `Unknown player sub-tag ${bt} at offset ${r.cursor - 1}.`);
  }
  if (r.u8() !== 0) {
    m = r.i32();
    for (let i = 0; i < m; i++) {
      r.i32();
      const k = r.i32();
      for (let j = 0; j < k; j++) {
        r.date4(); r.i32(); r.i32(); r.u8();
        if (r.u8() !== 0) r.skip(32);
      }
    }
    if (r.u8() !== 0) {
      m = r.i32();
      for (let i = 0; i < m; i++) {
        r.skip(0x2f + 9); r.i16();
        if (r.u8() !== 0) r.skip(18);
      }
    }
    if (r.u8() !== 0) {
      m = r.i16();
      for (let i = 0; i < m; i++) {
        r.date4(); skipRefTeamSave(r);
        if (r.ver >= 0x767) skipRefTeamSave(r);
        r.i32(); r.skip(2);
        const k = r.i32();
        if (k > 0) r.skip(k * 10);
      }
    }
  }
  r.i32(); r.i32();
  r.date4(); r.date4(); r.i32(); r.u8(); r.i32(); r.u8(); r.i32(); r.skip(2); r.i16(); r.skip(2);
  return {
    homeRep, currentRep, worldRep, actualCa, potentialAbility,
    playingDataRowId, marketValueGbp, morale, weightKg, heightCm
  };
}

interface RawNonPlayerBody {
  readonly homeRep: number;
  readonly currentRep: number;
  readonly worldRep: number;
  readonly staffCa: number;
  readonly staffPa: number;
  readonly nonPlayingDataRowId: number;
}

function parseActualNonPlayerBody(r: Fm2013BinaryReader): RawNonPlayerBody {
  const homeRep = r.i16();
  const currentRep = r.i16();
  const worldRep = r.i16();
  const staffCa = r.i16();
  const staffPa = r.i16();
  r.skip(4);
  const nonPlayingDataRowId = r.i32();
  r.i32();
  if (r.ver >= 0x74c) r.i32();
  r.i32(); r.u32(); r.date4(); r.u8();
  if (r.ver >= 0x742) r.u8();
  r.date4(); r.date4();
  if (r.u8() !== 0) skip16c0f30(r);
  if (r.u8() !== 0) {
    const m = r.i8();
    if (m > 0) r.skip(m * 2);
  }
  if (r.u8() !== 0) skipIntlBase(r);
  return { homeRep, currentRep, worldRep, staffCa, staffPa, nonPlayingDataRowId };
}

interface RawActualPerson {
  readonly firstNameRowId: number;
  readonly secondNameRowId: number;
  readonly commonNameRowId: number;
  readonly fullName: string;
  readonly birthDate: string | null;
  readonly primaryNationRowId: number;
  readonly personDataRowId: number;
  readonly birthCityRowId: number;
}

function parseActualPerson(r: Fm2013BinaryReader): RawActualPerson {
  const firstNameRowId = r.i32();
  const secondNameRowId = r.i32();
  const commonNameRowId = r.i32();
  const fullName = r.siStr();
  const dob = r.date4();
  r.skip(3);
  const primaryNationRowId = r.i32();
  const personDataRowId = r.i32();
  const birthCityRowId = r.i32();
  if (r.u8() !== 0) {
    let m = r.i8();
    if (m > 0) r.skip(m * 9);
    m = r.i32();
    if (m > 0) r.skip(m * 9);
    r.skip(3);
    m = r.i8();
    for (let i = 0; i < m; i++) {
      r.u8(); r.i16();
      if (r.ver >= 0x739) r.u8();
      r.i32();
    }
  }
  const nl = r.i8();
  for (let i = 0; i < nl; i++) { r.siStr(); r.i32(); }
  r.date4(); r.u8();
  return {
    firstNameRowId,
    secondNameRowId,
    commonNameRowId,
    fullName,
    birthDate: siDateToIso(dob.dayOfYear, dob.year),
    primaryNationRowId,
    personDataRowId,
    birthCityRowId
  };
}

function skip17efdf0(r: Fm2013BinaryReader): void {
  r.u8();
  if (r.ver >= 0x764) r.u8();
  if (r.ver < 0x73d) r.u8();
  r.skip(13);
  if (r.ver < 0x76c) r.skip(8);
  r.skip(3);
  if (r.ver >= 0x741) { r.u8(); r.skip(24); }
  for (let i = 0; i < 6; i++) {
    r.i32(); r.skip(2);
    if (r.ver >= 0x73d) r.u8();
    r.skip(4);
  }
}

function skip177b250(r: Fm2013BinaryReader): void {
  const n = r.i32();
  for (let i = 0; i < n; i++) {
    const v = r.i32();
    r.i32(); r.i32(); r.u8(); r.i32();
    if (v >= 2) { r.u32(); r.skip(8); r.i32(); r.u8(); }
  }
}

function skip177eec0(r: Fm2013BinaryReader): void {
  const ver = r.i16();
  r.u8(); r.i32(); r.u8(); r.u8(); r.i32(); r.date4(); r.i32(); r.u8();
  r.i32(); r.i32(); r.u8(); r.u8(); r.u8(); r.i16();
  r.i32(); r.i32(); r.i32(); r.i32();
  r.skip(10 * 4);
  r.skip(2); r.i32(); r.skip(3); r.skip(4); r.skip(2); r.i16();
  r.skip(5 * 3);
  r.skip(4 * 4); r.i16(); r.skip(4 * 4); r.u8(); r.skip(2 * 4); r.skip(3); r.i32();
  if (ver >= 0x1a) r.u8();
  r.u8(); r.i32(); r.i32(); r.u8(); r.u8(); r.i16(); r.i32(); r.skip(2);
  r.skip(4 * 5);
  r.i32(); r.i32();
  if (ver < 0x19) r.u8();
  r.skip(2);
  if (ver >= 0x17) r.u8();
  r.u8(); r.skip(16);
  if (ver >= 0x16) r.u8();
  if (ver >= 0x1b) r.i16();
  if (ver < 0x19) {
    skip177b250(r);
  } else {
    const n = r.i32();
    for (let i = 0; i < n; i++) {
      r.i32(); r.u32(); r.i32(); r.u8();
      skip177b250(r);
    }
  }
  if (ver >= 0x18) skip177b250(r);
}

function skipBookmarkFolder(r: Fm2013BinaryReader): void {
  skipVariantMap(r);
  const n1 = r.i32();
  for (let i = 0; i < n1; i++) skipVariantMap(r);
  const n2 = r.i32();
  for (let i = 0; i < n2; i++) skipBookmarkFolder(r);
}

function skip187dd00(r: Fm2013BinaryReader): void {
  const v = r.i32();
  r.i32(); r.u8(); r.u32(); r.i32();
  const n1 = r.i32();
  if (n1 > 0) throw new FM2013DecodeError('CORRUPT_DATABASE', `Unsupported human sub-list n1=${n1} at offset ${r.cursor}.`);
  const n2 = r.i32();
  if (n2 > 0) r.skip(n2 * 4);
  if (v >= 2) {
    r.u8(); r.skip(8); r.i32();
    const n3 = r.i32();
    if (n3 > 0) throw new FM2013DecodeError('CORRUPT_DATABASE', `Unsupported human sub-list n3=${n3} at offset ${r.cursor}.`);
    if (v >= 4) {
      r.u32();
      const n4 = r.i32();
      if (n4 > 0) r.skip(n4 * 12);
    } else {
      const n4 = r.i32();
      if (n4 > 0) r.skip(n4 * 8);
    }
  }
}

function parseHumanNonPlayer(r: Fm2013BinaryReader): {
  readonly nonPlayer: RawNonPlayerBody;
  readonly job: RawPersonJob;
  readonly person: RawActualPerson;
  readonly rowId: number;
  readonly uid: number;
} {
  r.u8(); r.u8(); r.i32();
  if (r.ver >= 0x75a) r.i32();
  r.skip(6); r.date4(); r.i32(); r.skip(2); r.siStr();
  skip17efdf0(r); skip17efdf0(r);
  r.u8(); r.skip(8); r.skip(5);
  if (r.ver < 0x744) r.u8();
  r.i16();
  let n = r.u8();
  if (n > 0) r.skip(n * 8);
  r.skip(16 * 8); // 16 * (i32 + i32)
  r.u8();
  if (r.ver < 0x752) r.skip(7);
  r.u8();
  if (r.ver < 0x752) r.skip(8);
  n = r.i8();
  for (let i = 0; i < n; i++) skipVariantMap(r);
  n = r.u16();
  for (let i = 0; i < n; i++) skip177eec0(r);
  n = r.u16();
  for (let i = 0; i < n; i++) skip177eec0(r);
  r.i32(); r.i16(); r.i16(); r.date4(); r.i32();
  n = r.i16();
  if (n > 0) r.skip(n * 16);
  n = r.i16();
  if (n > 0) r.skip(n * 16);
  n = r.i16();
  if (n > 0) r.skip(n * 8);
  r.date4(); r.date4(); r.date4();
  if (r.ver >= 0x751) r.skip(12);
  n = r.i32();
  for (let i = 0; i < n; i++) {
    const v = r.i32();
    if (v >= 2) skip161a4e0(r);
    else r.skip(8);
    const m = r.i32();
    if (m > 0) r.skip(m * 4);
    if (v >= 5) r.u32();
    if (v >= 3) r.u8();
    if (v >= 4) r.u8();
    if (v >= 6) r.u8();
  }
  n = r.i32();
  for (let i = 0; i < n; i++) {
    const v = r.i32();
    r.u8(); skip161a4e0(r); r.u32(); r.i16(); r.u8(); r.date4();
    if (v >= 2) r.i16();
  }
  r.i32();
  n = r.i32();
  for (let i = 0; i < n; i++) skip187dd00(r);
  if (r.ver >= 0x749) {
    r.i32(); n = r.i32(); if (n > 0) r.skip(n * 30);
    r.i32(); n = r.i32(); if (n > 0) r.skip(n * 29);
    r.i32(); n = r.i32(); if (n > 0) r.skip(n * 29);
  }
  n = r.i32();
  for (let i = 0; i < n; i++) {
    r.i32(); r.date4(); r.date4(); r.date4(); r.skip(2);
    if (r.ver >= 0x754) r.u8();
  }
  r.skip(24); r.date4(); r.u8();
  r.siStr(); r.siStr(); r.u8(); r.siStr(); r.siStr(); r.siStr();
  if (r.i16() !== 0) skipBookmarkFolder(r);
  if (r.u8() !== 0) skipVariantMap(r);
  if (r.ver >= 0x73e) r.u32();
  if (r.ver >= 0x763) r.u32();
  if (r.ver >= 0x76e) r.u32();
  if (r.ver >= 0x755) r.u8();
  if (r.ver >= 0x759) {
    n = r.i32();
    if (n > 0) r.skip(n * 2);
  }
  if (r.ver >= 0x75e) r.skip(8);
  if (r.ver >= 0x769) r.date4();
  const nonPlayer = parseActualNonPlayerBody(r);
  const job = parsePersonJob(r);
  const person = parseActualPerson(r);
  r.u32(); // person_base flags
  const rec = r.dbRecord();
  return { nonPlayer, job, person, rowId: rec.rowId, uid: rec.uid };
}

function skip1884510(r: Fm2013BinaryReader): void {
  r.siStr(); r.siStr(); r.siStr(); r.i16(); r.u8();
  if (r.ver >= 0x737) r.u16();
  r.i32(); r.i32(); r.skip(4); r.skip(8); r.skip(3); r.i32();
  if (r.ver >= 0x760) r.i32();
}

function skip17e6250(r: Fm2013BinaryReader): void {
  const ver = r.u8();
  for (let i = 0; i < 2; i++) {
    const n = r.i32();
    if (n > 0) r.skip(n * 48);
  }
  r.skip(2 + 4 + 4 + 8 + 8 + 4 + 4 + 2 + 56 + 4);
  for (let i = 0; i < 2; i++) {
    const n = r.i32();
    if (n > 0) r.skip(n * 18);
  }
  if (ver >= 8) r.skip(12);
  r.skip(8);
}

// --- Internal Unresolved Records (linked after all 51 tables finish) ---

interface RawClub {
  readonly rowId: number;
  readonly uid: number;
  readonly fullName: string;
  readonly shortName: string;
  readonly sixLetterName: string;
  readonly nickname: string;
  readonly nationRowId: number;
  readonly cityRowId: number;
  readonly yearFounded: number | null;
  readonly trainingFacilities: number | null;
  readonly youthFacilities: number | null;
  readonly youthCoaching: number | null;
  readonly youthRecruitment: number | null;
  readonly professionalStatus: number | null;
  readonly finance: ParsedClubFinance;
}

interface RawTeam {
  readonly rowId: number;
  readonly uid: number;
  readonly isNationalTeam: boolean;
  readonly ownerClubRowId: number;
  readonly teamType: number;
  readonly reputation: number;
  readonly compRowId: number;
  readonly stadiumRowId: number;
  readonly managerPersonRowId: number;
}

interface RawStadium {
  readonly rowId: number;
  readonly uid: number;
  readonly customName: string;
  readonly capacity: number;
  readonly seatingCapacity: number;
  readonly expansionCapacity: number;
  readonly ownerClubRowId: number;
  readonly cityRowId: number;
  readonly latitude: number;
  readonly longitude: number;
}

interface RawNation {
  readonly rowId: number;
  readonly uid: number;
  readonly fullName: string;
  readonly shortName: string;
}

interface RawComp {
  readonly rowId: number;
  readonly uid: number;
  readonly customName: string;
}

interface RawPlayerEntry {
  readonly rowId: number;
  readonly uid: number;
  readonly tag: 2 | 3;
  readonly body: RawPlayerBody;
  readonly job: RawPersonJob;
  readonly person: RawActualPerson;
}

interface RawStaffEntry {
  readonly rowId: number;
  readonly uid: number;
  readonly tag: 1 | 3 | 9;
  readonly nonPlayer: RawNonPlayerBody;
  readonly job: RawPersonJob;
  readonly person: RawActualPerson;
}

export interface ParsedGameDbResult {
  readonly gameDbVersion: number;
  readonly headerGameDate: string | null;
  readonly exactEof: boolean;
  readonly counts: DecodedSaveEntityCounts;
  readonly players: readonly DecodedSavePlayer[];
  readonly staff: readonly DecodedSaveStaff[];
  readonly clubs: readonly DecodedSaveClub[];
  readonly teams: readonly DecodedSaveTeam[];
  readonly stadiums: readonly DecodedSaveStadium[];
  readonly nations: readonly DecodedSaveNation[];
  readonly competitions: readonly DecodedSaveCompetition[];
  readonly staffByRowId: ReadonlyMap<number, DecodedSaveStaff>;
}

function readTableHeader(r: Fm2013BinaryReader, tableName: string): number {
  const count = r.u32();
  r.u8(); // table flag
  if (count > MAX_RECORDS_PER_TABLE) {
    throw new FM2013DecodeError(
      'CORRUPT_DATABASE',
      `Table ${tableName} declared implausible record count ${count} at offset ${r.cursor - 5}.`
    );
  }
  return count;
}

function skipPersonRecord(r: Fm2013BinaryReader, tag: number): void {
  switch (tag) {
    case 1:
      parseActualNonPlayerBody(r); parsePersonJob(r); parseActualPerson(r); r.u32(); r.dbRecord(); return;
    case 2:
      parseActualPlayerBody(r); parsePersonJob(r); parseActualPerson(r); r.u32(); r.dbRecord(); return;
    case 3:
      parseActualPlayerBody(r); parseActualNonPlayerBody(r); parsePersonJob(r); parseActualPerson(r); r.u32(); r.dbRecord(); return;
    case 4: {
      r.i32(); r.skip(16);
      const m = r.i8();
      for (let i = 0; i < m; i++) {
        r.skip(3); r.date5(); r.skip(2); r.i32(); r.skip(2); r.i32(); r.i32();
      }
      for (let i = 0; i < 2; i++) {
        const k = r.i32();
        if (k > 0) r.skip(k * 4);
      }
      r.date4(); parseActualPerson(r); r.u32(); r.dbRecord(); return;
    }
    case 5:
      r.siStr(); r.siStr(); r.u32(); r.dbRecord(); return;
    case 6:
      r.i32(); r.skip(3); r.i32(); r.u8(); parseActualPerson(r); r.u32(); r.dbRecord(); return;
    case 7: {
      const f0 = r.i32(); r.i32();
      if (f0 < 0) { r.i32(); r.skip(8); }
      r.u32(); r.dbRecord(); return;
    }
    case 8:
      r.i32(); parseActualPerson(r); r.u32(); r.dbRecord(); return;
    case 9:
      parseHumanNonPlayer(r); return;
    case 16:
      if (r.u8() === 0) r.i32();
      r.i32(); r.u8(); r.u32(); r.dbRecord(); return;
    case 17: {
      const sub = r.u8();
      if (sub !== 5 && sub !== 16 && sub !== 19) r.i32();
      if (sub === 4) { r.i16(); r.u16(); }
      else if (sub !== 5 && sub !== 6 && sub !== 8 && sub !== 16 && sub !== 18 && sub !== 19) {
        r.skip(28);
      }
      r.u32(); r.dbRecord(); return;
    }
    case 18: {
      r.skip(5); r.date4(); r.i32();
      const m = r.i32();
      if (m > 0) r.skip(m * 4);
      parseActualPerson(r); r.u32(); r.dbRecord(); return;
    }
    case 19:
      r.i32();
      if (r.u8() === 0) r.i32();
      r.i32(); r.u8(); r.u32(); r.dbRecord(); return;
    default:
      throw new FM2013DecodeError('CORRUPT_DATABASE', `Unknown PERSON subtype tag ${tag} at offset ${r.cursor - 1}.`);
  }
}

/**
 * Parse the entire FM2013 `game_db.dat` binary (all 51 tables + post-table tail + 64-byte hash).
 * Verified 65/65 exact EOF (0 drift) across versions 0x757..0x774.
 */
export function parseFm2013GameDb(
  bytes: Uint8Array,
  overrideGameDate: string | null = null,
  onProgress?: (percent: number, tableName: string) => void
): ParsedGameDbResult {
  const r = new Fm2013BinaryReader(bytes);
  if (bytes.byteLength < 64 ||
      bytes[0] !== 0x02 || bytes[1] !== 0x01 ||
      bytes[2] !== 0x74 || bytes[3] !== 0x61 || bytes[4] !== 0x64 || bytes[5] !== 0x2e) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', 'game_db.dat does not begin with expected SI .dat signature.');
  }
  r.cursor = 6;
  r.ver = r.u16();
  r.u8(); // header flag
  if (r.ver < FM2013_MIN_GAME_DB_VERSION || r.ver > FM2013_MAX_GAME_DB_VERSION) {
    throw new FM2013DecodeError(
      'UNSUPPORTED_DB_VERSION',
      `Unsupported FM2013 game_db version 0x${r.ver.toString(16)} (verified range: 0x${FM2013_MIN_GAME_DB_VERSION.toString(16)}..0x${FM2013_MAX_GAME_DB_VERSION.toString(16)}).`
    );
  }

  // Header metadata
  r.u32();
  if (r.ver >= 0x74e) r.u16();
  const headerDates = [r.date5(), r.date5(), r.date5(), r.date5()];
  const headerGameDate = siDateToIso(headerDates[0]!.dayOfYear, headerDates[0]!.year);
  const effectiveGameDate = overrideGameDate ?? headerGameDate;
  r.u32(); r.u32();
  const n1 = r.i8();
  for (let i = 0; i < n1; i++) { if (r.u8() !== 0) r.skip(1 + 0x45); }
  const n2 = r.i8();
  for (let i = 0; i < n2; i++) { if (r.u8() !== 0) r.skip(0x29); }
  const s1 = r.u32();
  for (let i = 0; i < s1; i++) r.siStr();
  const s2 = r.u32();
  for (let i = 0; i < s2; i++) r.siStr();
  r.u8();

  const cityRowToUid = new Map<number, number>();
  const rawClubs = new Map<number, RawClub>();
  const rawComps = new Map<number, RawComp>();
  const rawNations = new Map<number, RawNation>();
  const firstNames = new Map<number, string>();
  const secondNames = new Map<number, string>();
  const commonNames = new Map<number, string>();
  const rawStadiums = new Map<number, RawStadium>();
  const rawTeams = new Map<number, RawTeam>();
  const rawPlayers: RawPlayerEntry[] = [];
  const rawStaff: RawStaffEntry[] = [];
  const personDataByRow = new Map<number, Uint8Array>();
  const playingDataByRow = new Map<number, Uint8Array>();

  // T01 AWARD
  const awardCount = readTableHeader(r, 'T01_AWARD');
  for (let i = 0; i < awardCount; i++) {
    r.u8(); r.skip(14); r.i16(); r.skip(2); r.date4();
    r.i32(); r.i32(); r.skip(5); r.i32(); r.skip(10); r.u32(); r.u8(); r.date4();
    r.dbRecord();
  }
  r.tableFooter();

  // T02 CITY
  const cityCount = readTableHeader(r, 'T02_CITY');
  for (let i = 0; i < cityCount; i++) {
    r.u8(); r.u8(); r.f32(); r.f32(); r.u8(); r.i32(); r.i32();
    r.siStr(); r.u8(); r.i16(); r.u8(); r.i32(); r.i32(); r.u8();
    const rec = r.dbRecord();
    cityRowToUid.set(rec.rowId, rec.uid);
  }
  r.tableFooter();

  // T03 CLUB
  onProgress?.(10, 'T03_CLUB');
  const clubCount = readTableHeader(r, 'T03_CLUB');
  for (let i = 0; i < clubCount; i++) {
    const tag = r.u8();
    if (tag === 0x0c) { r.i32(); r.i32(); r.u8(); }
    const nationRowId = r.i32();
    r.i32(); // based nation
    r.i32(); // continental nation
    const cityRowId = r.i32();
    r.u8();
    const nickname = r.siStr();
    const trainingFacilities = r.u8();
    const youthFacilities = r.u8();
    const youthCoaching = r.u8();
    const yearFoundedRaw = r.u16();
    r.skip(4);
    const professionalStatus = r.u8();
    const youthRecruitment = r.u8();
    r.skip(9);
    let m = r.i8();
    if (m > 0) r.skip(m * 4);
    m = r.i8();
    if (m > 0) r.skip(m * 4);
    const finType = r.i8();
    let finance: ParsedClubFinance = {
      financeType: 'none',
      balanceGbp: null,
      transferBudgetGbp: null,
      transferBudgetSeasonGbp: null,
      weeklyWageBillGbp: null,
      weeklyWageBudgetGbp: null
    };
    if (finType === 0) {
      finance = { ...finance, financeType: 'basic', balanceGbp: parseFinanceBasic(r) };
    } else if (finType === 1) {
      finance = parseFinanceFull(r);
    }
    m = r.i16();
    if (m > 0) r.skip(m * 4);
    r.skip(40);
    m = r.i8();
    for (let j = 0; j < m; j++) { r.u8(); skip186de10(r, true); }
    m = r.i8();
    for (let j = 0; j < m; j++) {
      if (r.ver >= 0x772) { r.date4(); r.date4(); r.u8(); }
      else { r.date4(); r.u8(); r.u8(); }
    }
    m = r.i8();
    for (let j = 0; j < m; j++) {
      r.u8(); r.date4(); r.date4(); r.u8(); r.siStr(); r.i32(); r.i16(); r.u8(); r.u8();
    }
    m = r.i8();
    for (let j = 0; j < m; j++) {
      r.u8(); r.skip(8);
      if (r.ver >= 0x736) r.u16();
    }
    if (r.u8() !== 0) {
      r.i16(); r.skip(2); r.f32(); r.i32(); r.i32();
      const k = r.i8();
      if (k > 0) r.skip(k * 4);
    }
    if (r.u8() !== 0) skip16c0f30(r);
    r.u8(); r.i32(); r.date4(); r.date4(); r.date4();
    r.i16(); r.u8(); r.date4(); r.u8(); r.date4(); r.date4(); r.u8();
    if (r.ver >= 0x761) r.u8();
    r.u8(); r.skip(24); r.date4(); r.i32();
    m = r.i8();
    if (m > 0) r.skip(m * 21);
    r.i32();
    m = r.i32();
    if (m > 0) r.skip(m * 17);
    const base = parseClubBase(r);
    rawClubs.set(base.rowId, {
      rowId: base.rowId,
      uid: base.uid,
      fullName: base.fullName,
      shortName: base.shortName,
      sixLetterName: base.sixLetterName,
      nickname,
      nationRowId,
      cityRowId,
      yearFounded: yearFoundedRaw >= 1800 && yearFoundedRaw <= 2100 ? yearFoundedRaw : null,
      trainingFacilities: trainingFacilities >= 1 && trainingFacilities <= 20 ? trainingFacilities : null,
      youthFacilities: youthFacilities >= 1 && youthFacilities <= 20 ? youthFacilities : null,
      youthCoaching: youthCoaching >= 1 && youthCoaching <= 20 ? youthCoaching : null,
      youthRecruitment: youthRecruitment >= 1 && youthRecruitment <= 20 ? youthRecruitment : null,
      professionalStatus,
      finance
    });
  }
  r.tableFooter();

  // T04 COMP
  const compCount = readTableHeader(r, 'T04_COMP');
  for (let i = 0; i < compCount; i++) {
    r.u8(); r.u8(); r.u8(); r.skip(11);
    const ct = r.u8();
    r.skip(17);
    let customName = '';
    if (ct === 4) { customName = r.siStr(); r.siStr(); }
    r.skip(16); r.u16(); r.i16(); r.u8(); r.skip(6);
    if (r.ver >= 0x758) {
      const m = r.i32();
      if (m > 0) r.skip(m * 2);
    }
    if (r.u8() !== 0) skip1b61d00(r);
    r.i32(); r.u8(); r.u8();
    if (r.u8() !== 0) skipVariantList(r);
    const m = r.i32();
    if (m > 0) r.skip(m * 7);
    if (r.ver >= 0x738 && r.u8() !== 0) skip1871120(r);
    r.i32(); r.i16(); r.skip(8); r.skip(16); r.u16(); r.date4(); r.date4(); r.skip(2);
    const rec = r.dbRecord();
    rawComps.set(rec.rowId, { rowId: rec.rowId, uid: rec.uid, customName });
  }
  r.tableFooter();

  // T05 CONTINENT
  const contCount = readTableHeader(r, 'T05_CONTINENT');
  for (let i = 0; i < contCount; i++) {
    r.u8(); r.skip(3); r.f32(); r.skip(13);
    if (r.u8() !== 0) skipVariantList(r);
    if (r.u8() !== 0) skipVariantList(r);
    r.dbRecord();
  }
  r.tableFooter();

  // T06 CURRENCY
  const currencyCount = readTableHeader(r, 'T06_CURRENCY');
  for (let i = 0; i < currencyCount; i++) {
    r.u8(); r.siStr(); r.siStr(); r.siStr(); r.siStr(); r.f32();
    const m = r.i32();
    if (m > 0) r.skip(m * 6);
    r.dbRecord();
  }
  r.tableFooter();

  // T07 INJURY
  const injuryCount = readTableHeader(r, 'T07_INJURY');
  for (let i = 0; i < injuryCount; i++) {
    r.u8(); r.skip(22); r.dbRecord();
  }
  r.tableFooter();

  // T08 MEDIA_SOURCE
  const mediaCount = readTableHeader(r, 'T08_MEDIA_SOURCE');
  for (let i = 0; i < mediaCount; i++) {
    r.u8(); r.siStr(); r.u8();
    let m = r.i32(); if (m > 0) r.skip(m);
    r.siStr(); r.u8();
    m = r.i32(); if (m > 0) r.skip(m * 4);
    r.i32(); r.i32();
    m = r.i32(); if (m > 0) r.skip(m * 4);
    r.i32();
    m = r.i32();
    for (let j = 0; j < m; j++) { r.skip(8); r.siStr(); }
    r.skip(3); r.date4();
    m = r.i8(); if (m > 0) r.skip(m * 4);
    m = r.i32(); if (m > 0) r.skip(m * 4);
    r.dbRecord();
  }
  r.tableFooter();

  // T09 LANGUAGE
  const languageCount = readTableHeader(r, 'T09_LANGUAGE');
  for (let i = 0; i < languageCount; i++) {
    r.u8(); r.siStr(); r.u8();
    if (r.ver < 0x74f) r.i32();
    r.skip(12); r.dbRecord();
  }
  r.tableFooter();

  // T10 NATION
  const nationCount = readTableHeader(r, 'T10_NATION');
  for (let i = 0; i < nationCount; i++) {
    r.u8(); r.i16(); r.skip(40);
    if (r.ver >= 0x765) r.skip(8);
    r.skip(28);
    if (r.ver >= 0x765) r.skip(8);
    r.skip(29); r.skip(38);
    skipVariantMap(r);
    let m = r.i32(); if (m > 0) r.skip(m * 2);
    m = r.u8(); if (m > 0) r.skip(m * 5);
    m = r.i8(); if (m > 0) r.skip(m * 4);
    m = r.i8(); if (m > 0) r.skip(m * 4);
    m = r.i16(); if (m > 0) r.skip(m * 4);
    m = r.i16(); if (m > 0) r.skip(m * 4);
    for (let a = 0; a < 16; a++) {
      r.i16();
      const k = r.i8();
      if (k > 0) r.skip(k * 4);
    }
    m = r.i16(); if (m > 0) r.skip(m * 4);
    m = r.i32(); if (m > 0) r.skip(m * 4);
    for (let a = 0; a < 2; a++) {
      const k = r.i16();
      for (let j = 0; j < k; j++) skip1884510(r);
    }
    m = r.i16();
    for (let j = 0; j < m; j++) {
      r.siStr(); r.siStr(); r.siStr(); r.date4(); r.skip(12);
      if (r.ver < 0x73c) r.u8();
      r.siStr();
    }
    m = r.i16(); if (m > 0) r.skip(m * 9);
    m = r.i32(); if (m > 0) r.skip(m * 8);
    if (r.ver >= 0x732) {
      m = r.i32();
      for (let j = 0; j < m; j++) {
        r.skip(16);
        if (r.ver < 0x765) r.u8();
        else r.f32();
        r.skip(2);
      }
    }
    if (r.ver >= 0x745) {
      m = r.i16(); if (m > 0) r.skip(m * 14);
    }
    r.u8(); r.i32();
    if (r.ver >= 0x738 && r.u8() !== 0) skip1871120(r);
    r.skip(6);
    if (r.ver >= 0x73b) r.u8();
    r.skip(46);
    m = r.i8(); if (m > 0) r.skip(m * 5);
    m = r.i8(); if (m > 0) r.skip(m * 8);
    m = r.i8(); if (m > 0) r.skip(m * 7);
    m = r.i8(); if (m > 0) r.skip(m * 7);
    for (let a = 0; a < 2; a++) {
      m = r.i32();
      for (let j = 0; j < m; j++) {
        r.skip(20);
        if (r.ver >= 0x771) { r.date4(); r.date4(); }
      }
    }
    m = r.i32(); if (m > 0) r.skip(m * 4);
    r.skip(83);
    m = r.i8(); if (m > 0) r.skip(m * 4);
    m = r.i8(); if (m > 0) r.skip(m * 4);
    m = r.i32(); if (m > 0) r.skip(m * 12);
    const base = parseClubBase(r);
    rawNations.set(base.rowId, {
      rowId: base.rowId,
      uid: base.uid,
      fullName: base.fullName,
      shortName: base.shortName
    });
  }
  r.tableFooter();

  // T11 NAME_FIRST, T12 NAME_SECOND, T13 NAME_COMMON
  onProgress?.(35, 'T11_NAMES');
  for (const [label, target] of [
    ['T11_NAME_FIRST', firstNames],
    ['T12_NAME_SECOND', secondNames],
    ['T13_NAME_COMMON', commonNames]
  ] as const) {
    const cnt = readTableHeader(r, label);
    for (let i = 0; i < cnt; i++) {
      r.u8();
      const text = r.siStr();
      r.skip(12);
      const rec = r.dbRecord();
      target.set(rec.rowId, text);
    }
    r.tableFooter();
  }

  // T14 REGION, T15 LOCAL_REGION, T16 SPONSOR
  let cnt = readTableHeader(r, 'T14_REGION');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(33); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T15_LOCAL_REGION');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(26); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T16_SPONSOR');
  for (let i = 0; i < cnt; i++) { r.u8(); r.siStr(); r.u8(); r.siStr(); r.skip(2); r.dbRecord(); }
  r.tableFooter();

  // T17 STADIUM
  onProgress?.(55, 'T17_STADIUM');
  const stadiumCount = readTableHeader(r, 'T17_STADIUM');
  for (let i = 0; i < stadiumCount; i++) {
    r.u8();
    const capacity = r.i32();
    const seatingCapacity = r.i32();
    const expansionCapacity = r.i32();
    r.i32(); // used capacity
    const ownerClubRowId = r.i32();
    r.skip(1 + 4 + 4 + 3 + 4 + 10 + 1 + 40 + 1 + 4 + 4 + 2 + 2 + 2 + 2);
    const fl = r.u8();
    const customName = (fl & 0x10) !== 0 ? r.siStr() : '';
    r.u8();
    const cityRowId = r.i32();
    r.i32(); r.i16(); r.date4();
    const latitude = r.f32();
    const longitude = r.f32();
    const rec = r.dbRecord();
    rawStadiums.set(rec.rowId, {
      rowId: rec.rowId,
      uid: rec.uid,
      customName,
      capacity,
      seatingCapacity,
      expansionCapacity,
      ownerClubRowId,
      cityRowId,
      latitude,
      longitude
    });
  }
  r.tableFooter();

  // T18 STADIUM_CHANGE, T19 STAGE_NAME
  cnt = readTableHeader(r, 'T18_STADIUM_CHANGE');
  for (let i = 0; i < cnt; i++) {
    r.u8(); r.skip(12); r.date4(); r.date4(); r.i32(); r.u8(); r.i32(); r.u8(); r.skip(12); r.dbRecord();
  }
  r.tableFooter();

  cnt = readTableHeader(r, 'T19_STAGE_NAME');
  for (let i = 0; i < cnt; i++) {
    r.u8();
    if (r.u8() !== 0) r.siStr();
    r.dbRecord();
  }
  r.tableFooter();

  // T20 TEAM
  onProgress?.(68, 'T20_TEAM');
  const teamCount = readTableHeader(r, 'T20_TEAM');
  for (let i = 0; i < teamCount; i++) {
    const tag = r.u8();
    const isNationalTeam = tag === 0x0b;
    if (isNationalTeam) {
      r.date4(); r.date4(); r.date4(); r.skip(6);
      const m = r.i8();
      if (m > 0) r.skip(m * 9);
      r.skip(20);
      skip186de10(r, true);
    }
    const teamType = r.u8();
    r.u8();
    const reputation = r.i16();
    r.i16();
    const compRowId = r.i32();
    r.i32(); r.i32();
    const stadiumRowId = r.i32();
    const managerPersonRowId = r.i32();
    r.i32();
    r.skip(29);
    let m = r.i16();
    if (m > 0) r.skip(m * 4);
    m = r.i16();
    for (let j = 0; j < m; j++) {
      r.date4(); r.date4(); r.date4();
      if (r.ver >= 0x772) r.date4();
      r.i16(); r.skip(2); r.i32();
    }
    if (r.u8() !== 0) {
      r.u8();
      const k = r.i32();
      for (let j = 0; j < k; j++) skip17e6250(r);
    }
    const hm = r.i32();
    for (let j = 0; j < hm; j++) {
      r.date4();
      const v = r.i32();
      if (v <= -2) r.i32();
      r.skip(2);
      if (v <= -2) r.u8();
    }
    r.i32(); r.i32(); r.date4(); r.date4();
    const pm = r.i32();
    if (pm > 0) r.skip(pm * 4);
    r.skip(3);
    if (r.ver >= 0x766) {
      const k = r.i32();
      if (k > 0) r.skip(k * 4);
    }
    // TEAM_BASE
    r.skip(5);
    const ownerClubRowId = r.i32();
    r.siStr(); r.u8(); r.siStr(); r.u8();
    const rec = r.dbRecord();
    rawTeams.set(rec.rowId, {
      rowId: rec.rowId,
      uid: rec.uid,
      isNationalTeam,
      ownerClubRowId,
      teamType,
      reputation,
      compRowId,
      stadiumRowId,
      managerPersonRowId
    });
  }
  r.tableFooter();

  // T21 WEATHER, T22 PLAYER_TYPE, T23 DERBY, T24 AGREEMENT
  cnt = readTableHeader(r, 'T21_WEATHER');
  for (let i = 0; i < cnt; i++) { r.u8(); r.siStr(); r.skip(3 + 4 * 19); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T22_PLAYER_TYPE');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(2); r.dbRecord(); }
  r.tableFooter();

  const derbyCount = readTableHeader(r, 'T23_DERBY');
  for (let i = 0; i < derbyCount; i++) {
    r.u8(); r.siStr(); r.siStr(); r.siStr(); r.siStr(); r.date4(); r.skip(34); r.dbRecord();
  }
  r.tableFooter();

  cnt = readTableHeader(r, 'T24_AGREEMENT');
  for (let i = 0; i < cnt; i++) { r.u8(); r.dbRecord(); }
  r.tableFooter();

  // T25 PERSON
  onProgress?.(82, 'T25_PERSON');
  const totalPersons = readTableHeader(r, 'T25_PERSON');
  for (let i = 0; i < totalPersons; i++) {
    const tag = r.u8();
    if (tag === 1) {
      const nonPlayer = parseActualNonPlayerBody(r);
      const job = parsePersonJob(r);
      const person = parseActualPerson(r);
      r.u32();
      const rec = r.dbRecord();
      rawStaff.push({ rowId: rec.rowId, uid: rec.uid, tag: 1, nonPlayer, job, person });
    } else if (tag === 2) {
      const body = parseActualPlayerBody(r);
      const job = parsePersonJob(r);
      const person = parseActualPerson(r);
      r.u32();
      const rec = r.dbRecord();
      rawPlayers.push({ rowId: rec.rowId, uid: rec.uid, tag: 2, body, job, person });
    } else if (tag === 3) {
      const body = parseActualPlayerBody(r);
      const nonPlayer = parseActualNonPlayerBody(r);
      const job = parsePersonJob(r);
      const person = parseActualPerson(r);
      r.u32();
      const rec = r.dbRecord();
      rawPlayers.push({ rowId: rec.rowId, uid: rec.uid, tag: 3, body, job, person });
      rawStaff.push({ rowId: rec.rowId, uid: rec.uid, tag: 3, nonPlayer, job, person });
    } else if (tag === 9) {
      const human = parseHumanNonPlayer(r);
      rawStaff.push({
        rowId: human.rowId,
        uid: human.uid,
        tag: 9,
        nonPlayer: human.nonPlayer,
        job: human.job,
        person: human.person
      });
    } else {
      skipPersonRecord(r, tag);
    }
  }
  r.tableFooter();

  // T26 PERSON_DATA (8 personality bytes)
  onProgress?.(90, 'T26_PERSON_DATA');
  cnt = readTableHeader(r, 'T26_PERSON_DATA');
  for (let i = 0; i < cnt; i++) {
    r.u8();
    const raw8 = r.subarray(8);
    const rec = r.dbRecord();
    personDataByRow.set(rec.rowId, raw8);
  }
  r.tableFooter();

  // T27 PLAYING_DATA (69 bytes: 15 positions + 49 visible attrs + 5 hidden playing attrs)
  cnt = readTableHeader(r, 'T27_PLAYING_DATA');
  for (let i = 0; i < cnt; i++) {
    r.u8();
    const raw69 = r.subarray(0x45);
    const rec = r.dbRecord();
    playingDataByRow.set(rec.rowId, raw69);
  }
  r.tableFooter();

  // T28 NON_PLAYING_DATA (41 bytes)
  cnt = readTableHeader(r, 'T28_NON_PLAYING_DATA');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(0x29); r.dbRecord(); }
  r.tableFooter();

  // T29 COMP_HISTORY
  cnt = readTableHeader(r, 'T29_COMP_HISTORY');
  for (let i = 0; i < cnt; i++) { r.u8(); skip1b61d00(r); r.dbRecord(); }
  r.tableFooter();

  // T30..T51 Starting / Auxiliary tables
  cnt = readTableHeader(r, 'T30_ST_LOAN');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(25); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T31_ST_INJURY');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(20); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T32_ST_CONF');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(8); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T33_ST_FUT_TRF');
  for (let i = 0; i < cnt; i++) {
    r.u8(); r.skip(26);
    const m = r.i32();
    if (m > 0) r.skip(m * 20);
    r.dbRecord();
  }
  r.tableFooter();

  cnt = readTableHeader(r, 'T34_ST_DEBT');
  for (let i = 0; i < cnt; i++) {
    r.u8(); r.skip(35);
    if (r.ver >= 0x734) r.i32();
    if (r.ver >= 0x735) r.i32();
    r.dbRecord();
  }
  r.tableFooter();

  cnt = readTableHeader(r, 'T35_ST_HOF');
  for (let i = 0; i < cnt; i++) {
    r.u8(); r.i32(); r.i32(); r.siStr(); r.siStr(); r.siStr(); r.date4();
    const m = r.i32();
    if (m > 0) r.skip(m * 10);
    r.dbRecord();
  }
  r.tableFooter();

  cnt = readTableHeader(r, 'T36_ST_CUP_HIST');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(31); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T37_ST_LG_HIST');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(23); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T38_ST_BAN');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(14); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T39_ST_AVG_PTS');
  for (let i = 0; i < cnt; i++) {
    r.u8(); r.i32(); r.i32();
    const m1 = r.i32(); if (m1 > 0) r.skip(m1);
    const m2 = r.i32(); if (m2 > 0) r.skip(m2 * 2);
    r.dbRecord();
  }
  r.tableFooter();

  cnt = readTableHeader(r, 'T40_ST_INTL_FR');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(20); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T41_ST_RETIRE');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(10); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T42_EXTRA_PERSON');
  for (let i = 0; i < cnt; i++) { skipPersonRecord(r, r.u8()); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T43_ST_MONTHLY');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(32); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T44_ST_RECORD_45');
  for (let i = 0; i < cnt; i++) { r.u8(); r.i32(); r.u8(); skipVariantMap(r); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T45_ST_DRAFT');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(12); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T46_ST_RECORD_48');
  for (let i = 0; i < cnt; i++) { r.u8(); r.i32(); r.u8(); skipVariantMap(r); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T47_ST_RECORD_49');
  for (let i = 0; i < cnt; i++) { r.u8(); r.i32(); r.u8(); skipVariantMap(r); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T48_ST_MLS_SLOT');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(13); r.dbRecord(); }
  r.tableFooter();

  cnt = readTableHeader(r, 'T49_ST_MLS_CAP');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(10); r.dbRecord(); }
  r.tableFooter();

  if (r.ver >= 0x756) {
    cnt = readTableHeader(r, 'T50_ST_HAPPY');
    for (let i = 0; i < cnt; i++) { r.u8(); r.skip(17); r.dbRecord(); }
    r.tableFooter();
  }

  cnt = readTableHeader(r, 'T51_FIXTURE_NAME');
  for (let i = 0; i < cnt; i++) { r.u8(); r.skip(16); r.dbRecord(); }
  r.tableFooter();

  // Post-table tail (0x1647f00, 0x16480e0, 0x1631bf0, 0x16348a0, 0x1631d50, i32, variant_list, 64B hash)
  let tailN = r.i32(); if (tailN > 0) r.skip(tailN * 8);
  tailN = r.i32(); if (tailN > 0) r.skip(tailN * 8);
  tailN = r.i32(); if (tailN > 0) r.skip(tailN * 10);
  tailN = r.i32();
  for (let i = 0; i < tailN; i++) skip183b0f0(r);
  tailN = r.i32();
  for (let i = 0; i < tailN; i++) {
    r.i32(); r.u8(); r.i32(); r.i32(); r.date4(); r.date4();
    r.i32(); r.i32(); r.skip(2); r.date4(); r.u8();
    if (r.ver >= 0x747) r.u8();
  }
  r.i32();
  skipVariantList(r);
  const hashLen = r.i32();
  if (hashLen < 0 || hashLen > 128) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', `Unexpected trailing checksum length ${hashLen}.`);
  }
  r.skip(hashLen);
  const exactEof = r.remaining === 0;
  if (!exactEof) {
    throw new FM2013DecodeError(
      'CORRUPT_DATABASE',
      `FM2013 game_db.dat did not terminate cleanly at EOF (${r.remaining} trailing bytes remaining).`
    );
  }

  // --- Link & Materialize Canonical Entities ---
  onProgress?.(95, 'LINKING');

  const resolvePersonName = (ap: RawActualPerson): {
    firstName: string; lastName: string; commonName: string | null; displayName: string;
  } => {
    const firstName = firstNames.get(ap.firstNameRowId) ?? '';
    const lastName = secondNames.get(ap.secondNameRowId) ?? '';
    const commonRaw = ap.commonNameRowId >= 0 ? (commonNames.get(ap.commonNameRowId) ?? '') : '';
    const commonName = commonRaw.trim() || null;
    const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
    const displayName = commonName ?? (joined || ap.fullName.trim() || `Person #${ap.firstNameRowId}`);
    return { firstName, lastName, commonName, displayName };
  };

  const clubPlayerCounts = new Map<number, number>();
  const clubStaffCounts = new Map<number, number>();
  const nationPlayerCounts = new Map<number, number>();
  const nationClubCounts = new Map<number, number>();
  const nationStaffCounts = new Map<number, number>();
  const clubPrimaryTeam = new Map<number, RawTeam>();
  const compTeamsCount = new Map<number, number>();
  const compSampleClubs = new Map<number, string[]>();

  for (const club of rawClubs.values()) {
    if (club.nationRowId >= 0) {
      nationClubCounts.set(club.nationRowId, (nationClubCounts.get(club.nationRowId) ?? 0) + 1);
    }
  }

  for (const team of rawTeams.values()) {
    if (!team.isNationalTeam && team.ownerClubRowId >= 0) {
      const existing = clubPrimaryTeam.get(team.ownerClubRowId);
      if (!existing || team.teamType < existing.teamType) {
        clubPrimaryTeam.set(team.ownerClubRowId, team);
      }
      if (team.compRowId >= 0) {
        compTeamsCount.set(team.compRowId, (compTeamsCount.get(team.compRowId) ?? 0) + 1);
        const owner = rawClubs.get(team.ownerClubRowId);
        if (owner) {
          const list = compSampleClubs.get(team.compRowId) ?? [];
          if (list.length < 6 && !list.includes(owner.shortName || owner.fullName)) {
            list.push(owner.shortName || owner.fullName);
            compSampleClubs.set(team.compRowId, list);
          }
        }
      }
    }
  }

  const players: DecodedSavePlayer[] = [];
  for (const entry of rawPlayers) {
    const pd = playingDataByRow.get(entry.body.playingDataRowId);
    if (!pd || pd.byteLength < 69) continue;
    const pdat = entry.person.personDataRowId >= 0 ? personDataByRow.get(entry.person.personDataRowId) : undefined;
    const names = resolvePersonName(entry.person);
    const nation = rawNations.get(entry.person.primaryNationRowId) ?? null;

    // Resolve club via currentTeamRowId -> TEAM.ownerClubRowId -> CLUB (verified 4,058/4,058 exact).
    const team = entry.job.currentTeamRowId >= 0 ? (rawTeams.get(entry.job.currentTeamRowId) ?? null) : null;
    const club = team && !team.isNationalTeam ? (rawClubs.get(team.ownerClubRowId) ?? null) : null;

    const loanContract = entry.job.contracts.find(c => c.ctag === 1) ?? null;
    const fullContract = entry.job.contracts.find(c => c.ctag === 0 || c.ctag === 2 || c.ctag === 3 || c.ctag === 6) ?? null;
    const activeContract = loanContract ?? fullContract ?? entry.job.contracts[0] ?? null;

    let parentClub: RawClub | null = null;
    if (loanContract && fullContract && fullContract.teamRowId !== null) {
      const parentTeam = rawTeams.get(fullContract.teamRowId) ?? null;
      if (parentTeam && !parentTeam.isNationalTeam) {
        const candidate = rawClubs.get(parentTeam.ownerClubRowId) ?? null;
        if (candidate && (!club || candidate.uid !== club.uid)) parentClub = candidate;
      }
    }

    if (club) clubPlayerCounts.set(club.rowId, (clubPlayerCounts.get(club.rowId) ?? 0) + 1);
    if (nation) nationPlayerCounts.set(nation.rowId, (nationPlayerCounts.get(nation.rowId) ?? 0) + 1);

    const positions: DecodedPositionRatings = {
      GK: clampPosition(pd[0]!),
      SW: clampPosition(pd[1]!),
      DL: clampPosition(pd[2]!),
      DC: clampPosition(pd[3]!),
      DR: clampPosition(pd[4]!),
      DM: clampPosition(pd[5]!),
      ML: clampPosition(pd[6]!),
      MC: clampPosition(pd[7]!),
      MR: clampPosition(pd[8]!),
      AML: clampPosition(pd[9]!),
      AMC: clampPosition(pd[10]!),
      AMR: clampPosition(pd[11]!),
      ST: clampPosition(pd[12]!),
      WBL: clampPosition(pd[13]!),
      WBR: clampPosition(pd[14]!)
    };

    const attributes: Record<AttributeKey, number> = {
      crossing: scaleAttr(pd[15]!),
      dribbling: scaleAttr(pd[16]!),
      finishing: scaleAttr(pd[17]!),
      heading: scaleAttr(pd[18]!),
      longShots: scaleAttr(pd[19]!),
      marking: scaleAttr(pd[20]!),
      offTheBall: scaleAttr(pd[21]!),
      passing: scaleAttr(pd[22]!),
      penaltyTaking: scaleAttr(pd[23]!),
      tackling: scaleAttr(pd[24]!),
      vision: scaleAttr(pd[25]!),
      handling: scaleAttr(pd[26]!),
      aerialReach: scaleAttr(pd[27]!),
      commandOfArea: scaleAttr(pd[28]!),
      communication: scaleAttr(pd[29]!),
      kicking: scaleAttr(pd[30]!),
      throwing: scaleAttr(pd[31]!),
      anticipation: scaleAttr(pd[32]!),
      decisions: scaleAttr(pd[33]!),
      oneOnOnes: scaleAttr(pd[34]!),
      positioning: scaleAttr(pd[35]!),
      reflexes: scaleAttr(pd[36]!),
      firstTouch: scaleAttr(pd[37]!),
      technique: scaleAttr(pd[38]!),
      flair: scaleAttr(pd[41]!),
      corners: scaleAttr(pd[42]!),
      teamwork: scaleAttr(pd[43]!),
      workRate: scaleAttr(pd[44]!),
      longThrows: scaleAttr(pd[45]!),
      eccentricity: scaleAttr(pd[46]!),
      rushingOut: scaleAttr(pd[47]!),
      tendencyToPunch: scaleAttr(pd[48]!),
      punching: scaleAttr(pd[48]!),
      acceleration: scaleAttr(pd[49]!),
      freeKickTaking: scaleAttr(pd[50]!),
      strength: scaleAttr(pd[51]!),
      stamina: scaleAttr(pd[52]!),
      pace: scaleAttr(pd[53]!),
      jumpingReach: scaleAttr(pd[54]!),
      leadership: scaleAttr(pd[55]!),
      balance: scaleAttr(pd[57]!),
      bravery: scaleAttr(pd[58]!),
      aggression: scaleAttr(pd[60]!),
      agility: scaleAttr(pd[61]!),
      naturalFitness: scaleAttr(pd[65]!),
      determination: scaleAttr(pd[66]!),
      composure: scaleAttr(pd[67]!),
      concentration: scaleAttr(pd[68]!)
    };

    const ageResult = entry.person.birthDate && effectiveGameDate
      ? calculateCalendarAge(entry.person.birthDate, effectiveGameDate)
      : null;
    const calendarAge = ageResult?.status === 'calculated' ? ageResult.value : null;

    const contract: DecodedPlayerContract | null = activeContract
      ? {
          clubUid: club?.uid ?? null,
          clubName: club?.shortName || club?.fullName || null,
          weeklyWageGbp: activeContract.weeklyWageGbp,
          expiresAt: activeContract.expiresAt,
          joinedAt: activeContract.joinedAt,
          isLoan: activeContract.ctag === 1,
          jobType: activeContract.jobType,
          squadNumber: activeContract.squadNumber
        }
      : null;

    players.push({
      uid: entry.uid,
      rowId: entry.rowId,
      personTag: entry.tag,
      firstName: names.firstName,
      lastName: names.lastName,
      commonName: names.commonName,
      fullName: entry.person.fullName || names.displayName,
      displayName: names.displayName,
      birthDate: entry.person.birthDate,
      calendarAge,
      primaryNationUid: nation?.uid ?? null,
      primaryNationName: nation?.shortName || nation?.fullName || null,
      birthCityUid: entry.person.birthCityRowId >= 0 ? (cityRowToUid.get(entry.person.birthCityRowId) ?? null) : null,
      clubUid: club?.uid ?? null,
      clubName: club?.fullName || null,
      clubShortName: club?.shortName || club?.fullName || null,
      parentClubUid: parentClub?.uid ?? null,
      parentClubName: parentClub?.shortName || parentClub?.fullName || null,
      teamUid: team?.uid ?? null,
      teamType: team?.teamType ?? null,
      positionSummary: formatPositionSummary(positions),
      positions,
      attributes,
      leftFoot: scaleAttr(pd[39]!),
      rightFoot: scaleAttr(pd[40]!),
      heightCm: entry.body.heightCm >= 120 && entry.body.heightCm <= 230 ? entry.body.heightCm : null,
      weightKg: entry.body.weightKg >= 40 && entry.body.weightKg <= 140 ? entry.body.weightKg : null,
      morale: entry.body.morale,
      marketValueGbp: entry.body.marketValueGbp >= 0 ? entry.body.marketValueGbp : null,
      intCaps: entry.job.intCaps,
      intGoals: entry.job.intGoals,
      squadNumber: activeContract?.squadNumber ?? null,
      isLoanedIn: loanContract !== null,
      contract,
      actualCa: entry.body.actualCa,
      potentialAbility: entry.body.potentialAbility,
      homeReputation: entry.body.homeRep,
      currentReputation: entry.body.currentRep,
      worldReputation: entry.body.worldRep,
      hiddenPlaying: {
        dirtiness: scaleAttr(pd[56]!),
        consistency: scaleAttr(pd[59]!),
        importantMatches: scaleAttr(pd[62]!),
        injuryProneness: scaleAttr(pd[63]!),
        versatility: scaleAttr(pd[64]!)
      },
      personality: pdat && pdat.byteLength >= 8
        ? {
            adaptability: pdat[0]!,
            ambition: pdat[1]!,
            loyalty: pdat[2]!,
            pressure: pdat[3]!,
            professionalism: pdat[4]!,
            sportsmanship: pdat[5]!,
            temperament: pdat[6]!,
            controversy: pdat[7]!
          }
        : null
    });
  }

  const staff: DecodedSaveStaff[] = [];
  const staffByRowId = new Map<number, DecodedSaveStaff>();
  const personRowToUid = new Map<number, number>();
  for (const p of players) personRowToUid.set(p.rowId, p.uid);

  for (const entry of rawStaff) {
    const names = resolvePersonName(entry.person);
    const nation = rawNations.get(entry.person.primaryNationRowId) ?? null;
    const team = entry.job.currentTeamRowId >= 0 ? (rawTeams.get(entry.job.currentTeamRowId) ?? null) : null;
    const club = team && !team.isNationalTeam ? (rawClubs.get(team.ownerClubRowId) ?? null) : null;
    const contract = entry.job.contracts[0] ?? null;
    if (club) clubStaffCounts.set(club.rowId, (clubStaffCounts.get(club.rowId) ?? 0) + 1);
    if (nation) nationStaffCounts.set(nation.rowId, (nationStaffCounts.get(nation.rowId) ?? 0) + 1);
    const ageResult = entry.person.birthDate && effectiveGameDate
      ? calculateCalendarAge(entry.person.birthDate, effectiveGameDate)
      : null;
    const calendarAge = ageResult?.status === 'calculated' ? ageResult.value : null;

    const record: DecodedSaveStaff = {
      uid: entry.uid,
      rowId: entry.rowId,
      personTag: entry.tag,
      isHuman: entry.tag === 9,
      firstName: names.firstName,
      lastName: names.lastName,
      commonName: names.commonName,
      displayName: names.displayName,
      birthDate: entry.person.birthDate,
      calendarAge,
      primaryNationUid: nation?.uid ?? null,
      primaryNationName: nation?.shortName || nation?.fullName || null,
      clubUid: club?.uid ?? null,
      clubName: club?.shortName || club?.fullName || null,
      jobType: contract?.jobType ?? null,
      weeklyWageGbp: contract?.weeklyWageGbp ?? null,
      contractExpiresAt: contract?.expiresAt ?? null,
      staffCa: entry.nonPlayer.staffCa,
      staffPa: entry.nonPlayer.staffPa,
      homeReputation: entry.nonPlayer.homeRep,
      currentReputation: entry.nonPlayer.currentRep,
      worldReputation: entry.nonPlayer.worldRep
    };
    staff.push(record);
    staffByRowId.set(entry.rowId, record);
    personRowToUid.set(entry.rowId, entry.uid);
  }

  const clubs: DecodedSaveClub[] = [];
  for (const club of rawClubs.values()) {
    const nation = rawNations.get(club.nationRowId) ?? null;
    const primaryTeam = clubPrimaryTeam.get(club.rowId) ?? null;
    const stadium = primaryTeam && primaryTeam.stadiumRowId >= 0 ? (rawStadiums.get(primaryTeam.stadiumRowId) ?? null) : null;
    const comp = primaryTeam && primaryTeam.compRowId >= 0 ? (rawComps.get(primaryTeam.compRowId) ?? null) : null;
    clubs.push({
      uid: club.uid,
      rowId: club.rowId,
      fullName: club.fullName,
      shortName: club.shortName || club.fullName,
      sixLetterName: club.sixLetterName,
      nickname: club.nickname,
      nationUid: nation?.uid ?? null,
      nationName: nation?.shortName || nation?.fullName || null,
      cityUid: club.cityRowId >= 0 ? (cityRowToUid.get(club.cityRowId) ?? null) : null,
      yearFounded: club.yearFounded,
      trainingFacilities: club.trainingFacilities,
      youthFacilities: club.youthFacilities,
      youthCoaching: club.youthCoaching,
      youthRecruitment: club.youthRecruitment,
      professionalStatus: club.professionalStatus,
      financeType: club.finance.financeType,
      balanceGbp: club.finance.balanceGbp,
      transferBudgetGbp: club.finance.transferBudgetGbp,
      transferBudgetSeasonGbp: club.finance.transferBudgetSeasonGbp,
      weeklyWageBillGbp: club.finance.weeklyWageBillGbp,
      weeklyWageBudgetGbp: club.finance.weeklyWageBudgetGbp,
      primaryStadiumUid: stadium?.uid ?? null,
      primaryCompUid: comp?.uid ?? null,
      firstTeamReputation: primaryTeam?.reputation ?? null,
      playerCount: clubPlayerCounts.get(club.rowId) ?? 0,
      staffCount: clubStaffCounts.get(club.rowId) ?? 0
    });
  }

  const teams: DecodedSaveTeam[] = [];
  for (const team of rawTeams.values()) {
    const owner = !team.isNationalTeam ? (rawClubs.get(team.ownerClubRowId) ?? null) : null;
    const stadium = team.stadiumRowId >= 0 ? (rawStadiums.get(team.stadiumRowId) ?? null) : null;
    const comp = team.compRowId >= 0 ? (rawComps.get(team.compRowId) ?? null) : null;
    teams.push({
      uid: team.uid,
      rowId: team.rowId,
      isNationalTeam: team.isNationalTeam,
      ownerClubUid: owner?.uid ?? null,
      ownerClubName: owner?.shortName || owner?.fullName || null,
      teamType: team.teamType,
      reputation: team.reputation,
      compUid: comp?.uid ?? null,
      stadiumUid: stadium?.uid ?? null,
      managerPersonUid: team.managerPersonRowId >= 0 ? (personRowToUid.get(team.managerPersonRowId) ?? null) : null
    });
  }

  const stadiums: DecodedSaveStadium[] = [];
  for (const stadium of rawStadiums.values()) {
    const owner = stadium.ownerClubRowId >= 0 ? (rawClubs.get(stadium.ownerClubRowId) ?? null) : null;
    const trimmed = stadium.customName.trim();
    stadiums.push({
      uid: stadium.uid,
      rowId: stadium.rowId,
      customName: trimmed || null,
      nameProvenance: trimmed ? 'decoded_save' : 'not_stored_in_save',
      capacity: stadium.capacity,
      seatingCapacity: stadium.seatingCapacity,
      expansionCapacity: stadium.expansionCapacity,
      ownerClubUid: owner?.uid ?? null,
      ownerClubName: owner?.shortName || owner?.fullName || null,
      cityUid: stadium.cityRowId >= 0 ? (cityRowToUid.get(stadium.cityRowId) ?? null) : null,
      latitude: Number.isFinite(stadium.latitude) && Math.abs(stadium.latitude) <= 90 ? stadium.latitude : null,
      longitude: Number.isFinite(stadium.longitude) && Math.abs(stadium.longitude) <= 180 ? stadium.longitude : null
    });
  }

  const nations: DecodedSaveNation[] = [];
  for (const nation of rawNations.values()) {
    nations.push({
      uid: nation.uid,
      rowId: nation.rowId,
      fullName: nation.fullName,
      shortName: nation.shortName || nation.fullName,
      playerCount: nationPlayerCounts.get(nation.rowId) ?? 0,
      clubCount: nationClubCounts.get(nation.rowId) ?? 0,
      staffCount: nationStaffCounts.get(nation.rowId) ?? 0
    });
  }

  const competitions: DecodedSaveCompetition[] = [];
  for (const comp of rawComps.values()) {
    const trimmed = comp.customName.trim();
    competitions.push({
      uid: comp.uid,
      rowId: comp.rowId,
      customName: trimmed || null,
      nameProvenance: trimmed ? 'decoded_save' : 'not_stored_in_save',
      teamCount: compTeamsCount.get(comp.rowId) ?? 0,
      sampleClubs: compSampleClubs.get(comp.rowId) ?? []
    });
  }

  const counts: DecodedSaveEntityCounts = {
    players: players.length,
    staff: staff.length,
    humans: staff.filter(s => s.isHuman).length,
    clubs: clubs.length,
    teams: teams.length,
    stadiums: stadiums.length,
    nations: nations.length,
    competitions: competitions.length,
    cities: cityCount,
    awards: awardCount,
    injuries: injuryCount,
    derbies: derbyCount,
    currencies: currencyCount,
    languages: languageCount,
    totalPersons
  };

  return {
    gameDbVersion: r.ver,
    headerGameDate,
    exactEof,
    counts,
    players,
    staff,
    clubs,
    teams,
    stadiums,
    nations,
    competitions,
    staffByRowId
  };
}
