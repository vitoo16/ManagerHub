import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { liveAttributeCategory, type LivePlayer } from '@managerhub/domain';
import { SectionHeading, Status } from '@managerhub/ui';
import { fieldText } from './historical-format';
import { HistoricalEvidenceSelector, type HistoricalEvidenceGroup } from './HistoricalEvidenceSelector';

export const HistoricalPlayerDetail = memo(function HistoricalPlayerDetail({ player }: { player: LivePlayer }) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<HistoricalEvidenceGroup>('technical');
  const attributes = Object.entries(player.attributes).filter(([key]) => liveAttributeCategory(key) === group);
  const positions = Object.entries(player.positions);
  const club = player.club.value;
  const nation = player.primaryNation.value;
  return <div className="historical-player-detail">
    <section className="historical-panel">
      <div className="historical-player-heading">
        <div>
          <span className="mh-eyebrow">{t('Snapshot-local player ID')} · {t(player.nativeKind)}</span>
          <h3>{fieldText(player.name, t)}</h3>
          <p>{t('Native ID')} {player.nativeId} · {t('This identity is scoped to this snapshot only.')}</p>
        </div>
        <Status tone="warning">{t('Provisional')}</Status>
      </div>
      <dl className="historical-facts">
        <div><dt>{t('First name')}</dt><dd>{fieldText(player.firstName, t)}</dd></div>
        <div><dt>{t('Last name')}</dt><dd>{fieldText(player.lastName, t)}</dd></div>
        <div><dt>{t('Date of birth')}</dt><dd>{fieldText(player.birthDate, t)}</dd></div>
        <div><dt>{t('Derived calendar age')}</dt><dd>{fieldText(player.calendarAge, t, value => value + ' ' + t('years'))}</dd></div>
        <div><dt>{t('Primary nation link')}</dt><dd>{nation ? nation.name + ' · ' + t('Observed person link; not citizenship') : fieldText(player.primaryNation, t)}</dd></div>
        <div><dt>{t('Club / team link')}</dt><dd>{club ? club.name + ' · ' + t(club.relation === 'player_team_pointer' ? 'Observed player-team pointer' : 'Observed primary-contract team') : fieldText(player.club, t)}</dd></div>
      </dl>
      <p className="historical-footnote">{t('A primary-nation link does not establish citizenship or eligibility. A club/team pointer does not establish current employment or loan status.')}</p>
    </section>

    <section className="historical-panel historical-evidence-panel">
      <HistoricalEvidenceSelector value={group} onChange={setGroup} keys={Object.keys(player.attributes)} includeAbility/>
    </section>
    {group !== 'positions' && group !== 'ability' && <section className="historical-panel">
      <SectionHeading eyebrow={t('49 ordinary attributes')} title={t('Attribute evidence')}/>
      <div className="historical-value-grid">
        {attributes.map(([key, field]) => <div className="historical-value-row" key={key}>
          <span>{field.sourceName}</span>
          <strong className={field.value === null ? 'is-unknown' : ''}>{fieldText(field, t)}</strong>
        </div>)}
      </div>
      <p className="historical-footnote">{t('Values are provisional source observations, not Actual CA, PA or a calibrated player rating model. Zero and unknown are kept distinct.')}</p>
    </section>}

    {group === 'positions' && <section className="historical-panel">
      <SectionHeading eyebrow={t('15 position familiarity values')} title={t('Position evidence')}/>
      <div className="historical-value-grid historical-value-grid--positions">
        {positions.map(([key, field]) => <div className="historical-value-row" key={key}>
          <span>{field.nativeCode} · {t(key)}</span>
          <strong className={field.value === null ? 'is-unknown' : ''}>{fieldText(field, t)}</strong>
        </div>)}
      </div>
      <p className="historical-footnote">{t('Position familiarity is not certified eligibility and is not converted into tactical roles.')}</p>
    </section>}

    {group === 'ability' && <section className="historical-panel">
      <SectionHeading eyebrow={t('Unverified fields')} title={t('Ability and contract data')}/>
      <dl className="historical-facts historical-facts--compact">
        <div><dt>{t('Actual CA')}</dt><dd>{fieldText(player.actualCa, t)}</dd></div>
        <div><dt>{t('Potential ability')}</dt><dd>{fieldText(player.potentialAbility, t)}</dd></div>
        <div><dt>{t('Weekly wage')}</dt><dd>{fieldText(player.contract.weeklyWage, t)}</dd></div>
        <div><dt>{t('Wage frequency')}</dt><dd>{fieldText(player.contract.wageFrequency, t)}</dd></div>
        <div><dt>{t('Currency')}</dt><dd>{fieldText(player.contract.currency, t)}</dd></div>
        <div><dt>{t('Contract expiry')}</dt><dd>{fieldText(player.contract.expiresAt, t)}</dd></div>
      </dl>
    </section>}
  </div>;
});
