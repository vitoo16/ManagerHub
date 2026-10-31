import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { buildFm2013ImageRelativePlayerScan } from './fm2013-readonly-record-probe.mjs';

/** Address-free local transport. The research envelope never carries ability words or handles. */
export function buildFm2013LiveWireCapture(target, proofs, limits = {}) {
  if (!Array.isArray(proofs) || proofs.length !== 2) throw new RangeError('Both exact native type proofs are required');
  const sources = Object.entries(profile.nativeKinds).map(([nativeKind, kind]) => {
    const matches = proofs.filter(proof => proof?.candidates?.length === 1 &&
      proof.candidates[0].decoratedName === kind.decoratedName && proof.candidates[0].subobjectOffset === kind.personOffset);
    if (matches.length !== 1) throw new RangeError('Missing or ambiguous native type proof');
    return buildFm2013ImageRelativePlayerScan({ ...target, nativeKind, attributeSet: 'ordinary49',
      includePositions: true, includeClubLinks: true, includeBiography: true }, matches[0], limits);
  });
  function collectPass(payload, passes, attributes, positions, clubs, clubIndex, nations, nationIndex) {
    if (payload.status !== 'observed_candidates' || !Array.isArray(payload.records)) throw new Error('native_pass_rejected');
    const c = payload.coverage;
    passes.push({ nativeKind: payload.records[0]?.nativeKind ?? (passes.length === 0 ? 'player' : 'playerStaff'),
      imageTypeMetadataVerified: payload.imageTypeMetadataVerified,
      coverage: { bytesScanned: c.bytesScanned, matches: c.matches, rejected: c.rejected, duplicates: c.duplicates,
        faultCount: c.faultCount, stopReason: c.stopReason, selectedMappingsExhausted: c.selectedMappingsExhausted, elapsedMs: c.elapsedMs },
      records: payload.records.map(record => {
        const hex = values => values.map(n => (n & 255).toString(16).padStart(2, '0')).join('');
        let club = -1;
        if (record.club) {
          const value = [record.club.nativeId, record.club.name, record.club.relation], key = JSON.stringify(value);
          if (!clubIndex.has(key)) { clubIndex.set(key, clubs.length); clubs.push(value); }
          club = clubIndex.get(key);
        }
        let nation = -1;
        if (record.biography?.primaryNation) {
          const value = [record.biography.primaryNation.nativeId, record.biography.primaryNation.name], key = JSON.stringify(value);
          if (!nationIndex.has(key)) { nationIndex.set(key, nations.length); nations.push(value); }
          nation = nationIndex.get(key);
        }
        const positionHex = hex(positions.map(p => record.positions[p.key].raw));
        const dateHex = record.biography?.birthDateBytes ? hex(record.biography.birthDateBytes) : '-';
        return [record.identity.id, record.identity.firstName, record.identity.lastName,
          hex(attributes.map(a => record.attributes[a.key].raw)), `${positionHex}:${dateHex}:${nation}`, club];
      }) });
  }
  const metadata = { schema: profile.schema, profileVersion: profile.profileVersion, binarySha256: profile.binarySha256,
    attributes: profile.attributes.map(({ key }) => ({ key })), positions: profile.positions.map(({ key }) => ({ key })) };
  return `(function(metadata){const passes=[],clubs=[],clubIndex=new Map(),nations=[],nationIndex=new Map();const collect=${collectPass.toString()};try{
${sources.map(source => `(function(send){${source}})(payload=>collect(payload,passes,metadata.attributes,metadata.positions,clubs,clubIndex,nations,nationIndex));`).join('\n')}
send({kind:'fm2013-live-capture',status:'captured',encoding:'hex-i8-tuples-v2',capture:{schema:metadata.schema,profileVersion:metadata.profileVersion,
target:{pid:Process.id,arch:Process.arch,pointerSize:Process.pointerSize,imagePath:Process.mainModule.path,binarySha256:metadata.binarySha256},passes,clubs,nations}});
}catch(error){send({kind:'fm2013-live-capture',status:'rejected',diagnostic:String(error.message||error)});}})(${JSON.stringify(metadata)});`;
}

/** Retained REA evidence must be complete; a truncated preview cannot become a snapshot. */
export function extractFm2013WireCapture(evidence) {
  const result = evidence?.normalized_result;
  if (!result || result.messages_truncated !== false || !Array.isArray(result.messages) ||
      result.messages.some(message => message.type === 'error')) throw new Error('Incomplete or failed REA capture');
  const messages = result.messages.filter(message => message.type === 'send' && message.payload?.kind === 'fm2013-live-capture');
  if (messages.length !== 1 || messages[0].payload.status !== 'captured' || !messages[0].payload.capture) throw new Error('No complete local capture');
  const payload = messages[0].payload;
  if (payload.encoding === undefined) return payload.capture;
  if (!['hex-i8-tuples-v1', 'hex-i8-tuples-v2'].includes(payload.encoding)) throw new Error('Unknown local capture encoding');
  const biography = payload.encoding === 'hex-i8-tuples-v2';
  const packed = payload.capture;
  if (!Array.isArray(packed.clubs) || packed.clubs.length > profile.limits.maxRecords ||
      !Array.isArray(packed.passes) || packed.passes.length !== 2) throw new Error('Invalid packed capture');
  const clubs = packed.clubs.map(value => {
    if (!Array.isArray(value) || value.length !== 3 || !Number.isSafeInteger(value[0]) || value[0] <= 0 ||
        typeof value[1] !== 'string' || value[1].length > 128 || !['player_team_pointer', 'primary_contract_team'].includes(value[2])) throw new Error('Invalid packed club');
    return { nativeId: value[0], name: value[1], relation: value[2] };
  });
  if (biography && (!Array.isArray(packed.nations) || packed.nations.length > profile.limits.maxRecords)) throw new Error('Invalid packed nations');
  const nations = biography ? packed.nations.map(value => {
    if (!Array.isArray(value) || value.length !== 2 || !Number.isSafeInteger(value[0]) || value[0] <= 0 ||
        typeof value[1] !== 'string' || value[1].length > 128) throw new Error('Invalid packed nation');
    return { nativeId: value[0], name: value[1] };
  }) : [];
  function bytes(hex, length) {
    if (typeof hex !== 'string' || hex.length !== length * 2 || !/^[0-9a-f]+$/u.test(hex)) throw new Error('Invalid packed attribute bytes');
    return Array.from({ length }, (_, i) => { const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16); return value > 127 ? value - 256 : value; });
  }
  let total = 0;
  const passes = packed.passes.map(pass => {
    if (!Array.isArray(pass.records) || (total += pass.records.length) > profile.limits.maxRecords) throw new Error('Packed capture player limit');
    return { nativeKind: pass.nativeKind, imageTypeMetadataVerified: pass.imageTypeMetadataVerified, coverage: pass.coverage,
      records: pass.records.map(row => {
        if (!Array.isArray(row) || row.length !== 6 || !Number.isInteger(row[5]) || row[5] < -1 || row[5] >= clubs.length) throw new Error('Invalid packed player');
        const bio = biography && typeof row[4] === 'string' ? /^([0-9a-f]{30}):(-|[0-9a-f]{8}):(-1|0|[1-9][0-9]{0,3})$/u.exec(row[4]) : null;
        if (biography && (!bio || Number(bio[3]) >= nations.length)) throw new Error('Invalid packed biography');
        return { nativeId: row[0], firstName: row[1], lastName: row[2], attributeBytes: bytes(row[3], profile.attributes.length),
          positionBytes: bytes(bio ? bio[1] : row[4], profile.positions.length), ...(row[5] === -1 ? {} : { club: clubs[row[5]] }),
          ...(bio && bio[2] !== '-' ? { birthDateBytes: bytes(bio[2], 4).map(n => n & 255) } : {}),
          ...(bio && bio[3] !== '-1' ? { primaryNation: nations[Number(bio[3])] } : {}) };
      }) };
  });
  return { schema: packed.schema, profileVersion: packed.profileVersion, target: packed.target, passes };
}
