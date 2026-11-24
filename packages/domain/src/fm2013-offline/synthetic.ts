import type { DecodedPositionRatings } from './types';

/**
 * Deterministic synthetic FM2013 `.fm` save builder for unit & E2E testing.
 * Generates genuine AFE/FMF containers (encrypted AES-128-CTR + compressed/uncompressed)
 * with complete 51-table `game_db.dat`, `save_game_summary.dat`, and `humans.dat`
 * — never containing or copying any real Sports Interactive save bytes.
 */
class BinaryWriter {
  private chunks: Uint8Array[] = [];
  private total = 0;

  private push(arr: Uint8Array): void {
    this.chunks.push(arr);
    this.total += arr.byteLength;
  }

  get length(): number { return this.total; }

  u8(v: number): void { this.push(Uint8Array.of(v & 0xff)); }
  i8(v: number): void { this.push(Uint8Array.of(v & 0xff)); }
  u16(v: number): void {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v, true);
    this.push(b);
  }
  i16(v: number): void {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setInt16(0, v, true);
    this.push(b);
  }
  u32(v: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v >>> 0, true);
    this.push(b);
  }
  i32(v: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, v | 0, true);
    this.push(b);
  }
  f32(v: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setFloat32(0, v, true);
    this.push(b);
  }
  zeros(n: number): void { if (n > 0) this.push(new Uint8Array(n)); }
  raw(bytes: Uint8Array): void { this.push(bytes); }

  date4(doy: number, year: number): void { this.i16(doy); this.u16(year); }
  date5(flag: number, doy: number, year: number): void { this.u8(flag); this.i16(doy); this.u16(year); }

  siStr(text: string): void {
    if (!text.length) { this.u32(0); return; }
    this.u32(text.length);
    const buf = new Uint8Array(text.length * 2 + 2);
    const dv = new DataView(buf.buffer);
    for (let i = 0; i < text.length; i++) dv.setUint16(i * 2, text.charCodeAt(i), true);
    dv.setUint16(text.length * 2, 0, true);
    this.push(buf);
  }

  dbRecord(rowId: number, uid: number): void {
    this.i32(rowId); this.i32(uid); this.i32(uid);
  }

  emptyTable(nextUid = 1): void {
    this.u32(0); this.u8(0); // cnt=0, fl=0
    this.u32(0); this.u8(1); this.u32(nextUid); // footer
  }

  tableFooter(nextUid: number): void {
    this.u32(0); this.u8(1); this.u32(nextUid);
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.total);
    let pos = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, pos);
      pos += chunk.byteLength;
    }
    return out;
  }
}

export interface SyntheticPlayerSpec {
  readonly uid: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDoy: number;
  readonly birthYear: number;
  readonly nationRow: number;
  readonly clubRow: number;
  readonly loanFromClubRow?: number;
  readonly ca: number;
  readonly pa: number;
  readonly rep: number;
  readonly wageGbp: number;
  readonly marketValueGbp: number;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly squadNumber: number;
  readonly positions: Partial<DecodedPositionRatings>;
  readonly baseAttr: number; // 1..20 display value
  readonly hiddenBase?: number;
  readonly personality?: readonly [number, number, number, number, number, number, number, number];
}

export interface SyntheticClubSpec {
  readonly uid: number;
  readonly fullName: string;
  readonly shortName: string;
  readonly nationRow: number;
  readonly yearFounded: number;
  readonly balanceGbp: number;
  readonly transferBudgetGbp: number;
  readonly weeklyWageBudgetGbp: number;
  readonly reputation: number;
}

export interface SyntheticFm2013SaveSpec {
  readonly gameVersion?: string;
  readonly gameDbVersion?: number;
  readonly compressed?: boolean;
  readonly family?: 'afe' | 'fmf';
  readonly gameDateDoy?: number;
  readonly gameDateYear?: number;
  readonly managerName?: string;
  readonly managerClubRow?: number;
  readonly clubs?: readonly SyntheticClubSpec[];
  readonly players?: readonly SyntheticPlayerSpec[];
}

async function deflateZlib(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new CompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    chunks.push(next.value);
    total += next.value.byteLength;
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.byteLength; }
  return out;
}

async function encryptAfeMember(plaintext: Uint8Array, seed: number): Promise<Uint8Array> {
  const key = new Uint8Array(16);
  const iv = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    key[i] = (seed * 31 + i * 17 + 7) & 0xff;
    iv[i] = (seed * 13 + i * 29 + 3) & 0xff;
  }
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CTR' }, false, ['encrypt']);
  const copy = new Uint8Array(plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: iv, length: 128 },
    cryptoKey,
    copy
  ));
  const out = new Uint8Array(40 + ct.byteLength);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 16, true);
  dv.setUint32(4, 16, true);
  out.set(key, 8);
  out.set(iv, 24);
  out.set(ct, 40);
  return out;
}

function defaultSyntheticClubs(): readonly SyntheticClubSpec[] {
  return [
    {
      uid: 9001, fullName: 'Northbridge Athletic', shortName: 'Northbridge',
      nationRow: 0, yearFounded: 1892, balanceGbp: 45_000_000,
      transferBudgetGbp: 18_500_000, weeklyWageBudgetGbp: 950_000, reputation: 8200
    },
    {
      uid: 9002, fullName: 'Harbor City FC', shortName: 'Harbor City',
      nationRow: 1, yearFounded: 1904, balanceGbp: 22_000_000,
      transferBudgetGbp: 9_200_000, weeklyWageBudgetGbp: 520_000, reputation: 7400
    }
  ];
}

function defaultSyntheticPlayers(): readonly SyntheticPlayerSpec[] {
  const club0Roster: readonly [number, string, string, Partial<DecodedPositionRatings>, number, number, number, number][] = [
    [10001, 'Liam', 'Carter', { GK: 20 }, 155, 168, 85_000, 1],
    [10002, 'Noah', 'Bennett', { DL: 20, WBL: 18 }, 148, 162, 62_000, 3],
    [10003, 'Ethan', 'Brooks', { DC: 20 }, 158, 170, 92_000, 4],
    [10004, 'Lucas', 'Hayes', { DC: 20 }, 152, 164, 78_000, 5],
    [10005, 'Mason', 'Reed', { DR: 20, WBR: 18 }, 150, 165, 70_000, 2],
    [10006, 'Oliver', 'Ward', { DM: 20, MC: 18 }, 160, 174, 105_000, 6],
    [10007, 'Henry', 'Cole', { MC: 20, DM: 16 }, 156, 171, 95_000, 8],
    [10008, 'Jack', 'Price', { MC: 20, AMC: 18 }, 162, 178, 115_000, 10],
    [10009, 'Theo', 'Foster', { AML: 20, ML: 18 }, 154, 172, 88_000, 11],
    [10010, 'Leo', 'Morgan', { AMR: 20, MR: 18 }, 159, 176, 98_000, 7],
    [10011, 'Owen', 'Shaw', { ST: 20, AMC: 15 }, 168, 182, 145_000, 9],
    [10012, 'Sam', 'Cooper', { ST: 18, AML: 17, AMR: 17 }, 144, 169, 45_000, 14]
  ];
  const players: SyntheticPlayerSpec[] = club0Roster.map(([uid, firstName, lastName, positions, ca, pa, wageGbp, squadNumber], idx) => ({
    uid, firstName, lastName,
    birthDoy: 100 + idx * 12, birthYear: 1986 + (idx % 7),
    nationRow: idx % 2, clubRow: 0,
    ...(uid === 10012 ? { loanFromClubRow: 1 } : {}),
    ca, pa, rep: 7200 + idx * 100, wageGbp,
    marketValueGbp: 5_000_000 + idx * 1_500_000,
    heightCm: 176 + (idx % 12), weightKg: 72 + (idx % 10),
    squadNumber, positions,
    baseAttr: Math.min(18, 13 + (idx % 4)),
    hiddenBase: 14,
    personality: [13, 16, 12, 15, 17, 11, 12, 8]
  }));
  // Add 2 players at Harbor City (club 1) for multi-club / recruitment comparison
  players.push(
    {
      uid: 20001, firstName: 'Mateo', lastName: 'Silva',
      birthDoy: 45, birthYear: 1989, nationRow: 1, clubRow: 1,
      ca: 164, pa: 179, rep: 7800, wageGbp: 90_000,
      marketValueGbp: 14_000_000, heightCm: 180, weightKg: 75,
      squadNumber: 9, positions: { ST: 20, AMC: 16 }, baseAttr: 16,
      hiddenBase: 15, personality: [15, 18, 11, 16, 16, 13, 14, 9]
    },
    {
      uid: 20002, firstName: 'Hugo', lastName: 'Navarro',
      birthDoy: 210, birthYear: 1991, nationRow: 1, clubRow: 1,
      ca: 149, pa: 175, rep: 6900, wageGbp: 52_000,
      marketValueGbp: 8_500_000, heightCm: 185, weightKg: 79,
      squadNumber: 4, positions: { DC: 20, DM: 15 }, baseAttr: 15,
      hiddenBase: 13, personality: [14, 15, 14, 14, 15, 12, 13, 7]
    }
  );
  return players;
}

function buildSyntheticGameDb(spec: Required<Pick<
  SyntheticFm2013SaveSpec,
  'gameDbVersion' | 'gameDateDoy' | 'gameDateYear' | 'managerName' | 'managerClubRow'
>> & { clubs: readonly SyntheticClubSpec[]; players: readonly SyntheticPlayerSpec[] }): Uint8Array {
  const w = new BinaryWriter();
  const ver = spec.gameDbVersion;
  // Header: \x02\x01tad. + u16(ver) + u8(0)
  w.raw(Uint8Array.of(0x02, 0x01, 0x74, 0x61, 0x64, 0x2e));
  w.u16(ver);
  w.u8(0);
  w.u32(0);
  if (ver >= 0x74e) w.u16(ver);
  for (let i = 0; i < 4; i++) w.date5(0, spec.gameDateDoy, spec.gameDateYear);
  w.u32(0); w.u32(0);
  w.i8(0); w.i8(0); w.u32(0); w.u32(0); w.u8(0);

  // T01 AWARD (0)
  w.emptyTable();
  // T02 CITY (2)
  w.u32(2); w.u8(0);
  for (let i = 0; i < 2; i++) {
    w.u8(0); w.u8(0); w.f32(51.5 + i); w.f32(-0.1 - i); w.u8(0); w.i32(i); w.i32(0);
    w.siStr(''); w.u8(0); w.i16(0); w.u8(0); w.i32(0); w.i32(0); w.u8(0);
    w.dbRecord(i, 500 + i);
  }
  w.tableFooter(502);

  // T03 CLUB
  w.u32(spec.clubs.length); w.u8(0);
  spec.clubs.forEach((club, rowId) => {
    w.u8(0); // tag=0 CLUB
    w.i32(club.nationRow); w.i32(-1); w.i32(club.nationRow); w.i32(rowId % 2); w.u8(0);
    w.siStr(''); // nickname
    w.u8(16); w.u8(15); w.u8(16); w.u16(club.yearFounded);
    w.zeros(4); w.u8(1); w.u8(16); w.zeros(9);
    w.i8(0); w.i8(0);
    // fin_type = 1 (FINANCE_FULL)
    w.i8(1);
    w.i32(club.transferBudgetGbp);
    w.i32(club.transferBudgetGbp);
    w.zeros(21 * 4);
    if (ver < 0x748) w.u8(0);
    w.u8(0);
    w.i32(0);
    w.i32(Math.round(club.weeklyWageBudgetGbp * 0.8)); // weeklyWageBill
    w.zeros(3 * 4);
    if (ver >= 0x748) { w.i32(0); w.u8(0); }
    w.zeros(4 * 4);
    w.i32(club.weeklyWageBudgetGbp);
    w.zeros(4 * 33 * 4 + 4 * 4 + 2);
    w.i32(0); w.zeros(8 + 5); w.i32(0); w.zeros(3); w.date4(0, 1900); w.date4(0, 1900);
    w.i8(0); w.i8(0);
    w.date4(0, 1900); w.u8(0); w.zeros(13 * 4);
    if (ver < 0x770) w.u8(0);
    w.date4(0, 1900); w.i32(0);
    if (ver >= 0x735) w.i32(0);
    if (ver >= 0x770) w.i32(0);
    // FINANCE_BASIC
    w.i32(club.balanceGbp); w.zeros(4); w.date4(0, 1900); w.date4(0, 1900); w.date4(0, 1900);
    if (ver >= 0x768) w.u8(0);
    if (ver < 0x748) { w.i32(0); w.date4(0, 1900); }
    w.i32(0); w.zeros(2); w.i32(0); w.i32(0); w.zeros(5 * 4); w.i32(0);
    // rest of CLUB
    w.i16(0); w.zeros(40);
    w.i8(0); w.i8(0); w.i8(0); w.i8(0);
    w.u8(0); w.u8(0);
    w.u8(0); w.i32(0); w.date4(0, 1900); w.date4(0, 1900); w.date4(0, 1900);
    w.i16(0); w.u8(0); w.date4(0, 1900); w.u8(0); w.date4(0, 1900); w.date4(0, 1900); w.u8(0);
    if (ver >= 0x761) w.u8(0);
    w.u8(0); w.zeros(24); w.date4(0, 1900); w.i32(0);
    w.i8(0); w.i32(0); w.i32(0);
    // CLUB_BASE
    w.zeros(4);
    w.siStr(club.fullName); w.siStr(club.shortName); w.siStr(club.shortName.slice(0, 6));
    w.i8(0); w.u16(0);
    w.i8(0); w.i8(0); w.i8(0); w.i8(0); w.i8(0);
    w.i16(0); w.i16(0); w.i8(0);
    w.zeros(29);
    w.i16(0); w.u8(0);
    w.dbRecord(rowId, club.uid);
  });
  w.tableFooter(9100);

  // T04 COMP (1)
  w.u32(1); w.u8(0);
  w.u8(0); w.u8(0); w.u8(0); w.zeros(11); w.u8(4); // ct=4 inline name!
  w.zeros(17); w.siStr('Premier Synthetic Division'); w.siStr('PSD');
  w.zeros(16); w.u16(0); w.i16(0); w.u8(0); w.zeros(6);
  if (ver >= 0x758) w.i32(0);
  w.u8(0); w.i32(0); w.u8(0); w.u8(0); w.u8(0); w.i32(0);
  if (ver >= 0x738) w.u8(0);
  w.i32(0); w.i16(0); w.zeros(24); w.u16(0); w.date4(0, 1900); w.date4(0, 1900); w.zeros(2);
  w.dbRecord(0, 7001);
  w.tableFooter(7002);

  // T05..T09 empty
  w.emptyTable(); // T05 CONTINENT
  w.emptyTable(); // T06 CURRENCY
  w.emptyTable(); // T07 INJURY
  w.emptyTable(); // T08 MEDIA_SOURCE
  w.emptyTable(); // T09 LANGUAGE

  // T10 NATION (2: England, Spain)
  const nationSpecs = [
    { uid: 765, name: 'England' },
    { uid: 796, name: 'Spain' }
  ];
  w.u32(nationSpecs.length); w.u8(0);
  nationSpecs.forEach((nat, rowId) => {
    w.u8(0); w.i16(0); w.zeros(40);
    if (ver >= 0x765) w.zeros(8);
    w.zeros(28);
    if (ver >= 0x765) w.zeros(8);
    w.zeros(29 + 38);
    w.i32(0); // variant map
    w.i32(0); w.u8(0); w.i8(0); w.i8(0); w.i16(0); w.i16(0);
    for (let a = 0; a < 16; a++) { w.i16(0); w.i8(0); }
    w.i16(0); w.i32(0); w.i16(0); w.i16(0); w.i16(0);
    w.i16(0); w.i32(0);
    if (ver >= 0x732) w.i32(0);
    if (ver >= 0x745) w.i16(0);
    w.u8(0); w.i32(0);
    if (ver >= 0x738) w.u8(0);
    w.zeros(6);
    if (ver >= 0x73b) w.u8(0);
    w.zeros(46);
    w.i8(0); w.i8(0); w.i8(0); w.i8(0);
    w.i32(0); w.i32(0); w.i32(0);
    w.zeros(83);
    w.i8(0); w.i8(0); w.i32(0);
    // CLUB_BASE
    w.zeros(4); w.siStr(nat.name); w.siStr(nat.name); w.siStr(nat.name.slice(0, 3).toUpperCase());
    w.i8(0); w.u16(0);
    w.i8(0); w.i8(0); w.i8(0); w.i8(0); w.i8(0); w.i16(0); w.i16(0); w.i8(0);
    w.zeros(29); w.i16(0); w.u8(0);
    w.dbRecord(rowId, nat.uid);
  });
  w.tableFooter(800);

  // Collect all unique first/last names (players + 1 coach + 1 human manager)
  const managerParts = spec.managerName.trim().split(/\s+/);
  const managerFirst = managerParts[0] || 'Alex';
  const managerLast = managerParts.slice(1).join(' ') || 'Manager';
  const firstList: string[] = [];
  const lastList: string[] = [];
  const addFirst = (s: string) => { const idx = firstList.indexOf(s); if (idx >= 0) return idx; firstList.push(s); return firstList.length - 1; };
  const addLast = (s: string) => { const idx = lastList.indexOf(s); if (idx >= 0) return idx; lastList.push(s); return lastList.length - 1; };

  const playerNameIds = spec.players.map(p => [addFirst(p.firstName), addLast(p.lastName)] as const);
  const coachFirstId = addFirst('Carlos');
  const coachLastId = addLast('Mendez');
  const mgrFirstId = addFirst(managerFirst);
  const mgrLastId = addLast(managerLast);

  // T11 NAME_FIRST
  w.u32(firstList.length); w.u8(0);
  firstList.forEach((s, i) => { w.u8(0); w.siStr(s); w.zeros(12); w.dbRecord(i, 30000 + i); });
  w.tableFooter(31000);
  // T12 NAME_SECOND
  w.u32(lastList.length); w.u8(0);
  lastList.forEach((s, i) => { w.u8(0); w.siStr(s); w.zeros(12); w.dbRecord(i, 40000 + i); });
  w.tableFooter(41000);
  // T13 NAME_COMMON (0)
  w.emptyTable();
  // T14 REGION, T15 LOCAL_REGION, T16 SPONSOR
  w.emptyTable(); w.emptyTable(); w.emptyTable();

  // T17 STADIUM (1 per club)
  w.u32(spec.clubs.length); w.u8(0);
  spec.clubs.forEach((club, rowId) => {
    w.u8(0);
    w.i32(55_000 - rowId * 15_000);
    w.i32(55_000 - rowId * 15_000);
    w.i32(75_000 - rowId * 15_000);
    w.i32(55_000 - rowId * 15_000);
    w.i32(rowId); // ownerClubRowId
    w.zeros(1 + 4 + 4 + 3 + 4 + 10 + 1 + 40 + 1 + 4 + 4 + 2 + 2 + 2 + 2);
    w.u8(0x10); // custom inline name flag
    w.siStr(`${club.shortName} Park`);
    w.u8(0); w.i32(rowId % 2); w.i32(0); w.i16(200); w.date4(0, 1920);
    w.f32(53.45); w.f32(-2.25);
    w.dbRecord(rowId, 8000 + rowId);
  });
  w.tableFooter(8100);

  // T18 STADIUM_CHANGE, T19 STAGE_NAME
  w.emptyTable(); w.emptyTable();

  // T20 TEAM (1 First Team per club)
  const humanPersonRowId = spec.players.length + 1;
  w.u32(spec.clubs.length); w.u8(0);
  spec.clubs.forEach((club, rowId) => {
    w.u8(10); // tag=10 TEAM
    w.u8(0); // teamType=0 First Team
    w.u8(0);
    w.i16(club.reputation); w.i16(club.reputation);
    w.i32(0); // compRowId=0
    w.i32(0); w.i32(-1);
    w.i32(rowId); // stadiumRowId
    w.i32(rowId === spec.managerClubRow ? humanPersonRowId : -1); // manager
    w.i32(-1);
    w.zeros(29);
    w.i16(0); w.i16(0); w.u8(0); w.i32(0);
    w.i32(0); w.i32(0); w.date4(0, 1900); w.date4(0, 1900);
    w.i32(0); w.zeros(3);
    if (ver >= 0x766) w.i32(0);
    // TEAM_BASE
    w.zeros(5); w.i32(rowId); // ownerClubRowId
    w.siStr(''); w.u8(0); w.siStr(''); w.u8(0);
    w.dbRecord(rowId, club.uid);
  });
  w.tableFooter(9100);

  // T21..T24 empty
  w.emptyTable(); w.emptyTable(); w.emptyTable(); w.emptyTable();

  const writeContractBase = (wageGbp: number, expYear: number, personRow: number, teamRow: number, jobType: number, squadNumber: number) => {
    w.i32(wageGbp); w.i32(0);
    if (ver >= 0x753) w.i32(0);
    w.date4(180, expYear); w.date4(0, 1900); w.zeros(3);
    w.i32(0);
    w.u8(0); w.date4(spec.gameDateDoy, spec.gameDateYear);
    w.u8(0); w.u8(0); w.u8(squadNumber); w.zeros(3);
    if (ver >= 0x75b) w.u16(0);
    else w.u8(0);
    w.i16(0);
    w.i32(personRow); w.i32(teamRow); w.u8(jobType); w.u8(0);
  };

  const writePersonJob = (teamRow: number, contracts: readonly { ctag: number; wage: number; expYear: number; teamRow: number; jobType: number; squadNo: number }[], personRow: number) => {
    w.i16(0); w.i32(-1); w.u8(12); w.u8(3); w.zeros(2);
    w.i32(-1); w.date4(0, 1900);
    w.i32(teamRow); w.date4(spec.gameDateDoy, spec.gameDateYear); w.u8(0);
    w.u8(0); w.i32(0); w.i32(-1);
    w.i8(contracts.length);
    for (const c of contracts) {
      w.u8(c.ctag);
      if (c.ctag === 0) {
        w.zeros(2); w.i16(0); w.i32(0); w.i32(0); w.zeros(2);
        w.i8(0); w.i8(0); w.u8(0);
        writeContractBase(c.wage, c.expYear, personRow, c.teamRow, c.jobType, c.squadNo);
      } else if (c.ctag === 1) {
        w.i16(0); w.i32(0); w.u8(0); w.u16(0); w.u8(0); w.u32(0); w.i32(0);
        writeContractBase(c.wage, c.expYear, personRow, c.teamRow, c.jobType, c.squadNo);
      }
    }
    w.i8(0); w.i8(0); w.i32(0); w.u8(0); w.i16(0);
    w.i16(0); w.date4(0, 1900); w.u8(0); w.date4(0, 1900); w.date4(0, 1900);
    w.i32(0); w.i32(0); w.date4(0, 1900); w.u8(0); w.date4(0, 1900);
    if (ver >= 0x73a) w.zeros(8);
  };

  const writeActualPerson = (fnRow: number, lnRow: number, fullName: string, birthDoy: number, birthYear: number, nationRow: number, personDataRow: number) => {
    w.i32(fnRow); w.i32(lnRow); w.i32(-1);
    w.siStr(fullName);
    w.date4(birthDoy, birthYear); w.zeros(3);
    w.i32(nationRow); w.i32(personDataRow); w.i32(0);
    w.u8(0); w.i8(0); w.date4(0, 1900); w.u8(0);
  };

  const writeNonPlayerBody = (rep: number, ca: number, pa: number, npdRow: number) => {
    w.i16(rep); w.i16(rep); w.i16(rep - 500); w.i16(ca); w.i16(pa);
    w.zeros(4); w.i32(npdRow); w.i32(0);
    if (ver >= 0x74c) w.i32(0);
    w.i32(0); w.u32(0); w.date4(0, 1900); w.u8(0);
    if (ver >= 0x742) w.u8(0);
    w.date4(0, 1900); w.date4(0, 1900);
    w.u8(0); w.u8(0); w.u8(0);
  };

  // T25 PERSON: players + 1 coach (tag=1) + 1 human manager (tag=9)
  const totalPersons = spec.players.length + 2;
  w.u32(totalPersons); w.u8(0);
  spec.players.forEach((p, idx) => {
    w.u8(2); // ACTUAL_PLAYER
    w.i16(p.rep); w.i16(p.rep); w.i16(p.rep - 400); w.i16(p.ca); w.i16(p.pa);
    w.i32(idx); // playingDataRowId
    w.i32(p.marketValueGbp);
    w.u8(15); // morale
    w.date4(spec.gameDateDoy, spec.gameDateYear);
    w.zeros(10); w.u8(1); w.i16(p.weightKg); w.i16(p.heightCm);
    w.zeros(8); w.u8(0); w.i32(0); w.i32(0); w.zeros(9);
    w.i8(0); w.i32(0); w.u8(0); w.i16(0); w.i16(0); w.u8(0); w.zeros(21);
    w.u8(0); w.i32(0); w.u8(0); w.i32(0); w.u8(0); w.i32(0); w.i32(0); w.u8(0);
    if (ver >= 0x73f) w.u8(0);
    w.date4(0, 1900); w.date4(0, 1900); w.date4(0, 1900); w.date4(0, 1900);
    w.siStr(''); w.u8(0); w.i32(0);
    if (ver < 0x73a) w.zeros(8);
    w.i32(0); w.date4(0, 1900); w.i32(0);
    w.u8(0); w.u8(0); w.u8(0); w.u8(0); w.i8(0); w.u8(0);
    w.i32(0); w.i32(0);
    w.date4(0, 1900); w.date4(0, 1900); w.i32(0); w.u8(0); w.i32(0); w.u8(0); w.i32(0); w.zeros(2); w.i16(0); w.zeros(2);

    const contracts = p.loanFromClubRow !== undefined
      ? [
          { ctag: 0, wage: p.wageGbp, expYear: 2016, teamRow: p.loanFromClubRow, jobType: 1, squadNo: 255 },
          { ctag: 1, wage: Math.round(p.wageGbp * 0.5), expYear: 2013, teamRow: p.clubRow, jobType: 1, squadNo: p.squadNumber }
        ]
      : [{ ctag: 0, wage: p.wageGbp, expYear: 2016, teamRow: p.clubRow, jobType: 1, squadNo: p.squadNumber }];
    writePersonJob(p.clubRow, contracts, idx);
    const [fnRow, lnRow] = playerNameIds[idx]!;
    writeActualPerson(fnRow, lnRow, `${p.firstName} ${p.lastName}`, p.birthDoy, p.birthYear, p.nationRow, idx);
    w.u32(0);
    w.dbRecord(idx, p.uid);
  });

  // Coach (tag=1)
  const coachRow = spec.players.length;
  w.u8(1);
  writeNonPlayerBody(6200, 142, 155, 0);
  writePersonJob(0, [{ ctag: 0, wage: 14_000, expYear: 2015, teamRow: 0, jobType: 3, squadNo: 255 }], coachRow);
  writeActualPerson(coachFirstId, coachLastId, 'Carlos Mendez', 120, 1974, 1, -1);
  w.u32(0);
  w.dbRecord(coachRow, 50001);

  // Human Manager (tag=9)
  const write17efdf0 = () => {
    w.u8(0);
    if (ver >= 0x764) w.u8(0);
    if (ver < 0x73d) w.u8(0);
    w.zeros(13);
    if (ver < 0x76c) w.zeros(8);
    w.zeros(3);
    if (ver >= 0x741) { w.u8(0); w.zeros(24); }
    for (let i = 0; i < 6; i++) {
      w.i32(0); w.zeros(2);
      if (ver >= 0x73d) w.u8(0);
      w.zeros(4);
    }
  };
  w.u8(9);
  w.u8(0); w.u8(0); w.i32(0);
  if (ver >= 0x75a) w.i32(0);
  w.zeros(6); w.date4(0, 1900); w.i32(0); w.zeros(2); w.siStr('');
  write17efdf0(); write17efdf0();
  w.u8(0); w.zeros(8 + 5);
  if (ver < 0x744) w.u8(0);
  w.i16(0); w.u8(0);
  w.zeros(16 * 8);
  w.u8(0); if (ver < 0x752) w.zeros(7);
  w.u8(0); if (ver < 0x752) w.zeros(8);
  w.i8(0); w.u16(0); w.u16(0);
  w.i32(0); w.i16(0); w.i16(0); w.date4(0, 1900); w.i32(0);
  w.i16(0); w.i16(0); w.i16(0);
  w.date4(0, 1900); w.date4(0, 1900); w.date4(0, 1900);
  if (ver >= 0x751) w.zeros(12);
  w.i32(0); w.i32(0);
  w.i32(0); w.i32(0);
  if (ver >= 0x749) { w.i32(0); w.i32(0); w.i32(0); w.i32(0); w.i32(0); w.i32(0); }
  w.i32(0);
  w.zeros(24); w.date4(0, 1900); w.u8(0);
  w.siStr(''); w.siStr(''); w.u8(0); w.siStr(''); w.siStr(''); w.siStr('');
  w.i16(0); w.u8(0);
  if (ver >= 0x73e) w.u32(0);
  if (ver >= 0x763) w.u32(0);
  if (ver >= 0x76e) w.u32(0);
  if (ver >= 0x755) w.u8(0);
  if (ver >= 0x759) w.i32(0);
  if (ver >= 0x75e) w.zeros(8);
  if (ver >= 0x769) w.date4(0, 1900);
  writeNonPlayerBody(7500, 150, 180, 1);
  writePersonJob(spec.managerClubRow, [{ ctag: 0, wage: 40_000, expYear: 2016, teamRow: spec.managerClubRow, jobType: 2, squadNo: 255 }], humanPersonRowId);
  writeActualPerson(mgrFirstId, mgrLastId, spec.managerName, 60, 1978, 0, -1);
  w.u32(0);
  w.dbRecord(humanPersonRowId, 60001);
  w.tableFooter(70000);

  // T26 PERSON_DATA (8 bytes per player)
  w.u32(spec.players.length); w.u8(0);
  spec.players.forEach((p, idx) => {
    w.u8(0);
    const pers = p.personality ?? [12, 14, 13, 15, 16, 11, 12, 8];
    for (const v of pers) w.u8(v);
    w.dbRecord(idx, p.uid);
  });
  w.tableFooter(70000);

  // T27 PLAYING_DATA (69 bytes per player)
  w.u32(spec.players.length); w.u8(0);
  spec.players.forEach((p, idx) => {
    w.u8(0);
    const pd = new Uint8Array(69);
    const posKeys: readonly (keyof DecodedPositionRatings)[] = [
      'GK', 'SW', 'DL', 'DC', 'DR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST', 'WBL', 'WBR'
    ];
    posKeys.forEach((key, pi) => { pd[pi] = p.positions[key] ?? 1; });
    for (let bi = 15; bi < 69; bi++) pd[bi] = Math.min(100, p.baseAttr * 5);
    pd[39] = 15 * 5; // leftFoot
    pd[40] = 20 * 5; // rightFoot
    const hb = Math.min(100, (p.hiddenBase ?? 14) * 5);
    pd[56] = hb; pd[59] = hb; pd[62] = hb; pd[63] = hb; pd[64] = hb;
    w.raw(pd);
    w.dbRecord(idx, p.uid);
  });
  w.tableFooter(70000);

  // T28 NON_PLAYING_DATA (2 records: coach + human)
  w.u32(2); w.u8(0);
  for (let i = 0; i < 2; i++) {
    w.u8(0); w.raw(new Uint8Array(0x29).fill(12)); w.dbRecord(i, 50001 + i * 10000);
  }
  w.tableFooter(70000);

  // T29..T51 empty (T50 skipped when ver < 0x756)
  const remainingTables = ver >= 0x756 ? 23 : 22;
  for (let t = 0; t < remainingTables; t++) w.emptyTable();

  // Post-table tail + 64-byte checksum
  w.i32(0); w.i32(0); w.i32(0); w.i32(0); w.i32(0); w.i32(-1);
  w.i32(0); // variant list
  w.i32(64); w.zeros(64);
  return w.toUint8Array();
}

function buildSyntheticSummary(spec: {
  gameVersion: string;
  managerName: string;
  clubShortName: string;
  gameDateDoy: number;
  gameDateYear: number;
}): Uint8Array {
  const w = new BinaryWriter();
  w.raw(Uint8Array.of(0x02, 0x01, 0x74, 0x61, 0x64, 0x2e));
  w.u16(2); w.u8(0);
  w.siStr('765,0,0,');
  w.siStr(spec.gameVersion);
  w.u8(1);
  w.i32(1);
  w.siStr(spec.managerName);
  w.siStr(spec.clubShortName);
  w.date4(spec.gameDateDoy, spec.gameDateYear);
  w.u32(0x44);
  return w.toUint8Array();
}

function buildSyntheticHumans(humanPersonRowId: number): Uint8Array {
  const w = new BinaryWriter();
  w.raw(Uint8Array.of(0x02, 0x01, 0x74, 0x61, 0x64, 0x2e));
  w.u16(5); w.u8(0);
  w.u16(1);
  w.i32(humanPersonRowId);
  w.i32(0);
  return w.toUint8Array();
}

export async function buildSyntheticFm2013Save(spec: SyntheticFm2013SaveSpec = {}): Promise<Uint8Array> {
  const gameVersion = spec.gameVersion ?? '13.3.3';
  const gameDbVersion = spec.gameDbVersion ?? 0x774;
  const compressed = spec.compressed ?? true;
  const family = spec.family ?? 'afe';
  const gameDateDoy = spec.gameDateDoy ?? 198; // 2012-07-17
  const gameDateYear = spec.gameDateYear ?? 2012;
  const managerName = spec.managerName ?? 'Alex Mercer';
  const managerClubRow = spec.managerClubRow ?? 0;
  const clubs = spec.clubs ?? defaultSyntheticClubs();
  const players = spec.players ?? defaultSyntheticPlayers();
  const managerClubShort = clubs[managerClubRow]?.shortName ?? clubs[0]?.shortName ?? 'Northbridge';

  const rawMembers: readonly [string, string, Uint8Array][] = [
    ['save_game_summary', '.dat', buildSyntheticSummary({ gameVersion, managerName, clubShortName: managerClubShort, gameDateDoy, gameDateYear })],
    ['humans', '.dat', buildSyntheticHumans(players.length + 1)],
    ['game_db', '.dat', buildSyntheticGameDb({ gameDbVersion, gameDateDoy, gameDateYear, managerName, managerClubRow, clubs, players })]
  ];

  const storedBlobs: Uint8Array[] = [];
  const dirWriter = new BinaryWriter();
  dirWriter.u32(0);
  dirWriter.u32(rawMembers.length);

  let relOffset = 0;
  for (let i = 0; i < rawMembers.length; i++) {
    const [stem, ext, uncomp] = rawMembers[i]!;
    const payload = compressed ? await deflateZlib(uncomp) : uncomp;
    const stored = family === 'afe' ? await encryptAfeMember(payload, i + 1) : payload;
    dirWriter.siStr(stem);
    dirWriter.siStr(ext);
    dirWriter.u32(relOffset);
    dirWriter.u32(stored.byteLength);
    dirWriter.u32(uncomp.byteLength);
    storedBlobs.push(stored);
    relOffset += stored.byteLength;
  }

  const dirCompressed = await deflateZlib(dirWriter.toUint8Array());
  const directoryOffset = 18 + relOffset;

  const out = new BinaryWriter();
  // Container header (18 bytes)
  if (family === 'afe') {
    out.raw(Uint8Array.of(0x02, 0x01, 0x61, 0x66, 0x65, 0x2e, 0x05, 0x00, 0x00));
  } else {
    out.raw(Uint8Array.of(0x02, 0x01, 0x66, 0x6d, 0x66, 0x2e, 0x05, 0x00, 0x00));
  }
  out.u32(directoryOffset);
  out.u32(0);
  out.u8(compressed ? 1 : 0);

  for (const blob of storedBlobs) out.raw(blob);

  // Trailing FMF v4 directory
  out.raw(Uint8Array.of(0x02, 0x01, 0x66, 0x6d, 0x66, 0x2e, 0x04, 0x00, 0x00));
  out.raw(dirCompressed);

  return out.toUint8Array();
}
