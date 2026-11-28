import { describe, expect, it } from 'vitest';
import { reportPage } from './ReportPagination';

describe('report pagination', () => {
  it('covers every result and retains absolute offsets', () => {
    expect(reportPage(29, 0, 12)).toEqual({ page: 0, count: 3, start: 0, end: 12, total: 29 });
    expect(reportPage(29, 2, 12)).toEqual({ page: 2, count: 3, start: 24, end: 29, total: 29 });
  });
  it('clamps a stale page after results shrink', () => {
    expect(reportPage(5, 3, 12).page).toBe(0);
    expect(reportPage(0, 2, 12)).toEqual({ page: 0, count: 1, start: 0, end: 0, total: 0 });
  });
});
