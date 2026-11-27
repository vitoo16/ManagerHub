import type { RcaEvidenceRecord } from './rca-types';

/**
 * Canonical evidence registry referencing SHA-256 digests and retained REA Evidence IDs.
 */
export const RCA_EVIDENCE_REGISTRY: readonly RcaEvidenceRecord[] = [
  {
    id: 'EV-FMRTE26-RCA-JSON',
    artifact: '<FMRTE26_INSTALL_ROOT>/Ratings/rca.json',
    version: '24.4.0.35 (shipped in FMRTE 26.3.2-build41)',
    sha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa',
    method: 'Direct JSON schema & weight matrix extraction',
    status: 'OBSERVED',
    summary: '10 positional archetypes, 47 visible attributes, 5 hidden traits, 8 personality traits, and WeakerFoot weights (3.0..7.5).'
  },
  {
    id: 'EV-FMRTE26-POSITIONS-JSON',
    artifact: '<FMRTE26_INSTALL_ROOT>/Ratings/positions.json',
    version: '24.4.0.35 (shipped in FMRTE 26.3.2-build41)',
    sha256: 'c1ee11733e8d76715a3d157f76e1742b8f4b6f2e22a11b9b54ada9891c7de675',
    method: 'Direct JSON comparison against rca.json and FMRTE 13 Ratings/FMRTE.xml',
    status: 'OBSERVED',
    summary: 'Proves positional % rating weights (-20..100 + AgePeak + AbilityDependent) are distinct from RCA CA-cost weights.'
  },
  {
    id: 'EV-FMRTE26-AVALONIA-DLL',
    artifact: '<FMRTE26_INSTALL_ROOT>/current/FmrteAvalonia.dll',
    version: '26.3.2.42 (MVID ae81bf4d-f887-2214-dad5-9a575848146b)',
    sha256: 'c763b9614e98f13a16f1b49b4a14ad191fc585627919fbac165970938d425ecf',
    method: 'REA inspect_managed_members (ev_bdf1ea070b38a8c685160958522acf7fce6383af642029c8d8373c25e122580e, ev_a61d53d35232eb3beaf07b84804b1f99848c90deb30f32c4ab1acd5830f7eeb3)',
    status: 'OBSERVED',
    summary: 'Confirms PersonalInformationViewModel CA(i2), PA(i2), RCA(i4), AbilityDifference(string), MatchCaWithRCA(bool), and AbilityView XAML bindings.'
  },
  {
    id: 'EV-FMRTE26-FRAMEWORK-PACKED',
    artifact: '<FMRTE26_INSTALL_ROOT>/current/FMRTE.dll (resource uAutp 0x28000002)',
    version: '26.3.2.42 (MVID c1d1bd13-5fbc-417d-40ad-2d18cd8973c8)',
    sha256: '29122b04bde4d77b5860423544d93f6bbef5b2e9c65b9a5749bd388c2be4b89e',
    method: 'REA inspect_managed_artifact (ev_4354c5ba30f94943de7cbe1fca1540aa417532a1cc435c3582dec562bf6dcd54)',
    status: 'UNKNOWN',
    summary: 'Fmrte.Framework.dll is embedded inside encrypted resource uAutp; never unpacked per anti-tamper compliance. Exact internal rounding/multi-position branches remain UNKNOWN.'
  },
  {
    id: 'EV-FMRTE13-NO-RCA',
    artifact: '<FMRTE13_INSTALL_ROOT>/FMRTE.exe',
    version: '13.3.3.62 (MVID 3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6)',
    sha256: 'c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae',
    method: 'REA inspect_managed_members (ev_c8421357f4ab30ad6d10deef76764b37f98e186374efe5eb4a85ccaeb169b607)',
    status: 'OBSERVED',
    summary: 'FMRTE 13 implements Match CA to PA and positional % ratings, but contains zero RCA engine or weight table.'
  },
  {
    id: 'EV-FM26-EDITOR-FMF',
    artifact: '<FM26_INSTALL_ROOT>/shared/data/editor.fmf',
    version: 'FM26 afe./fmf. v8 (zstd)',
    sha256: null,
    method: 'Read-only zstd container decompression of SI Pre-Game Editor XML',
    status: 'OBSERVED',
    summary: 'Historical observation, artifact digest conflicts with rolesAndDuties.json and requires recheck. Reports SI person ability fourCCs: PCAB (CA), ERCL (Rec. CA), PCRD (CA/RCA % diff), PRDF (CA/RCA diff), PPAB (PA).'
  },
  {
    id: 'EV-FM2013-CORPUS-VALIDATION',
    artifact: 'Historical report; row-level corpus not available',
    version: 'FM2013 13.3.3f359652 (game_db v0x765..0x774)',
    sha256: null,
    method: 'Offline game_db decode + out-of-sample affine weighted-mean validation',
    status: 'INFERRED',
    summary: 'Historical FM2013 calibration claim; row-level corpus, exclusions and overlap audit are not in the repository. Accuracy is not independently reproduced.'
  }
];
