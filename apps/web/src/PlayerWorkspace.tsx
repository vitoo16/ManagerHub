import { useTranslation } from 'react-i18next';
import { readableImportError, readableImportWarning } from './i18n/player-import-copy';
import { lazy, memo, Suspense, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  parsePlayerExport, parsePlayerHtml, type PlayerDataset
} from '@managerhub/domain';
import {Button,Icon,Status,Surface} from '@managerhub/ui';


const PlayerDetails = lazy(() => import('./features/player-lab/PlayerDetails').then(module => ({ default: module.PlayerDetails })));
import { usePlayerLibrary } from './usePlayerLibrary';
import './player-workspace.css';

const MAX_EXPORT_BYTES=12*1024*1024;

type Props={
  dataset:PlayerDataset|null;
  onDataset:(dataset:PlayerDataset|null)=>void;
  onOpenSquad:()=>void;
};
export const PlayerWorkspace = memo(function PlayerWorkspace({dataset,onDataset,onOpenSquad}:Props){
  const { t } = useTranslation();
  const inputRef=useRef<HTMLInputElement>(null);
  const [error,setError]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [chosenId,setChosenId]=useState<string|null>(null);
  const [visibleLimit,setVisibleLimit]=useState(100);
  const [pendingDelete,setPendingDelete]=useState<string|null>(null);
  const library=usePlayerLibrary();
  const fileInputId=useId();
  const onFile=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    e.target.value='';
    if(!file)return;
    setError(null);
    try{
      if(!/\.(csv|tsv|txt|html|htm)$/i.test(file.name))throw new Error('Choose an HTML, CSV, TSV or TXT export with player columns.');
      if(!file.size||file.size>MAX_EXPORT_BYTES)throw new Error('Player export must be between 1 byte and 12 MB.');
      const source=await file.text();
      const parsed=/\.(html|htm)$/i.test(file.name)?parsePlayerHtml(source,file.name):parsePlayerExport(source,file.name);
      onDataset(parsed);
      setChosenId(parsed.players[0]?.id??null);
      setSearch('');
      setVisibleLimit(100);
    }catch(ex){setError(readableImportError(ex));}
  };
  const visible=useMemo(()=>dataset?.players.filter(p=>[p.name,p.club,p.position].some(v=>v?.toLowerCase().includes(search.toLowerCase())))??[],[dataset,search]);
  const selected=dataset?.players.find(p=>p.id===chosenId)??dataset?.players[0]??null;
  const savedCurrent=dataset!==null&&library.items.some(item=>item.importedAt===dataset.importedAt &&
    item.fileName===dataset.fileName&&item.playerCount===dataset.players.length);
  const openSaved=async (id:string)=>{
    const restored=await library.open(id);
    if(!restored)return;
    onDataset(restored);
    setChosenId(restored.players[0]?.id??null);
    setSearch('');setVisibleLimit(100);setPendingDelete(null);setError(null);
  };
  const deleteSaved=async (id:string)=>{
    if(pendingDelete!==id){setPendingDelete(id);return;}
    if(await library.remove(id))setPendingDelete(null);
  };
  return <div className="view-flow">
    <div className="page-title"><span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / PROVISIONAL EXPORTS")}</span><h1>{t("Player Lab")}</h1><p>{t("Import a player list from Football Manager to discover each player's strengths, suitable roles and comparisons with teammates.")}</p></div>
    <div className="player-lab-header">
      <div><input id={fileInputId} ref={inputRef} type="file" accept=".csv,.tsv,.txt,.html,.htm,text/csv,text/tab-separated-values,text/html" className="visually-hidden" onChange={onFile}/>
        <Button variant="primary" onClick={()=>inputRef.current?.click()}><Icon name="plus" size={16}/>{t(dataset?'Replace player export' :'Import player CSV / HTML')}</Button>
        {dataset&&<Button disabled={savedCurrent||library.activity!==null} onClick={()=>void library.save(dataset)}>
          <Icon name="download" size={16}/>{t(savedCurrent?'Saved to this browser':library.activity==='saving'?'Saving…':'Save on this browser')}
        </Button>}
        {dataset&&<Button variant="quiet" onClick={()=>{onDataset(null);setChosenId(null);setSearch('');setVisibleLimit(100);}}><Icon name="trash" size={16}/> {t("Clear session")}</Button>}
      </div>
      <Status tone="info">{t("No data uploaded")}</Status>
    </div>
    {error&&<div role="alert" className="inline-alert"><Icon name="warning" size={16}/>{t(error)}</div>}
    <Surface className="saved-player-library">
      <div className="saved-player-library__heading">
        <div><strong>{t("Saved player exports")}</strong><small>{t("IndexedDB · This browser only · Explicit opt-in · Up to 20 exports")}</small></div>
        <Status tone={library.error?'warning':'neutral'}>{library.loading?t('Loading…'):library.items.length+' '+t('saved')}</Status>
      </div>
      {library.error&&<div role="alert" className="local-library-error"><Icon name="warning" size={16}/>{t("Could not access your saved lists. Please check browser storage settings or try again.")}
        <button onClick={library.clearError} aria-label={t("Dismiss local library error")}><Icon name="close" size={15}/></button></div>}
      {!library.loading&&library.items.length===0&&<p className="saved-player-library__empty">{t("No saved exports yet. Import an HTML/CSV/TSV player list, then select “Save on this browser” to keep it after reloading.")}</p>}
      {library.items.length>0&&<div className="saved-player-library__items" role="list" aria-label={t("Saved exports")}>
        {library.items.map(item=><div className="saved-player-library__item" role="listitem" key={item.id}>
          <div className="saved-player-library__meta"><strong title={item.fileName}>{item.fileName}</strong><small>{item.playerCount.toLocaleString()} {t('players')} · {item.attributeCount} {t('attributes')} · {t('Saved')} {new Date(item.savedAt).toLocaleDateString(t('locale'))}</small></div>
          <Button disabled={library.activity!==null} onClick={()=>void openSaved(item.id)}><Icon name="file" size={14}/> {t("Open")}</Button>
          <Button variant={pendingDelete===item.id?'danger':'quiet'} disabled={library.activity!==null}
            onClick={()=>void deleteSaved(item.id)}>{t(pendingDelete===item.id?'Confirm delete':'Delete')}</Button>
        </div>)}
      </div>}
    </Surface>
    {!dataset?<Surface className="player-intro">
      <div className="player-intro__symbol"><Icon name="sparkles" size={26}/></div>
      <h2>{t("Turn attributes into football insights.")}</h2>
      <p>{t("In Football Manager, create a player-list view with Name, Position, and as many technical, mental and physical attributes as possible. Export the view as HTML (native Print Screen) or CSV/TSV and import it here. The file is analyzed entirely in your browser.")}</p>
      <div className="player-intro__checks"><span>{t("Attribute distribution")}</span><span>{t("Position / role profile")}</span><span>{t("Explainable scores")}</span><span>{t("Missing data visibility")}</span></div>
      <p className="module-disclaimer">{t("FM26's native Print Screen can produce HTML. ManagerHub reads a local exported HTML table or CSV/TSV; a .fm save itself is not yet a validated player-data source.")}</p>
    </Surface>:<>
      <div className="dataset-banner"><div><strong>{dataset.players.length.toLocaleString()} {t('player records')}</strong><span>{dataset.fileName} · {dataset.attributeColumns.length} {t('recognized attributes')}</span></div><Status tone="warning">{t("From your export (not game-verified)")}</Status></div>
      {dataset.warnings.length>0&&<div className="dataset-warnings" role="status">{dataset.warnings.map((warning,i)=><p key={i}><Icon name="warning" size={14}/>{t(readableImportWarning(warning))}</p>)}</div>}
      <div className="player-lab-layout">
        <Surface className="player-list-panel"><div className="player-list-panel__heading"><span>{t("Players")}</span><span>{visible.length} {t('shown')}</span></div>
          <label className="search-box player-search"><Icon name="search" size={16}/><span className="visually-hidden">{t("Search imported players")}</span><input placeholder={t("Search player, team, position…")} value={search} onChange={e=>{setSearch(e.target.value);setVisibleLimit(100);}}/></label>
          <div className="player-list-scroll" role="list" aria-label={t("Imported players")}>{visible.slice(0,visibleLimit).map(p=><div key={p.id} role="listitem"><button className={'player-list-entry '+(selected?.id===p.id?'player-list-entry--active':'')} onClick={()=>setChosenId(p.id)}>
            <span className="player-list-avatar" aria-hidden="true">{p.name.slice(0,1)}</span><span className="player-list-entry__copy"><strong>{p.name}</strong><small>{p.position??t('Unknown position')} · {p.club??t('Unknown club')}</small></span><Icon name="chevron" size={13}/>
          </button></div>)}</div>
          {!visible.length&&<div className="player-search-empty">{t("No players match this search.")}</div>}
          {visible.length>visibleLimit&&<Button className="player-list-more" onClick={()=>setVisibleLimit(n=>n+100)}>
            {t('Show next 100')} · {visible.length-visibleLimit} {t('remaining')}
          </Button>}
        </Surface>
        <div className="player-detail-column">{selected?<Suspense fallback={<Surface className="empty-library" role="status">{t('Loading…')}</Surface>}><PlayerDetails key={selected.id} player={selected} dataset={dataset} onOpenSquad={onOpenSquad}/></Suspense>:<Surface className="empty-library">{t("Choose a player from the imported list.")}</Surface>}</div>
      </div>
    </>}
    <div className="coverage-note"><Icon name="shield" size={16}/><p><strong>{t("Data integrity:")}</strong> {t("CA, PA and hidden personality are not recovered from a CSV unless independently verified. Role profiles are authored ManagerHub heuristics, not Sports Interactive ratings. Player identities in different imports are not assumed to match.")}</p></div>
  </div>;
});
