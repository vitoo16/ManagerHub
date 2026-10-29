import { describe, expect, it } from 'vitest';
import { inspectArchiveIndex, parseArchiveDirectory } from './archive';

function syntheticIndex() {
  const data: number[] = [];
  const number = (n: number) => data.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
  const name = (s: string) => {
    number(s.length);
    for (const c of s) data.push(c.charCodeAt(0), 0);
    data.push(0, 0);
  };
  number(0); number(1);
  name('game_info'); name('.dat');
  number(0); number(128); number(256);
  return Uint8Array.from(data);
}
describe('bounded AFE/FM directory catalogue parser', () => {
  it('extracts only member metadata from valid index', () => {
    expect(parseArchiveDirectory(syntheticIndex(), 1000)).toEqual([
      {filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256}
    ]);
  });
  it('rejects member extents past the archive boundary', () => {
    expect(parseArchiveDirectory(syntheticIndex(), 64)).toBeNull();
  });
  it('rejects truncated directory data', () => {
    expect(parseArchiveDirectory(syntheticIndex().subarray(0, 16), 1000)).toBeNull();
  });
  it('rejects impossible number of entries', () => {
    const wrong = syntheticIndex();
    wrong[4] = 0xff; wrong[5] = 0xff;
    expect(parseArchiveDirectory(wrong, 1000)).toBeNull();
  });

  it('recognizes a bounded trailing FMF directory in a realistic save-shaped file', async () => {
    // A compact zlib-compressed directory fixture mirrors the real save's
    // trailing marker and UTF-16LE names without bundling any game-save bytes.
    const markerAndDirectory = Uint8Array.from([
      2, 1, 102, 109, 102, 46, 4, 0, 0,
      120, 156, 99, 96, 96, 96, 96, 2, 98, 78, 32, 78, 103, 72, 100, 200,
      101, 72, 101, 136, 103, 200, 100, 200, 99, 72, 99, 200, 7, 138, 177,
      0, 177, 30, 67, 10, 80, 166, 132, 1, 2, 26, 64, 4, 35, 3, 3, 59,
      138, 142, 20, 134, 36, 12, 213, 96, 149, 76, 16, 97, 0, 49, 181, 10, 84
    ]);
    const prefix = new Uint8Array(1024);
    const bytes = new Uint8Array(prefix.length + markerAndDirectory.length);
    bytes.set(prefix);
    bytes.set(markerAndDirectory, prefix.length);
    const file = new File([bytes], 'synthetic-career.fm');
    const index = await inspectArchiveIndex(file);
    expect(index).toMatchObject({
      family: 'fmf-index-candidate',
      evidence: 'experimental',
      memberCount: 2,
      directoryOffset: 1024,
      members: [
        { filename: 'game_info.dat', offset: 0, storedBytes: 128, reportedUncompressedBytes: 256 },
        { filename: 'game_db.dat', offset: 128, storedBytes: 512, reportedUncompressedBytes: 1024 }
      ]
    });
  });


  it('inspects a synthetic 69-member save archive end to end', async () => {
    const names = [
      'game_info.dat', 'save_game_summary.dat', 'game_db.dat', 'humans.dat',
      'news.dat', 'transfer_man.dat', 'shortlist_man.dat', 'MANAGER_MANAGER.dat',
      'tc_record_man.dat', 'tc_history_ls.dat', 'tc_records_history_ls.dat',
      'tc_league_history_ls.dat', 'tc_cup_history_ls.dat', 'tc_best_eleven_history_ls.dat',
      'tactics_man.dat', 'regeneration_manager.dat', 'edit_session_man.dat',
      'weather_manager.dat', 'fog_of_war.sav.dat', 'injury_manager.dat',
      'injury_histories_ls.dat', 'training_man.dat', 'scout_man.dat', 'awol.dat',
      'award_man.dat', 'award_year_hist_ls.dat', 'award_club_hist_ls.dat', 'fine.dat.dat',
      'contract_man.dat', 'person_record_history_ls.dat', 'person_record_manager.dat',
      'official_manager.dat', 'agent_manager.dat', 'dispute.dat', 'finance_manager.dat',
      'sim_stats.dat', 'virtual_man.dat', 'network_man.dat', 'hall_of_fame.dat',
      'backroom_feedback_manager.dat', 'interaction_manager.dat', 'press_conference_manager.dat',
      'job_centre.dat', 'team_talk_man.dat', 'board_takeover_manager.dat', 'feeder_man.dat',
      'captain_system.dat', 'media_man.dat', 'match_stats_cfg.dat', 'award_club_hist_dt.cmt',
      'award_club_hist_id.cmt', 'award_year_hist_dt.cmt', 'award_year_hist_id.cmt',
      'comp_history_dt.cmt', 'comp_history_id.cmt', 'injury_histories_dt.cmt',
      'injury_histories_id.cmt', 'person_db_changes.cmt', 'person_record_history_dt.cmt',
      'person_record_history_id.cmt', 'player_stats_hist_dt.cmt', 'player_stats_hist_id.cmt',
      'starting_club_debt_db.cmt', 'tc_cup_history_dt.cmt', 'tc_cup_history_id.cmt',
      'tc_history_dt.cmt', 'tc_history_id.cmt', 'tc_league_history_dt.cmt',
      'tc_league_history_id.cmt'
    ];
    expect(names).toHaveLength(69);

    const directory: number[] = [];
    const u32 = (value: number) => directory.push(
      value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255
    );
    const utf16 = (value: string) => {
      u32(value.length);
      for (const character of value) {
        const code = character.charCodeAt(0);
        directory.push(code & 255, (code >>> 8) & 255);
      }
      directory.push(0, 0);
    };

    u32(0);
    u32(names.length);
    names.forEach((name, index) => {
      const dot = name.lastIndexOf('.');
      utf16(name.slice(0, dot));
      utf16(name.slice(dot));
      u32(index * 16);
      u32(8);
      u32(16);
    });

    const directoryBytes = Uint8Array.from(directory);
    const compressedStream = new Blob([directoryBytes]).stream().pipeThrough(new CompressionStream('deflate'));
    const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer());
    const marker = Uint8Array.from([2, 1, 102, 109, 102, 46, 4, 0, 0]);
    const prefix = new Uint8Array(2048);
    const bytes = new Uint8Array(prefix.length + marker.length + compressed.length);
    bytes.set(prefix);
    bytes.set(marker, prefix.length);
    bytes.set(compressed, prefix.length + marker.length);

    const index = await inspectArchiveIndex(new File([bytes], 'synthetic-69-member.fm'));
    expect(index).not.toBeNull();
    expect(index?.memberCount).toBe(69);
    expect(index?.directoryOffset).toBe(2048);
    expect(index?.members[0]).toEqual({
      filename: 'game_info.dat', offset: 0, storedBytes: 8, reportedUncompressedBytes: 16
    });
    expect(index?.members[2]?.filename).toBe('game_db.dat');
    expect(index?.members[68]?.filename).toBe('tc_league_history_id.cmt');
  });

  it('ignores malformed trailing FMF markers instead of failing inspection', async () => {
    const bytes = Uint8Array.from([1, 2, 3, 2, 1, 102, 109, 102, 46, 4, 0, 0, 120, 0, 1, 2, 3]);
    const file = new File([bytes], 'malformed-career.fm');
    await expect(inspectArchiveIndex(file)).resolves.toBeNull();
  });
});
