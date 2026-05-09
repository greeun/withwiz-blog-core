/**
 * 댓글 목록 컴포넌트 (공개)
 *
 * 서비스의 listByPost 결과(트리 구조 Comment[])를 받아 렌더링한다.
 * 대댓글은 들여쓰기로 표시한다 (기본 1단계, 깊이는 데이터에 따름).
 */
"use client";

import { useCallback } from "react";
import type { Comment } from "../../types/comment";
import type { BlogI18nStrings } from "../../types/blog";
import { resolveI18n } from "../../i18n";

interface CommentListProps {
  /** 트리 구조 댓글 목록 (루트 + replies) */
  comments: Comment[];
  /** 답글 버튼 클릭 시 호출 — parentId 전달 */
  onReply?: (parentId: string) => void;
  /** 추가 CSS 클래스 */
  className?: string;
  /** i18n 오버라이드 (선택) — 미제공 시 한국어 기본값 사용 */
  i18n?: BlogI18nStrings;
}

function formatAuthor(comment: Comment, t: Required<BlogI18nStrings>): string {
  if (comment.authorName) return comment.authorName;
  if (comment.guestName) return comment.guestName;
  if (comment.authorId) return t.commentMemberLabel;
  return t.commentGuestLabel;
}

function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CommentItemProps {
  comment: Comment;
  depth: number;
  onReply?: (parentId: string) => void;
  t: Required<BlogI18nStrings>;
}

function CommentItem({ comment, depth, onReply, t }: CommentItemProps) {
  const handleReply = useCallback(() => {
    onReply?.(comment.id);
  }, [comment.id, onReply]);

  return (
    <li
      className="blog-comment-item"
      data-comment-id={comment.id}
      data-depth={depth}
      style={{ marginLeft: depth > 0 ? `${depth * 24}px` : undefined }}
    >
      <div className="blog-comment-header">
        <span className="blog-comment-author">{formatAuthor(comment, t)}</span>
        <span className="blog-comment-date">{formatDate(comment.createdAt)}</span>
      </div>
      <div className="blog-comment-content">{comment.content}</div>
      {onReply && (
        <div className="blog-comment-actions">
          <button
            type="button"
            className="blog-comment-reply-btn"
            onClick={handleReply}
          >
            {t.commentReplyButton}
          </button>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <ul className="blog-comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              t={t}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** 댓글 목록 — 트리 구조를 재귀적으로 렌더링 */
export default function CommentList({
  comments,
  onReply,
  className,
  i18n,
}: CommentListProps) {
  const t = resolveI18n(i18n);
  const base = "blog-comment-list";
  const classes = className ? `${base} ${className}` : base;

  if (!comments || comments.length === 0) {
    return (
      <div className={classes}>
        <p className="blog-comment-empty">{t.commentEmptyState}</p>
      </div>
    );
  }

  return (
    <ul className={classes}>
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} depth={0} onReply={onReply} t={t} />
      ))}
    </ul>
  );
}

export { CommentList };
