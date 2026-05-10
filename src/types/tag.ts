/**
 * 태그 시스템 타입 정의
 */

/** 태그 기본 정보 */
export interface Tag {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  postCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** 포스트 수가 반드시 포함된 태그 (Tag Cloud, 목록 조회 결과) */
export interface TagWithCount extends Tag {
  postCount: number;
}

/** 태그 생성 입력 */
export interface CreateTagInput {
  slug: string;
  name: string;
  description?: string;
}

/** 태그 수정 입력 */
export interface UpdateTagInput extends Partial<CreateTagInput> {}
