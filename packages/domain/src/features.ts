export interface Feature {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly phase: number;
}
export const FEATURES: readonly Feature[] = [
  { id: 'MH-01', title: 'Save Manager & Reader', group: 'Game Data', phase: 2 },
  { id: 'MH-02', title: 'Player Database Explorer', group: 'Game Data', phase: 2 },
  { id: 'MH-03', title: 'Advanced Save Editor', group: 'Game Data', phase: 7 },
  { id: 'MH-04', title: 'Player Development History', group: 'Game Data', phase: 3 },
  { id: 'MH-05', title: 'Data Integrity & Compatibility', group: 'Game Data', phase: 2 },
  { id: 'MH-06', title: 'Player Intelligence & eCA', group: 'Football Intelligence', phase: 3 },
  { id: 'MH-07', title: 'Tactical Lab', group: 'Football Intelligence', phase: 4 },
  { id: 'MH-08', title: 'AI Tactical Advisor', group: 'Football Intelligence', phase: 4 },
  { id: 'MH-09', title: 'Tactical Role Intelligence', group: 'Football Intelligence', phase: 4 },
  { id: 'MH-10', title: 'Set Piece Intelligence', group: 'Football Intelligence', phase: 7 },
  { id: 'MH-11', title: 'Squad Planner 2.0', group: 'Squad Management', phase: 4 },
  { id: 'MH-12', title: 'Recruitment & Scouting', group: 'Squad Management', phase: 5 },
  { id: 'MH-13', title: 'Transfer & Contracts', group: 'Squad Management', phase: 5 },
  { id: 'MH-14', title: 'Youth Development Centre', group: 'Squad Management', phase: 5 },
  { id: 'MH-15', title: 'Training & Performance Centre', group: 'Squad Management', phase: 5 },
  { id: 'MH-16', title: 'Opposition Intelligence', group: 'Match Intelligence', phase: 6 },
  { id: 'MH-17', title: 'Matchday Manager', group: 'Match Intelligence', phase: 6 },
  { id: 'MH-18', title: 'Post-Match Analysis', group: 'Match Intelligence', phase: 6 },
  { id: 'MH-19', title: 'Club DNA & Philosophy', group: 'Club Management', phase: 6 },
  { id: 'MH-20', title: 'Dressing Room & Leadership', group: 'Club Management', phase: 6 },
  { id: 'MH-21', title: 'Boardroom & Strategy', group: 'Club Management', phase: 6 },
  { id: 'MH-22', title: 'Football Finance', group: 'Club Management', phase: 5 },
  { id: 'MH-23', title: 'Dynasty & Succession', group: 'Club Management', phase: 6 },
  { id: 'MH-24', title: 'AI Sporting Director & Staff', group: 'AI & Platform', phase: 6 },
  { id: 'MH-25', title: 'What-if Scenario Simulator', group: 'AI & Platform', phase: 5 },
  { id: 'MH-26', title: 'Dashboard & Reports', group: 'AI & Platform', phase: 3 },
  { id: 'MH-27', title: 'Integrations & Personalization', group: 'AI & Platform', phase: 7 }
] as const;
export const FEATURE_GROUPS = [...new Set(FEATURES.map(item => item.group))] as const;
