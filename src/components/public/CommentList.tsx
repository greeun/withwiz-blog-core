"use client";

/**
 * 댓글 목록 컴포넌트 (공개)
 *
 * 서비스의 listByPost 결과(트리 구조 Comment[])를 받아 렌더링한다.
 * 대댓글은 들여쓰기로 표시한다.
 */

import { useCallback } from "react";
import type { Comment } from "../../types/comment";
import type { CommentListProps } from "./types";
import { resolveI18n } from "../../i18n";
import { ps, publicRootVars } from "./styles";
import type { BlogI18nStrings } from "../../i18n/types";

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
    <div style={ps.commentItem(depth)}>
      <div style={ps.commentHeader}>
        <span style={ps.commentAuthor}>{formatAuthor(comment, t)}</span>
        <span style={ps.commentDate}>{formatDate(comment.createdAt)}</span>
      </div>
      <div style={ps.commentContent}>{comment.content}</div>
      {onReply && (
        <button
          type="button"
          style={ps.commentReplyBtn}
          onClick={handleReply}
        >
          {t.commentReplyButton}
        </button>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 댓글 목록 -- 트리 구조를 재귀적으로 렌더링 */
export default function CommentList({
  comments,
  onReply,
  i18n: i18nOverride,
  className,
}: CommentListProps) {
  const t = resolveI18n(i18nOverride);

  if (!comments || comments.length === 0) {
    return (
      <div className={className} style={{ ...publicRootVars() }}>
        <p style={ps.commentEmpty}>{t.commentEmptyState}</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...publicRootVars() }}>
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} depth={0} onReply={onReply} t={t} />
      ))}
    </div>
  );
}

export { CommentList };
