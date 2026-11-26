import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionTabs } from '@managerhub/ui';
import {
  buildMassEditPlayersOverlay, buildMassEditStaffOverlay, buildMassEditClubsOverlay,
  validatePlayerDraftPatch, validateStaffDraftPatch, validateClubDraftPatch,
  type DecodedSaveDatabase, type DecodedSavePlayer, type DecodedSaveStaff, type DecodedSaveClub, type SaveDraftOverlay
} from '@managerhub/domain/fm2013-offline';
import { MassEditPlayerPanel } from './MassEditPlayerPanel';
import { NumericMassEditPanel } from './NumericMassEditPanel';
import { PLAYER_MASS_FIELDS, STAFF_MASS_FIELDS, CLUB_MASS_FIELDS } from './numeric-mass-fields';

const SECTIONS = [
  { id: 'quick', label: 'Mass Edit Players' }, { id: 'players', label: 'Player fields' },
  { id: 'staff', label: 'Staff fields' }, { id: 'clubs', label: 'Club fields' }
] as const;
type Section = typeof SECTIONS[number]['id'];
const playerName = (p: DecodedSavePlayer) => p.displayName;
const staffName = (s: DecodedSaveStaff) => s.displayName;
const clubName = (c: DecodedSaveClub) => c.fullName;
const playerSearch = (p: DecodedSavePlayer) => [p.uid, p.displayName, p.clubName, p.primaryNationName].join(' ');
const staffSearch = (s: DecodedSaveStaff) => [s.uid, s.displayName, s.clubName, s.primaryNationName].join(' ');
const clubSearch = (c: DecodedSaveClub) => [c.uid, c.fullName, c.shortName, c.nationName].join(' ');

export function AdvancedMassEdit({ database, managedClubUid, onCommitOverlay }: {
  readonly database: DecodedSaveDatabase;
  readonly managedClubUid: number | null;
  readonly onCommitOverlay: (label: string, mutate: (overlay: SaveDraftOverlay) => SaveDraftOverlay) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [section, setSection] = useState<Section>('quick');
  return <>
    <SectionTabs<Section> id={id} label={t('Mass edit sections')}
      items={SECTIONS.map(item => ({ ...item, label: t(item.label) }))} active={section} onChange={setSection}/>
    <div role="tabpanel" id={id + '-panel'} aria-labelledby={id + '-tab-' + section}>
      {section === 'quick' && <MassEditPlayerPanel database={database} managedClubUid={managedClubUid}
        onApply={(uids, patch) => onCommitOverlay(`Mass edit (${uids.length})`, cur => buildMassEditPlayersOverlay(cur, uids, patch))}/>}
      {section === 'players' && <NumericMassEditPanel key="players" records={database.players} fields={PLAYER_MASS_FIELDS}
        searchText={playerSearch} name={playerName} validate={validatePlayerDraftPatch}
        onApply={(uids, patch) => onCommitOverlay(`Mass edit players (${uids.length})`, cur => buildMassEditPlayersOverlay(cur, uids, patch))}/>}
      {section === 'staff' && <NumericMassEditPanel key="staff" records={database.staff} fields={STAFF_MASS_FIELDS}
        searchText={staffSearch} name={staffName} validate={validateStaffDraftPatch}
        onApply={(uids, patch) => onCommitOverlay(`Mass edit staff (${uids.length})`, cur => buildMassEditStaffOverlay(cur, uids, patch))}/>}
      {section === 'clubs' && <NumericMassEditPanel key="clubs" records={database.clubs} fields={CLUB_MASS_FIELDS}
        searchText={clubSearch} name={clubName} validate={validateClubDraftPatch}
        onApply={(uids, patch) => onCommitOverlay(`Mass edit clubs (${uids.length})`, cur => buildMassEditClubsOverlay(cur, uids, patch))}/>}
    </div>
  </>;
}
