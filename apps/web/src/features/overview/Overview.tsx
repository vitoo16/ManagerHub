import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type PlayerDataset, type SaveIdentity, type WorkspaceKey } from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import ContinueWorkspace from './ContinueWorkspace';

const WORKFLOWS: readonly { title: string; detail: string; destination: WorkspaceKey }[] = [
  { title: 'Import observed player data', detail: 'Use a local HTML/CSV/TSV export, not an unverified .fm player decoder.', destination: 'players' },
  { title: 'Compare player roles', detail: 'Inspect visible attributes and source-labeled heuristic role fit.', destination: 'players' },
  { title: 'Build your starting XI', detail: 'Create, save, compare and export Plan A/B without changing your game save.', destination: 'squad' }
];

function Overview({ imports, current, onDataset, go }: {
  imports: readonly SaveIdentity[];
  current: PlayerDataset | null;
  onDataset: (dataset: PlayerDataset) => void;
  go: (key: WorkspaceKey) => void;
}) {
  const { t } = useTranslation();
  return <div className="view-flow">
    <div className="hero">
      <div className="hero-content">
        <div className="hero-kicker"><span className="hero-kicker__dot"/> {t("THE NEXT ERA OF FOOTBALL MANAGEMENT")}</div>
        <h1>{t("Every decision.")}<br/><em>{t("Better informed.")}</em></h1>
        <p>{t("Analyze player exports, compare two starting elevens and pick up work saved in this browser. Every estimate stays labeled.")}</p>
        <div className="hero-actions">
          <Button variant="primary" onClick={() => go('players')}><Icon name="plus" size={17}/> {t("Import player list")}</Button>
          <Button onClick={() => go('squad')}><Icon name="layers" size={17}/> {t("Squad Planner")}</Button>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="radar-rings"><i/><i/><i/><i/></div>
        <div className="hero-pitch"><span className="pitch-line pitch-line-a"/><span className="pitch-line pitch-line-b"/><span className="pitch-line pitch-line-c"/><span className="pitch-circle"/></div>
        <div className="hero-art-caption">{t("PLAN  ·  ANALYZE  ·  EVOLVE")}</div>
      </div>
    </div>
    <ContinueWorkspace current={current} onDataset={onDataset} go={go}/>
    <div className="headline-stats" aria-label={t("Workspace information")}>
      <Surface className="stat-card"><span className="stat-label">{t("Product scope")}</span><div className="stat-value">27<span>{t("modules")}</span></div><span className="stat-sub">{t("Six interconnected departments")}</span></Surface>
      <Surface className="stat-card"><span className="stat-label">{t("Local files inspected")}</span><div className="stat-value">{imports.length.toString().padStart(2, '0')}<span>{t("files")}</span></div><span className="stat-sub">{t("No save files uploaded to a server")}</span></Surface>
      <Surface className="stat-card"><span className="stat-label">{t("Loaded player records")}</span><div className="stat-value">{(current?.players.length ?? 0).toLocaleString()}<span>{t("players")}</span></div><span className="stat-sub">{t("Export-derived data · No verified live reader")}</span></Surface>
    </div>
    <SectionHeading eyebrow={t("AVAILABLE WORKFLOWS")} title={t("What you can do today")}>
      <button className="text-link" onClick={() => go('modules')}>{t("All 27 workstreams")} <Icon name="arrow" size={15}/></button>
    </SectionHeading>
    <div className="overview-panels">
      <Surface className="phase-card">
        <div className="panel-heading"><span>{t("WORK WITH REAL EXPORTS")}</span><Status tone="info">{t("Local and read-only")}</Status></div>
        <div className="phase-list">
          {WORKFLOWS.map((workflow, i) =>
            <div key={workflow.title} className="phase-row">
              <div className={'phase-marker ' + (i === 0 ? 'phase-marker--active' : '')}>{String(i + 1).padStart(2, '0')}</div>
              <div className="phase-row__copy"><strong>{t(workflow.title)}</strong><small>{t(workflow.detail)}</small></div>
              <button className="phase-row__action" onClick={() => go(workflow.destination)}
                aria-label={t('Open {{workspace}}', { workspace: t(workflow.title) })}>{t('Open')} <Icon name="arrow" size={13}/></button>
            </div>
          )}
        </div>
        <div className="phase-card__footer"><button className="text-link" onClick={() => go('modules')}>{t("Full feature directory")} <Icon name="chevron" size={14}/></button></div>
      </Surface>
      <Surface className="principles-card">
        <div className="panel-heading"><span>{t("HOW TO READ YOUR RESULTS")}</span><Icon name="shield" size={17}/></div>
        <div className="principle"><span className="principle__icon"><Icon name="check" size={18}/></span><div><strong>{t("CA and PA are different from role fit")}</strong><p>{t("We label actual CA, estimates and role-fit scores separately, so you know what each number means.")}</p></div></div>
        <div className="principle"><span className="principle__icon"><Icon name="check" size={18}/></span><div><strong>{t("Use the same squad across tools")}</strong><p>{t("Your player reports and squad plans work from the same list you imported.")}</p></div></div>
        <div className="principle"><span className="principle__icon"><Icon name="check" size={18}/></span><div><strong>{t("Your files stay yours")}</strong><p>{t("ManagerHub checks files on your device. It never changes your original save.")}</p></div></div>
        <button onClick={() => go('architecture')} className="principles-link">{t("Understand data integrity")} <Icon name="arrow" size={16}/></button>
      </Surface>
    </div>
  </div>;
}
export default memo(Overview);
