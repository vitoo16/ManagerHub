import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS, type AttributeKey, type PlayerExport } from './player-import';

export interface ScoredRole {
  readonly id: string;
  readonly title: string;
  readonly slot: string;
  readonly score: number | null;  // 0–100 derived index, NOT FM CA
  readonly coverage: number;
  readonly evidence: readonly { attribute: AttributeKey; value: number; weight: number }[];
  readonly missing: readonly AttributeKey[];
}
export interface RoleProfile {
  readonly id: string;
  readonly title: string;
  readonly slot: string;
  readonly demands: Readonly<Partial<Record<AttributeKey, number>>>;
}
/** Product-designed role heuristics, not Sports Interactive's underlying match engine. */
export const ROLE_PROFILES: readonly RoleProfile[] = [
  {id:'advanced-forward',title:'Advanced Forward',slot:'ST',demands:{finishing:3,offTheBall:3,acceleration:2,pace:2,anticipation:2,composure:2,firstTouch:1}},
  {id:'target-forward',title:'Target Forward',slot:'ST',demands:{strength:3,heading:3,jumpingReach:2,bravery:2,firstTouch:2,teamwork:1,finishing:1}},
  {id:'winger',title:'Winger',slot:'AM (L/R)',demands:{dribbling:3,crossing:3,acceleration:2,pace:2,agility:1,offTheBall:2,firstTouch:1}},
  {id:'advanced-playmaker',title:'Advanced Playmaker',slot:'AM/CM',demands:{passing:3,vision:3,decisions:2,firstTouch:2,technique:2,composure:1,flair:1}},
  {id:'deep-playmaker',title:'Deep-Lying Playmaker',slot:'CM/DM',demands:{passing:3,vision:3,decisions:2,composure:2,firstTouch:2,teamwork:1,positioning:1}},
  {id:'box-to-box',title:'Box-to-Box Midfielder',slot:'CM',demands:{stamina:3,workRate:3,teamwork:2,offTheBall:2,positioning:2,passing:1,tackling:1}},
  {id:'ball-winner',title:'Ball-Winning Midfielder',slot:'CM/DM',demands:{tackling:3,positioning:3,workRate:2,aggression:2,stamina:2,anticipation:1,teamwork:1}},
  {id:'centre-back',title:'Central Defender',slot:'CB',demands:{marking:3,tackling:3,positioning:3,heading:2,jumpingReach:2,concentration:2,strength:1}},
  {id:'wing-back',title:'Wing-Back',slot:'D/WB',demands:{crossing:3,stamina:3,pace:2,workRate:2,acceleration:2,positioning:1,tackling:1}},
  {id:'goalkeeper',title:'Goalkeeper',slot:'GK',demands:{handling:3,reflexes:3,oneOnOnes:2,aerialReach:2,communication:2,positioning:2,concentration:1}}
];

/**
 * Returns a role attribute-fit estimate, not native positional familiarity.
 * Score is suppressed when fewer than 65% weighted requirements are observed.
 */
export function scoreRole(player:PlayerExport,role:RoleProfile):ScoredRole {
  const demands=Object.entries(role.demands) as [AttributeKey,number][];
  const total=demands.reduce((sum,[,w])=>sum+w,0);
  let seen=0,sum=0;
  const evidence:ScoredRole['evidence'][number][]=[];
  const missing:AttributeKey[]=[];
  for(const [attribute,weight] of demands){
    const value=player.attributes[attribute];
    if(value===undefined){missing.push(attribute);continue;}
    evidence.push({attribute,value,weight});
    seen+=weight;sum+=((value-1)/19)*weight;
  }
  const coverage=total?seen/total:0;
  const score=coverage>=0.65 && seen>0 ? Math.round((sum/seen)*100):null;
  return {id:role.id,title:role.title,slot:role.slot,score,coverage,evidence,missing};
}
export function analyzeRoles(player:PlayerExport):ScoredRole[] {
  return ROLE_PROFILES.map(profile=>scoreRole(player,profile))
    .sort((a,b)=>(b.score??-1)-(a.score??-1)||b.coverage-a.coverage);
}
export interface AttributeInsight { readonly key: AttributeKey; readonly label:string;readonly value:number;}
export function getAttributeInsights(player:PlayerExport): { strongest:AttributeInsight[]; weakest:AttributeInsight[] } {
  const observations=(Object.entries(player.attributes) as [AttributeKey,number][])
    .filter(([,value])=>Number.isInteger(value)&&value>=1&&value<=20)
    .map(([key,value])=>({key,label:ATTRIBUTE_LABELS[key],value}));
  return {
    strongest:[...observations].sort((a,b)=>b.value-a.value).slice(0,4),
    weakest:[...observations].sort((a,b)=>a.value-b.value).slice(0,4)
  };
}
/**
 * Generic attributes-only summary, never eCA on the 1–200 scale.
 * No imputation or predicted PA.
 */
export function attributeStrengthIndex(player:PlayerExport): { index:number|null; observed:number } {
  const values=Object.values(player.attributes).filter((n):n is number=>typeof n==='number'&&n>=1&&n<=20);
  return {index:values.length>=8?Math.round(values.reduce((a,b)=>a+(b-1)/19,0)/values.length*100):null,observed:values.length};
}
export interface AttributeGroupSummary{readonly name:string;readonly score:number|null;readonly observed:number;}
export function attributeGroupSummary(player:PlayerExport):AttributeGroupSummary[] {
  return Object.entries(ATTRIBUTE_GROUPS).map(([name,keys])=>{
    const values=keys.map(key=>player.attributes[key]).filter((x):x is number=>typeof x==='number');
    return {name,score:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null,observed:values.length};
  });
}
