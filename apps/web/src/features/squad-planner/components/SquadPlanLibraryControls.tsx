import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  decodeSavedSquadPlans, makeSavedSquadPlans, restoreSavedSquadPlans,
  squadPlanStorageKey, SAVED_SQUAD_PLAN_STORAGE_PREFIX,
  type PlayerDataset, type SquadPlans, type SquadPlanKey
} from '@managerhub/domain';
import { Button, Icon } from '@managerhub/ui';

type Props = {
  dataset: PlayerDataset;
  plans: SquadPlans;
  active: SquadPlanKey;
  onRestore: (plans: SquadPlans, active: SquadPlanKey) => void;
};

/** Explicit user actions only. No automatic persistence or silent cross-career restore. */
function SquadPlanLibraryControls({ dataset, plans, active, onRestore }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);

  const save = useCallback(async () => {
    setBusy(true); setNotice(null); setConfirmForget(false);
    try {
      const record = await makeSavedSquadPlans(dataset, plans, active);
      localStorage.setItem(SAVED_SQUAD_PLAN_STORAGE_PREFIX + record.datasetSha256, JSON.stringify(record));
      setNotice('Plans A and B saved for this exact player export on this browser.');
    } catch {
      setNotice('Could not save these plans. Check conflicting locks or browser storage permissions.');
    } finally { setBusy(false); }
  }, [dataset, plans, active]);

  const restore = useCallback(async () => {
    setBusy(true); setNotice(null); setConfirmForget(false);
    try {
      const key = await squadPlanStorageKey(dataset);
      const saved = localStorage.getItem(key);
      if (saved === null) {
        setNotice('No saved plans found for this exact player export.');
        return;
      }
      const restored = await restoreSavedSquadPlans(decodeSavedSquadPlans(saved), dataset);
      onRestore(restored.plans, restored.active);
      setNotice('Plans A and B restored from this browser.');
    } catch {
      setNotice('Saved plans could not be validated. Your current plans were not changed.');
    } finally { setBusy(false); }
  }, [dataset, onRestore]);

  const forget = useCallback(async () => {
    setBusy(true); setNotice(null);
    try {
      const key = await squadPlanStorageKey(dataset);
      localStorage.removeItem(key);
      setNotice('Saved plans for this player export were removed. Current session plans remain unchanged.');
    } catch {
      setNotice('Could not remove saved plans from browser storage.');
    } finally {
      setBusy(false); setConfirmForget(false);
    }
  }, [dataset]);

  return <section className="squad-plan-library" aria-label={t('Saved squad plans')}>
    <div className="squad-plan-library__intro">
      <strong><Icon name="database" size={16}/> {t('Save and restore your plans')}</strong>
      <p>{t('Keep both lineups on this browser, tied to this exact imported player list. Nothing is uploaded or saved automatically.')}</p>
    </div>
    <div className="squad-plan-library__actions">
      <Button disabled={busy} onClick={() => void save()}>{t('Save plans locally')}</Button>
      <Button variant="quiet" disabled={busy} onClick={() => void restore()}>{t('Restore saved plans')}</Button>
      {confirmForget ? <>
        <Button variant="danger" disabled={busy} onClick={() => void forget()}>{t('Confirm forget plans')}</Button>
        <Button variant="quiet" disabled={busy} onClick={() => setConfirmForget(false)}>{t('Cancel')}</Button>
      </> : <Button variant="quiet" disabled={busy} onClick={() => { setConfirmForget(true); setNotice(null); }}>{t('Forget saved plans')}</Button>}
    </div>
    {notice && <p className="squad-plan-library__notice" role="status" aria-live="polite">{t(notice)}</p>}
  </section>;
}

export default memo(SquadPlanLibraryControls);
