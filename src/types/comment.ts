/**
 * 댓글 시스템 타입 정의
 *
 * 블로그 포스트에 달리는 댓글/대댓글 엔티티의 타입을 정의한다.
 */

// ── 상태 enum ──

/** 댓글 모더레이션 상태 */
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';

// ── 댓글 엔티티 ──

/** 댓글 기본 정보 */
export interface Comment {
  /** 댓글 식별자 (cuid) */
  id: string;
  /** 대상 포스트 ID */
  postId: string;
  /** 부모 댓글 ID (대댓글인 경우) — null이면 루트 댓글 */
  parentId: string | null;
  /** 작성자 ID (로그인 사용자) — null이면 게스트 */
  authorId: string | null;
  /** 게스트 이름 (authorId가 null일 때 사용) */
  guestName: string | null;
  /** 게스트 이메일 (authorId가 null일 때 사용) */
  guestEmail: string | null;
  /** 댓글 본문 */
  content: string;
  /** 모더레이션 상태 */
  status: CommentStatus;
  /** 작성자 IP 해시 (rate limit 용) */
  ipHash: string | null;
  /** 생성 시각 */
  createdAt: Date | string;
  /** 수정 시각 */
  updatedAt: Date | string;

  /** 대댓글 목록 (트리 구조 로드 시 채워짐) */
  replies?: Comment[];
  /** 표시용 작성자 이름 (authorId로 조회 후 채워짐) */
  authorName?: string;
}

// ── 입력 타입 ──

/** 댓글 생성 입력 */
export interface CreateCommentInput {
  /** 대상 포스트 ID */
  postId: string;
  /** 부모 댓글 ID (대댓글 작성 시) */
  parentId?: string;
  /** 댓글 본문 (1~2000자) */
  content: string;
  /** 게스트 이름 (비로그인 시 필수) */
  guestName?: string;
  /** 게스트 이메일 (비로그인 시 선택) */
  guestEmail?: string;
  /** 허니팟 필드 — 봇이 채우면 SPAM 처리 */
  honeypot?: string;
}

/** 댓글 상태 변경 입력 */
export interface UpdateCommentStatusInput {
  status: CommentStatus;
}
