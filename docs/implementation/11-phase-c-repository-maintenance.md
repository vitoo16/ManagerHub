# Phase C repository maintenance

This work follows PR #120 on accepted Windows main `17490818afca06b90c152c9ec7c1329d3a9a3ee7`. PR #115 had already merged at `5ba4514` before the PR #120 merge. Its research changes remain in the branch ancestry.

## Recovery and archival

The local recovery bundle passed `git bundle verify`. All 61 ref names and object IDs matched the prior deletion plan. The 49 remote refs and 12 local refs were absent from their respective live ref lists. This work performed no branch deletions.

Three historical documents are now indexed in [the archive](../archive/README.md). The obsolete destructive script has been retired. The archived inventory and historical test reports remain available.

## Worker and profile changes

The current SaveSession workflow uses the decode worker for both full decode and header-only inspection. The retired inspection worker had only test consumers. The active worker tests exercise acceptance, malformed replies, file identity, bounded parser failures, cancellation and late replies, the active 90-second decode timeout, missing Worker support and transport errors.

The FM2013 profile still contains the build, executable identity, offsets, schema, labels and limits required by its consumers. The FMRTE artifact identity, IL tokens and getter digests now live in the [research provenance manifest](../research/fmrte/fm2013-live-profile-provenance.json). Joining the manifest to the runtime profile by field key reproduced all fields of the previous JSON object, including the 49 ordinary attributes and 15 positions. Production readers and native host imports resolve the runtime profile directly.

The work updates maintenance rules in [AGENTS.md](../../AGENTS.md). It leaves the acceptance ledger's module status and native writer certification gates in place.
