import { useTranslation } from 'react-i18next';
import { Button } from '@managerhub/ui';

export function reportPage(total: number, requestedPage: number, pageSize: number) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(0, requestedPage), count - 1);
  const start = page * pageSize;
  return { page, count, start, end: Math.min(total, start + pageSize), total };
}

export function ReportPagination({ label, range, onChange }: {
  readonly label: string;
  readonly range: ReturnType<typeof reportPage>;
  readonly onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  if (range.count <= 1) return null;
  return <div className="save-db-actions" role="group" aria-label={label}>
    <Button type="button" disabled={range.page === 0} onClick={() => onChange(range.page - 1)}>{t('Previous page')}</Button>
    <span aria-live="polite">{t('Showing {{from}}–{{to}} of {{total}}', { from: range.start + 1, to: range.end, total: range.total })}</span>
    <Button type="button" disabled={range.page + 1 >= range.count} onClick={() => onChange(range.page + 1)}>{t('Next page')}</Button>
  </div>;
}
