import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type:'json' };
import { createFm2013CaptureTicket } from '../packages/domain/src/live-session.ts';
import { exportFm2013WireCapture, finalizeFm2013Session, prepareFm2013Session } from './fm2013-local-session.mjs';
const imagePath = 'C:\\Games\\Football Manager 2013\\fm.exe';
const id='12345678-1234-4234-8234-123456789abc',evidenceId='ev_'+'1'.repeat(64),issued='2030-01-01T00:00:00.000Z';
const processIdentity={pid:100,startedAtFileTime:'134000000000000001',imagePath:imagePath,binarySha256:profile.binarySha256};
const observed=()=>({status:'observed',process:{...processIdentity}});
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),'mh-session-flow-'));
 try{
  const script=join(dir,'fixture.js'),ticket=join(dir,'ticket.json'),evidence=join(dir,'evidence.json'),output=join(dir,'output.json');
  const source='// Synthetic read-only fixture\n',sha=createHash('sha256').update(source).digest('hex');await writeFile(script,source);
  const request={schema:'managerhub-local-capture-request-v1',ticket:createFm2013CaptureTicket(processIdentity,id,issued),script:{path:script,sha256:sha},authority:'local_process_query',captureAuthenticated:false};
  await writeFile(ticket,JSON.stringify(request));
  const capture={schema:profile.schema,profileVersion:profile.profileVersion,target:{pid:100,arch:'ia32',pointerSize:4,imagePath:imagePath,binarySha256:profile.binarySha256},
   gameDateBytes:[198,0,220,7],passes:['player','playerStaff'].map((nativeKind,i)=>({nativeKind,imageTypeMetadataVerified:true,
    coverage:{bytesScanned:4096,matches:1,rejected:0,duplicates:0,faultCount:0,stopReason:null,selectedMappingsExhausted:true,elapsedMs:1},
    records:[{nativeId:i+1,firstName:'Synthetic',lastName:'Fixture',attributeBytes:Array(49).fill(75),positionBytes:Array(15).fill(1),birthDateBytes:[0,0,208,7]}]}))};
  const record={evidence_id:evidenceId,operation:'load_frida_script',normalized_result:{source_sha256:sha,messages_truncated:false,messages:[{type:'send',payload:{kind:'fm2013-live-capture',status:'captured',captureId:id,capture}}]}};
  await writeFile(evidence,JSON.stringify({records:[record]}));
  const options={ticket,evidence,evidenceId,output,snapshotId:'synthetic-session',careerId:'declared-fixture',capturedAt:'2030-01-01T00:00:00.000Z',mode:'editor'};
  const dependencies={observe:async()=>observed(),now:()=> '2030-01-01T00:01:00.000Z'};
  await run({dir,script,request,record,options,dependencies});
 }finally{const target=resolve(dir);assert.equal(dirname(target),resolve(tmpdir()));assert.match(basename(target),/^mh-session-flow-[A-Za-z0-9]+$/u);await rm(target,{recursive:true,force:true});}
}
test('session finalization publishes only explicit historical snapshots and preserves all source files',async()=>fixture(async({options,dependencies})=>{
 const beforeTicket=await readFile(options.ticket),beforeEvidence=await readFile(options.evidence);
 const summary=await finalizeFm2013Session(options,dependencies);assert.equal(summary.playerCount,2);assert.equal(summary.availability,'historical_capture');
 const doc=JSON.parse(await readFile(options.output,'utf8'));assert.equal(doc.session.currentness,'unverified');assert.equal(doc.session.captureAuthenticated,false);
 assert.equal(doc.session.decision,'same_process_at_endpoints');assert.equal(doc.result.snapshot.verification,'provisional');
 assert.deepEqual(await readFile(options.ticket),beforeTicket);assert.deepEqual(await readFile(options.evidence),beforeEvidence);
 const original=await readFile(options.output);await assert.rejects(finalizeFm2013Session(options,dependencies),/output_exists/u);assert.deepEqual(await readFile(options.output),original);
}));
test('wire export creates the exact address-free JSON accepted by Historical Snapshots',async()=>fixture(async({options,dependencies})=>{
 const beforeTicket=await readFile(options.ticket),beforeEvidence=await readFile(options.evidence);
 const summary=await exportFm2013WireCapture(options,dependencies);
 assert.equal(summary.status,'ready');assert.equal(summary.playerCount,2);assert.equal(summary.format,profile.schema);
 assert.equal(summary.projection,'unprojected_source');assert.equal(Object.hasOwn(summary,'mode'),false);
 assert.equal(summary.availability,'historical_capture');assert.equal(summary.captureAuthenticated,false);
 const bytes=await readFile(options.output),wire=JSON.parse(bytes.toString('utf8'));
 assert.equal(wire.schema,profile.schema);assert.equal(wire.profileVersion,profile.profileVersion);
 assert.equal(wire.target.pid,100);assert.equal(wire.target.imagePath,imagePath);assert.equal(wire.passes.length,2);
 assert.equal(wire.passes[0].records.length,1);assert.equal(Object.hasOwn(wire,'session'),false);
 const containsAddressKey=value=>Array.isArray(value)?value.some(containsAddressKey):
  value!==null&&typeof value==='object'?Object.keys(value).some(key=>key.toLowerCase().includes('address')||containsAddressKey(value[key])):false;
 assert.equal(containsAddressKey(wire),false);
 assert.equal(summary.outputSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.deepEqual(await readFile(options.ticket),beforeTicket);assert.deepEqual(await readFile(options.evidence),beforeEvidence);
 await assert.rejects(exportFm2013WireCapture(options,dependencies),/output_exists/u);
}));
test('same PID with a new creation time or an exited/denied process cannot publish a pending result',async()=>{
 for(const status of ['reused','process_not_found','access_denied'])await fixture(async({options,dependencies})=>{
  let count=0;dependencies.observe=async()=>++count===1?observed():status==='reused'?{status:'observed',process:{...processIdentity,startedAtFileTime:'134000000000000002'}}:{status,reason:'private diagnostic'};
  await assert.rejects(finalizeFm2013Session(options,dependencies),new RegExp(status==='reused'?'process_identity_changed':status,'u'));
  await assert.rejects(readFile(options.output),{code:'ENOENT'});
 });
});
test('token, script hash, source file changes and truncated evidence fail before output',async()=>{
 for(const kind of ['token','hash','script','truncated','embedded-network-path'])await fixture(async({options,dependencies,record,script,request})=>{
  if(kind==='token')record.normalized_result.messages[0].payload.captureId='12345678-1234-4234-8234-123456789abd';
  if(kind==='hash')record.normalized_result.source_sha256='0'.repeat(64);
  if(kind==='truncated')record.normalized_result.messages_truncated=true;
  if(kind==='script')await writeFile(script,'// Changed fixture');
  if(kind==='embedded-network-path'){
   request.script.path='\\\\untrusted.invalid\\share\\fixture.js';await writeFile(options.ticket,JSON.stringify(request));
   dependencies.observe=async()=>{throw Error('must reject before observation or filesystem follow-up');};
  }
  await writeFile(options.evidence,JSON.stringify({records:[record]}));
  if(kind==='embedded-network-path')await assert.rejects(finalizeFm2013Session(options,dependencies),/invalid_capture_request/u);
  else await assert.rejects(finalizeFm2013Session(options,dependencies));
  await assert.rejects(readFile(options.output),{code:'ENOENT'});
 });
});
test('expired requests fail before observing and Realism redacts through the same session boundary',async()=>fixture(async({options,dependencies,dir})=>{
 let count=0;const expired={observe:async()=>{count++;return observed();},now:()=> '2030-01-01T00:10:00.000Z'};
 await assert.rejects(finalizeFm2013Session(options,expired),/ticket_expired/u);assert.equal(count,0);await assert.rejects(readFile(options.output),{code:'ENOENT'});
 let clockReads=0;
 const expiresDuringRead={observe:async()=>observed(),now:()=>++clockReads<4?'2030-01-01T00:01:00.000Z':'2030-01-01T00:10:00.000Z'};
 await assert.rejects(finalizeFm2013Session(options,expiresDuringRead),/ticket_expired/u);assert.equal(clockReads,4);
 await assert.rejects(readFile(options.output),{code:'ENOENT'});
 await finalizeFm2013Session({...options,mode:'realism',output:join(dir,'realism.json')},dependencies);
 const doc=JSON.parse(await readFile(join(dir,'realism.json'),'utf8'));for(const p of doc.result.snapshot.players){assert.equal(p.birthDate.value,null);assert.equal(p.calendarAge.value,null);for(const f of Object.values(p.attributes))assert.equal(f.value,null);}
}));
test('prepare binds RTTI file proofs to the observed executable path and rejects replaced image bytes',async()=>fixture(async({dir})=>{
 const ticket=join(dir,'prepared-ticket.json'),script=join(dir,'prepared-script.js'),replacement=Buffer.from('different executable bytes');
 let readPath=null;
 await assert.rejects(prepareFm2013Session({pid:'100',ticket,script},{
  observe:async()=>observed(),now:()=>issued,
  readBinary:async file=>{readPath=file;return replacement;}
 }),/image_changed_before_prepare/u);
 assert.equal(readPath,imagePath);
 await assert.rejects(readFile(ticket),{code:'ENOENT'});await assert.rejects(readFile(script),{code:'ENOENT'});
}));
test('unobserved prepare targets never fabricate a ticket or script',async()=>fixture(async({dir})=>{
 const ticket=join(dir,'not-created.json'),script=join(dir,'not-created.js');
 await assert.rejects(prepareFm2013Session({pid:'100',ticket,script},{observe:async()=>({status:'process_not_found'})}),/process_not_found/u);
 await assert.rejects(prepareFm2013Session({pid:'2147483648',ticket,script},
  {observe:async()=>{throw Error('invalid PID must fail before process observation');}}),/invalid_prepare_arguments/u);
 await assert.rejects(readFile(ticket),{code:'ENOENT'});await assert.rejects(readFile(script),{code:'ENOENT'});
}));
