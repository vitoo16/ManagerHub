import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase, PlayerDraftPatch, PlayerPresetKind } from '@managerhub/domain/fm2013-offline';
import { EditorNumberField } from './EditorNumberField';
import { AttributePropertyGroup, Button } from '@managerhub/ui';
import { clampInt } from './editor-number';
import { EditorRecordSections, type EditorSection } from './EditorRecordSections';
import PlayerAttributeTable from '../PlayerAttributeTable';
import { HIDDEN_KEYS, PERSONALITY_KEYS, POSITION_KEYS } from '../player-attribute-fields';

const PLAYER_SECTIONS = [
  { id: 'general', label: 'Ability, Reputation & Bio' },
  { id: 'contract', label: 'Active Contract' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'hidden', label: 'Hidden Playing Traits (1–20)' },
  { id: 'personality', label: 'Personality (1–20)' },
  { id: 'positions', label: 'Positions & Feet' },
  { id: 'presets', label: 'Quick presets' }
] as const satisfies readonly { id: EditorSection; label: string }[];

interface Props {
  readonly player: DecodedSaveDatabase['players'][number];
  readonly applyPlayerField: (label: string, patch: PlayerDraftPatch) => void;
  readonly applyPlayerPreset: (preset: PlayerPresetKind, label: string) => void;
}

export function PlayerEditorRecord({ player, applyPlayerField, applyPlayerPreset }: Props) {
  const { t } = useTranslation();
  return <EditorRecordSections label="Player editor sections" items={PLAYER_SECTIONS}>
      {recordSection => <>
        {recordSection === 'presets' && (
        <div className="editor-presets">
        <strong>{t('Quick presets')}:</strong>
        <Button type="button" onClick={() => applyPlayerPreset('inspire_morale', 'Inspire Player')}>
        {t('Inspire morale')}
        </Button>
        <Button type="button" onClick={() => applyPlayerPreset('match_ca_to_pa', 'Match CA to PA')}>
        {t('Match CA to PA')}
        </Button>
        <Button type="button" onClick={() => applyPlayerPreset('wonderkid_pa_200', 'Wonderkid PA 200')}>
        {t('Wonderkid (PA 200)')}
        </Button>
        <Button type="button" onClick={() => applyPlayerPreset('perfect_model_professional', 'Model Professional')}>
        {t('Model Professional')}
        </Button>
        <Button type="button" onClick={() => applyPlayerPreset('natural_all_positions', 'All Positions 20')}>
        {t('All positions 20')}
        </Button>
        {player.contract && (
        <Button type="button" onClick={() => applyPlayerPreset('extend_contract_5y', 'Extend Contract +5y')}>
        {t('Extend contract +5y')}
        </Button>
        )}
        </div>
        )}
        
        {recordSection === 'general' && (
        <>
        <div className="editor-section">
        <h3>{t('Ability, Reputation & Bio')}</h3>
        <div className="editor-field-grid">
        <EditorNumberField label={<>{t('Actual CA')} (1–200)</>} min={1} max={200}
        value={player.actualCa} onChange={value => applyPlayerField('Edit Actual CA', { actualCa: value })}/>
        <EditorNumberField label={<>{t('Actual PA')} (1–200)</>} min={1} max={200}
        value={player.potentialAbility} onChange={value => applyPlayerField('Edit Actual PA', { potentialAbility: value })}/>
        <EditorNumberField label={<>{t('Morale')} (1–20)</>} min={1} max={20}
        value={player.morale} onChange={value => applyPlayerField('Edit Morale', { morale: value })}/>
        <EditorNumberField label={<>{t('Market value')} (£)</>} min={0} max={1_500_000_000} step={50_000}
        value={player.marketValueGbp} onChange={value => applyPlayerField('Edit Market Value', { marketValueGbp: value })}/>
        <EditorNumberField label={<>{t('Current reputation')}</>} min={1} max={10_000}
        value={player.currentReputation} onChange={value => applyPlayerField('Edit Current Reputation', { currentReputation: value })}/>
        <EditorNumberField label={<>{t('World reputation')}</>} min={1} max={10_000}
        value={player.worldReputation} onChange={value => applyPlayerField('Edit World Reputation', { worldReputation: value })}/>
        <EditorNumberField label={<>{t('International caps')}</>} min={0} max={250}
        value={player.intCaps} onChange={value => applyPlayerField('Edit Caps', { intCaps: value })}/>
        <EditorNumberField label={<>{t('International goals')}</>} min={0} max={250}
        value={player.intGoals} onChange={value => applyPlayerField('Edit Int Goals', { intGoals: value })}/>
        </div>
        </div>
        
        </>
        )}
        
        {recordSection === 'contract' && (player.contract ? (
        <div className="editor-section">
        <h3>{t('Active Contract')}</h3>
        <div className="editor-field-grid">
        <EditorNumberField label={<>{t('Weekly wage')} (£)</>} min={0} max={10_000_000} step={1_000}
        value={player.contract.weeklyWageGbp} onChange={value => applyPlayerField('Edit Weekly Wage', { weeklyWageGbp: value })}/>
        <EditorNumberField label={<>{t('Contract expiry')}</span>
        <input
        type="date"
        value={player.contract.expiresAt ?? ''}
        disabled={player.contract.expiresAt == null}
        onChange={e => {
        if (/^\d{4}-\d{2}-\d{2}$/u.test(e.target.value)) {
        applyPlayerField('Edit Contract Expiry', { contractExpiresAt: e.target.value });
        }
        }}
        />
        </label>
        <label className="editor-field">
        <span>{t('Squad number')} (1–99)</>} min={1} max={99}
        value={player.squadNumber} onChange={value => applyPlayerField('Edit Squad Number', { squadNumber: value })}/>
        </div>
        </div>
        ) : <p className="editor-notice">{t('No active contract data.')}</p>)}
        
        {recordSection === 'personality' && (player.personality ? (
        <AttributePropertyGroup
        title={t('Personality (1–20)')}
        fields={PERSONALITY_KEYS.map(item => ({
        key: item.key, label: t(item.label), value: player.personality?.[item.key]
        }))}
        onChange={(key, raw, previous) => applyPlayerField(`Edit ${key}`, {
        personality: { [key]: clampInt(raw, previous, 1, 20) }
        })}
        />
        ) : <p className="editor-notice">{t('No personality data.')}</p>)}
        
        {recordSection === 'attributes' && (
        <PlayerAttributeTable attributes={player.attributes}
        onChange={(key, raw, previous) => applyPlayerField(`Edit ${key}`, {
        attributes: { [key]: clampInt(raw, previous, 1, 20) }
        })}/>
        )}
        
        {recordSection === 'hidden' && (
        <AttributePropertyGroup
        title={t('Hidden Playing Traits (1–20)')}
        fields={HIDDEN_KEYS.map(item => ({
        key: item.key, label: t(item.label), value: player.hiddenPlaying[item.key]
        }))}
        onChange={(key, raw, previous) => applyPlayerField(`Edit ${key}`, {
        hiddenPlaying: { [key]: clampInt(raw, previous, 1, 20) }
        })}
        />
        )}
        
        {recordSection === 'positions' && (
        <>
        <div className="editor-section">
        <h3>{t('Preferred feet')} (1–20)</h3>
        <div className="editor-field-grid">
        <EditorNumberField label={<>{t('Left foot')}</>} min={1} max={20}
        value={player.leftFoot} onChange={value => applyPlayerField('Edit Left Foot', { leftFoot: value })}/>
        <EditorNumberField label={<>{t('Right foot')}</>} min={1} max={20}
        value={player.rightFoot} onChange={value => applyPlayerField('Edit Right Foot', { rightFoot: value })}/>
        </div>
        </div>
        <div className="editor-section">
        <h3>{t('Positional familiarity (1–20)')}</h3>
        <div className="editor-field-grid editor-field-grid--compact">
        {POSITION_KEYS.map(pos => (
        <label className="editor-field" key={pos}>
        <span>{pos}</span>
        <input
        type="number"
        min={1}
        max={20}
        value={player.positions[pos]}
        onChange={e =>
        applyPlayerField(`Edit ${pos}`, {
        positions: { [pos]: clampInt(e.target.value, player.positions[pos], 1, 20) }
        })
        }
        />
        </label>
        ))}
        </div>
        </div>
        </>
        )}
      </>}
    </EditorRecordSections>;
}
