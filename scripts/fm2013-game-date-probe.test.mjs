import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { buildFm2013GameDateProbe } from './fm2013-game-date-probe.mjs';
function execute(options={}) {
  let reads=0; const messages=[],bytes=[198,0,220,7];
  const pointer=offset=>({add:n=>pointer(offset+n),readU8(){reads++;if(options.denied)throw Error('access_denied');return options.changed&&reads>4&&offset===profile.gameDate.rva?199:bytes[offset-profile.gameDate.rva];}});
  const Process={id:100,arch:'ia32',pointerSize:4,mainModule:{path:profile.imagePath,size:profile.gameDate.imageSize,base:pointer(0)},...options.process};
  vm.runInNewContext(buildFm2013GameDateProbe({pid:100,binarySha256:profile.binarySha256}),{Process,send:m=>messages.push(JSON.parse(JSON.stringify(m)))});
  return {result:messages[0],reads};
}
test('date probe uses image-relative coordinates and repeats all four bytes without certification',()=>{
 const {result,reads}=execute();assert.equal(reads,8);assert.deepEqual(result.gameDateBytes,[198,0,220,7]);assert.equal(result.runtimeImageBytesAuthenticated,false);
});
test('wrong target rejects before memory access; changed or inaccessible dates reject',()=>{
 for(const process of [{id:101},{arch:'x64'},{pointerSize:8},{mainModule:{path:'C:/other/fm.exe',size:profile.gameDate.imageSize}},{mainModule:{path:profile.imagePath,size:1}}]){const r=execute({process});assert.equal(r.result.status,'rejected');assert.equal(r.reads,0);}
 assert.equal(execute({changed:true}).result.diagnostic,'game_date_changed');assert.equal(execute({denied:true}).result.status,'rejected');
 assert.throws(()=>buildFm2013GameDateProbe({pid:100,binarySha256:'wrong'}),RangeError);
});
