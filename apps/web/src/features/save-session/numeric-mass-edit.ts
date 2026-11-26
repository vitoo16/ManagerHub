/** Draft-only planning. Domain validators remain the authority for supported ranges. */
export interface NumericMassField<RecordType, Patch> {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly read: (record: RecordType) => number | null | undefined;
  readonly patch: (value: number) => Patch;
}

export interface NumericMassRecord {
  readonly uid: number;
}

/** Shared availability/no-op classification for both quick and single-field bulk edits. */
export function classifyNumericChanges(fields: readonly {
  readonly before: number | null | undefined;
  readonly after: number;
}[]): 'unavailable' | 'unchanged' | 'changed' {
  if (fields.some(field => field.before == null || !Number.isFinite(field.before))) return 'unavailable';
  return fields.some(field => field.before !== field.after) ? 'changed' : 'unchanged';
}

export function planNumericMassEdit<RecordType extends NumericMassRecord, Patch>(
  records: readonly RecordType[],
  field: NumericMassField<RecordType, Patch> | undefined,
  input: { readonly query: string; readonly all: boolean; readonly raw: string },
  searchText: (record: RecordType) => string,
  validate: (patch: Patch) => void
) {
  const query = input.query.trim().toLocaleLowerCase();
  const scoped = input.all || query.length > 0;
  const raw = input.raw.trim();
  let patch: Patch | null = null;
  let value: number | null = null;
  let invalid = false;
  if (field && raw) {
    const parsed = Number(raw);
    if (!/^-?\d+$/u.test(raw) || !Number.isSafeInteger(parsed)) invalid = true;
    else {
      try {
        const candidate = field.patch(parsed);
        validate(candidate);
        patch = candidate;
        value = parsed;
      } catch { invalid = true; }
    }
  }
  const changes: { record: RecordType; before: number }[] = [];
  let matched = 0;
  let unavailable = 0;
  let unchanged = 0;
  if (scoped && field && patch !== null && value !== null) {
    for (const record of records) {
      if (!input.all && !searchText(record).toLocaleLowerCase().includes(query)) continue;
      matched++;
      const before = field.read(record);
      const status = classifyNumericChanges([{ before, after: value }]);
      if (status === 'unavailable') unavailable++;
      else if (status === 'unchanged') unchanged++;
      else if (before != null) changes.push({ record, before });
    }
  }
  return { scoped, invalid, patch, value, matched, unavailable, unchanged, changes };
}
