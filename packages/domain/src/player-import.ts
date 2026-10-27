/**
 * Read-only, browser-local parser for exported FM player lists.
 * The export is a user-supplied observation, NOT a verified game save decode.
 * Never infer CA/PA, unobserved attributes or player identity across careers.
 */
export type AttributeKey =
  | 'corners' | 'crossing' | 'dribbling' | 'finishing' | 'firstTouch'
  | 'freeKickTaking' | 'heading' | 'longShots' | 'longThrows' | 'marking'
  | 'passing' | 'penaltyTaking' | 'tackling' | 'technique'
  | 'aggression' | 'anticipation' | 'bravery' | 'composure'
  | 'concentration' | 'decisions' | 'determination' | 'flair'
  | 'leadership' | 'offTheBall' | 'positioning' | 'teamwork'
  | 'vision' | 'workRate'
  | 'acceleration' | 'agility' | 'balance' | 'jumpingReach'
  | 'naturalFitness' | 'pace' | 'stamina' | 'strength'
  | 'aerialReach' | 'commandOfArea' | 'communication' | 'eccentricity'
  | 'handling' | 'kicking' | 'oneOnOnes' | 'reflexes' | 'rushingOut'
  | 'throwing' | 'punching' | 'tendencyToPunch';

export interface PlayerExport {
  readonly id: string;                   // import-local identity only
  readonly name: string;
  readonly position: string | null;
  readonly age: number | null;
  readonly club: string | null;
  readonly nationality: string | null;
  readonly attributes: Readonly<Partial<Record<AttributeKey, number>>>;
  readonly source: 'game_export';
  readonly verification: 'provisional';
}
export interface PlayerDataset {
  readonly fileName: string;
  readonly importedAt: string;
  readonly players: readonly PlayerExport[];
  readonly attributeColumns: readonly AttributeKey[];
  readonly warnings: readonly string[];
  readonly source: 'game_export';
  readonly actualCaAvailable: false;
  readonly potentialAbilityAvailable: false;
}

const MAX_ROWS = 20000;
const MAX_COLUMNS = 160;
const MAX_TEXT_CHARS = 12_000_000;

export const ATTRIBUTE_GROUPS = {
  Technical: ['corners','crossing','dribbling','finishing','firstTouch','freeKickTaking','heading','longShots','longThrows','marking','passing','penaltyTaking','tackling','technique'],
  Mental: ['aggression','anticipation','bravery','composure','concentration','decisions','determination','flair','leadership','offTheBall','positioning','teamwork','vision','workRate'],
  Physical: ['acceleration','agility','balance','jumpingReach','naturalFitness','pace','stamina','strength'],
  Goalkeeping: ['aerialReach','commandOfArea','communication','eccentricity','handling','kicking','oneOnOnes','reflexes','rushingOut','throwing','punching','tendencyToPunch']
} as const satisfies Record<string, readonly AttributeKey[]>;

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  corners:'Corners',crossing:'Crossing',dribbling:'Dribbling',finishing:'Finishing',
  firstTouch:'First Touch',freeKickTaking:'Free Kick Taking',heading:'Heading',
  longShots:'Long Shots',longThrows:'Long Throws',marking:'Marking',
  passing:'Passing',penaltyTaking:'Penalty Taking',tackling:'Tackling',technique:'Technique',
  aggression:'Aggression',anticipation:'Anticipation',bravery:'Bravery',composure:'Composure',
  concentration:'Concentration',decisions:'Decisions',determination:'Determination',
  flair:'Flair',leadership:'Leadership',offTheBall:'Off The Ball',positioning:'Positioning',
  teamwork:'Teamwork',vision:'Vision',workRate:'Work Rate',
  acceleration:'Acceleration',agility:'Agility',balance:'Balance',jumpingReach:'Jumping Reach',
  naturalFitness:'Natural Fitness',pace:'Pace',stamina:'Stamina',strength:'Strength',
  aerialReach:'Aerial Reach',commandOfArea:'Command Of Area',communication:'Communication',
  eccentricity:'Eccentricity',handling:'Handling',kicking:'Kicking',
  oneOnOnes:'One On Ones',reflexes:'Reflexes',rushingOut:'Rushing Out',
  throwing:'Throwing',punching:'Punching',tendencyToPunch:'Tendency To Punch'
};

function normalize(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

const aliasEntries: [string, AttributeKey][] = [
  ['cor','corners'],['cro','crossing'],['dri','dribbling'],['fin','finishing'],
  ['fir','firstTouch'],['fkt','freeKickTaking'],['freekicks','freeKickTaking'],
  ['hea','heading'],['lon','longShots'],['lsh','longShots'],['lth','longThrows'],
  ['mar','marking'],['pas','passing'],['pen','penaltyTaking'],['tck','tackling'],
  ['tac','tackling'],['tec','technique'],['agg','aggression'],['ant','anticipation'],
  ['bra','bravery'],['com','composure'],['cnt','concentration'],['con','concentration'],
  ['dec','decisions'],['det','determination'],['fla','flair'],['ldr','leadership'],
  ['lea','leadership'],['otb','offTheBall'],['pos','positioning'],['tea','teamwork'],
  ['twr','teamwork'],['vis','vision'],['wor','workRate'],['wra','workRate'],
  ['acc','acceleration'],['agi','agility'],['bal','balance'],['jum','jumpingReach'],
  ['nat','naturalFitness'],['pac','pace'],['sta','stamina'],['str','strength'],
  ['aer','aerialReach'],['cmd','commandOfArea'],['cmda','commandOfArea'],
  ['ecc','eccentricity'],['han','handling'],['kic','kicking'],['one','oneOnOnes'],
  ['ref','reflexes'],['rus','rushingOut'],['thr','throwing'],['pun','punching'],
  ['tendencytopunch','tendencyToPunch']
];
const ATTRIBUTE_LOOKUP = new Map<string, AttributeKey>(
  [...Object.entries(ATTRIBUTE_LABELS).map(([key,label])=>[normalize(label),key as AttributeKey] as const),...aliasEntries]);

function determineDelimiter(header: string): string {
  const candidates = ['\t',';',','];
  const counts = candidates.map(delimiter => {
    let count = 0, quoted = false;
    for (let i=0;i<header.length;i++) {
      if (header[i]==='"') {
        if (quoted && header[i+1]==='"') {i++;continue;}
        quoted=!quoted;
      } else if (header[i]===delimiter && !quoted) count++;
    }
    return count;
  });
  const max = Math.max(...counts);
  if (max===0) throw new Error('No delimited columns found. Export a CSV/TSV player table.');
  return candidates[counts.indexOf(max)]!;
}

/** Strict quoted CSV / TSV parser, including quoted embedded newlines. */
export function parseRows(text: string): string[][] {
  if (text.length>MAX_TEXT_CHARS) throw new Error('Export is too large for safe in-browser analysis.');
  const stripped=text.replace(/^\uFEFF/,'');
  const firstLine=stripped.split(/\r?\n/,1)[0]??'';
  const delimiter=determineDelimiter(firstLine);
  const rows:string[][]=[];
  let row:string[]=[],cell='',quoted=false,closed=false,atStart=true;
  for(let i=0;i<stripped.length;i++){
    const ch=stripped[i]!;
    if(quoted){
      if(ch==='"'){
        if(stripped[i+1]==='"'){cell+='"';i++;}
        else{quoted=false;closed=true;}
      }else cell+=ch;
    }else if(ch==='"' && atStart){quoted=true;atStart=false;}
    else if(ch===delimiter){
      row.push(cell);cell='';atStart=true;closed=false;
      if(row.length>MAX_COLUMNS)throw new Error('Too many columns in player export.');
    }else if(ch==='\n'||ch==='\r'){
      if(ch==='\r'&&stripped[i+1]==='\n')i++;
      row.push(cell);
      if(row.some(value=>value.trim()!=='')) rows.push(row);
      if(rows.length>MAX_ROWS+1)throw new Error('Too many player rows in export.');
      row=[];cell='';atStart=true;closed=false;
    }else{
      if(closed && ch.trim()!=='')throw new Error('Malformed quoted CSV field.');
      if(ch==='"')throw new Error('Unexpected quote inside CSV field.');
      cell+=ch;atStart=false;
    }
  }
  if(quoted)throw new Error('Unclosed quote in player export.');
  row.push(cell);
  if(row.some(value=>value.trim()!==''))rows.push(row);
  return rows;
}

function headerIndex(headers: readonly string[], aliases: readonly string[]): number {
  const lookup=new Set(aliases.map(normalize));
  return headers.findIndex(name=>lookup.has(normalize(name)));
}
function parsedAttribute(value: string | undefined): number | null {
  if(!value || !/^\s*(?:[1-9]|1\d|20)\s*$/.test(value))return null;
  return Number(value.trim());
}
function cleanedText(value: string | undefined): string | null {
  const result=value?.trim()??'';
  return result && result!=='-' && result!=='—' ? result : null;
}
/**
 * Native print-to-HTML table or an external CSV export share the same typed
 * normalization rules. HTML is never inserted into the live document.
 */
export function parsePlayerExport(text: string, fileName: string, importedAt = new Date().toISOString()): PlayerDataset {
  return normalizePlayerRows(parseRows(text), fileName, importedAt);
}

export function parsePlayerHtml(text: string, fileName: string, importedAt = new Date().toISOString()): PlayerDataset {
  if (text.length > MAX_TEXT_CHARS) throw new Error('HTML export exceeds safe inspection limits.');
  if (typeof DOMParser === 'undefined') throw new Error('HTML imports require browser DOM parsing.');
  // Strip active / remote resource elements before parsing an inert detached document.
  const safe = text
    .replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(img|link|video|audio|source)\b[^>]*\/?>/gi, '');
  const parsed = new DOMParser().parseFromString(safe, 'text/html');
  const tables = Array.from(parsed.querySelectorAll('table'));
  if (!tables.length) throw new Error('No player table found in the HTML export.');
  const candidates = tables.map(table => Array.from(table.querySelectorAll('tr')).map(row =>
    Array.from(row.children).filter(node => node.tagName === 'TH' || node.tagName === 'TD')
      .map(node => (node.textContent ?? '').replace(/\u00a0/g, ' ').trim()))
    .filter(row => row.length > 1));
  const rows = candidates.sort((a, b) => b.length - a.length)[0] ?? [];
  if (rows.length > MAX_ROWS + 1 || rows.some(row => row.length > MAX_COLUMNS))
    throw new Error('HTML export exceeds safe row/column limits.');
  return normalizePlayerRows(rows, fileName, importedAt);
}
function normalizePlayerRows(rows: readonly string[][], fileName: string, importedAt: string): PlayerDataset {
  if(rows.length<2) throw new Error('The export must include a header and at least one player.');
  const headers=rows[0]!.map(x=>x.trim());
  const nameIndex=headerIndex(headers,['Name','Player','Player Name','Full Name','Tên','Tên cầu thủ']);
  if(nameIndex<0)throw new Error('Name/Player column not found in export.');
  const positionIndex=headerIndex(headers,['Position','Positions','Pos','Vị trí']);
  const ageIndex=headerIndex(headers,['Age','Tuổi']);
  const clubIndex=headerIndex(headers,['Club','Team','CLB']);
  const nationIndex=headerIndex(headers,['Nationality','Nation','Nat']);
  const map=new Map<AttributeKey,number>();
  headers.forEach((header,index)=>{
    const key=ATTRIBUTE_LOOKUP.get(normalize(header));
    if(key && !map.has(key))map.set(key,index);
  });
  const warnings:string[]=[];
  if(map.size===0)warnings.push('No recognized attribute columns. Player names are imported but role analysis is unavailable.');
  if(positionIndex<0)warnings.push('No position column. Position familiarity cannot be assessed.');
  if(headers.some(h=>['ca','pa','currentability','potentialability'].includes(normalize(h))))
    warnings.push('CA/PA-like export columns were not accepted as verified hidden game values.');
  let skipped=0,masked=0;
  const players:PlayerExport[]=[];
  for(let i=1;i<rows.length;i++){
    const row=rows[i]!;
    const name=cleanedText(row[nameIndex]);
    if(!name){skipped++;continue;}
    const attributes:Partial<Record<AttributeKey,number>>={};
    for(const [key,column] of map){
      const raw=row[column];
      const value=parsedAttribute(raw);
      if(value!==null)attributes[key]=value;
      else if(raw?.trim() && raw.trim()!=='-')masked++;
    }
    const ageText=ageIndex>=0?row[ageIndex]:undefined;
    const age=ageText && /^\d{1,2}$/.test(ageText.trim())?Number(ageText.trim()):null;
    players.push({id:'export-row-'+i,name,
      position:positionIndex>=0?cleanedText(row[positionIndex]):null,
      age:age!==null&&age>=14&&age<=60?age:null,
      club:clubIndex>=0?cleanedText(row[clubIndex]):null,
      nationality:nationIndex>=0?cleanedText(row[nationIndex]):null,
      attributes,source:'game_export',verification:'provisional'});
  }
  if(players.length===0)throw new Error('No valid player names found in export.');
  if(skipped)warnings.push(skipped+' rows without a player name were skipped.');
  if(masked)warnings.push(masked+' unavailable or unrecognized attribute cells were left unknown.');
  return {fileName,importedAt,players,
    attributeColumns:[...map.keys()],warnings,
    source:'game_export',actualCaAvailable:false,potentialAbilityAvailable:false};
}
