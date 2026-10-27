import { useMemo, useState } from 'react';
import {
  FORMATIONS, declaredPositions, optimizeSquad, type FormationId, type PlayerDataset
} from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import './squad-workspace.css';

export function SquadWorkspace({ dataset, onImport }: { dataset: PlayerDataset | null; onImport: () => void }) {
  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const solution = useMemo(() => dataset ? optimizeSquad(dataset.players, formation) : null, [dataset, formation]);
  const unknownPositions = useMemo(() => dataset ?
    dataset.players.filter(player => declaredPositions(player.position).size === 0).length : 0, [dataset]);
  const positions = useMemo(() => new Map(solution?.lineup.map(assignment =>
    [assignment.slot.id, assignment]) ?? []), [solution]);

  return <div className="view-flow">
    <div className="page-title">
      <span className="mh-eyebrow">SQUAD MANAGEMENT / CONSTRAINT-BASED ANALYSIS</span>
      <h1>Squad Planner</h1>
      <p>Generate a complete eleven-player draft using the positions shown in your imported roster, explainable role-attribute estimates and unique-player assignment rules.</p>
    </div>
    {!dataset ? <Surface className="squad-no-data">
      <Icon name="layers" size={34}/>
      <h2>Your squad needs an actual player export.</h2>
      <p>Import an FM HTML/CSV/TSV squad list first. Unknown positions and attributes will not be filled with invented numbers.</p>
      <Button variant="primary" onClick={onImport}>Open Player Lab <Icon name="arrow" size={15}/></Button>
    </Surface> : <>
      <div className="squad-control-row">
        <label className="squad-formation-control">Formation
          <select value={formation} onChange={event => setFormation(event.target.value as FormationId)}>
            {Object.keys(FORMATIONS).map(key => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <div className="squad-source-label"><Icon name="shield" size={15}/>
          <span>{dataset.fileName} · {dataset.players.length} players · Imported data only</span></div>
        <Status tone={solution?.complete ? 'positive' : 'warning'}>{solution?.complete ? 'Feasible XI' : 'Incomplete XI'}</Status>
      </div>
      <div className="squad-summary-row">
        <Surface className="squad-summary-card"><span>Starting XI</span><strong>{solution?.lineup.length ?? 0}<small> / 11</small></strong><small>One player per slot</small></Surface>
        <Surface className="squad-summary-card"><span>Average role fit</span><strong>{solution?.averageRoleScore ?? '—'}{solution?.averageRoleScore !== null && <small> / 100</small>}</strong><small>Derived attribute heuristic</small></Surface>
        <Surface className="squad-summary-card"><span>Unrecognized positions</span><strong>{unknownPositions}</strong><small>Excluded rather than guessed</small></Surface>
      </div>
      <div className="squad-workspace-grid">
        <Surface className="squad-pitch-card">
          <div className="squad-card-heading"><span>Tactical selection</span><span>Draft · Not an in-game lineup</span></div>
          <div className="squad-pitch" role="img" aria-label={solution?.complete ?
            formation + ' pitch layout with eleven uniquely assigned players. Accessible lineup appears to the right.' :
            'Incomplete formation: no players positioned because a verified, eligible starting eleven is unavailable.'}>
            <div className="squad-pitch__border"/><div className="squad-pitch__half"/><div className="squad-pitch__circle"/>
            <div className="squad-pitch__area squad-pitch__area--top"/><div className="squad-pitch__area squad-pitch__area--bottom"/>
            {solution?.complete && FORMATIONS[formation].map(slot => {
              const assignment=positions.get(slot.id);
              if (!assignment) return null;
              const top = slot.row === -1 ? '12%' : slot.row === 0 ? (formation === '4-2-3-1' ? '34%' : '23%') :
                slot.row === 1 ? '52%' : slot.row === 2 ? '73%' : '90%';
              const left = (11 + slot.column * 19.5) + '%';
              return <div key={slot.id} className="squad-position-marker" style={{left,top}}>
                <span className="squad-position-marker__number">{slot.label}</span>
                <span className="squad-position-marker__name" title={assignment.name}>{assignment.name}</span>
                <span className="squad-position-marker__fit">{assignment.roleScore} / 100</span>
              </div>;
            })}
            {!solution?.complete && <div className="squad-pitch__incomplete">
              <Icon name="warning" size={25}/><strong>Cannot construct a valid XI</strong>
              <span>Insufficient distinct, eligible and adequately observed players</span>
            </div>}
          </div>
          <div className="squad-pitch-note">The pitch is a planning diagram, not tracked match positioning. No simulated chemistry or win probability.</div>
        </Surface>
        <Surface className="squad-lineup-card">
          <div className="squad-card-heading"><span>Slot assignments</span><span>{formation}</span></div>
          {solution?.complete
            ? <ol className="squad-roster" aria-label="Assigned starting eleven">
              {solution.lineup.map(assignment => <li key={assignment.slot.id}>
                <span className="squad-roster__slot">{assignment.slot.label}</span>
                <div className="squad-roster__name"><strong>{assignment.name}</strong>
                  <small>{assignment.slot.roleId.replaceAll('-', ' ')} · {Math.round(assignment.coverage * 100)}% data coverage</small>
                </div>
                <span className="squad-roster__score">{assignment.roleScore}</span>
              </li>)}
            </ol>
            : <div className="squad-feasibility">
              <Status tone="warning">Hard constraints not met</Status>
              <p>{solution?.reason}</p>
              <p>Import more verified position/attribute columns. No player will be assigned twice or placed in an unsupported position.</p>
            </div>}
        </Surface>
      </div>
      <SectionHeading eyebrow="DATA SUFFICIENCY" title="Position coverage and blockers"/>
      <Surface className="squad-coverage-card">
        <div className="squad-coverage-columns"><strong>Slot</strong><strong>Known-position candidates</strong><strong>Enough observed attributes</strong></div>
        {solution?.diagnostics.map(entry =>
          <div key={entry.slot.id} className="squad-coverage-row">
            <span>{entry.slot.label}</span>
            <span>{entry.eligibleCandidates} player{entry.eligibleCandidates===1?'':'s'}</span>
            <span className={entry.scoredCandidates===0?'squad-coverage-row--missing':''}>
              {entry.scoredCandidates===0 ? 'Not enough data' : entry.scoredCandidates + ' ready'}
            </span>
          </div>)}
      </Surface>
      <div className="coverage-note"><Icon name="shield" size={17}/>
        <p><strong>Interpretation:</strong> this is an attribute-based, provisional assignment using imported visible positions. It is not FM CA/PA, exact game positional familiarity, full tactical role intelligence, chemistry or a predicted match result. Registration, injury and match fitness constraints are not present in these exports.</p>
      </div>
    </>}
  </div>;
}
