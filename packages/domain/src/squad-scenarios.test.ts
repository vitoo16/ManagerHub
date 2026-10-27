import { describe, expect, it } from 'vitest';
import { compareSquadScenarios } from './squad-scenarios';
import { optimizeSquad } from './squad-optimizer';
import { ATTRIBUTE_GROUPS, type AttributeKey, type PlayerExport } from './player-import';
const attributes=Object.fromEntries([...new Set(Object.values(ATTRIBUTE_GROUPS).flat())].map(k=>[k,14])) as Record<AttributeKey,number>;
function player(id:string,position:string):PlayerExport {
  return {id,name:id,position,age:24,club:'Test United',nationality:null,attributes,source:'game_export',verification:'provisional'};
}
const squad=[
  player('gk','GK'),player('lb','D (L)'),player('cb1','D (C)'),player('cb2','D (C)'),
  player('rb','D (R)'),player('cm1','M (C)'),player('cm2','M (C)'),player('cm3','M (C)'),
  player('lw','AM (L)'),player('st','ST (C)'),player('rw','AM (R)'),player('reserve','M (C)')
];
describe('honest squad scenario comparisons',()=>{
  it('reports same XI without inventing effect',()=>{
    const a=optimizeSquad(squad,'4-3-3');
    const comparison=compareSquadScenarios(a,optimizeSquad(squad,'4-3-3'));
    expect(comparison).toMatchObject({comparable:true,changedSlots:0,changedPlayers:0,roleFitDelta:0});
  });
  it('tracks a changed candidate without duplicated player IDs',()=>{
    const a=optimizeSquad(squad,'4-3-3');
    const b=optimizeSquad(squad,'4-3-3',{lockedSlots:{lcm:'reserve'}});
    expect(b.complete).toBe(true);
    const comparison=compareSquadScenarios(a,b);
    expect(comparison.comparable).toBe(true);
    expect(comparison.changedSlots).toBeGreaterThan(0);
    expect(comparison.changedPlayers).toBe(1);
  });
  it('does not compare incomparable schemes or incomplete XI',()=>{
    const a=optimizeSquad(squad,'4-3-3');
    const b=optimizeSquad(squad,'4-2-3-1');
    expect(compareSquadScenarios(a,b).comparable).toBe(false);
    const c=optimizeSquad(squad,'4-3-3',{excludedPlayerIds:['gk']});
    expect(compareSquadScenarios(a,c).roleFitDelta).toBeNull();
  });
});
