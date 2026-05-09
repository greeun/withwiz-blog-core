/**
 * 페이지네이션 유틸리티
 */
import type { PaginatedResult } from '../types/common';

/**
 * 페이지네이션 결과 객체를 생성한다.
 *
 * @param items - 현재 페이지 항목 배열
 * @param total - 전체 항목 수
 * @param page - 현재 페이지 번호 (1부터 시작)
 * @param limit - 페이지당 항목 수
 * @returns 페이지네이션 메타데이터가 포함된 결과 객체
 */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
