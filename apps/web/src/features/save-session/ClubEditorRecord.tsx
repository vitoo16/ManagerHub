import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase, ClubDraftPatch, ClubSquadPresetKind } from '@managerhub/domain/fm2013-offline';
import { EditorNumberField } from './EditorNumberField';
import { Button } from '@managerhub/ui';
import { EditorRecordSections, type EditorSection } from './EditorRecordSections';

const CLUB_SECTIONS = [
  { id: 'general', label: 'Finances' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'presets', label: 'Club presets' }
] as const satisfies readonly { id: EditorSection; label: string }[];

interface Props {
  readonly club: DecodedSaveDatabase['clubs'][number];
  readonly applyClubField: (label: string, patch: ClubDraftPatch) => void;
  readonly applyClubPreset: (targetClubUid: number, preset: ClubSquadPresetKind, label: string) => void;
}

export function ClubEditorRecord({ club, applyClubField, applyClubPreset }: Props) {
  const { t } = useTranslation();
  return <EditorRecordSections label="Club editor sections" items={CLUB_SECTIONS}>
      {recordSection => <>
        {recordSection === 'presets' && <div className="editor-presets">
        <strong>{t('Club presets')}:</strong>
        <Button type="button" onClick={() => applyClubPreset(club.uid, 'inspire_team', 'Inspire Squad')}>
        {t('Inspire squad')}
        </Button>
        <Button type="button" onClick={() => applyClubPreset(club.uid, 'heal_fitness_morale_team', 'Heal & Boost Fitness')}>
        {t('Heal & max fitness squad')}
        </Button>
        <Button type="button" onClick={() => applyClubPreset(club.uid, 'match_squad_ca_pa', 'Match Squad CA to PA')}>
        {t('Match squad CA to PA')}
        </Button>
        <Button type="button" onClick={() => applyClubPreset(club.uid, 'boost_finances_facilities', 'Boost Finances & Facilities')}>
        {t('Max facilities & £250M balance')}
        </Button>
        </div>}
        {recordSection === 'general' && <div className="editor-section">
        <h3>{t('Finances')}</h3>
        <div className="editor-field-grid">
        {club.financeType !== 'none' && (
        <EditorNumberField label={<>{t('Balance')} (£)</>} min={-1_000_000_000} max={1_500_000_000} step={250_000}
        value={club.balanceGbp} onChange={value => applyClubField('Edit Club Balance', { balanceGbp: value })}/>
        )}
        {club.financeType === 'full' && (
        <>
        <EditorNumberField label={<>{t('Transfer budget')} (£)</>} min={0} max={1_500_000_000} step={250_000}
        value={club.transferBudgetGbp} onChange={value => applyClubField('Edit Transfer Budget', { transferBudgetGbp: value })}/>
        <EditorNumberField label={<>{t('Wage budget')} (£)</>} min={0} max={50_000_000} step={10_000}
        value={club.weeklyWageBudgetGbp} onChange={value => applyClubField('Edit Wage Budget', { weeklyWageBudgetGbp: value })}/>
        </>
        )}
        </div>
        {club.financeType === 'none' && <p className="editor-notice">{t('No club finance data.')}</p>}
        </div>}
        {recordSection === 'facilities' && <div className="editor-section">
        <h3>{t('Facilities')}</h3>
        <div className="editor-field-grid">
        <EditorNumberField label={<>{t('Training facilities')} (1–20)</>} min={1} max={20}
        value={club.trainingFacilities} onChange={value => applyClubField('Edit Training Facilities', { trainingFacilities: value })}/>
        <EditorNumberField label={<>{t('Youth facilities')} (1–20)</>} min={1} max={20}
        value={club.youthFacilities} onChange={value => applyClubField('Edit Youth Facilities', { youthFacilities: value })}/>
        <EditorNumberField label={<>{t('Youth coaching')} (1–20)</>} min={1} max={20}
        value={club.youthCoaching} onChange={value => applyClubField('Edit Youth Coaching', { youthCoaching: value })}/>
        <EditorNumberField label={<>{t('Youth recruitment')} (1–20)</>} min={1} max={20}
        value={club.youthRecruitment} onChange={value => applyClubField('Edit Youth Recruitment', { youthRecruitment: value })}/>
        </div>
        </div>}
      </>}
    </EditorRecordSections>;
}
