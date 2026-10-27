import { type PlayerExport } from './player-import';
import { ROLE_PROFILES, scoreRole } from './player-analysis';

type LineupPosition = 'GK' | 'LB' | 'RB' | 'CB' | 'CM' | 'DM' | 'AM' | 'LW' | 'RW' | 'ST';
export type FormationId = '4-3-3' | '4-2-3-1';

export interface LineupSlot {
  readonly id: string;
  readonly label: string;
  readonly position: LineupPosition;
  readonly roleId: string;
  readonly row: number; // 0 = attack, 3 = goalkeeper
  readonly column: number;
}

const CB_ROLE = 'centre-back';
const WB_ROLE = 'wing-back';
const CM_PLAYMAKER = 'deep-playmaker';

export const FORMATIONS: Record<FormationId, readonly LineupSlot[]> = {
  '4-3-3': [
    {id:'gk',label:'GK',position:'GK',roleId:'goalkeeper',row:3,column:2},
    {id:'lb',label:'LB',position:'LB',roleId:WB_ROLE,row:2,column:0},
    {id:'lcb',label:'LCB',position:'CB',roleId:CB_ROLE,row:2,column:1},
    {id:'rcb',label:'RCB',position:'CB',roleId:CB_ROLE,row:2,column:3},
    {id:'rb',label:'RB',position:'RB',roleId:WB_ROLE,row:2,column:4},
    {id:'lcm',label:'LCM',position:'CM',roleId:'box-to-box',row:1,column:1},
    {id:'cm',label:'CM',position:'CM',roleId:CM_PLAYMAKER,row:1,column:2},
    {id:'rcm',label:'RCM',position:'CM',roleId:'ball-winner',row:1,column:3},
    {id:'lw',label:'LW',position:'LW',roleId:'winger',row:0,column:0},
    {id:'st',label:'ST',position:'ST',roleId:'advanced-forward',row:0,column:2},
    {id:'rw',label:'RW',position:'RW',roleId:'winger',row:0,column:4}
  ],
  '4-2-3-1': [
    {id:'gk',label:'GK',position:'GK',roleId:'goalkeeper',row:3,column:2},
    {id:'lb',label:'LB',position:'LB',roleId:WB_ROLE,row:2,column:0},
    {id:'lcb',label:'LCB',position:'CB',roleId:CB_ROLE,row:2,column:1},
    {id:'rcb',label:'RCB',position:'CB',roleId:CB_ROLE,row:2,column:3},
    {id:'rb',label:'RB',position:'RB',roleId:WB_ROLE,row:2,column:4},
    {id:'ldm',label:'LDM',position:'DM',roleId:CM_PLAYMAKER,row:1,column:1},
    {id:'rdm',label:'RDM',position:'DM',roleId:'ball-winner',row:1,column:3},
    {id:'lw',label:'LW',position:'LW',roleId:'winger',row:0,column:0},
    {id:'am',label:'AM',position:'AM',roleId:'advanced-playmaker',row:0,column:2},
    {id:'rw',label:'RW',position:'RW',roleId:'winger',row:0,column:4},
    {id:'st',label:'ST',position:'ST',roleId:'advanced-forward',row:-1,column:2}
  ]
};

export interface SlotAssignment {
  readonly slot: LineupSlot;
  readonly playerId: string;
  readonly name: string;
  readonly roleScore: number;
  readonly coverage: number;
}
export interface SlotCoverage {
  readonly slot: LineupSlot;
  readonly eligibleCandidates: number;
  readonly scoredCandidates: number;
}
export interface SquadSolution {
  readonly formation: FormationId;
  readonly complete: boolean;
  readonly lineup: readonly SlotAssignment[];
  readonly diagnostics: readonly SlotCoverage[];
  readonly averageRoleScore: number | null;
  readonly reason: string | null;
  readonly model: 'role-fit-heuristic-v1';
}

/** Parse only explicitly declared, visible export positions. No inferred positional familiarity. */
export function declaredPositions(raw: string | null): ReadonlySet<LineupPosition> {
  const positions = new Set<LineupPosition>();
  if (!raw) return positions;
  const text = raw.toUpperCase().replace(/\s+/g,' ').trim();
  const direct: ReadonlyArray<LineupPosition> = ['GK','LB','RB','CB','CM','DM','AM','LW','RW','ST'];
  for (const token of text.split(/[,;]+/)) {
    const clean = token.trim();
    // Native position notation: "D (LC)", "AM (RL)", "M (C)", "ST (C)".
    const native = clean.match(/^(D|WB|DM|M|AM|ST|GK)\s*(?:\(([LCR]+)\))?$/);
    if (native) {
      const group = native[1];
      const sides = native[2] ?? '';
      if (group==='GK') positions.add('GK');
      if (group==='ST') positions.add('ST');
      if (group==='DM') positions.add('DM');
      if (group==='AM'&&sides.includes('C')) positions.add('AM');
      if (group==='AM'&&sides.includes('L')) positions.add('LW');
      if (group==='AM'&&sides.includes('R')) positions.add('RW');
      if (group==='M'&&sides.includes('C')) positions.add('CM');
      if (group==='M'&&sides.includes('L')) positions.add('LW');
      if (group==='M'&&sides.includes('R')) positions.add('RW');
      if ((group==='D'||group==='WB')&&sides.includes('L')) positions.add('LB');
      if ((group==='D'||group==='WB')&&sides.includes('R')) positions.add('RB');
      if (group==='D'&&sides.includes('C')) positions.add('CB');
      continue;
    }
    for (const symbol of clean.split(/\s*\/\s*/)) {
      if (direct.includes(symbol as LineupPosition)) positions.add(symbol as LineupPosition);
    }
  }
  return positions;
}

/** Hungarian minimum-cost matching; strict one-player-per-slot and no guessed player eligibility. */
function matchSlots(cost: readonly (readonly number[])[]): number[] | null {
  const n = cost.length;
  const m = cost[0]?.length ?? 0;
  if (m < n) return null;
  const u = new Float64Array(n+1);
  const v = new Float64Array(m+1);
  const p = new Int32Array(m+1);
  const way = new Int32Array(m+1);
  for (let i=1;i<=n;i++) {
    p[0]=i;
    let j0=0;
    const minv=new Float64Array(m+1).fill(Infinity);
    const used=new Uint8Array(m+1);
    do {
      used[j0]=1;
      const i0=p[j0]!;
      let delta=Infinity,j1=0;
      for (let j=1;j<=m;j++) {
        if (used[j]) continue;
        const current=(cost[i0-1]?.[j-1]??1e6)-u[i0]!-v[j]!;
        if (current<minv[j]!) {minv[j]=current;way[j]=j0;}
        if (minv[j]!<delta) {delta=minv[j]!;j1=j;}
      }
      if (!Number.isFinite(delta)) return null;
      for (let j=0;j<=m;j++) {
        if (used[j]) {u[p[j]!]+=delta;v[j]-=delta;}
        else minv[j]-=delta;
      }
      j0=j1;
    } while (p[j0]!==0);
    do {
      const j1=way[j0]!;
      p[j0]=p[j1]!;
      j0=j1;
    } while(j0!==0);
  }
  const selected=Array(n).fill(-1) as number[];
  for(let j=1;j<=m;j++) if(p[j]>0) selected[p[j]-1]=j-1;
  return selected.some((index,i)=>index<0||(cost[i]?.[index]??1e6)>=1e6)?null:selected;
}

export function optimizeSquad(players: readonly PlayerExport[], formation: FormationId): SquadSolution {
  const slots=FORMATIONS[formation];
  const seen=new Set<string>();
  const available=players.filter(player=>{
    if(seen.has(player.id))return false;
    seen.add(player.id);
    return true;
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const roles=new Map(ROLE_PROFILES.map(r=>[r.id,r]));
  const eligibilities=available.map(p=>declaredPositions(p.position));
  const matrices: { score: number | null; coverage: number; eligible: boolean }[][] = slots.map(slot => {
    const role=roles.get(slot.roleId);
    if(!role)throw new Error('Unknown role profile: '+slot.roleId);
    return available.map((player,i)=>{
      const eligible=eligibilities[i]!.has(slot.position);
      if(!eligible)return {score:null,coverage:0,eligible:false};
      const result=scoreRole(player,role);
      return {score:result.score,coverage:result.coverage,eligible};
    });
  });
  const diagnostics=slots.map((slot,i)=>({
    slot, eligibleCandidates:matrices[i]!.filter(entry=>entry.eligible).length,
    scoredCandidates:matrices[i]!.filter(entry=>entry.score!==null).length
  }));
  const candidateIndices=available.map((_,index)=>index)
    .filter(index=>matrices.some(row=>row[index]!.score!==null));
  const unmatchedReason='No complete 11-player assignment exists using declared positions and at least 65% of role attributes. Inspect slot coverage; missing/unknown values are not imputed.';
  if(candidateIndices.length<slots.length||diagnostics.some(d=>d.scoredCandidates===0))
    return {formation,complete:false,lineup:[],diagnostics,averageRoleScore:null,reason:unmatchedReason,model:'role-fit-heuristic-v1'};
  const cost=matrices.map(row=>candidateIndices.map(index=>{
    const score=row[index]!.score;
    return score===null?1e6:100-score;
  }));
  const matches=matchSlots(cost);
  if(!matches)return {formation,complete:false,lineup:[],diagnostics,averageRoleScore:null,reason:unmatchedReason,model:'role-fit-heuristic-v1'};
  const lineup=matches.map((index,slotIndex)=>{
    const slot=slots[slotIndex]!;
    const playerIndex=candidateIndices[index]!;
    const player=available[playerIndex]!;
    const scoring=matrices[slotIndex]![playerIndex]!;
    return {slot,playerId:player.id,name:player.name,roleScore:scoring.score!,coverage:scoring.coverage};
  });
  return {formation,complete:true,lineup,diagnostics,
    averageRoleScore:Math.round(lineup.reduce((sum,entry)=>sum+entry.roleScore,0)/lineup.length*10)/10,
    reason:null,model:'role-fit-heuristic-v1'};
}
