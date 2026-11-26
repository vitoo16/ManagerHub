import type { DecodedStaffAttributes } from '@managerhub/domain/fm2013-offline';

export const STAFF_ATTR_KEYS: readonly { readonly key: keyof DecodedStaffAttributes; readonly label: string }[] = [
  { key: 'attacking', label: 'Coaching Attacking' },
  { key: 'defending', label: 'Coaching Defending' },
  { key: 'fitness', label: 'Coaching Fitness' },
  { key: 'goalkeepers', label: 'Coaching Goalkeepers' },
  { key: 'mental', label: 'Coaching Mental' },
  { key: 'technical', label: 'Coaching Technical' },
  { key: 'tactical', label: 'Coaching Tactical' },
  { key: 'player', label: 'Coaching Outfield' },
  { key: 'manManagement', label: 'Man Management' },
  { key: 'workingWithYoungsters', label: 'Working With Youngsters' },
  { key: 'judgingPlayerAbility', label: 'Judging Player Ability' },
  { key: 'judgingPlayerPotential', label: 'Judging Player Potential' },
  { key: 'tacticalKnowledge', label: 'Tactical Knowledge' },
  { key: 'motivating', label: 'Motivating' },
  { key: 'levelOfDiscipline', label: 'Level of Discipline' },
  { key: 'determination', label: 'Determination' },
  { key: 'adaptability', label: 'Adaptability' },
  { key: 'physiotherapy', label: 'Physiotherapy' }
];
