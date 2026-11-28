import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase, StadiumDraftPatch } from '@managerhub/domain/fm2013-offline';
import { EditorNumberField } from './EditorNumberField';

interface Props {
  readonly stadium: DecodedSaveDatabase['stadiums'][number];
  readonly applyStadiumField: (label: string, patch: StadiumDraftPatch) => void;
}

export function StadiumEditorRecord({ stadium, applyStadiumField }: Props) {
  const { t } = useTranslation();
  return <div className="editor-section">
            <h3>{t('Stadium Capacities')}</h3>
            <div className="editor-field-grid">
              <EditorNumberField label={<>{t('Capacity')}</>} min={100} max={500_000} step={500}
        value={stadium.capacity} onChange={value => applyStadiumField('Edit Stadium Capacity', { capacity: value })}/>
              <EditorNumberField label={<>{t('Seating')}</>} min={0} max={500_000} step={500}
        value={stadium.seatingCapacity} onChange={value => applyStadiumField('Edit Stadium Seating', { seatingCapacity: value })}/>
              <EditorNumberField label={<>{t('Expansion')}</>} min={0} max={500_000} step={500}
        value={stadium.expansionCapacity} onChange={value => applyStadiumField('Edit Expansion Capacity', { expansionCapacity: value })}/>
            </div>
          </div>;
}
