"use client";

/**
 * 블로그 공개 상세 페이지 컴포넌트
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BlogConfig, BlogDetail, BlogNav, Attachment } from "../../types";
import { formatFileSize, getFileIcon } from "../../utils/file-helpers";
import { resolveI18n } from "../../i18n";

/** HTML 텍스트 노드 안의 URL을 클릭 가능한 링크로 변환 (태그 내부는 건드리지 않음) */
function linkifyHtml(html: string): string {
  return html.replace(
    /(<a\s[^>]*>[\s\S]*?<\/a>)|(<[^>]+>)|(https?:\/\/[^\s<]+)/gi,
    (match, aTag, tag, url) => {
      if (aTag || tag) return match;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    },
  );
}

interface Props {
  post: BlogDetail;
  prev: BlogNav | null;
  next: BlogNav | null;
  config: BlogConfig;
  /** 어드민 미리보기에서 사용 시 true — Link를 span으로 렌더링 */
  staticLinks?: boolean;
  /** 이미지 URL 변환기 */
  imageUrlTransformer?: (url: string, size: string) => string;
  /** 조회수 카운팅 콜백 (미리보기에서는 호출하지 않음) */
  onViewCount?: (slug: string) => void;
}

export default function BlogDetailPage({
  post, prev, next, config,
  staticLinks = false,
  imageUrlTransformer,
  onViewCount,
}: Props) {
  const i18n = resolveI18n(config.i18n);
  const basePath = config.basePath;

  // 조회수 카운팅
  useEffect(() => {
    if (!staticLinks && onViewCount) {
      onViewCount(post.slug);
    }
  }, [post.slug, staticLinks, onViewCount]);

  const title = post.title;
  const content = post.content;
  const theme = config.categories[post.category] || Object.values(config.categories)[0];
  const catClass = theme?.key || post.category.toLowerCase();
  const catLabel = theme?.label || post.category;
  const excerpt = post.excerpt;
  const attachments: Attachment[] = post.attachments || [];

  // 목록 URL 복원 (SSR-safe: useEffect 내부에서만 sessionStorage 접근)
  const [backHref, setBackHref] = useState(basePath);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = config.sessionStorageKey || "blogListUrl";
      const saved = sessionStorage.getItem(key);
      if (saved) setBackHref(saved);
    } catch {
      // sessionStorage 비활성 — basePath 유지
    }
  }, [config.sessionStorageKey, basePath]);

  const backLink = staticLinks ? (
    <span className="blog-detail-back">&larr; {i18n.publicBackToList}</span>
  ) : (
    <Link href={backHref} className="blog-detail-back">
      &larr; {i18n.publicBackToList}
    </Link>
  );

  // 대표 이미지 URL
  const coverUrl = post.coverImageUrl
    ? (imageUrlTransformer && !staticLinks ? imageUrlTransformer(post.coverImageUrl, "lg") : post.coverImageUrl)
    : null;

  const article = (
    <article
      className="blog-detail-article"
      data-category={catClass}
      style={{
        "--cat-main": theme?.main,
        "--cat-bg-tint": theme?.bgTint,
        "--cat-bg-quote": theme?.bgQuote,
        "--cat-border": theme?.border,
        "--cat-divider": theme?.divider,
      } as React.CSSProperties}
    >
      {/* 헤더 */}
      <div className="nbe-pv-hd">
        <div className="nbe-pv-meta">
          <div className={`nbe-pv-cat ${catClass}`}>{catLabel}</div>
        </div>
        <div className="nbe-pv-tt">{title}</div>
        {excerpt && <div className="nbe-pv-st">{excerpt}</div>}
      </div>

      {/* 대표 이미지 */}
      {coverUrl && (
        <div className="nbe-pv-fi">
          {staticLinks ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={title} style={{ maxWidth: "100%", height: "auto" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={title} />
          )}
        </div>
      )}

      {/* 블록 콘텐츠 + CTA */}
      <div
        className="blog-rich-content"
        dangerouslySetInnerHTML={{ __html: linkifyHtml(content) }}
      />

      {/* 첨부파일 */}
      {attachments.length > 0 && (
        <div className="blog-attachments">
          <div className="blog-attachments-label">{i18n.publicAttachmentsLabel}</div>
          <div className="blog-attachments-list">
            {attachments.map((att) => (
              <a
                key={att.key}
                href={staticLinks ? undefined : att.url}
                className="blog-attachment-item"
                download={staticLinks ? undefined : att.name}
                target={staticLinks ? undefined : "_blank"}
                rel={staticLinks ? undefined : "noopener noreferrer"}
                onClick={staticLinks ? (e) => e.preventDefault() : undefined}
              >
                <span className="blog-attachment-icon">{getFileIcon(att.type)}</span>
                <span className="blog-attachment-name">{att.name}</span>
                <span className="blog-attachment-size">{formatFileSize(att.size)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 이전/다음 네비게이션 */}
      <div className="nbe-pv-fnav">
        <div>
          {prev && (
            <>
              <div className="nbe-pv-fl">&larr; {i18n.publicPrevPost}</div>
              {staticLinks ? (
                <span className="nbe-pv-ft">{prev.title}</span>
              ) : (
                <Link href={`${basePath}/${prev.slug}`} className="nbe-pv-ft">{prev.title}</Link>
              )}
            </>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          {next && (
            <>
              <div className="nbe-pv-fl">{i18n.publicNextPost} &rarr;</div>
              {staticLinks ? (
                <span className="nbe-pv-ft">{next.title}</span>
              ) : (
                <Link href={`${basePath}/${next.slug}`} className="nbe-pv-ft">{next.title}</Link>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );

  // 미리보기 모드: article만 반환
  if (staticLinks) return article;

  // 공개 페이지: 래퍼 포함
  return (
    <main className="blog-page page-with-header">
      <div className="blog-container">
        {backLink}
        {article}
      </div>
    </main>
  );
}

export { BlogDetailPage };
