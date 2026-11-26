import { downloadContent } from '../../../download-content';
import { memo, useCallback, useId, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FORMATIONS, analyzeRoleInteractions, applyRoleInteractionAdjustment, applyTacticalDiagnosticAdjustment, createTacticalScenarioCsv, defaultTacticalScenario, diagnoseTacticalScenario, isRoleAdjustmentId, makeSavedTacticalScenarios, positionTacticalSlot,
  restoreSavedTacticalScenarios, squadDatasetSha256, tacticalPosition, tacticalReportFilename, tacticalScenarioForFormation,
  TACTICAL_STORAGE_PREFIX,
  type PlayerDataset, type RoleInteractionFinding, type SquadPlanKey, type SquadPlans, type SquadSolution,
  type TacticalInstructions, type TacticalPhase, type TacticalPoint,
  type TacticalDiagnosticId, type TacticalScenario, type TacticalScenarios, type TacticalWidth, type TacticalIntensity
} from '@managerhub/domain';
import { Button, SectionTabs, Surface } from '@managerhub/ui';
import { TacticalRoleReport, TacticalShapeReport } from './TacticalAnalysisPanels';

type Props = {
  dataset: PlayerDataset;
  plans: SquadPlans;
  active: SquadPlanKey;
  solution: SquadSolution | null;
  scenarios: TacticalScenarios;
  setScenarios: Dispatch<SetStateAction<TacticalScenarios>>;
};

const ANALYSIS_SECTIONS = [{ id: 'shape', label: 'Tactical diagnostics' }, { id: 'roles', label: 'Role partnerships' }] as const;
type AnalysisSection = typeof ANALYSIS_SECTIONS[number]['id'];

const PHASES: readonly TacticalPhase[] = ['possession', 'defending'];
const LEVELS: readonly TacticalIntensity[] = ['low', 'balanced', 'high'];
const WIDTHS: readonly TacticalWidth[] = ['narrow', 'balanced', 'wide'];
type AdjustmentHistory = { before: TacticalScenario; after: TacticalScenario; kind: 'shape' | 'role' };

function TacticalLab({ dataset, plans, active, solution, scenarios, setScenarios }: Props) {
  const { t } = useTranslation();
  const analysisId = useId();
  const [analysis, setAnalysis] = useState<AnalysisSection>('shape');
  const [phase, setPhase] = useState<TacticalPhase>('possession');
  const [selectedId, setSelectedId] = useState('gk');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<Partial<Record<SquadPlanKey, AdjustmentHistory>>>({});
  const lastAdjustment = adjustmentHistory[active];
  const dragging = useRef<string | null>(null);
  const formation = plans[active].formation;
  const scenario = useMemo(() => tacticalScenarioForFormation(scenarios[active], formation), [scenarios, active, formation]);
  const slots = FORMATIONS[formation];
  const lineup = useMemo(() => new Map(solution?.lineup.map(item => [item.slot.id, item] as const) ?? []), [solution]);
  const selectedSlot = slots.find(item => item.id === selectedId) ?? slots[0]!;
  const selectedPoint = tacticalPosition(scenario, phase, selectedSlot.id);
  const changedPositions = Object.keys(scenario.placements[phase]).length;
  const report = useMemo(() => analysis === 'shape' ? diagnoseTacticalScenario(scenario, solution) : null, [analysis, scenario, solution]);
  const roleInteractions = useMemo(() => analysis === 'roles' ? analyzeRoleInteractions(scenario, solution) : null, [analysis, scenario, solution]);

  const updateScenario = useCallback((update: (current: TacticalScenario) => TacticalScenario) => {
    setAdjustmentHistory(previous => ({ ...previous, [active]: undefined }));
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
    setAdjustmentHistory(previous => ({ ...previous, [active]: { before: scenario, after: adjusted, kind: 'shape' } }));
    setNotice(null);
  };

  const applyRoleAdjustment = (finding: RoleInteractionFinding) => {
    if (!isRoleAdjustmentId(finding.id)) return;
    const adjusted = applyRoleInteractionAdjustment(scenario, solution, finding);
    if (adjusted === scenario) return;
    setScenarios(previous => ({ ...previous, [active]: adjusted }));
    setAdjustmentHistory(previous => ({ ...previous, [active]: { before: scenario, after: adjusted, kind: 'role' } }));
    setNotice(null);
  };

  const undoAdjustment = () => {
    if (!lastAdjustment || lastAdjustment.after !== scenario) return;
    setScenarios(previous => ({ ...previous, [active]: lastAdjustment.before }));
    setAdjustmentHistory(previous => ({ ...previous, [active]: undefined }));
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
    if (!rect.width || !rect.height) return;
    const point = {
      x: Math.max(1, Math.min(19, Math.round((event.clientX - rect.left) / rect.width * 20))),
      y: Math.max(1, Math.min(19, Math.round((event.clientY - rect.top) / rect.height * 20)))
    };
    // Pointer events within the same tactical grid cell need no state update.
    if (point.x === Number(event.currentTarget.dataset.x) && point.y === Number(event.currentTarget.dataset.y)) return;
    position(id, point);
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
    try {
      downloadContent(createTacticalScenarioCsv(active, scenario, solution), 'text/csv;charset=utf-8',
        tacticalReportFilename(dataset.fileName, active));
    } catch {
      setNotice('Could not export tactical report. The plan is unchanged.');
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
      setAdjustmentHistory({});
      setNotice('Tactical scenarios restored for both plans.');
    } catch {
      setNotice('Tactical scenarios could not be validated. Restore matching lineup formations first.');
    } finally { setBusy(false); }
  };

  const forget = async () => {
    setBusy(true); setNotice(null);
    try {
      localStorage.removeItem(TACTICAL_STORAGE_PREFIX + await squadDatasetSha256(dataset));
      setAdjustmentHistory({});
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
            <strong>{slot.label}</strong>{' '}<span>{assignment?.name ?? '—'}</span>
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
        <p className="tactical-lab__source">{t('Source: imported player export. Position labels and roles come from the current lineup. Tactical coordinates and instructions are user assumptions. Changing formations resets this plan’s tactical coordinates.')}</p>
      </Surface>
    </div>
    <div className="tactical-lab__analysis">
      <SectionTabs<AnalysisSection> id={analysisId} label={t('Tactical analysis sections')}
        items={ANALYSIS_SECTIONS.map(item => ({ ...item, label: t(item.label) }))}
        active={analysis} onChange={setAnalysis}/>
      <div role="tabpanel" id={analysisId + '-panel'} aria-labelledby={analysisId + '-tab-' + analysis}>
        {report && <TacticalShapeReport report={report} busy={busy}
          canUndo={lastAdjustment?.kind === 'shape' && lastAdjustment.after === scenario}
          undoAdjustment={undoAdjustment} applyAdjustment={applyAdjustment}/>}
        {roleInteractions && <TacticalRoleReport roleInteractions={roleInteractions} busy={busy}
          canUndo={lastAdjustment?.kind === 'role' && lastAdjustment.after === scenario}
          undoAdjustment={undoAdjustment} applyRoleAdjustment={applyRoleAdjustment}/>}
      </div>
    </div>
  </section>;
}

export default memo(TacticalLab);
