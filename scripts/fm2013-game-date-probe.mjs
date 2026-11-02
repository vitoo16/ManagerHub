import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };

export function createFm2013GameDateConfig(target) {
  if (target?.binarySha256 !== profile.binarySha256 || !Number.isInteger(target.pid) || target.pid < 1 || target.pid > 0x7fffffff) throw new RangeError('Invalid exact-build game-date target');
  return { pid: target.pid, binarySha256: profile.binarySha256, imagePath: profile.imagePath, ...profile.gameDate };
}

/** Runs only inside an explicitly attached research process; reads no host clock. */
export function readFm2013GameDate(config) {
  const image = Process.mainModule;
  if (Process.id !== config.pid || Process.arch !== 'ia32' || Process.pointerSize !== 4 ||
      image.path.toLowerCase() !== config.imagePath.toLowerCase() || image.size !== config.imageSize) throw Error('game_date_target_mismatch');
  if (!Number.isSafeInteger(config.rva) || config.rva < 0 || config.rva + 4 > image.size) throw Error('game_date_outside_image');
  const address = image.base.add(config.rva);
  const bytes = [0, 1, 2, 3].map(offset => address.add(offset).readU8());
  if (bytes.some((value, offset) => address.add(offset).readU8() !== value)) throw Error('game_date_changed');
  return bytes;
}

export function buildFm2013GameDateProbe(target) {
  const config = createFm2013GameDateConfig(target);
  return `(function(config){try{send({kind:'fm2013-game-date',status:'observed_candidate',gameDateBytes:(${readFm2013GameDate.toString()})(config),runtimeImageBytesAuthenticated:false});}catch(error){send({kind:'fm2013-game-date',status:'rejected',diagnostic:String(error.message||error)});}})(${JSON.stringify(config)});`;
}
