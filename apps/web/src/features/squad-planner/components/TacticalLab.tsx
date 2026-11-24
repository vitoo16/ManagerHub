import { memo, useCallback, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FORMATIONS, analyzeRoleInteractions, applyTacticalDiagnosticAdjustment, createTacticalScenarioCsv, defaultTacticalScenario, diagnoseTacticalScenario, makeSavedTacticalScenarios, positionTacticalSlot,
  restoreSavedTacticalScenarios, squadDatasetSha256, tacticalPosition, tacticalReportFilename, tacticalScenarioForFormation,
  TACTICAL_STORAGE_PREFIX,
  type PlayerDataset, type SquadPlanKey, type SquadPlans, type SquadSolution,
  type TacticalInstructions, type TacticalPhase, type TacticalPoint,
  type TacticalDiagnosticId, type TacticalScenario, type TacticalScenarios, type TacticalWidth, type TacticalIntensity
} from '@managerhub/domain';
import { Button, Surface } from '@managerhub/ui';

type Props = {
  dataset: PlayerDataset;
  plans: SquadPlans;
  active: SquadPlanKey;
  solution: SquadSolution | null;
  scenarios: TacticalScenarios;
  setScenarios: Dispatch<SetStateAction<TacticalScenarios>>;
};

const PHASES: readonly TacticalPhase[] = ['possession', 'defending'];
const LEVELS: readonly TacticalIntensity[] = ['low', 'balanced', 'high'];
const WIDTHS: readonly TacticalWidth[] = ['narrow', 'balanced', 'wide'];

function TacticalLab({ dataset, plans, active, solution, scenarios, setScenarios }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<TacticalPhase>('possession');
  const [selectedId, setSelectedId] = useState('gk');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);
  const [lastAdjustment, setLastAdjustment] = useState<{ plan: SquadPlanKey; before: TacticalScenario; after: TacticalScenario } | null>(null);
  const dragging = useRef<string | null>(null);
  const formation = plans[active].formation;
  const scenario = tacticalScenarioForFormation(scenarios[active], formation);
  const slots = FORMATIONS[formation];
  const lineup = new Map(solution?.lineup.map(item => [item.slot.id, item] as const) ?? []);
  const selectedSlot = slots.find(item => item.id === selectedId) ?? slots[0]!;
  const selectedPoint = tacticalPosition(scenario, phase, selectedSlot.id);
  const changedPositions = Object.keys(scenario.placements[phase]).length;
  const report = diagnoseTacticalScenario(scenario, solution);
  const roleInteractions = analyzeRoleInteractions(scenario, solution);

  const updateScenario = useCallback((update: (current: TacticalScenario) => TacticalScenario) => {
    setLastAdjustment(null);
    setScenarios(previous => ({
      ...previous,
      [active]: update(tacticalScenarioForFormation(previous[active], formation))
    }));
    setNotice(null);
  }, [active, formation, setScenarios]);

  const applyAdjustment = (id: TacticalDiagnosticId) => {
    if (id === 'incomplete-xi') return;
    const adjusted = applyTacticalDiagnosticAdjustment(scenario, id);
    setScenarios(previous => ({ ...previous, [active]: adjusted }));
    setLastAdjustment({ plan: active, before: scenario, after: adjusted });
    setNotice(null);
  };

  const undoAdjustment = () => {
    if (!lastAdjustment || lastAdjustment.plan !== active || lastAdjustment.after !== scenario) return;
    setScenarios(previous => ({ ...previous, [active]: lastAdjustment.before }));
    setLastAdjustment(null);
  };

  const position = useCallback((slotId: string, point: TacticalPoint) => {
    updateScenario(current => positionTacticalSlot(current, phase, slotId, point));
  }, [phase, updateScenario]);

  const nudge = useCallback((slotId: string, dx: number, dy: number) => {
    updateScenario(current => {
      const old = tacticalPosition(current, phase, slotId);
      const next = { x: Math.max(1, Math.min(19, old.x + dx)), y: Math.max(1, Math.min(19, old.y + dy)) };
      return old.x === next.x && old.y === next.y ? current : positionTacticalSlot(current, phase, slotId, next);
    });
  }, [phase, updateScenario]);

  const onArrow = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const step = event.shiftKey ? 2 : 1;
    const directions: Record<string, readonly [number, number]> = {
      ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0]
    };
    const change = directions[event.key];
    if (!change) return;
    event.preventDefault();
    setSelectedId(id);
    nudge(id, change[0]!, change[1]!);
  };

  const onDrag = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (dragging.current !== id) return;
    const pitch = event.currentTarget.closest<HTMLElement>('.tactical-lab__pitch');
    if (!pitch) return;
    const rect = pitch.getBoundingClientRect();
    position(id, {
      x: Math.max(1, Math.min(19, Math.round((event.clientX - rect.left) / rect.width * 20))),
      y: Math.max(1, Math.min(19, Math.round((event.clientY - rect.top) / rect.height * 20)))
    });
  };

  const changeInstructions = (next: Partial<TacticalInstructions>) => {
    updateScenario(current => ({ ...current, instructions: { ...current.instructions, ...next } }));
  };

  const currentScenarios = (): TacticalScenarios => ({
    A: tacticalScenarioForFormation(scenarios.A, plans.A.formation),
    B: tacticalScenarioForFormation(scenarios.B, plans.B.formation)
  });

  const exportTacticalReport = () => {
    setNotice(null);
    let url: string | null = null;
    try {
      const csv = createTacticalScenarioCsv(active, scenario, solution);
      url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = tacticalReportFilename(dataset.fileName, active);
      anchor.hidden = true;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
    } catch {
      setNotice('Could not export tactical report. The plan is unchanged.');
    } finally {
      if (url !== null) {
        const cleanupUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(cleanupUrl), 30_000);
      }
    }
  };

  const save = async () => {
    setBusy(true); setNotice(null); setConfirmForget(false);
    try {
      const record = await makeSavedTacticalScenarios(dataset, currentScenarios(), plans);
      localStorage.setItem(TACTICAL_STORAGE_PREFIX + record.datasetSha256, JSON.stringify(record));
      setNotice('Tactical scenarios A and B saved on this browser.');
    } catch {
      setNotice('Could not save tactical scenarios. Check browser storage permissions.');
    } finally { setBusy(false); }
  };

  const restore = async () => {
    setBusy(true); setNotice(null); setConfirmForget(false);
    try {
      const saved = localStorage.getItem(TACTICAL_STORAGE_PREFIX + await squadDatasetSha256(dataset));
      if (saved === null) { setNotice('No tactical scenarios saved for this export.'); return; }
      const restored = await restoreSavedTacticalScenarios(saved, dataset, plans);
      setScenarios(restored.scenarios);
      setLastAdjustment(null);
      setNotice('Tactical scenarios restored for both plans.');
    } catch {
      setNotice('Tactical scenarios could not be validated. Restore matching lineup formations first.');
    } finally { setBusy(false); }
  };

  const forget = async () => {
    setBusy(true); setNotice(null);
    try {
      localStorage.removeItem(TACTICAL_STORAGE_PREFIX + await squadDatasetSha256(dataset));
      setLastAdjustment(null);
      setNotice('Saved tactical scenarios removed. Session edits remain available.');
    } catch {
      setNotice('Could not remove saved tactical scenarios.');
    } finally { setBusy(false); setConfirmForget(false); }
  };

  return <section className="tactical-lab" aria-label={t('Tactical Lab')}>
    <div className="tactical-lab__intro">
      <div><span className="mh-eyebrow">MH-07 / {t('Tactical projection')}</span>
        <h2>{t('Tactical Lab')} · {t('Plan')} {active}</h2>
        <p>{t('Design your own in-possession and defending positions. These are user-authored projections for the imported XI, not native FM2013 instructions or observed player movement.')}</p>
      </div>
      <div className="tactical-lab__actions">
        <Button disabled={busy} onClick={() => void save()}>{t('Save tactical scenarios')}</Button>
        <Button variant="quiet" disabled={busy} onClick={exportTacticalReport}>{t('Export tactical plan as CSV')}</Button>
        <Button variant="quiet" disabled={busy} onClick={() => void restore()}>{t('Restore tactical scenarios')}</Button>
        {confirmForget ? <>
          <Button variant="danger" disabled={busy} onClick={() => void forget()}>{t('Confirm forget tactics')}</Button>
          <Button variant="quiet" disabled={busy} onClick={() => setConfirmForget(false)}>{t('Cancel')}</Button>
        </> : <Button variant="quiet" disabled={busy} onClick={() => setConfirmForget(true)}>{t('Forget tactical scenarios')}</Button>}
      </div>
    </div>
    {notice && <p role="status" className="tactical-lab__notice">{t(notice)}</p>}
    <div className="tactical-lab__phases" role="group" aria-label={t('Tactical phase')}>
      {PHASES.map(item => <button key={item} type="button" aria-pressed={phase === item}
        className={phase === item ? 'tactical-lab__phase tactical-lab__phase--active' : 'tactical-lab__phase'}
        onClick={() => setPhase(item)}>{t(item === 'possession' ? 'In possession' : 'Defending')}</button>)}
      <span>{t('{{count}} adjusted positions', { count: changedPositions })}</span>
    </div>
    <div className="tactical-lab__layout">
      <div className="tactical-lab__pitch" role="group" aria-label={t('Editable tactical pitch')}>
        <div className="squad-pitch__border"/><div className="squad-pitch__half"/>
        <div className="squad-pitch__circle"/><div className="squad-pitch__area squad-pitch__area--top"/>
        <div className="squad-pitch__area squad-pitch__area--bottom"/>
        {slots.map(slot => {
          const point = tacticalPosition(scenario, phase, slot.id);
          const assignment = lineup.get(slot.id);
          return <button key={slot.id} type="button" className="tactical-lab__player"
            data-slot={slot.id} data-x={point.x} data-y={point.y}
            aria-pressed={selectedSlot.id === slot.id}
            aria-label={t('Move {{slot}} {{player}} on tactical pitch', { slot: slot.label, player: assignment?.name ?? t('Unassigned') })}
            title={t('Use arrow keys to move, or drag on the pitch')}
            style={{ left: `${point.x * 5}%`, top: `${point.y * 5}%` }}
            onClick={() => setSelectedId(slot.id)}
            onKeyDown={event => onArrow(event, slot.id)}
            onPointerDown={event => {
              if (event.button !== 0) return;
              setSelectedId(slot.id);
              dragging.current = slot.id;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => onDrag(event, slot.id)}
            onPointerUp={event => { dragging.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
            onPointerCancel={() => { dragging.current = null; }}>
            <strong>{slot.label}</strong><span>{assignment?.name ?? '—'}</span>
          </button>;
        })}
      </div>
      <Surface className="tactical-lab__settings">
        <h3>{t('Adjust positions')}</h3>
        <p>{t('Select a player and move with arrow keys on the board, drag a marker, or use these controls on touch devices.')}</p>
        <label>{t('Select tactical position')}
          <select value={selectedSlot.id} onChange={event => setSelectedId(event.target.value)}>
            {slots.map(slot => <option key={slot.id} value={slot.id}>{slot.label} · {lineup.get(slot.id)?.name ?? t('Unassigned')}</option>)}
          </select>
        </label>
        <div className="tactical-lab__nudge" role="group" aria-label={t('Move selected position')}>
          <Button variant="quiet" onClick={() => nudge(selectedSlot.id, -1, 0)} aria-label={t('Move left')}>←</Button>
          <Button variant="quiet" onClick={() => nudge(selectedSlot.id, 0, -1)} aria-label={t('Move up')}>↑</Button>
          <Button variant="quiet" onClick={() => nudge(selectedSlot.id, 0, 1)} aria-label={t('Move down')}>↓</Button>
          <Button variant="quiet" onClick={() => nudge(selectedSlot.id, 1, 0)} aria-label={t('Move right')}>→</Button>
        </div>
        <p className="tactical-lab__coordinates">{selectedSlot.label} · X {selectedPoint.x} / 20 · Y {selectedPoint.y} / 20</p>
        <Button variant="quiet" onClick={() => updateScenario(() => defaultTacticalScenario(formation))}>{t('Reset tactical plan')}</Button>
        <h3>{t('Scenario assumptions')}</h3>
        <div className="tactical-lab__fields">
          {phase === 'possession' ? <>
            <label>{t('Attacking width')}<select value={scenario.instructions.width}
              onChange={event => changeInstructions({ width: event.target.value as TacticalWidth })}>
              {WIDTHS.map(item => <option key={item} value={item}>{t(item)}</option>)}
            </select></label>
            <label>{t('Proposed tempo')}<select value={scenario.instructions.tempo}
              onChange={event => changeInstructions({ tempo: event.target.value as TacticalIntensity })}>
              {LEVELS.map(item => <option key={item} value={item}>{t(item)}</option>)}
            </select></label>
          </> : <>
            <label>{t('Proposed pressing')}<select value={scenario.instructions.pressing}
              onChange={event => changeInstructions({ pressing: event.target.value as TacticalIntensity })}>
              {LEVELS.map(item => <option key={item} value={item}>{t(item)}</option>)}
            </select></label>
            <label>{t('Proposed defensive line')}<select value={scenario.instructions.defensiveLine}
              onChange={event => changeInstructions({ defensiveLine: event.target.value as TacticalIntensity })}>
              {LEVELS.map(item => <option key={item} value={item}>{t(item)}</option>)}
            </select></label>
          </>}
        </div>
        <section className="tactical-lab__diagnostics" aria-label={t('Tactical diagnostics')}>
          <h3>{t('Tactical diagnostics')}</h3>
          <p className="tactical-lab__diagnostic-summary" role="status">
            {report.lineupEvidence === 'incomplete-xi'
              ? t('Complete XI needed for shape diagnostics')
              : report.diagnostics.length === 0
                ? t('No shape risks detected by these rules')
                : t('{{count}} tactical cautions', { count: report.diagnostics.length })}
          </p>
          {report.diagnostics.length > 0 && <ul className="tactical-lab__diagnostic-list">
            {report.diagnostics.map(item => <li key={item.id} className="tactical-lab__diagnostic">
              <strong>{t(item.title)}</strong>
              <p><b>{t('Why flagged')}</b> {t(item.trigger)}</p>
              <p><b>{t('Consider')}</b> {t(item.adjustment)}</p>
              <p><b>{t('Limit')}</b> {t(item.limitation)}</p>
              {item.id !== 'incomplete-xi' && <Button variant="quiet" disabled={busy}
                aria-label={t('Apply suggested adjustment to {{finding}}', { finding: t(item.title) })}
                onClick={() => applyAdjustment(item.id)}>{t('Apply suggested adjustment')}</Button>}
            </li>)}
          </ul>}
          {lastAdjustment?.plan === active && lastAdjustment.after === scenario && <Button variant="quiet" disabled={busy}
            onClick={undoAdjustment}>{t('Undo last tactical adjustment')}</Button>}
          <p className="tactical-lab__diagnostic-provenance">{t('Rule set {{version}}. These checks use manager-authored positions and instructions, and cannot predict match outcomes.', { version: report.model })}</p>
        </section>
        <section className="tactical-lab__diagnostics" aria-label={t('Role partnerships')}>
          <h3>{t('Role partnerships')}</h3>
          {roleInteractions.findings.length === 0
            ? <p>{t('No role interaction findings under these bounded rules')}</p>
            : <ul className="tactical-lab__diagnostic-list">
              {roleInteractions.findings.map((finding, index) => <li key={finding.id + '-' + index} className="tactical-lab__diagnostic">
                <strong>{t(finding.title)}</strong>
                {finding.playerNames.length > 0 && <p>{t('Assigned players')}: {finding.playerNames.join(', ')}</p>}
                <p><b>{t('Why flagged')}</b> {t(finding.reason)}</p>
                <p><b>{t('Consider')}</b> {t(finding.suggestion)}</p>
                <p><b>{t('Limit')}</b> {t(finding.limitation)}</p>
              </li>)}
            </ul>}
          <p className="tactical-lab__diagnostic-provenance">{t('Role model {{version}} uses imported lineup roles and manager-authored positions only.', { version: roleInteractions.model })}</p>
        </section>
        <p className="tactical-lab__source">{t('Source: imported player export. Position labels and roles come from the current lineup. Tactical coordinates and instructions are user assumptions. Changing formations resets this plan’s tactical coordinates.')}</p>
      </Surface>
    </div>
  </section>;
}

export default memo(TacticalLab);
