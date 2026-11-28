import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from '@managerhub/domain';
import type { DecodedSavePlayer, DecodedSaveStaff, DecodedSaveClub,
  PlayerDraftPatch, StaffDraftPatch, ClubDraftPatch } from '@managerhub/domain/fm2013-offline';
import { HIDDEN_KEYS, PERSONALITY_KEYS, POSITION_KEYS } from '../player-attribute-fields';
import { STAFF_ATTR_KEYS } from './staff-attribute-fields';
import type { NumericMassField } from './numeric-mass-edit';

type PlayerField = NumericMassField<DecodedSavePlayer, PlayerDraftPatch>;
type StaffField = NumericMassField<DecodedSaveStaff, StaffDraftPatch>;
type ClubField = NumericMassField<DecodedSaveClub, ClubDraftPatch>;

const playerField = (id: string, label: string, group: string, read: PlayerField['read'], patch: PlayerField['patch']): PlayerField =>
  ({ id, label, group, read, patch });
const staffField = (id: string, label: string, group: string, read: StaffField['read'], patch: StaffField['patch']): StaffField =>
  ({ id, label, group, read, patch });
const clubField = (id: string, label: string, group: string, read: ClubField['read'], patch: ClubField['patch']): ClubField =>
  ({ id, label, group, read, patch });

export const PLAYER_MASS_FIELDS: readonly PlayerField[] = [
  playerField('actualCa', 'Actual CA', 'Ability', p => p.actualCa, value => ({ actualCa: value })),
  playerField('potentialAbility', 'Actual PA', 'Ability', p => p.potentialAbility, value => ({ potentialAbility: value })),
  playerField('morale', 'Morale', 'Ability', p => p.morale, value => ({ morale: value })),
  playerField('homeReputation', 'Home reputation', 'Ability', p => p.homeReputation, value => ({ homeReputation: value })),
  playerField('currentReputation', 'Current reputation', 'Ability', p => p.currentReputation, value => ({ currentReputation: value })),
  playerField('worldReputation', 'World reputation', 'Ability', p => p.worldReputation, value => ({ worldReputation: value })),
  playerField('marketValueGbp', 'Market value (£)', 'Active Contract', p => p.marketValueGbp, value => ({ marketValueGbp: value })),
  playerField('weeklyWageGbp', 'Weekly wage (£)', 'Active Contract', p => p.contract?.weeklyWageGbp, value => ({ weeklyWageGbp: value })),
  playerField('leftFoot', 'Left foot', 'Positions & Feet', p => p.leftFoot, value => ({ leftFoot: value })),
  playerField('rightFoot', 'Right foot', 'Positions & Feet', p => p.rightFoot, value => ({ rightFoot: value })),
  ...Object.entries(ATTRIBUTE_GROUPS).flatMap(([group, keys]) => keys.filter(key => key !== 'punching').map(key =>
    playerField('attribute.' + key, ATTRIBUTE_LABELS[key], group, p => p.attributes[key], value => ({ attributes: { [key]: value } })))),
  ...HIDDEN_KEYS.map(({ key, label }) => playerField('hidden.' + key, label, 'Hidden Playing Traits (1–20)',
    p => p.hiddenPlaying[key], value => ({ hiddenPlaying: { [key]: value } }))),
  ...PERSONALITY_KEYS.map(({ key, label }) => playerField('personality.' + key, label, 'Personality (1–20)',
    p => p.personality?.[key], value => ({ personality: { [key]: value } }))),
  ...POSITION_KEYS.map(key => playerField('position.' + key, key, 'Positions & Feet',
    p => p.positions[key], value => ({ positions: { [key]: value } })))
];

export const STAFF_MASS_FIELDS: readonly StaffField[] = [
  staffField('staffCa', 'Staff CA', 'Ability', s => s.staffCa, value => ({ staffCa: value })),
  staffField('staffPa', 'Staff PA', 'Ability', s => s.staffPa, value => ({ staffPa: value })),
  staffField('homeReputation', 'Home reputation', 'Ability', s => s.homeReputation, value => ({ homeReputation: value })),
  staffField('currentReputation', 'Current reputation', 'Ability', s => s.currentReputation, value => ({ currentReputation: value })),
  staffField('worldReputation', 'World reputation', 'Ability', s => s.worldReputation, value => ({ worldReputation: value })),
  staffField('weeklyWageGbp', 'Weekly wage (£)', 'Active Contract', s => s.weeklyWageGbp, value => ({ weeklyWageGbp: value })),
  ...STAFF_ATTR_KEYS.map(({ key, label }) => staffField('attribute.' + key, label, 'Attributes',
    s => s.attributes?.[key], value => ({ attributes: { [key]: value } })))
];

export const CLUB_MASS_FIELDS: readonly ClubField[] = [
  clubField('balanceGbp', 'Balance (£)', 'Finances', c => c.financeType === 'none' ? null : c.balanceGbp, value => ({ balanceGbp: value })),
  clubField('transferBudgetGbp', 'Transfer budget (£)', 'Finances', c => c.financeType === 'full' ? c.transferBudgetGbp : null, value => ({ transferBudgetGbp: value })),
  clubField('transferBudgetSeasonGbp', 'Season transfer budget (£)', 'Finances', c => c.financeType === 'full' ? c.transferBudgetSeasonGbp : null, value => ({ transferBudgetSeasonGbp: value })),
  clubField('weeklyWageBudgetGbp', 'Wage budget (£)', 'Finances', c => c.financeType === 'full' ? c.weeklyWageBudgetGbp : null, value => ({ weeklyWageBudgetGbp: value })),
  clubField('trainingFacilities', 'Training facilities', 'Facilities', c => c.trainingFacilities, value => ({ trainingFacilities: value })),
  clubField('youthFacilities', 'Youth facilities', 'Facilities', c => c.youthFacilities, value => ({ youthFacilities: value })),
  clubField('youthCoaching', 'Youth coaching', 'Facilities', c => c.youthCoaching, value => ({ youthCoaching: value })),
  clubField('youthRecruitment', 'Youth recruitment', 'Facilities', c => c.youthRecruitment, value => ({ youthRecruitment: value }))
];
