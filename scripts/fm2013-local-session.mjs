import { writeFile, lstat } from 'node:fs/promises';
import { resolve, extname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { createFm2013CaptureTicket, validateFm2013CaptureAdmission } from '../packages/domain/src/live-session.ts';
import { observeFm2013Process } from './fm2013-process-observer.mjs';
import { readBoundedRegularFile, readBoundedUtf8File } from './local-research-files.mjs';
import { findPe32RttiVtables } from './pe32-rtti-vtables.mjs';
import { buildFm2013LiveWireCapture, extractFm2013WireCapture } from './fm2013-live-wire.mjs';
import { buildFm2013NormalizedDocument, writeFm2013NormalizedDocument } from './fm2013-normalize-live.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value,k))) throw Error('invalid_capture_request');
  return value;
}
function observation(value) {
  if (value?.status === 'observed') return value;
  if (['process_not_found','access_denied','observation_failed','unsupported_build'].includes(value?.status)) return { status:value.status };
  return { status:'observation_failed' };
}
function admit(ticket, observed, binding, timestamp) {
  const decision=validateFm2013CaptureAdmission(ticket,observation(observed),binding,timestamp);
  if(decision.status!=='admitted') throw Error(decision.reason);
}
async function fresh(file) {
  try { await lstat(file); } catch(error) { if(error.code==='ENOENT')return;throw error; }
  throw Error('output_exists');
}
function json(text, reason) { try{return JSON.parse(text);}catch{throw Error(reason);} }

/** Prepares a bounded read-only script and local process-instance ticket, without attaching. */
export async function prepareFm2013Session(options, dependencies={}) {
  const pid=Number(options.pid),ticketPath=resolve(options.ticket),scriptPath=resolve(options.script);
  if(!/^[1-9][0-9]*$/u.test(String(options.pid))||!Number.isSafeInteger(pid)||pid>0x7fffffff||ticketPath===scriptPath||extname(ticketPath)!=='.json'||extname(scriptPath)!=='.js')throw Error('invalid_prepare_arguments');
  await fresh(ticketPath);await fresh(scriptPath);
  const observe=dependencies.observe??observeFm2013Process,clock=dependencies.now??now;
  const before=await observe(pid);
  if(before.status!=='observed')throw Error(observation(before).status);
  const ticket=createFm2013CaptureTicket(before.process,randomUUID(),clock());
  const binary=await readBoundedRegularFile(profile.imagePath,64*1024*1024);
  const proofs=Object.values(profile.nativeKinds).map(k=>findPe32RttiVtables(binary,{decoratedName:k.decoratedName,subobjectOffset:k.personOffset}));
  const source=buildFm2013LiveWireCapture({pid,binarySha256:before.process.binarySha256},proofs,{},ticket.captureId);
  admit(ticket,await observe(pid),{captureId:ticket.captureId,pid},clock());
  const request={schema:'managerhub-local-capture-request-v1',ticket,script:{path:scriptPath,sha256:digest(source)},authority:'local_process_query',captureAuthenticated:false};
  await writeFile(scriptPath,source,{flag:'wx'});
  await writeFile(ticketPath,JSON.stringify(request,null,2)+'\n',{flag:'wx'});
  return {status:'prepared',pid,ticket:ticketPath,script:scriptPath,expiresAt:ticket.expiresAt,captureAuthenticated:false};
}

/** Accepts only matching, complete script evidence and matching process observations.
 * Output is explicitly historical; this is not a process watcher, IPC service or authentication.
 */
export async function finalizeFm2013Session(options, dependencies={}) {
  const output=resolve(options.output),ticketPath=resolve(options.ticket),evidencePath=resolve(options.evidence);
  if(output===ticketPath||output===evidencePath||extname(output)!=='.json'||!/^ev_[0-9a-f]{64}$/u.test(options.evidenceId??''))throw Error('invalid_finalize_arguments');
  await fresh(output);
  const request=object(json((await readBoundedUtf8File(ticketPath,64*1024)).text,'invalid_capture_request'),['schema','ticket','script','authority','captureAuthenticated']);
  object(request.script,['path','sha256']);
  if(request.schema!=='managerhub-local-capture-request-v1'||request.authority!=='local_process_query'||request.captureAuthenticated!==false||
     typeof request.script.path!=='string'||request.script.path.length>4096||!isAbsolute(request.script.path)||
     request.script.path.replaceAll('\\','/').startsWith('//')||extname(request.script.path).toLowerCase()!=='.js'||
     !/^[0-9a-f]{64}$/u.test(request.script.sha256))throw Error('invalid_capture_request');
  const clock=dependencies.now??now,observe=dependencies.observe??observeFm2013Process,ticket=request.ticket;
  const binding={captureId:ticket?.captureId,pid:ticket?.process?.pid};
  admit(ticket,{status:'observed',process:ticket?.process},binding,clock());
  admit(ticket,await observe(binding.pid),binding,clock());
  if(digest(await readBoundedRegularFile(request.script.path,1024*1024))!==request.script.sha256)throw Error('prepared_script_changed');
  const source=await readBoundedUtf8File(evidencePath,64*1024*1024),bundle=json(source.text,'invalid_evidence_json');
  const rows=Array.isArray(bundle.records)?bundle.records:[bundle];
  const matches=rows.filter(row=>row?.evidence_id===options.evidenceId);
  if(matches.length!==1)throw Error('ambiguous_capture_evidence');
  const evidence=matches[0];
  if(evidence.operation!=='load_frida_script'||evidence.normalized_result?.source_sha256!==request.script.sha256)throw Error('capture_script_mismatch');
  const wire=extractFm2013WireCapture(evidence);
  const envelope=evidence.normalized_result.messages.find(m=>m.type==='send'&&m.payload?.kind==='fm2013-live-capture').payload;
  const captured={captureId:envelope.captureId,pid:wire.target?.pid};
  admit(ticket,{status:'observed',process:ticket.process},captured,clock());
  const document=buildFm2013NormalizedDocument(Buffer.from(JSON.stringify(wire)),{snapshotId:options.snapshotId,careerId:options.careerId,capturedAt:options.capturedAt,mode:options.mode});
  const finalObservation=await observe(binding.pid),observedAt=clock();
  admit(ticket,finalObservation,captured,observedAt);
  document.session={schema:'fm2013-local-session-admission-v1',captureId:ticket.captureId,process:ticket.process,
    observedAt,decision:'same_process_at_endpoints',availability:'historical_capture',captureAuthenticated:false,
    currentness:'unverified',careerLineage:'unverified',evidenceId:options.evidenceId,evidenceSha256:digest(source.bytes),scriptSha256:request.script.sha256};
  await writeFm2013NormalizedDocument(output,document);
  return {status:document.result.status,playerCount:document.result.snapshot.players.length,mode:document.result.snapshot.mode,
    sessionDecision:'same_process_at_endpoints',availability:'historical_capture',output};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const action=process.argv[2],keys=action==='prepare'?['pid','ticket','script']:action==='finalize'?['ticket','evidence','evidence-id','output','snapshot-id','career-id','captured-at','mode']:[];
  if(!keys.length)throw Error('Use prepare or finalize');
  const options={};for(let i=3;i<process.argv.length;i+=2){const key=process.argv[i]?.slice(2),value=process.argv[i+1];if(!process.argv[i]?.startsWith('--')||!keys.includes(key)||!value||Object.hasOwn(options,key))throw Error('invalid_named_arguments');options[key]=value;}
  if(Object.keys(options).length!==keys.length)throw Error('missing_named_arguments');
  const mapped=Object.fromEntries(Object.entries(options).map(([key,value])=>[key.replace(/-([a-z])/gu,(_,c)=>c.toUpperCase()),value]));
  console.log(JSON.stringify(await(action==='prepare'?prepareFm2013Session(mapped):finalizeFm2013Session(mapped))));
 }catch(error){console.error(error.message||String(error));process.exitCode=1;}
}
