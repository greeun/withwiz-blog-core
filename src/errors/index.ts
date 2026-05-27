/**
 * @withwiz/blog-core 도메인 에러 시스템
 *
 * 서비스 계층에서는 사용자 메시지(자연어) 대신 코드 기반 에러를 던진다.
 * 호스트/UI 계층은 이 코드를 i18n 매핑으로 사용자에게 표시한다.
 */

/** 블로그 도메인 에러 */
export class BlogError extends Error {
  /**
   * @param code - 안정적인 에러 코드 (UI 매핑 키)
   * @param message - 개발자/로그용 영문 메시지 (사용자 노출 X)
   * @param statusCode - HTTP 상태 코드 (라우트 핸들러에서 사용)
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BlogError';
  }
}

/**
 * 안정적인 에러 코드 상수.
 * 호스트/UI는 이 코드를 키로 사용자 메시지를 매핑한다.
 */
export const BLOG_ERROR_CODES = {
  // ── 댓글 ──
  COMMENT_HONEYPOT_TRIGGERED: 'COMMENT_HONEYPOT_TRIGGERED',
  COMMENT_RATE_LIMIT_EXCEEDED: 'COMMENT_RATE_LIMIT_EXCEEDED',
  COMMENT_LOGIN_REQUIRED: 'COMMENT_LOGIN_REQUIRED',
  COMMENT_MAX_DEPTH_EXCEEDED: 'COMMENT_MAX_DEPTH_EXCEEDED',
  COMMENT_PARENT_NOT_FOUND: 'COMMENT_PARENT_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',

  // ── 태그 ──
  TAG_DUPLICATE_SLUG: 'TAG_DUPLICATE_SLUG',
  TAG_INVALID_SLUG: 'TAG_INVALID_SLUG',
  TAG_NOT_FOUND: 'TAG_NOT_FOUND',

  // ── 블로그 글 ──
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  POST_DUPLICATE_SLUG: 'POST_DUPLICATE_SLUG',

  // ── 공통 ──
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/** BLOG_ERROR_CODES 값의 union 타입 */
export type BlogErrorCode = (typeof BLOG_ERROR_CODES)[keyof typeof BLOG_ERROR_CODES];
