import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eligibleSlotCandidates, type LineupSlot, type PlayerDataset } from '@managerhub/domain';
import { Button, Icon, Surface } from '@managerhub/ui';
import { getRoleTitle } from './role-title';

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
  const rosterSearchIndex=useMemo(()=>dataset.players.map(player=>({
    player,
    searchText:[player.name,player.position,player.club].filter(Boolean).join(' ').toLocaleLowerCase()
  })),[dataset.players]);
  const pinMatches=useMemo(()=>{
    const query=deferredPinSearch.trim().toLocaleLowerCase();
    return rosterSearchIndex.filter(entry=>!query||entry.searchText.includes(query))
      .map(entry=>entry.player);
  },[rosterSearchIndex,deferredPinSearch]);
  const pinnedOptions=useMemo(()=>
    new Map(slots.map(slot=>[slot.id,eligibleSlotCandidates(pinMatches,slot,'',50)])),
  [slots,pinMatches]);
  const searched=useMemo(()=>{
    const query=deferredExcludeSearch.trim().toLocaleLowerCase();
    return rosterSearchIndex.filter(entry=>!query||entry.searchText.includes(query))
      .slice(0,60).map(entry=>entry.player);
  },[rosterSearchIndex,deferredExcludeSearch]);
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
              {candidate.name} · {t('Fit')} {candidate.score}{excluded.includes(candidate.playerId)?' · '+t('EXCLUDED'):''}
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
        <input type="checkbox" checked={excluded.includes(player.id)}
          onChange={event=>onExclude(player.id,event.target.checked)}/>
        <span>{player.name}</span><small>{player.position??t('Position unknown')}</small>
      </label>)}
      {searched.length===0 && <p className="module-disclaimer">{t("No players match your search.")}</p>}
    </div>
    {dataset.players.length>60&&<p className="module-disclaimer">{t("Showing the first 60 matching players. Search by name to find others.")}</p>}
  </Surface>;
}

export default memo(PinEditor);
