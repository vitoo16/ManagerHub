/**
 * Summarize structural evidence from a parsed, bounded AFE directory.
 * Names are identifiers only; no claim about game records or compression codec.
 */
export function summarizeNestedStructure(parsed) {
  if (!parsed || !Array.isArray(parsed.groups)) throw new TypeError('Expected parsed AFE directory groups.');
  return parsed.groups.map(group => {
    const members = group.members;
    const storedSizes = new Map();
    const reportedSizes = new Map();
    let numberedCompetitionNames = 0;
    let storedTotal = 0;
    let reportedTotal = 0;
    for (const member of members) {
      if (/^comp_[0-9]+\.dat$/.test(member.filename)) numberedCompetitionNames++;
      storedSizes.set(member.storedBytes, (storedSizes.get(member.storedBytes) ?? 0) + 1);
      reportedSizes.set(member.reportedUncompressedBytes,
        (reportedSizes.get(member.reportedUncompressedBytes) ?? 0) + 1);
      storedTotal += member.storedBytes;
      reportedTotal += member.reportedUncompressedBytes;
    }
    const commonPairs = new Map();
    for (const member of members) {
      const key = member.storedBytes + ':' + member.reportedUncompressedBytes;
      commonPairs.set(key, (commonPairs.get(key) ?? 0) + 1);
    }
    const topPairs = [...commonPairs].map(([key, count]) => {
      const [storedBytes, reportedUncompressedBytes] = key.split(':').map(Number);
      return { storedBytes, reportedUncompressedBytes, count };
    }).sort((a, b) => b.count - a.count ||
      a.storedBytes - b.storedBytes || a.reportedUncompressedBytes - b.reportedUncompressedBytes)
      .slice(0, 5);
    return {
      group: group.groupName,
      members: members.length,
      numberedCompetitionNames,
      otherNames: members.length - numberedCompetitionNames,
      storedTotalBytes: storedTotal,
      reportedTotalBytes: reportedTotal,
      topSizePairs: topPairs
    };
  });
}
