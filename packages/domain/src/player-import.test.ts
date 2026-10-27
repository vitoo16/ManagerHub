import {describe,expect,it} from 'vitest';
import { parseRows,parsePlayerExport } from './player-import';
import {scoreRole,ROLE_PROFILES,analyzeRoles,attributeStrengthIndex} from './player-analysis';

const all = [
  'Name;Position;Age;Club;Passing;Vision;Decisions;First Touch;Technique;Composure;Teamwork;Positioning;Tackling;Pace;Stamina;Work Rate',
  '"An, Example";DM;22;Fiction FC;19;18;17;17;16;16;14;9;5;11;12;11',
  'Ball Winner;DM;28;Fiction FC;12;9;13;10;10;11;17;18;19;14;19;19'
].join('\r\n');

describe('CSV/TSV export reader',()=>{
  it('detects semicolon and handles quoted delimiters',()=>{
    const result=parsePlayerExport(all,'roster.csv','2026-01-01');
    expect(result.players).toHaveLength(2);
    expect(result.players[0]?.name).toBe('An, Example');
    expect(result.players[0]?.attributes.passing).toBe(19);
    expect(result.players[0]?.source).toBe('game_export');
    expect(result.actualCaAvailable).toBe(false);
  });
  it('handles tabs, quotes, newlines and BOM',()=>{
    const rows=parseRows('\uFEFFName\tPassing\n"A ""Star"""\t15\n"Two\nLines"\t9');
    expect(rows).toEqual([['Name','Passing'],['A "Star"','15'],['Two\nLines','9']]);
  });
  it('never treats masked or scouted ranges as exact attributes',()=>{
    const result=parsePlayerExport('Name,Passing,Vision,Decisions\nHidden,16-18,-,21\nKnown,15,17,11','x.csv');
    expect(result.players[0]?.attributes).toEqual({});
    expect(result.players[1]?.attributes).toEqual({passing:15,vision:17,decisions:11});
  });
  it('rejects bad headers or malicious format',()=>{
    expect(()=>parsePlayerExport('Foo;Bar\nA;1','no-name.csv')).toThrow(/Name/);
    expect(()=>parseRows('Name;Passing\n"Unterminated;12')).toThrow(/Unclosed/);
  });
  it('treats export CA/PA columns as unverified and ignores them',()=>{
    const d=parsePlayerExport('Name;Passing;CA;PA\nMister;15;189;200','x.csv');
    expect(d.warnings.some(x=>x.includes('CA/PA-like'))).toBe(true);
    expect(d.players[0]?.attributes).toEqual({passing:15});
  });
});
describe('role and ability estimates are explainable, not game CA',()=>{
  const [playmaker,winner]=parsePlayerExport(all,'sample.csv').players;
  it('prefers the creative midfielder for deep playmaker role',()=>{
    const role=ROLE_PROFILES.find(x=>x.id==='deep-playmaker')!;
    expect(scoreRole(playmaker!,role).score).toBeGreaterThan(scoreRole(winner!,role).score??0);
  });
  it('prioritizes defensive specialist in ball winning role',()=>{
    const role=ROLE_PROFILES.find(x=>x.id==='ball-winner')!;
    expect(scoreRole(winner!,role).score).toBeGreaterThan(scoreRole(playmaker!,role).score??0);
  });
  it('reports insufficient data rather than inventing scores',()=>{
    const tiny=parsePlayerExport('Name;Passing\nUnknown;20','small.csv').players[0]!;
    expect(analyzeRoles(tiny).every(x=>x.score===null)).toBe(true);
    expect(attributeStrengthIndex(tiny)).toEqual({index:null,observed:1});
  });
  it('reports role evidence and missing fields',()=>{
    const p=scoreRole(playmaker!,ROLE_PROFILES[3]!);
    expect(p.evidence.length).toBeGreaterThan(0);
    expect(p.coverage).toBeGreaterThan(0.65);
    expect(p.id).toBe('advanced-playmaker');
  });
});
