// Research arithmetic only. No process access, record discovery or save-file I/O.
// Evidence, exact artifact identity and static/runtime limits:
// ../docs/research/fmrte/14-fmrte13-field-transforms.md
function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function argumentsForWord(word, address, mode, field) {
  integer(word, 0, 0xffff, 'word');
  integer(address, 0, 0xffffffff, 'effective field address');
  if (![0, 1, 3].includes(mode)) throw new RangeError('Unresolved field mode');
  if (field !== 'ca' && field !== 'pa') throw new RangeError('Unknown field');
  return address & 15;
}

const left = (word, count) => ((word << count) | (word >>> (16 - count))) & 0xffff;
const right = (word, count) => ((word >>> count) | (word << (16 - count))) & 0xffff;
const invert = (word) => word ^ 0xffff;

/** Decode one supplied word; the caller must establish its address and mode separately. */
export function decodeAbilityWord(word, address, mode, field) {
  const key = argumentsForWord(word, address, mode, field);
  let result;
  if (field === 'ca' && mode === 0) {
    result = left(right(invert(right(word, key)), 8) ^ 42991, key);
  } else if (field === 'ca' && mode === 1) {
    result = right(invert(right(invert(word), 2)) ^ 33331, key);
  } else if ((field === 'ca' && mode === 3) || (field === 'pa' && mode === 1)) {
    result = left(right(invert(left(word, key)), 12) ^ 47114, key);
  } else if (field === 'pa' && mode === 0) {
    result = left(invert(right(invert(word ^ 13121), key)), 11);
  } else {
    result = left(right(invert(word ^ 51768), 14) ^ 20102, key);
  }
  return result >= 0x8000 ? result - 0x10000 : result;
}

/** Inverse arithmetic into a returned word. This function writes no external state. */
export function encodeAbilityWord(value, address, mode, field) {
  integer(value, -0x8000, 0x7fff, 'signed ability word');
  const word = value & 0xffff;
  const key = argumentsForWord(word, address, mode, field);
  if (field === 'ca' && mode === 0) {
    return left(invert(left(right(word, key) ^ 42991, 8)), key);
  }
  if (field === 'ca' && mode === 1) {
    return invert(left(invert(left(word, key) ^ 33331), 2));
  }
  if ((field === 'ca' && mode === 3) || (field === 'pa' && mode === 1)) {
    return right(invert(left(right(word, key) ^ 47114, 12)), key);
  }
  if (field === 'pa' && mode === 0) {
    return invert(left(invert(right(word, 11)), key)) ^ 13121;
  }
  return invert(left(right(word, key) ^ 20102, 14)) ^ 51768;
}

function multiplier(value) {
  if (value !== 1 && value !== 5) throw new RangeError('Unresolved attribute multiplier');
  return value;
}

function signedByte(value) {
  const byte = value & 255;
  return byte >= 128 ? byte - 256 : byte;
}

function roundEven(value) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  return fraction === 0.5 ? lower + (lower & 1) : Math.round(value);
}

export function decodeAttributeByte(raw, scale) {
  integer(raw, -128, 127, 'signed attribute byte');
  return Math.max(1, signedByte(roundEven(raw / multiplier(scale))));
}

export function encodeAttributeByte(value, scale) {
  integer(value, -128, 127, 'signed attribute byte');
  return signedByte(value * multiplier(scale));
}
