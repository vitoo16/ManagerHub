import type { AttributeKey } from './player-import';

export interface RoleProfile {
  readonly id: string;
  readonly title: string;
  readonly slot: string;
  readonly demands: Readonly<Partial<Record<AttributeKey, number>>>;
}

export const FM2013_ROLE_POSITIONS = ['GK', 'SW', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'] as const;
export type RolePosition = typeof FM2013_ROLE_POSITIONS[number];
export type RoleDuty = 'defend' | 'support' | 'attack' | 'stopper' | 'cover' | 'automatic';

export interface EditionRole extends RoleProfile {
  readonly edition: 'FM2013';
  readonly nativeTitle: string;
  readonly positions: readonly RolePosition[];
  readonly duties: readonly RoleDuty[];
  readonly dutyImportance: Readonly<Partial<Record<RoleDuty, RoleProfile['demands']>>>;
  readonly baseline: boolean;
  readonly provenance: 'community-reference';
  readonly importanceModel: 'managerhub-role-importance-v1';
}

function entry(profile: RoleProfile, nativeTitle: string, positions: readonly RolePosition[], duties: readonly RoleDuty[],
  dutyImportance: EditionRole['dutyImportance'], baseline = false): EditionRole {
  return { ...profile, edition: 'FM2013', nativeTitle, positions, duties, dutyImportance, baseline,
    provenance: 'community-reference', importanceModel: 'managerhub-role-importance-v1' };
}

/** Community-documented FM13 candidates. Native per-build menu parity remains unverified.
 * Importance numbers are ManagerHub-authored, NOT SI values or CA costs.
 * Existing ten generic baseline scores and IDs are intentionally unchanged.
 */
const FM2013_ROLES: readonly EditionRole[] = [
  entry({id:'advanced-forward',title:'Advanced Forward',slot:'ST',demands:{finishing:3,offTheBall:3,acceleration:2,pace:2,anticipation:2,composure:2,firstTouch:1}}, "Advanced Forward", ["ST"], ["attack"], {}, true),
  entry({id:'target-forward',title:'Target Forward',slot:'ST',demands:{strength:3,heading:3,jumpingReach:2,bravery:2,firstTouch:2,teamwork:1,finishing:1}}, "Target Man", ["ST"], ["support","attack"], {"support":{"teamwork":3},"attack":{"finishing":3,"composure":2}}, true),
  entry({id:'winger',title:'Winger',slot:'AM (L/R)',demands:{dribbling:3,crossing:3,acceleration:2,pace:2,agility:1,offTheBall:2,firstTouch:1}}, "Winger", ["ML","MR","AML","AMR"], ["support","attack"], {"support":{"crossing":3},"attack":{"dribbling":3,"offTheBall":3}}, true),
  entry({id:'advanced-playmaker',title:'Advanced Playmaker',slot:'AM/CM',demands:{passing:3,vision:3,decisions:2,firstTouch:2,technique:2,composure:1,flair:1}}, "Advanced Playmaker", ["MC","AMC","AML","AMR"], ["support","attack"], {"support":{"workRate":2,"stamina":1},"attack":{"dribbling":2,"anticipation":2,"offTheBall":2}}, true),
  entry({id:'deep-playmaker',title:'Deep-Lying Playmaker',slot:'CM/DM',demands:{passing:3,vision:3,decisions:2,composure:2,firstTouch:2,teamwork:1,positioning:1}}, "Deep-Lying Playmaker", ["DM","MC"], ["defend","support"], {"defend":{"marking":2,"tackling":2,"positioning":3},"support":{"offTheBall":2,"firstTouch":3}}, true),
  entry({id:'box-to-box',title:'Box-to-Box Midfielder',slot:'CM',demands:{stamina:3,workRate:3,teamwork:2,offTheBall:2,positioning:2,passing:1,tackling:1}}, "Box-to-Box Midfielder", ["MC"], ["support"], {}, true),
  entry({id:'ball-winner',title:'Ball-Winning Midfielder',slot:'CM/DM',demands:{tackling:3,positioning:3,workRate:2,aggression:2,stamina:2,anticipation:1,teamwork:1}}, "Ball-Winning Midfielder", ["MC"], ["defend","support"], {"defend":{"positioning":3},"support":{"passing":2,"offTheBall":1}}, true),
  entry({id:'centre-back',title:'Central Defender',slot:'CB',demands:{marking:3,tackling:3,positioning:3,heading:2,jumpingReach:2,concentration:2,strength:1}}, "Central Defender", ["DC"], ["defend","stopper","cover"], {"stopper":{"aggression":2,"bravery":3},"cover":{"anticipation":3,"acceleration":2,"pace":2}}, true),
  entry({id:'wing-back',title:'Wing-Back',slot:'D/WB',demands:{crossing:3,stamina:3,pace:2,workRate:2,acceleration:2,positioning:1,tackling:1}}, "Wing-Back", ["DL","DR","WBL","WBR"], ["defend","support","attack","automatic"], {"defend":{"marking":2,"positioning":3},"support":{"crossing":3,"passing":2},"attack":{"dribbling":2,"offTheBall":2}}, true),
  entry({id:'goalkeeper',title:'Goalkeeper',slot:'GK',demands:{handling:3,reflexes:3,oneOnOnes:2,aerialReach:2,communication:2,positioning:2,concentration:1}}, "Goalkeeper", ["GK"], ["defend"], {}, true),
  entry({"id":"sweeper-keeper","title":"Sweeper Keeper","slot":"GK","demands":{"handling":3,"reflexes":3,"rushingOut":3,"anticipation":2,"acceleration":2,"oneOnOnes":2,"decisions":2,"kicking":1}}, "Sweeper Keeper", ["GK"], ["defend","support","attack"], {"support":{"passing":2},"attack":{"firstTouch":2,"pace":2}}),
  entry({"id":"sweeper","title":"Sweeper","slot":"SW","demands":{"anticipation":3,"positioning":3,"tackling":3,"marking":2,"acceleration":2,"concentration":2,"composure":2}}, "Sweeper", ["SW"], ["defend"], {}),
  entry({"id":"libero","title":"Libero","slot":"SW","demands":{"positioning":3,"anticipation":3,"passing":3,"tackling":2,"decisions":2,"vision":2,"composure":2,"dribbling":1}}, "Libero", ["SW"], ["support","attack"], {"attack":{"longShots":2,"pace":2,"stamina":2,"workRate":2}}),
  entry({"id":"limited-defender","title":"Limited Defender","slot":"CB","demands":{"tackling":3,"marking":3,"strength":3,"positioning":2,"heading":2,"jumpingReach":2,"determination":1}}, "Limited Defender", ["DC"], ["defend","stopper","cover"], {"stopper":{"aggression":2,"bravery":3},"cover":{"anticipation":3,"acceleration":2,"pace":2}}),
  entry({"id":"ball-playing-defender","title":"Ball-Playing Defender","slot":"CB","demands":{"tackling":3,"marking":2,"positioning":2,"passing":3,"composure":3,"vision":2,"technique":2,"decisions":2}}, "Ball-Playing Defender", ["DC"], ["defend","stopper","cover"], {"stopper":{"aggression":2,"bravery":2},"cover":{"anticipation":3,"acceleration":2}}),
  entry({"id":"full-back","title":"Full Back","slot":"D (L/R)","demands":{"tackling":3,"positioning":3,"marking":2,"anticipation":2,"stamina":2,"workRate":2,"acceleration":2,"teamwork":1}}, "Full Back", ["DL","DR"], ["defend","support","attack","automatic"], {"support":{"crossing":2},"attack":{"crossing":3,"dribbling":2,"offTheBall":2}}),
  entry({"id":"defensive-midfielder","title":"Defensive Midfielder","slot":"DM","demands":{"positioning":3,"tackling":3,"marking":2,"decisions":2,"teamwork":2,"stamina":2,"passing":2,"strength":1}}, "Defensive Midfielder", ["DM"], ["defend","support"], {"support":{"offTheBall":2}}),
  entry({"id":"anchor-man","title":"Anchor Man","slot":"DM","demands":{"positioning":3,"anticipation":3,"tackling":3,"marking":2,"strength":2,"concentration":2,"decisions":2}}, "Anchor Man", ["DM"], ["defend"], {}),
  entry({"id":"central-midfielder","title":"Central Midfielder","slot":"CM","demands":{"passing":3,"decisions":3,"firstTouch":2,"teamwork":2,"positioning":2,"workRate":2,"determination":1}}, "Central Midfielder", ["MC"], ["defend","support","attack","automatic"], {"defend":{"marking":2,"tackling":3},"support":{"offTheBall":2,"vision":2},"attack":{"offTheBall":3,"finishing":2,"dribbling":2}}),
  entry({"id":"wide-midfielder","title":"Wide Midfielder","slot":"M (L/R)","demands":{"crossing":3,"workRate":3,"teamwork":3,"stamina":2,"passing":2,"decisions":2,"tackling":2,"offTheBall":1}}, "Wide Midfielder", ["ML","MR"], ["defend","support","attack","automatic"], {"defend":{"positioning":2,"tackling":3},"attack":{"offTheBall":3,"crossing":3}}),
  entry({"id":"defensive-winger","title":"Defensive Winger","slot":"M/AM (L/R)","demands":{"workRate":3,"stamina":3,"tackling":3,"teamwork":2,"marking":2,"crossing":2,"dribbling":2,"pace":2}}, "Defensive Winger", ["ML","MR","AML","AMR"], ["support","attack"], {"attack":{"dribbling":3,"offTheBall":2}}),
  entry({"id":"inside-forward","title":"Inside Forward","slot":"AM","demands":{"dribbling":3,"offTheBall":3,"acceleration":2,"pace":2,"decisions":2,"passing":2,"flair":2}}, "Inside Forward", ["AML","AMR","AMC"], ["support","attack"], {"support":{"longShots":2,"technique":2},"attack":{"finishing":3,"composure":2}}),
  entry({"id":"attacking-midfielder","title":"Attacking Midfielder","slot":"AMC","demands":{"firstTouch":3,"vision":3,"decisions":3,"passing":2,"technique":2,"offTheBall":2,"flair":1}}, "Attacking Midfielder", ["AMC"], ["support","attack"], {"attack":{"dribbling":2,"acceleration":2,"finishing":2}}),
  entry({"id":"trequartista","title":"Trequartista","slot":"AMC/ST","demands":{"vision":3,"flair":3,"offTheBall":3,"technique":2,"firstTouch":2,"passing":2,"composure":2,"finishing":2}}, "Trequartista", ["AMC","ST"], ["attack"], {}),
  entry({"id":"deep-lying-forward","title":"Deep-Lying Forward","slot":"ST","demands":{"firstTouch":3,"passing":3,"teamwork":3,"vision":2,"technique":2,"strength":2,"offTheBall":2,"decisions":2}}, "Deep-Lying Forward", ["ST"], ["support","attack"], {"attack":{"finishing":3,"composure":2}}),
  entry({"id":"poacher","title":"Poacher","slot":"ST","demands":{"finishing":3,"offTheBall":3,"anticipation":3,"acceleration":3,"composure":2,"pace":2,"firstTouch":1}}, "Poacher", ["ST"], ["attack"], {}),
  entry({"id":"complete-forward","title":"Complete Forward","slot":"ST","demands":{"finishing":3,"firstTouch":3,"technique":3,"passing":2,"dribbling":2,"strength":2,"pace":2,"heading":2,"decisions":2,"offTheBall":2}}, "Complete Forward", ["ST"], ["support","attack"], {"support":{"vision":3,"teamwork":2},"attack":{"composure":3,"acceleration":2}}),
  entry({"id":"defensive-forward","title":"Defensive Forward","slot":"ST","demands":{"workRate":3,"stamina":3,"teamwork":3,"tackling":2,"strength":2,"passing":2,"anticipation":2}}, "Defensive Forward", ["ST"], ["support","attack"], {"attack":{"finishing":2,"offTheBall":2,"composure":2}}),
];

export const ROLE_PROFILES: readonly RoleProfile[] = FM2013_ROLES.filter(role => role.baseline);

export function getEditionRoles(edition: string): readonly EditionRole[] {
  return edition === 'FM2013' ? FM2013_ROLES : [];
}

export function getRoleDutyProfile(edition: string, id: string, position: RolePosition, duty: RoleDuty): RoleProfile | null {
  const role = getEditionRoles(edition).find(item => item.id === id);
  if (!role || !role.positions.includes(position) || !role.duties.includes(duty) || duty === 'automatic') return null;
  return { id: role.id, title: role.nativeTitle, slot: position, demands: { ...role.demands, ...role.dutyImportance[duty] } };
}
