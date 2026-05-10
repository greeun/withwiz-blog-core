/**
 * 댓글 시스템 타입 정의
 */

/** 댓글 모더레이션 상태 */
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';

/** 댓글 기본 정보 */
export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  content: string;
  status: CommentStatus;
  ipHash: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  /** 대댓글 목록 (트리 구조 로드 시 채워짐) */
  replies?: Comment[];
  /** 표시용 작성자 이름 */
  authorName?: string;
}

/** 댓글 생성 입력 */
export interface CreateCommentInput {
  postId: string;
  parentId?: string;
  content: string;
  guestName?: string;
  guestEmail?: string;
  /** 허니팟 필드 -- 봇이 채우면 SPAM 처리 */
  honeypot?: string;
}

/** 댓글 상태 변경 입력 */
export interface UpdateCommentStatusInput {
  status: CommentStatus;
}
