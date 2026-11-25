import { FM2013DecodeError } from './types';

const utf16Decoder = new TextDecoder('utf-16le', { fatal: false });
const MAX_STRING_CHARS = 100_000;
const MAX_TABLE_FOOTER_RECORDS = 2_000_000;

export interface SiDate4 {
  readonly dayOfYear: number;
  readonly year: number;
}

export interface SiDate5 {
  readonly flag: number;
  readonly dayOfYear: number;
  readonly year: number;
}

export interface DbRecordIds {
  readonly rowId: number;
  readonly uid: number;
  readonly dbId: number;
}

export interface TableFooter {
  readonly deletedCount: number;
  readonly flag: number;
  readonly nextUid: number;
}

/**
 * Convert Sports Interactive's (dayOfYear, year) representation into YYYY-MM-DD.
 * dayOfYear is 0-indexed from January 1 (verified 4,058/4,058 exact on FM13-LOCAL-01).
 */
export function siDateToIso(dayOfYear: number, year: number): string | null {
  if (!Number.isInteger(dayOfYear) || !Number.isInteger(year)) return null;
  if (year < 1850 || year > 2200 || dayOfYear < 0 || dayOfYear > 366) return null;
  const date = new Date(Date.UTC(year, 0, 1 + dayOfYear));
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() !== year) return null;
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoToSiDate(iso: string): SiDate4 | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1850 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const jan1 = Date.UTC(year, 0, 1);
  const dayOfYear = Math.round((date.getTime() - jan1) / 86_400_000);
  if (dayOfYear < 0 || dayOfYear > 366) return null;
  return { dayOfYear, year };
}

export class Fm2013BinaryReader {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  cursor = 0;
  ver = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get length(): number {
    return this.bytes.byteLength;
  }

  get remaining(): number {
    return this.bytes.byteLength - this.cursor;
  }

  private ensure(size: number): void {
    if (size < 0 || this.cursor + size > this.bytes.byteLength) {
      throw new FM2013DecodeError(
        'TRUNCATED_DATABASE',
        `Unexpected end of FM2013 binary stream at offset ${this.cursor} (needed ${size} bytes, length ${this.bytes.byteLength}).`
      );
    }
  }

  u8(): number {
    this.ensure(1);
    return this.bytes[this.cursor++]!;
  }

  i8(): number {
    this.ensure(1);
    const v = this.view.getInt8(this.cursor);
    this.cursor += 1;
    return v;
  }

  u16(): number {
    this.ensure(2);
    const v = this.view.getUint16(this.cursor, true);
    this.cursor += 2;
    return v;
  }

  i16(): number {
    this.ensure(2);
    const v = this.view.getInt16(this.cursor, true);
    this.cursor += 2;
    return v;
  }

  u32(): number {
    this.ensure(4);
    const v = this.view.getUint32(this.cursor, true);
    this.cursor += 4;
    return v;
  }

  i32(): number {
    this.ensure(4);
    const v = this.view.getInt32(this.cursor, true);
    this.cursor += 4;
    return v;
  }

  f32(): number {
    this.ensure(4);
    const v = this.view.getFloat32(this.cursor, true);
    this.cursor += 4;
    return v;
  }

  skip(n: number): void {
    if (!Number.isSafeInteger(n) || n < 0) {
      throw new FM2013DecodeError('CORRUPT_DATABASE', `Invalid skip length ${n} at offset ${this.cursor}.`);
    }
    this.ensure(n);
    this.cursor += n;
  }

  subarray(n: number): Uint8Array {
    this.ensure(n);
    const slice = this.bytes.subarray(this.cursor, this.cursor + n);
    this.cursor += n;
    return slice;
  }

  date4(): SiDate4 {
    const dayOfYear = this.i16();
    const year = this.u16();
    return { dayOfYear, year };
  }

  date5(): SiDate5 {
    const flag = this.u8();
    const dayOfYear = this.i16();
    const year = this.u16();
    return { flag, dayOfYear, year };
  }

  siStr(): string {
    const charCount = this.u32();
    if (charCount === 0) return '';
    if (charCount > MAX_STRING_CHARS) {
      throw new FM2013DecodeError(
        'CORRUPT_DATABASE',
        `String length ${charCount} exceeds safe bound at offset ${this.cursor - 4}.`
      );
    }
    const byteLen = charCount * 2;
    this.ensure(byteLen + 2);
    const text = utf16Decoder.decode(this.bytes.subarray(this.cursor, this.cursor + byteLen));
    this.cursor += byteLen;
    const terminator = this.u16();
    if (terminator !== 0) {
      throw new FM2013DecodeError(
        'CORRUPT_DATABASE',
        `Expected UTF-16 null terminator after string at offset ${this.cursor - 2}, got 0x${terminator.toString(16)}.`
      );
    }
    return text;
  }

  dbRecord(): DbRecordIds {
    const rowId = this.i32();
    const uid = this.i32();
    const dbId = this.i32();
    return { rowId, uid, dbId };
  }

  tableFooter(): TableFooter {
    const deletedCount = this.u32();
    if (deletedCount > MAX_TABLE_FOOTER_RECORDS) {
      throw new FM2013DecodeError(
        'CORRUPT_DATABASE',
        `Table footer count ${deletedCount} exceeds safe bound at offset ${this.cursor - 4}.`
      );
    }
    this.skip(deletedCount * 12);
    const flag = this.u8();
    const nextUid = this.u32();
    return { deletedCount, flag, nextUid };
  }
}
