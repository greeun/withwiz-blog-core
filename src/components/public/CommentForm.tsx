/**
 * 댓글 작성 폼 컴포넌트 (공개)
 *
 * 로그인 여부에 따라 게스트 필드(이름/이메일) 노출을 제어한다.
 * 허니팟 hidden 필드로 봇 제출을 차단한다.
 * 전송 후 승인 대기 메시지를 표시한다 (autoApprove 설정과 무관하게 기본 안내).
 */
"use client";

import { useCallback, useState } from "react";
import type { BlogI18nStrings } from "../../types/blog";
import { resolveI18n } from "../../i18n";

interface CommentFormProps {
  /** 대상 포스트 ID */
  postId: string;
  /** 대댓글 작성 시 부모 댓글 ID */
  parentId?: string;
  /** 댓글 API 베이스 경로 (예: "/api/blog/comments") */
  apiBasePath: string;
  /** true면 로그인 필수 — 비로그인 시 폼 대신 안내 표시 */
  requireLogin: boolean;
  /** 현재 로그인 사용자 ID (있으면 게스트 필드 숨김) */
  currentUserId?: string;
  /** 작성 성공 후 콜백 */
  onSubmit?: () => void;
  /** 추가 CSS 클래스 */
  className?: string;
  /** i18n 오버라이드 (선택) — 미제공 시 한국어 기본값 사용 */
  i18n?: BlogI18nStrings;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

/** 댓글 작성 폼 */
export default function CommentForm({
  postId,
  parentId,
  apiBasePath,
  requireLogin,
  currentUserId,
  onSubmit,
  className,
  i18n,
}: CommentFormProps) {
  const t = resolveI18n(i18n);
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isGuest = !currentUserId;
  const blockedForGuest = requireLogin && isGuest;

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === "submitting") return;

      setStatus("submitting");
      setErrorMessage(null);

      try {
        const payload: Record<string, unknown> = {
          postId,
          content,
          honeypot,
        };
        if (parentId) payload.parentId = parentId;
        if (isGuest) {
          if (guestName) payload.guestName = guestName;
          if (guestEmail) payload.guestEmail = guestEmail;
        }

        const res = await fetch(apiBasePath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "same-origin",
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const message =
            (errJson && typeof errJson === "object" && "error" in errJson
              ? String((errJson as { error: unknown }).error)
              : null) ?? t.commentFormError;
          throw new Error(message);
        }

        setStatus("success");
        setContent("");
        setHoneypot("");
        onSubmit?.();
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
      }
    },
    [
      apiBasePath,
      content,
      guestEmail,
      guestName,
      honeypot,
      isGuest,
      onSubmit,
      parentId,
      postId,
      status,
      t,
    ],
  );

  const base = "blog-comment-form";
  const classes = className ? `${base} ${className}` : base;

  if (blockedForGuest) {
    return (
      <div className={classes}>
        <p className="blog-comment-login-required">{t.commentLoginRequired}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={classes}>
        <p className="blog-comment-success">{t.commentFormSuccess}</p>
        <button
          type="button"
          className="blog-comment-reset-btn"
          onClick={() => setStatus("idle")}
        >
          {t.commentResetButton}
        </button>
      </div>
    );
  }

  return (
    <form className={classes} onSubmit={handleSubmit} noValidate>
      {isGuest && (
        <>
          <div className="blog-comment-field">
            <label htmlFor="blog-comment-guest-name">{t.commentFormNameLabel}</label>
            <input
              id="blog-comment-guest-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          <div className="blog-comment-field">
            <label htmlFor="blog-comment-guest-email">{t.commentFormEmailLabel}</label>
            <input
              id="blog-comment-guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="blog-comment-field">
        <label htmlFor="blog-comment-content">{t.commentFormContentLabel}</label>
        <textarea
          id="blog-comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={4}
          required
        />
      </div>

      {/* 허니팟 — 봇 차단용 hidden 필드. 실제 사용자는 채우지 않는다. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="blog-comment-website">Website</label>
        <input
          id="blog-comment-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {errorMessage && (
        <p className="blog-comment-error" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className="blog-comment-submit-btn"
        disabled={status === "submitting" || content.trim().length === 0}
      >
        {status === "submitting" ? t.commentFormSubmitting : t.commentFormSubmitButton}
      </button>
    </form>
  );
}

export { CommentForm };
