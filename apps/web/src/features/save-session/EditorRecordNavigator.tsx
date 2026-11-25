import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase } from '@managerhub/domain/fm2013-offline';
import { Button, Icon } from '@managerhub/ui';
import {
  MAX_EDITOR_RECORDS, MAX_EDITOR_SEARCH_RESULTS, recordKey, recordName, searchEditorRecords,
  type EditorRecordKind, type EditorRecordState, type EditorRecordTarget
} from './editor-records';

interface Props {
  readonly database: DecodedSaveDatabase;
  readonly state: EditorRecordState;
  readonly onOpen: (target: EditorRecordTarget) => void;
  readonly onClose: (target: EditorRecordTarget) => void;
}

export function EditorRecordNavigator({ database, state, onOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<EditorRecordKind>(state.active.kind);
  const [query, setQuery] = useState('');
  const activeRecordRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRecordRef.current?.focus(); }, [state]);
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery !== query;
  const results = useMemo(() => searchEditorRecords(database, kind, deferredQuery), [database, kind, deferredQuery]);
  const atLimit = state.records.length >= MAX_EDITOR_RECORDS;
  const kindLabels: Record<EditorRecordKind, string> = {
    player: t('Players'), staff: t('Staff & Managers'), club: t('Clubs & Finances'), stadium: t('Stadiums')
  };
  return (
    <section className="editor-record-navigator" aria-label={t('Editor record navigation')}>
      <div className="editor-record-tabs" role="group" aria-label={t('Open records')}>
        {state.records.map(record => {
          const key = recordKey(record);
          const name = recordName(database, record);
          return (
            <div className="editor-record-tab" key={key}>
              <button type="button" className="editor-record-tab__select"
                ref={key === recordKey(state.active) ? activeRecordRef : undefined}
                aria-pressed={key === recordKey(state.active)}
                onClick={() => onOpen(record)}>
                <small>{kindLabels[record.kind]} · #{record.uid}</small>
                <strong>{name}</strong>
              </button>
              {state.records.length > 1 && (
                <Button type="button" variant="quiet" className="editor-record-tab__close"
                  aria-label={t('Close record {{name}} ({{kind}} #{{uid}})', { name, kind: kindLabels[record.kind], uid: record.uid })}
                  onClick={() => onClose(record)}>
                  <Icon name="close" size={14}/>
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="editor-record-search">
        <label className="editor-field">
          <span>{t('Record type')}</span>
          <select value={kind} onChange={event => {
            setKind(event.currentTarget.value as EditorRecordKind);
            setQuery('');
          }}>
            {Object.entries(kindLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select>
        </label>
        <label className="editor-field">
          <span>{t('Find record by name or UID')}</span>
          <input type="search" value={query} onChange={event => setQuery(event.currentTarget.value)}
            placeholder={t('Search database…')}/>
        </label>
      </div>
      {atLimit && <p className="editor-record-hint" role="status">{t('Close a record before opening another.')}</p>}
      {query.trim() && (
        <div className="editor-record-results" role="group" aria-label={t('Matching records')} aria-busy={searching}>
          {!searching && results.length === 0 && <p className="editor-record-hint" role="status">{t('No matching records.')}</p>}
          {results.map(result => (
            <Button key={recordKey(result.target)} type="button"
              disabled={searching || (atLimit && !state.records.some(record => recordKey(record) === recordKey(result.target)))}
              onClick={() => {
                onOpen(result.target);
                setQuery('');
                if (recordKey(result.target) === recordKey(state.active)) activeRecordRef.current?.focus();
              }}>
              <span>{result.name}</span><small>#{result.target.uid}</small>
            </Button>
          ))}
          {results.length === MAX_EDITOR_SEARCH_RESULTS && <p className="editor-record-hint">{t('Showing up to 24 records. Refine your search to narrow results.')}</p>}
        </div>
      )}
    </section>
  );
}
