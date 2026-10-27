import {describe,expect,it} from 'vitest';
import { declaredPositions, optimizeSquad, eligibleSlotCandidates, FORMATIONS, type SquadConstraints } from './squad-optimizer';
import { ATTRIBUTE_GROUPS, type AttributeKey, type PlayerExport } from './player-import';

const allKeys=[...new Set(Object.values(ATTRIBUTE_GROUPS).flat())] as AttributeKey[];
const sampleAttributes=Object.fromEntries(allKeys.map(key=>[key,15])) as Record<AttributeKey,number>;
function player(id:string,position:string):PlayerExport {
  return {id,name:id,position,age:24,club:'Example Club',nationality:null,
    attributes:sampleAttributes,source:'game_export',verification:'provisional'};
}
const roster=[
  player('goalkeeper','GK'),player('left-back','D (L)'),player('centre-back-a','D (C)'),
  player('centre-back-b','D (C)'),player('right-back','D (R)'),
  player('cm-a','M (C)'),player('cm-b','M (C)'),player('cm-c','M (C)'),
  player('left-wing','AM (L)'),player('right-wing','AM (R)'),player('striker','ST (C)')
];
describe('versioned export-only squad assignment',()=>{
  it('understands visible FM notation without assuming unknown familiarity',()=>{
    expect([...declaredPositions('D (RC), M (C), AM (L)')].sort()).toEqual(['CB','CM','LW','RB']);
    expect([...declaredPositions('')]).toEqual([]);
    expect([...declaredPositions('Not available')]).toEqual([]);
  });
  it('builds exactly 11 distinct assignments for the 4-3-3 profile',()=>{
    const result=optimizeSquad(roster,'4-3-3');
    expect(result.complete).toBe(true);
    expect(result.lineup).toHaveLength(11);
    expect(new Set(result.lineup.map(x=>x.playerId)).size).toBe(11);
    expect(result.averageRoleScore).toBeGreaterThan(0);
    expect(result.model).toBe('role-fit-heuristic-v1');
  });
  it('fails closed when the only goalkeeping candidate disappears',()=>{
    const result=optimizeSquad(roster.slice(1),'4-3-3');
    expect(result.complete).toBe(false);
    expect(result.lineup).toHaveLength(0);
    expect(result.diagnostics.find(x=>x.slot.id==='gk')?.scoredCandidates).toBe(0);
  });
  it('does not invent role fit when attributes are absent',()=>{
    const sparse=roster.map(p=>({...p,attributes:{passing:20}}));
    const result=optimizeSquad(sparse,'4-3-3');
    expect(result.complete).toBe(false);
    expect(result.averageRoleScore).toBeNull();
  });
  it('respects the different midfield shape for 4-2-3-1',()=>{
    const extended=[...roster,player('defensive-a','DM'),player('defensive-b','DM'),player('attacking-centre','AM (C)')];
    const result=optimizeSquad(extended,'4-2-3-1');
    expect(result.complete).toBe(true);
    expect(result.lineup.find(x=>x.slot.id==='am')?.playerId).toBe('attacking-centre');
    expect(new Set(result.lineup.map(x=>x.playerId)).size).toBe(11);
  });
  it('returns deterministic selections on unchanged data',()=>{
    const first=optimizeSquad(roster,'4-3-3');
    const second=optimizeSquad([...roster].reverse(),'4-3-3');
    expect(first.lineup.map(x=>x.playerId)).toEqual(second.lineup.map(x=>x.playerId));
  });
  it('pins a versatile player to exactly one slot, recalculating every other assignment',()=>{
    const versatile=player('versatile','D (R), AM (R)');
    const withBench=[...roster,versatile];
    const result=optimizeSquad(withBench,'4-3-3',{lockedSlots:{rb:'versatile'}});
    expect(result.complete).toBe(true);
    expect(result.lineup.find(x=>x.slot.id==='rb')?.playerId).toBe('versatile');
    expect(result.lineup.find(x=>x.slot.id==='rw')?.playerId).toBe('right-wing');
    expect(new Set(result.lineup.map(x=>x.playerId)).size).toBe(11);
  });
  it('allows a strict excluded-player what-if if replacement is eligible',()=>{
    const result=optimizeSquad([...roster,player('stand-in','GK')],'4-3-3',
      {excludedPlayerIds:['goalkeeper']});
    expect(result.complete).toBe(true);
    expect(result.lineup.find(x=>x.slot.id==='gk')?.playerId).toBe('stand-in');
  });
  it('fails closed on duplicate pins, exclusion conflict and unknown slot',()=>{
    const list=[...roster,player('versatile','D (R), AM (R)')];
    const invalid: SquadConstraints[]=[
      {lockedSlots:{rb:'versatile',rw:'versatile'}},
      {lockedSlots:{rb:'versatile'},excludedPlayerIds:['versatile']},
      {lockedSlots:{abc:'right-back'}}
    ];
    for(const constraints of invalid){
      const result=optimizeSquad(list,'4-3-3',constraints);
      expect(result.complete).toBe(false);
      expect(result.reason).toBeTruthy();
      expect(result.lineup).toEqual([]);
    }
  });
  it('rejects pinning players without exported suitability and filters eligible candidates',()=>{
    const sparse=[...roster,player('low-data','D (R)')];
    const target=sparse.map(p=>p.id==='low-data'?{...p,attributes:{passing:20}}:p);
    const result=optimizeSquad(target,'4-3-3',{lockedSlots:{rb:'low-data'}});
    expect(result.complete).toBe(false);
    expect(result.reason).toMatch(/not eligible|lacks/i);
    const ranked=eligibleSlotCandidates(target,FORMATIONS['4-3-3'].find(s=>s.id==='rb')!,'right');
    expect(ranked.map(x=>x.playerId)).toContain('right-back');
    expect(ranked.map(x=>x.playerId)).not.toContain('low-data');
  });
  it('reports impossible exclusions rather than generating a reduced lineup',()=>{
    const result=optimizeSquad(roster,'4-3-3',{excludedPlayerIds:['goalkeeper']});
    expect(result.complete).toBe(false);
    expect(result.lineup).toEqual([]);
  });

});
