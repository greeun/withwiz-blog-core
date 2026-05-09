/**
 * 태그 시스템 타입 정의
 *
 * 블로그 포스트와 N:M 관계를 맺는 태그 엔티티의 타입을 정의한다.
 */

// ── 태그 엔티티 ──

/** 태그 기본 정보 */
export interface Tag {
  /** 태그 식별자 (cuid) */
  id: string;
  /** URL-safe slug (소문자, 하이픈) */
  slug: string;
  /** 표시명 */
  name: string;
  /** 설명 (optional) */
  description?: string | null;
  /** 해당 태그를 사용하는 공개 포스트 수 (목록/클라우드 조회 시 포함) */
  postCount?: number;
  /** 생성 시각 */
  createdAt: Date | string;
  /** 수정 시각 */
  updatedAt: Date | string;
}

/** 포스트 수가 반드시 포함된 태그 (Tag Cloud, 목록 조회 결과) */
export interface TagWithCount extends Tag {
  /** 해당 태그를 사용하는 공개 포스트 수 */
  postCount: number;
}

// ── 입력 타입 ──

/** 태그 생성 입력 */
export interface CreateTagInput {
  /** URL-safe slug */
  slug: string;
  /** 표시명 (1~50자) */
  name: string;
  /** 설명 (0~500자, optional) */
  description?: string;
}

/** 태그 수정 입력 (모든 필드 optional) */
export interface UpdateTagInput extends Partial<CreateTagInput> {}
