import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type SaveIdentity, type WorkspaceKey } from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';

const PHASES = [
  { name: 'Foundation & Interface', detail: 'Core architecture, design system, motion', count: 'Phase 01' },
  { name: 'Football Manager Data', detail: 'Save adapters, verified player records', count: 'Phase 02' },
  { name: 'Player Intelligence', detail: 'eCA, role intelligence, scouting charts', count: 'Phase 03' },
  { name: 'Tactics & Squad Planning', detail: 'Tactical Lab, optimized lineups', count: 'Phase 04' },
  { name: 'Sporting Department', detail: 'Transfers, contracts, youth, finance', count: 'Phase 05' },
  { name: 'Club Management & AI', detail: 'Matchday, boardroom, AI staff', count: 'Phase 06' },
  { name: 'Full Integration', detail: 'Set pieces, certified editor, release', count: 'Phase 07' }
] as const;

function Overview({ imports, go }: { imports: readonly SaveIdentity[]; go: (key: WorkspaceKey) => void }) {
  const { t } = useTranslation();
  return <div className="view-flow">
    <div className="hero">
      <div className="hero-content">
        <div className="hero-kicker"><span className="hero-kicker__dot"/> {t("THE NEXT ERA OF FOOTBALL MANAGEMENT")}</div>
        <h1>{t("Every decision.")}<br/><em>{t("Better informed.")}</em></h1>
        <p>{t("A single command center for your career. Built around verified Football Manager data, transparent analysis and a system designed to grow with the club.")}</p>
        <div className="hero-actions">
          <Button variant="primary" onClick={() => go('saves')}><Icon name="plus" size={17}/> {t("Inspect a save")}</Button>
          <Button onClick={() => go('players')}><Icon name="compass" size={17}/> {t("Player Lab")}</Button>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="radar-rings"><i/><i/><i/><i/></div>
        <div className="hero-pitch"><span className="pitch-line pitch-line-a"/><span className="pitch-line pitch-line-b"/><span className="pitch-line pitch-line-c"/><span className="pitch-circle"/></div>
        <div className="hero-art-caption">{t("PLAN  ·  ANALYZE  ·  EVOLVE")}</div>
      </div>
    </div>
    <div className="headline-stats" aria-label={t("Workspace information")}>
      <Surface className="stat-card"><span className="stat-label">{t("Product scope")}</span><div className="stat-value">27<span>{t("modules")}</span></div><span className="stat-sub">{t("Six interconnected departments")}</span></Surface>
      <Surface className="stat-card"><span className="stat-label">{t("Local files inspected")}</span><div className="stat-value">{imports.length.toString().padStart(2, '0')}<span>{t("files")}</span></div><span className="stat-sub">{t("No save files uploaded to a server")}</span></Surface>
      <Surface className="stat-card"><span className="stat-label">{t("Current implementation")}</span><div className="stat-value stat-value--word">{t("Foundation")}</div><span className="stat-sub">{t("Player exports work now · Save reader is still being built")}</span></Surface>
    </div>
    <SectionHeading eyebrow={t("BUILD PROGRESS")} title={t("Your management ecosystem")}>
      <button className="text-link" onClick={() => go('modules')}>{t("All 27 workstreams")} <Icon name="arrow" size={15}/></button>
    </SectionHeading>
    <div className="overview-panels">
      <Surface className="phase-card">
        <div className="panel-heading"><span>{t("WHAT'S COMING NEXT")}</span><Status tone="info">{t("7 integrated phases")}</Status></div>
        <div className="phase-list">
          {PHASES.slice(0, 5).map((phase, i) =>
            <div key={phase.name} className="phase-row">
              <div className={'phase-marker ' + (i === 0 ? 'phase-marker--active' : '')}>{String(i + 1).padStart(2, '0')}</div>
              <div className="phase-row__copy"><strong>{t(phase.name)}</strong><small>{t(phase.detail)}</small></div>
              <span className="phase-row__state">{t(i === 0 ? 'IN PROGRESS' : 'PLANNED')}</span>
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
