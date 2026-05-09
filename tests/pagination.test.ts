import { describe, it, expect } from 'vitest';
import { buildPaginatedResult } from '@withwiz/blog-core/utils';

describe('buildPaginatedResult', () => {
  // BC-P-01
  it('정상 페이지네이션을 계산한다', () => {
    const items = ['a', 'b', 'c'];
    const result = buildPaginatedResult(items, 10, 1, 3);
    expect(result.pagination.totalPages).toBe(4);
    expect(result.pagination.hasMore).toBe(true);
  });

  // BC-P-02
  it('마지막 페이지에서 hasMore=false를 반환한다', () => {
    const items = ['x'];
    const result = buildPaginatedResult(items, 10, 4, 3);
    expect(result.pagination.totalPages).toBe(4);
    expect(result.pagination.hasMore).toBe(false);
  });

  // BC-P-03
  it('total=0일 때 빈 결과를 반환한다', () => {
    const result = buildPaginatedResult([], 0, 1, 10);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.items).toEqual([]);
  });

  // BC-P-04
  it('단일 페이지에서 hasMore=false를 반환한다', () => {
    const items = [1, 2, 3, 4, 5];
    const result = buildPaginatedResult(items, 5, 1, 10);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasMore).toBe(false);
  });

  // BC-P-05
  it('limit=1일 때 totalPages를 정확히 계산한다', () => {
    const result = buildPaginatedResult(['item'], 100, 50, 1);
    expect(result.pagination.totalPages).toBe(100);
    expect(result.pagination.hasMore).toBe(true);
  });

  // BC-P-06
  it('입력 items 배열 참조를 보존한다', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildPaginatedResult(items, 2, 1, 10);
    expect(result.items).toBe(items);
  });

  // BC-P-07
  it('정확한 page와 pageSize를 반환한다', () => {
    const result = buildPaginatedResult([], 100, 3, 20);
    expect(result.pagination.page).toBe(3);
    expect(result.pagination.pageSize).toBe(20);
  });
});
