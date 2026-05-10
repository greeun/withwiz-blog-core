/**
 * 공통 타입 정의
 */

/** 페이지네이션 결과 타입 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 정렬 순서 */
export type SortOrder = 'asc' | 'desc';
