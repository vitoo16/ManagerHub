import { lazy, memo, Suspense, useId, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { FORMATIONS, type PlayerDataset, type SquadPlanKey, type SquadPlans, type TacticalScenarios } from '@managerhub/domain';
import type { DecodedSaveDatabase } from '@managerhub/domain/fm2013-offline';
import { Icon, SectionHeading, SectionTabs, Status, Surface } from '@managerhub/ui';
import TacticalPitch from './features/squad-planner/components/TacticalPitch';
import LineupResults from './features/squad-planner/components/LineupResults';
import SquadScenarioHeader from './features/squad-planner/components/SquadScenarioHeader';
import SquadControlBar from './features/squad-planner/components/SquadControlBar';
import SquadPlanLibraryControls from './features/squad-planner/components/SquadPlanLibraryControls';
import SquadSummaryCards from './features/squad-planner/components/SquadSummaryCards';
import SquadEmptyState from './features/squad-planner/components/SquadEmptyState';
import SavedSquadRosterPicker from './features/squad-planner/components/SavedSquadRosterPicker';
import SquadReportActions from './features/squad-planner/components/SquadReportActions';
import { useSquadPlannerModel } from './features/squad-planner/hooks/useSquadPlannerModel';
import { registerSaveDbI18n } from './i18n/register-save-db-i18n';
import './squad-workspace.css';

registerSaveDbI18n();

const TacticalLab = lazy(() => import('./features/squad-planner/components/TacticalLab'));
const PinEditor = lazy(() => import('./features/squad-planner/components/PinEditor'));
const ScenarioComparison = lazy(() => import('./features/squad-planner/components/ScenarioComparison'));
const PositionCoverageTable = lazy(() => import('./features/squad-planner/components/PositionCoverageTable'));

const SQUAD_SECTIONS = [
  { id: 'lineup', label: 'Starting eleven' },
  { id: 'constraints', label: 'Adjust squad' },
  { id: 'tactics', label: 'Tactical Lab' },
  { id: 'compare', label: 'Plan comparison' },
  { id: 'coverage', label: 'Position coverage and blockers' }
] as const;
type SquadSection = typeof SQUAD_SECTIONS[number]['id'];

function SquadWorkspaceView({
  dataset,
  onImport,
  onOpenSaves,
  onDataset,
  plans,
  setPlans,
  active,
  setActive,
  tacticalScenarios,
  setTacticalScenarios,
  activeDecodedSave = null,
  clubFilterUid = null,
  onClubFilterChange
}: {
  dataset: PlayerDataset | null;
  onImport: () => void;
  onOpenSaves?: () => void;
  onDataset: (dataset: PlayerDataset) => void;
  plans: SquadPlans;
  setPlans: Dispatch<SetStateAction<SquadPlans>>;
  active: SquadPlanKey;
  setActive: Dispatch<SetStateAction<SquadPlanKey>>;
  tacticalScenarios: TacticalScenarios;
  setTacticalScenarios: Dispatch<SetStateAction<TacticalScenarios>>;
  activeDecodedSave?: DecodedSaveDatabase | null;
  clubFilterUid?: number | null;
  onClubFilterChange?: (clubUid: number | null) => void;
}) {
  const { t } = useTranslation();
  const clubSelectId = useId();
  const sectionId = useId();
  const [section, setSection] = useState<SquadSection>('lineup');
  const [tacticsVisited, setTacticsVisited] = useState(false);
  const changeSection = (next: SquadSection) => {
    setSection(next);
    if (next === 'tactics') setTacticsVisited(true);
  };
  const {
    plan, solution, solutions, unknownPositions,
    changeFormation, onPin, onExclude, reset, onCopyPlanAtoB
  } = useSquadPlannerModel({ dataset, plans, setPlans, active, setActive });

  const clubsWithPlayers = useMemo(() => {
    if (!activeDecodedSave) return [];
    return activeDecodedSave.clubs
      .filter(club => club.playerCount > 0)
      .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName));
  }, [activeDecodedSave]);

  const isDecodedSource = dataset?.source === 'decoded_save' && activeDecodedSave !== null;

  return <div className="view-flow">
    <div className="page-title">
      <span className="mh-eyebrow">{t("SQUAD MANAGEMENT / CONSTRAINT-BASED ANALYSIS")}</span>
      <h1>{t("Squad Planner")}</h1>
      <p>{t("Pick a formation, keep your favorite players in position, exclude others and compare two possible starting elevens.")}</p>
    </div>
    {!dataset ? <>
      <SavedSquadRosterPicker onDataset={onDataset}/>
      <SquadEmptyState onImport={onImport} onOpenSaves={onOpenSaves}/>
    </> : <>
      {isDecodedSource && activeDecodedSave && onClubFilterChange && (
        <Surface className="squad-decoded-bar">
          <div className="squad-decoded-bar__meta">
            <Status tone="positive">{t('Decoded save active')}</Status>
            <strong>{activeDecodedSave.source.fileName}</strong>
            <span>
              {activeDecodedSave.source.edition} {activeDecodedSave.source.build}
              {activeDecodedSave.source.gameDate ? ` · ${activeDecodedSave.source.gameDate}` : ''}
            </span>
          </div>
          <label className="squad-decoded-bar__select" htmlFor={clubSelectId}>
            <span>{t('Active squad club')}</span>
            <select
              id={clubSelectId}
              aria-label={t('Select club squad from save')}
              value={clubFilterUid === null ? 'all' : String(clubFilterUid)}
              onChange={event => {
                const value = event.currentTarget.value;
                onClubFilterChange(value === 'all' ? null : Number(value));
              }}
            >
              <option value="all">{t('All players in save')} ({activeDecodedSave.counts.players.toLocaleString()})</option>
              {clubsWithPlayers.map(club => (
                <option key={club.uid} value={String(club.uid)}>
                  {club.shortName || club.fullName} ({club.playerCount})
                </option>
              ))}
            </select>
          </label>
        </Surface>
      )}
      <SquadScenarioHeader active={active} onSetActive={setActive} onCopyPlanAtoB={onCopyPlanAtoB}/>
      <SquadPlanLibraryControls key={dataset.importedAt + ':' + dataset.fileName}
        dataset={dataset} plans={plans} active={active}
        onRestore={(nextPlans, nextActive) => { setPlans(nextPlans); setActive(nextActive); }}/>
      {solutions && <SquadReportActions dataset={dataset} solutions={solutions}/>}
      <SquadControlBar formation={plan.formation} dataset={dataset} solution={solution} onChangeFormation={changeFormation}/>
      <SquadSummaryCards solution={solution} plan={plan} unknownPositions={unknownPositions}/>

      <SectionTabs<SquadSection> id={sectionId} label={t('Squad planner sections')}
        items={SQUAD_SECTIONS.map(item => ({ ...item, label: t(item.label) }))}
        active={section} onChange={changeSection}/>
      <div className="squad-section-panel" role="tabpanel" id={sectionId + '-panel'}
        aria-labelledby={sectionId + '-tab-' + section}>
        <Suspense fallback={<p role="status">{t('Loading…')}</p>}>
          {section === 'lineup' && solution && <div className="squad-workspace-grid">
            <TacticalPitch solution={solution}/>
            <LineupResults solution={solution}/>
          </div>}
          {section === 'constraints' && <>
            <SectionHeading eyebrow={t('WHAT-IF PLANNING')} title={t('Adjust Plan') + ' ' + active}/>
            <PinEditor key={active + plan.formation} slots={FORMATIONS[plan.formation]} dataset={dataset}
              locks={plan.lockedSlots} excluded={plan.excludedPlayerIds}
              onPin={onPin} onExclude={onExclude} onClear={reset}/>
          </>}
          {/* Keep the visited tactical editor mounted to preserve its local adjustment history. */}
          {tacticsVisited && <div hidden={section !== 'tactics'}>
            <TacticalLab dataset={dataset} plans={plans} active={active} solution={solution}
              scenarios={tacticalScenarios} setScenarios={setTacticalScenarios}/>
          </div>}
          {section === 'compare' && solutions && <ScenarioComparison left={solutions.A} right={solutions.B}/>}
          {section === 'coverage' && <PositionCoverageTable solution={solution}/>}
        </Suspense>
      </div>

      <div className="coverage-note"><Icon name="shield" size={17}/>
        <p><strong>{t("Interpretation:")}</strong> {t("Plans A and B stay available while you browse this session. Role-fit estimates don't include match fitness, chemistry or hidden CA and PA.")}</p>
      </div>
    </>}
  </div>;
}


export const SquadWorkspace = memo(SquadWorkspaceView);
