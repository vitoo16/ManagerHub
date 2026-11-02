// Source-era research metadata; scale5 requires reference attributesRange=20.
// This catalogue is separate from modern product AttributeKey aliases.
import profile from "../packages/domain/src/fm2013-live-profile.json" with {type:"json"};
export const FM2013_ORDINARY_ATTRIBUTES = Object.freeze(profile.attributes.map(a=>Object.freeze({...a})));
