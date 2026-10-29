import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eligibleSlotCandidates, type PlayerDataset, type LineupSlot } from '@managerhub/domain';
import { Button, Surface } from '@managerhub/ui';
import { getRoleTitle } from '../getRoleTitle';

interface PinEditorProps {
  readonly slots: readonly LineupSlot[];
  readonly dataset: PlayerDataset;
  readonly locks: Readonly<Record<string,string>>;
  readonly excluded: readonly string[];
  readonly onPin: (slotId:string,playerId:string|null)=>void;
  readonly onExclude: (playerId:string,excluded:boolean)=>void;
  readonly onClear: ()=>void;
}
function PinEditor({slots,dataset,locks,excluded,onPin,onExclude,onClear}:PinEditorProps){
  const { t } = useTranslation();
  const [pinSearch,setPinSearch]=useState('');
  const [excludeSearch,setExcludeSearch]=useState('');
  const deferredPinSearch=useDeferredValue(pinSearch);
  const deferredExcludeSearch=useDeferredValue(excludeSearch);
  const normalizedExcludeSearch=deferredExcludeSearch.trim().toLocaleLowerCase();
  const pinnedOptions=useMemo(()=>{
    return new Map(slots.map(slot=>[slot.id,eligibleSlotCandidates(dataset.players,slot,deferredPinSearch,50)]));
  },[slots,dataset.players,deferredPinSearch]);
  const exclusionSearchIndex=useMemo(()=>dataset.players.map(player=>({
    player,
    normalizedText:[player.name,player.position,player.club].map(value=>value?.toLocaleLowerCase()??'').join(' ')
  })),[dataset.players]);
  const searched=useMemo(()=>exclusionSearchIndex
    .filter(entry=>!normalizedExcludeSearch||entry.normalizedText.includes(normalizedExcludeSearch))
    .slice(0,60).map(entry=>entry.player),[exclusionSearchIndex,normalizedExcludeSearch]);
  const excludedSet=useMemo(()=>new Set(excluded),[excluded]);
  return <Surface className="squad-edit-card">
    <div className="squad-card-heading"><span>{t("Manager constraints")}</span>
      <Button variant="quiet" onClick={onClear}>{t("Clear all constraints")}</Button>
    </div>
    <p className="module-disclaimer">{t("Pin an observed, eligible player to a position or exclude a player from selection. Every edit recalculates the entire XI.")}</p>
    <label className="squad-editor-filter">{t("Find players to pin")}
      <input type="search" placeholder={t("Search name, club or exported position…")} value={pinSearch}
        onChange={event=>setPinSearch(event.target.value)}/>
    </label>
    <div className="squad-lock-list" role="group" aria-label={t("Lock player positions")}>
      {slots.map(slot=>{
        const value=locks[slot.id]??'';
        const candidates=pinnedOptions.get(slot.id)??[];
        const selected=candidates.find(x=>x.playerId===value);
        const pinnedName=dataset.players.find(p=>p.id===value)?.name??value;
        return <label className="squad-lock-row" key={slot.id}>
          <span><strong>{slot.label}</strong><small>{t(getRoleTitle(slot.roleId))}</small></span>
          <select aria-label={t('Lock')+' '+slot.label} value={value}
            onChange={event=>onPin(slot.id,event.target.value||null)}>
            <option value="">{t("Automatic selection")}</option>
            {value && !selected && <option value={value}>{pinnedName} · {t('current lock')}</option>}
            {candidates.map(candidate=><option key={candidate.playerId} value={candidate.playerId}>
              {candidate.name} · {t('Fit')} {candidate.score}{excludedSet.has(candidate.playerId)?' · '+t('EXCLUDED'):''}
            </option>)}
          </select>
        </label>;
      })}
    </div>
    <div className="squad-exclusion-heading"><strong>{t("Exclude players")}</strong><small>{excluded.length} {t('unavailable for selection')}</small></div>
    <label className="squad-editor-filter">{t("Search roster to exclude")}
      <input type="search" placeholder={t("Search exported players…")} value={excludeSearch}
        onChange={event=>setExcludeSearch(event.target.value)}/>
    </label>
    <div className="squad-exclusion-list" role="group" aria-label={t("Exclude players")}>
      {searched.map(player=><label key={player.id} className="squad-exclusion-player">
        <input type="checkbox" checked={excludedSet.has(player.id)}
          onChange={event=>onExclude(player.id,event.target.checked)}/>
        <span>{player.name}</span><small>{player.position??t('Position unknown')}</small>
      </label>)}
      {searched.length===0 && <p className="module-disclaimer">{t("No players match your search.")}</p>}
    </div>
    {dataset.players.length>60&&<p className="module-disclaimer">{t("Showing the first 60 matching players. Search by name to find others.")}</p>}
  </Surface>;
}

export default memo(PinEditor);
