import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase, StaffDraftPatch, DecodedStaffAttributes } from '@managerhub/domain/fm2013-offline';
import { EditorNumberField } from './EditorNumberField';
import { AttributePropertyGroup } from '@managerhub/ui';
import { clampInt } from './editor-number';
import { EditorRecordSections, type EditorSection } from './EditorRecordSections';

const STAFF_ATTR_KEYS: readonly { readonly key: keyof DecodedStaffAttributes; readonly label: string }[] = [
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

const STAFF_SECTIONS = [
  { id: 'general', label: 'Staff Ability, Reputation & Contract' },
  { id: 'attributes', label: 'Attributes' }
] as const satisfies readonly { id: EditorSection; label: string }[];

interface Props {
  readonly staffMember: DecodedSaveDatabase['staff'][number];
  readonly applyStaffField: (label: string, patch: StaffDraftPatch) => void;
}

export function StaffEditorRecord({ staffMember, applyStaffField }: Props) {
  const { t } = useTranslation();
  return <EditorRecordSections label="Staff editor sections" items={STAFF_SECTIONS}>
      {recordSection => <>
        {recordSection === 'general' && <div className="editor-section">
        <h3>{t('Staff Ability, Reputation & Contract')}</h3>
        <div className="editor-field-grid">
        <EditorNumberField label={<>{t('Staff CA')} (1–200)</>} min={1} max={200}
        value={staffMember.staffCa} onChange={value => applyStaffField('Edit Staff CA', { staffCa: value })}/>
        <EditorNumberField label={<>{t('Staff PA')} (1–200)</>} min={1} max={200}
        value={staffMember.staffPa} onChange={value => applyStaffField('Edit Staff PA', { staffPa: value })}/>
        <EditorNumberField label={<>{t('Current reputation')}</>} min={1} max={10_000}
        value={staffMember.currentReputation} onChange={value => applyStaffField('Edit Staff Reputation', { currentReputation: value })}/>
        {staffMember.weeklyWageGbp !== null && (
        <EditorNumberField label={<>{t('Weekly wage')} (£)</>} min={0} max={10_000_000} step={500}
        value={staffMember.weeklyWageGbp} onChange={value => applyStaffField('Edit Staff Wage', { weeklyWageGbp: value })}/>
        )}
        </div>
        </div>}
        {recordSection === 'attributes' && (staffMember.attributes ? (
        <AttributePropertyGroup
        title={t('Coaching, Scouting, Mental & Medical Attributes (1–20)')}
        fields={STAFF_ATTR_KEYS.map(item => ({
        key: item.key, label: t(item.label), value: staffMember.attributes?.[item.key]
        }))}
        onChange={(key, raw, previous) => applyStaffField(`Edit ${key}`, {
        attributes: { [key]: clampInt(raw, previous, 1, 20) }
        })}
        />
        ) : <p className="editor-notice">{t('No staff attribute data.')}</p>)}
      </>}
    </EditorRecordSections>;
}
