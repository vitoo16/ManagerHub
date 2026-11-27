import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, bindDevelopmentSource, importDevelopmentLibrary, previewDevelopmentRebase, rebaseDevelopmentRecord, MAX_DEVELOPMENT_JSON, decodeDevelopmentLibrary, encodeDevelopmentLibrary, makeDevelopmentRecord,
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
  const [incoming, setIncoming] = useState<{ raw: string; library: DevelopmentLibrary } | null>(null);
  const [reading, setReading] = useState(false);
  const [reviewRebase, setReviewRebase] = useState(false);
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
  const rebase = reviewRebase && record && stale && ready ? previewDevelopmentRebase(ready.library, record.id, ready.binding, player) : null;
  const importPreview = incoming?.library.scope === ready?.binding.scope ? incoming?.library : null;
  let nameHasControl = false;
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      nameHasControl = true;
      break;
    }
  }
  const validName = name.trim().length > 0 && name.trim().length <= 80 && !nameHasControl;
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
  const chooseImport = async (file: File | undefined) => {
    setIncoming(null);
    if (!file || !ready) return;
    setReading(true);
    try {
      // Bound UTF-8 bytes before reading; the decoder separately bounds JSON characters.
      if (file.size > MAX_DEVELOPMENT_JSON * 3) throw new Error('invalid_development_library');
      const raw = await file.text();
      importDevelopmentLibrary(raw, ready.library, ready.binding, player);
      setIncoming({ raw, library: decodeDevelopmentLibrary(raw, ready.binding) });
      setNotice('');
    } catch {
      setNotice('Import rejected. Use a compatible JSON for this exact source and player with unique records and available space.');
    } finally {
      setReading(false);
    }
  };
  const confirmImport = () => run(current => {
    if (incoming === null) return;
    const next = importDevelopmentLibrary(incoming.raw, current.library, current.binding, player);
    write(current, next.records);
    setIncoming(null);
    setPage(0);
    setSelected('');
    setReviewRebase(false);
  });
  const save = () => run(current => {
    const next = makeDevelopmentRecord(current.binding, player, scenario, name.trim(), crypto.randomUUID(), new Date().toISOString());
    write(current, [next, ...current.library.records]);
    setSelected(next.id); setPage(0); setReviewRebase(false);
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
    setSelected(next.id); setPage(0); setReviewRebase(false);
  });
  const remove = () => withRecord((current, item) => {
    if (!window.confirm(t('Delete the selected saved development scenario? Current A/B assumptions will stay unchanged.'))) return;
    write(current, current.library.records.filter(value => value.id !== item.id));
    setSelected('');
    setReviewRebase(false);
    setNotice('Saved development scenario removed.');
  });
  const saveRebase = () => withRecord((current, item) => {
    const next = rebaseDevelopmentRecord(current.library, item.id, current.binding, player, name.trim(), crypto.randomUUID(), new Date().toISOString());
    write(current, [next, ...current.library.records]);
    setSelected(next.id);
    setPage(0);
    setReviewRebase(false);
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
    <label className="editor-field"><span>{t('Import scenario JSON')}</span>
      <input type="file" accept=".json,application/json" disabled={!ready || reading || atLimit} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        void chooseImport(file);
      }}/></label>
    {importPreview && <div>
      <p>{t('Review imported assumptions: {{count}} records. Nothing will be restored automatically.', { count: importPreview.records.length })}</p>
      <ul>{importPreview.records.map(item => <li key={item.id}>{item.name} — {t(item.revision === ready?.binding.revision ? 'Source matches' : 'Source changed')}</li>)}</ul>
      <div className="save-db-actions">
        <Button type="button" onClick={confirmImport}>{t('Confirm scenario import')}</Button>
        <Button type="button" variant="quiet" onClick={() => setIncoming(null)}>{t('Cancel')}</Button>
      </div>
    </div>}
    {atLimit && <p className="module-disclaimer">{t('Delete a saved scenario before adding another.')}</p>}
    {records.length > 0 && <>
      <table className="compare-table" aria-label={t('Saved development scenarios')}>
        <thead><tr><th scope="col">{t('Scenario name')}</th><th scope="col">{t('Source status')}</th></tr></thead>
        <tbody>{records.slice(range.start, range.end).map(item => <tr key={item.id}>
          <th scope="row"><Button type="button" variant="quiet" aria-pressed={selected === item.id}
            onClick={() => { setSelected(item.id); setName(item.name); setReviewRebase(false); }}>{item.name}</Button></th>
          <td>{t(item.revision === ready?.binding.revision ? 'Source matches' : 'Source changed')}</td>
        </tr>)}</tbody>
      </table>
      <ReportPagination label={t('Saved development scenarios page')} range={range} onChange={setPage}/>
      {record && <p>{t('Selected saved scenario')}: {record.name}</p>}
      {stale && <p className="module-disclaimer">{t('The visible source values changed. Restore is blocked. Review the targets against the current source before saving a separate rebased copy.')}</p>}
      <div className="save-db-actions">
        <Button type="button" disabled={!record || stale} onClick={restore}>{t('Restore into scenario {{slot}}', { slot: active })}</Button>
        <Button type="button" disabled={!record || !validName} onClick={rename}>{t('Rename saved scenario')}</Button>
        <Button type="button" disabled={!record || !validName || atLimit} onClick={duplicate}>{t('Duplicate saved scenario')}</Button>
        <Button type="button" disabled={!record || !stale || atLimit} onClick={() => setReviewRebase(true)}>{t('Review scenario rebase')}</Button>
        <Button type="button" disabled={!record} onClick={exportRecord}>{t('Export scenario JSON')}</Button>
        <Button type="button" variant="danger" disabled={!record} onClick={remove}>{t('Delete saved scenario')}</Button>
      </div>
      {rebase && <section aria-label={t('Scenario rebase preview')}>
        <p className="module-disclaimer">{t('Review absolute targets against current observed attributes. Met targets are removed, locks use current values, and missing inputs block rebase. Previous baseline values are not stored.')}</p>
        {rebase.rows.length > 0 && <div className="editor-diff-wrap"><table className="compare-table development-table" aria-label={t('Scenario rebase preview')}>
          <thead><tr><th scope="col">{t('Attributes')}</th><th scope="col">{t('Current')}</th><th scope="col">{t('Previous target')}</th><th scope="col">{t('Proposed')}</th><th scope="col">{t('Source status')}</th></tr></thead>
          <tbody>{rebase.rows.map(row => <tr key={row.key}>
            <th scope="row">{t(ATTRIBUTE_LABELS[row.key])}</th><td>{row.current ?? '—'}</td><td>{row.previousTarget ?? '—'}</td>
            <td>{row.proposed ?? '—'}</td><td>{t(row.status === 'retained' ? 'Target retained' : row.status === 'satisfied' ? 'Target already met' : row.status === 'locked' ? 'Lock current value' : 'Missing input')}</td>
          </tr>)}</tbody>
        </table></div>}
        <div className="save-db-actions">
          <Button type="button" disabled={!rebase.scenario || !validName || atLimit} onClick={saveRebase}>{t('Save rebased copy')}</Button>
          <Button type="button" variant="quiet" onClick={() => setReviewRebase(false)}>{t('Cancel')}</Button>
        </div>
      </section>}
    </>}
    {notice && <p role="status" aria-live="polite">{t(notice)}</p>}
  </section>;
}
