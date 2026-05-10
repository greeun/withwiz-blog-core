"use client";

/**
 * 댓글 작성 폼 컴포넌트 (공개)
 *
 * 허니팟 hidden 필드로 봇 제출을 차단한다.
 * 전송 후 승인 대기 메시지를 표시한다.
 */

import { useCallback, useState } from "react";
import type { CommentFormProps } from "./types";
import { resolveI18n } from "../../i18n";
import { ps, publicRootVars } from "./styles";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function CommentForm({
  postId,
  parentId,
  apiBasePath,
  requireLogin = false,
  currentUserId,
  onSubmitted,
  i18n: i18nOverride,
  className,
}: CommentFormProps) {
  const t = resolveI18n(i18nOverride);
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
        onSubmitted?.();
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : t.errorUnknown);
      }
    },
    [apiBasePath, content, guestEmail, guestName, honeypot, isGuest, onSubmitted, parentId, postId, status, t],
  );

  if (blockedForGuest) {
    return (
      <div className={className} style={{ ...publicRootVars() }}>
        <p style={ps.formLoginRequired}>{t.commentLoginRequired}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={className} style={{ ...publicRootVars() }}>
        <p style={ps.formSuccess}>{t.commentFormSuccess}</p>
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            style={ps.formSubmitBtn}
            onClick={() => setStatus("idle")}
          >
            {t.commentResetButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={className}
      style={{ ...publicRootVars(), ...ps.commentForm }}
      onSubmit={handleSubmit}
      noValidate
    >
      {isGuest && (
        <>
          <div style={ps.formField}>
            <label style={ps.formLabel} htmlFor="blog-comment-guest-name">
              {t.commentFormNameLabel}
            </label>
            <input
              id="blog-comment-guest-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t.commentFormNamePlaceholder}
              maxLength={50}
              required
              style={ps.formInput}
            />
          </div>
          <div style={ps.formField}>
            <label style={ps.formLabel} htmlFor="blog-comment-guest-email">
              {t.commentFormEmailLabel}
            </label>
            <input
              id="blog-comment-guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder={t.commentFormEmailPlaceholder}
              style={ps.formInput}
            />
          </div>
        </>
      )}

      <div style={ps.formField}>
        <label style={ps.formLabel} htmlFor="blog-comment-content">
          {t.commentFormContentLabel}
        </label>
        <textarea
          id="blog-comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.commentFormContentPlaceholder}
          maxLength={2000}
          rows={4}
          required
          style={ps.formTextarea}
        />
        <div style={{ fontSize: 11, color: 'var(--blog-public-text-dim)', marginTop: 2, textAlign: 'right' as const }}>
          {t.commentMaxLengthHint}
        </div>
      </div>

      {/* 허니팟 -- 봇 차단용 hidden 필드 */}
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
        <p style={ps.formError} role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        style={{
          ...ps.formSubmitBtn,
          ...(status === "submitting" || content.trim().length === 0 ? ps.formDisabled : {}),
        }}
        disabled={status === "submitting" || content.trim().length === 0}
      >
        {status === "submitting"
          ? t.commentFormSubmitting
          : parentId
            ? t.commentFormSubmitReply
            : t.commentFormSubmitButton}
      </button>
    </form>
  );
}

export { CommentForm };
