import { describe, expect, it } from 'vitest';
import { parseFm2013Container } from './afe-container';
import { parseFm2013GameDb } from './game-db-parser';

describe('FM2013 offline admission boundaries', () => {
  it.each([4, 6, 65535])('rejects unrecognized outer version %i before directory parsing', async version => {
    const bytes = new Uint8Array(32);
    bytes.set([2, 1, 0x61, 0x66, 0x65, 0x2e]);
    new DataView(bytes.buffer).setUint16(6, version, true);
    await expect(parseFm2013Container(bytes)).rejects.toThrow('Unsupported FM2013 archive version');
  });

  it.each([0x758, 0x760, 0x772])('rejects unobserved database schema %i before table parsing', version => {
    const bytes = new Uint8Array(64);
    bytes.set([2, 1, 0x74, 0x61, 0x64, 0x2e]);
    new DataView(bytes.buffer).setUint16(6, version, true);
    expect(() => parseFm2013GameDb(bytes, null)).toThrow('Unsupported FM2013 game_db version');
  });
});
