import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bindDevelopmentSource, decodeDevelopmentLibrary, encodeDevelopmentLibrary, makeDevelopmentRecord,
  restoreDevelopmentRecord, DEVELOPMENT_STORAGE_PREFIX, MAX_DEVELOPMENT_SCENARIOS,
  type DevelopmentBinding, type DevelopmentLibrary, type DevelopmentScenario, type PlayerExport,
  type SavedDevelopmentScenario } from '@managerhub/domain';
import { Button } from '@managerhub/ui';
import { downloadContent } from '../download-content';
import { ReportPagination, reportPage } from './ReportPagination';

interface Props {
  readonly player: PlayerExport;
  readonly edition: string | null;
  readonly build: string | null;
  readonly sourceId: string;
  readonly scenario: DevelopmentScenario;
  readonly active: 'A' | 'B';
  readonly onRestore: (scenario: DevelopmentScenario) => void;
}
type Ready = { binding: DevelopmentBinding; library: DevelopmentLibrary; raw: string | null };
function read(binding: DevelopmentBinding): Ready {
  const raw = localStorage.getItem(DEVELOPMENT_STORAGE_PREFIX + binding.scope);
  return { binding, library: decodeDevelopmentLibrary(raw, binding), raw };
}

export function DevelopmentScenarioLibrary({ player, edition, build, sourceId, scenario, active, onRestore }: Props) {
  const { t } = useTranslation();
  const [ready, setReady] = useState<Ready | null>(null);
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let binding: DevelopmentBinding | null = null;
    setReady(null);
    setNotice('');
    const refresh = () => {
      if (cancelled || !binding) return;
      try { setReady(read(binding)); }
      catch { setReady(null); setNotice('Saved development scenarios could not be validated or read. Nothing was overwritten.'); }
    };
    void bindDevelopmentSource(player, sourceId, edition, build).then(value => {
      if (cancelled) return;
      binding = value;
      refresh();
    }).catch(() => {
      if (!cancelled) setNotice('Development scenario storage is unavailable for this source.');
    });
    const onStorage = (event: StorageEvent) => {
      if (binding && (event.key === null || event.key === DEVELOPMENT_STORAGE_PREFIX + binding.scope)) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => { cancelled = true; window.removeEventListener('storage', onStorage); };
  }, [player, sourceId, edition, build]);
  const records = ready?.library.records ?? [];
  const record = records.find(item => item.id === selected);
  const stale = record && record.revision !== ready?.binding.revision;
  const range = reportPage(records.length, page, 5);
  const validName = name.trim().length > 0 && name.trim().length <= 80;
  const atLimit = records.length >= MAX_DEVELOPMENT_SCENARIOS;

  const fresh = (): Ready => {
    if (!ready) throw new Error('storage_not_ready');
    const latest = read(ready.binding);
    if (latest.raw !== ready.raw) {
      setReady(latest);
      throw new Error('storage_changed');
    }
    return latest;
  };
  const run = (action: (current: Ready) => void) => {
    try { action(fresh()); }
    catch { setNotice('Scenario action could not be completed. Check the saved list and browser storage.'); }
  };
  const write = (current: Ready, next: readonly SavedDevelopmentScenario[]) => {
    const library = { ...current.library, records: next };
    const raw = encodeDevelopmentLibrary(library, current.binding);
    localStorage.setItem(DEVELOPMENT_STORAGE_PREFIX + current.binding.scope, raw);
    setReady({ binding: current.binding, library: decodeDevelopmentLibrary(raw, current.binding), raw });
    setNotice('Development scenarios saved on this browser.');
  };
  const save = () => run(current => {
    const next = makeDevelopmentRecord(current.binding, player, scenario, name.trim(), crypto.randomUUID(), new Date().toISOString());
    write(current, [next, ...current.library.records]);
    setSelected(next.id); setPage(0);
  });
  const withRecord = (action: (current: Ready, item: SavedDevelopmentScenario) => void) => run(current => {
    const item = current.library.records.find(value => value.id === selected);
    if (!item) throw new Error('record_missing');
    action(current, item);
  });
  const restore = () => withRecord((current, item) => {
    const next = restoreDevelopmentRecord(item, current.binding, player);
    if (!window.confirm(t('Replace the current scenario {{slot}} with the selected saved assumptions?', { slot: active }))) return;
    onRestore(next);
    setNotice('Saved development assumptions restored.');
  });
  const rename = () => withRecord((current, item) => {
    write(current, current.library.records.map(value => value.id === item.id ? { ...value, name: name.trim() } : value));
  });
  const duplicate = () => withRecord((current, item) => {
    const next = { ...item, id: crypto.randomUUID(), name: name.trim(), savedAt: new Date().toISOString() };
    write(current, [next, ...current.library.records]);
    setSelected(next.id); setPage(0);
  });
  const remove = () => withRecord((current, item) => {
    if (!window.confirm(t('Delete the selected saved development scenario? Current A/B assumptions will stay unchanged.'))) return;
    write(current, current.library.records.filter(value => value.id !== item.id));
    setSelected('');
    setNotice('Saved development scenario removed.');
  });
  const exportRecord = () => withRecord((current, item) => {
    const raw = encodeDevelopmentLibrary({ ...current.library, records: [item] }, current.binding);
    downloadContent(raw, 'application/json;charset=utf-8', 'managerhub-development-scenario.json');
  });
  return <section className="development-library" aria-label={t('Saved development scenarios')}>
    <p className="module-disclaimer">{t('Save explicit assumptions for this exact source and player on this browser. No CA/PA, hidden fields or original save bytes are included. Saved names are your own text. Nothing is restored automatically.')}</p>
    <label className="editor-field"><span>{t('Scenario name')}</span>
      <input value={name} maxLength={80} onChange={event => setName(event.currentTarget.value)}/></label>
    <div className="save-db-actions">
      <Button type="button" disabled={!ready || !validName || atLimit} onClick={save}>{t('Save scenario {{slot}}', { slot: active })}</Button>
      <span>{records.length} / {MAX_DEVELOPMENT_SCENARIOS}</span>
    </div>
    {atLimit && <p className="module-disclaimer">{t('Delete a saved scenario before adding another.')}</p>}
    {records.length > 0 && <>
      <table className="compare-table" aria-label={t('Saved development scenarios')}>
        <thead><tr><th scope="col">{t('Scenario name')}</th><th scope="col">{t('Source status')}</th></tr></thead>
        <tbody>{records.slice(range.start, range.end).map(item => <tr key={item.id}>
          <th scope="row"><Button type="button" variant="quiet" aria-pressed={selected === item.id}
            onClick={() => { setSelected(item.id); setName(item.name); }}>{item.name}</Button></th>
          <td>{t(item.revision === ready?.binding.revision ? 'Source matches' : 'Source changed')}</td>
        </tr>)}</tbody>
      </table>
      <ReportPagination label={t('Saved development scenarios page')} range={range} onChange={setPage}/>
      {record && <p>{t('Selected saved scenario')}: {record.name}</p>}
      {stale && <p className="module-disclaimer">{t('The visible source values changed. Restore is blocked; the saved assumptions can still be exported or deleted.')}</p>}
      <div className="save-db-actions">
        <Button type="button" disabled={!record || stale} onClick={restore}>{t('Restore into scenario {{slot}}', { slot: active })}</Button>
        <Button type="button" disabled={!record || !validName} onClick={rename}>{t('Rename saved scenario')}</Button>
        <Button type="button" disabled={!record || !validName || atLimit} onClick={duplicate}>{t('Duplicate saved scenario')}</Button>
        <Button type="button" disabled={!record} onClick={exportRecord}>{t('Export scenario JSON')}</Button>
        <Button type="button" variant="danger" disabled={!record} onClick={remove}>{t('Delete saved scenario')}</Button>
      </div>
    </>}
    {notice && <p role="status" aria-live="polite">{t(notice)}</p>}
  </section>;
}
