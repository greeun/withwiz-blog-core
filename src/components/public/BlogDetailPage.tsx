"use client";

/**
 * 블로그 공개 상세 페이지 컴포넌트
 *
 * 대표 이미지, 본문 렌더링, 첨부파일, CTA 버튼, 이전/다음 네비게이션을 지원한다.
 */

import { useEffect, useState } from "react";
import type { Attachment } from "../../types/blog";
import type { BlogDetailPageProps } from "./types";
import { formatFileSize, getFileIcon } from "../../utils/file-helpers";
import { resolveI18n } from "../../i18n";
import { ps, publicRootVars } from "./styles";
import { useBlogUI } from "../../context/BlogUIContext";

/** HTML 텍스트 노드 안의 URL을 클릭 가능한 링크로 변환 */
function linkifyHtml(html: string): string {
  return html.replace(
    /(<a\s[^>]*>[\s\S]*?<\/a>)|(<[^>]+>)|(https?:\/\/[^\s<]+)/gi,
    (match, aTag: string | undefined, tag: string | undefined, url: string | undefined) => {
      if (aTag || tag) return match;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    },
  );
}

/** CTA 데이터를 content 내 base64 마커에서 추출 */
function extractCtaFromContent(content: string): { msg: string; btn: string; url: string } | null {
  // v1 호환: <!--CTA:base64data--> 형식
  const match = content.match(/<!--CTA:([\w+/=]+)-->/);
  if (!match) return null;
  try {
    const decoded = typeof atob === "function" ? atob(match[1]) : Buffer.from(match[1], "base64").toString("utf-8");
    const data = JSON.parse(decoded);
    if (data && data.msg && data.btn && data.url) return data;
  } catch {
    // 파싱 실패 — null 반환
  }
  return null;
}

/** CTA 마커를 content에서 제거 */
function removeCtaFromContent(content: string): string {
  return content.replace(/<!--CTA:[\w+/=]+-->/g, "").trim();
}

export default function BlogDetailPage({
  post,
  prev,
  next,
  categories,
  basePath,
  staticLinks = false,
  imageUrlTransformer,
  onViewCount,
  enableCta = true,
  enableAttachments = true,
  i18n: i18nOverride,
  className,
  sessionStorageKey,
}: BlogDetailPageProps) {
  const { Link } = useBlogUI();
  const t = resolveI18n(i18nOverride);

  // 조회수 카운팅
  useEffect(() => {
    if (!staticLinks && onViewCount) {
      onViewCount(post.slug);
    }
  }, [post.slug, staticLinks, onViewCount]);

  const theme = categories[post.category] || Object.values(categories)[0];
  const catLabel = theme?.label || post.category;
  const attachments: Attachment[] = (enableAttachments && post.attachments) || [];

  // CTA 추출
  const ctaData = enableCta ? extractCtaFromContent(post.content) : null;
  const displayContent = ctaData ? removeCtaFromContent(post.content) : post.content;

  // 목록 URL 복원
  const [backHref, setBackHref] = useState(basePath);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = sessionStorageKey || "blogListUrl";
      const saved = sessionStorage.getItem(key);
      if (saved) setBackHref(saved);
    } catch {
      // sessionStorage 비활성 — basePath 유지
    }
  }, [sessionStorageKey, basePath]);

  // 대표 이미지 URL
  const coverUrl = post.coverImageUrl
    ? (imageUrlTransformer && !staticLinks ? imageUrlTransformer(post.coverImageUrl, "lg") : post.coverImageUrl)
    : null;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const rootClass = className ? `blog-public-detail ${className}` : "blog-public-detail";

  return (
    <div className={rootClass} style={{ ...publicRootVars(), ...ps.container }}>
      {/* 뒤로가기 */}
      {!staticLinks && (
        <Link href={backHref} style={ps.detailBack}>
          &larr; {t.publicBackToList}
        </Link>
      )}

      <article style={ps.detailArticle}>
        {/* 헤더 */}
        <div style={ps.detailHeader}>
          <span style={ps.detailCategoryBadge(theme?.main)}>{catLabel}</span>
          <h1 style={ps.detailTitle}>{post.title}</h1>
          {post.excerpt && <p style={ps.detailExcerpt}>{post.excerpt}</p>}
          <div style={ps.detailMeta}>{formatDate(post.publishedAt)}</div>
          {post.tags && post.tags.length > 0 && (
            <div style={{ ...ps.cardTags, marginTop: 8 }}>
              {post.tags.map((tag) =>
                staticLinks ? (
                  <span key={tag.id} style={ps.tagBadge}>#{tag.name}</span>
                ) : (
                  <Link key={tag.id} href={`${basePath}?tag=${tag.slug}`} style={ps.tagBadge}>
                    #{tag.name}
                  </Link>
                )
              )}
            </div>
          )}
        </div>

        {/* 대표 이미지 */}
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={post.title} style={ps.detailCover} />
        )}

        {/* 본문 HTML 렌더링 */}
        <div
          className="blog-rich-content"
          style={ps.detailContent}
          dangerouslySetInnerHTML={{ __html: linkifyHtml(displayContent) }}
        />

        {/* CTA 버튼 */}
        {enableCta && ctaData && (
          <div style={ps.ctaSection}>
            <div style={ps.ctaMessage}>{ctaData.msg}</div>
            {staticLinks ? (
              <span style={ps.ctaButton}>{ctaData.btn}</span>
            ) : (
              <a
                href={ctaData.url}
                target="_blank"
                rel="noopener noreferrer"
                style={ps.ctaButton}
              >
                {ctaData.btn}
              </a>
            )}
          </div>
        )}

        {/* 첨부파일 */}
        {enableAttachments && attachments.length > 0 && (
          <div style={ps.attachmentsSection}>
            <div style={ps.attachmentsLabel}>{t.publicAttachmentsLabel}</div>
            {attachments.map((att) => (
              <a
                key={att.key}
                href={staticLinks ? undefined : att.url}
                style={ps.attachmentItem}
                download={staticLinks ? undefined : att.name}
                target={staticLinks ? undefined : "_blank"}
                rel={staticLinks ? undefined : "noopener noreferrer"}
                onClick={staticLinks ? (e) => e.preventDefault() : undefined}
              >
                <span style={ps.attachmentIcon}>{getFileIcon(att.type)}</span>
                <span style={ps.attachmentName}>{att.name}</span>
                <span style={ps.attachmentSize}>{formatFileSize(att.size)}</span>
              </a>
            ))}
          </div>
        )}

        {/* 이전/다음 네비게이션 */}
        <div style={ps.navSection}>
          <div style={ps.navItem("left")}>
            {prev && (
              <>
                <div style={ps.navLabel}>&larr; {t.publicPrevPost}</div>
                {staticLinks ? (
                  <span style={ps.navLink}>{prev.title}</span>
                ) : (
                  <Link href={`${basePath}/${prev.slug}`} style={ps.navLink}>
                    {prev.title}
                  </Link>
                )}
              </>
            )}
          </div>
          <div style={ps.navItem("right")}>
            {next && (
              <>
                <div style={ps.navLabel}>{t.publicNextPost} &rarr;</div>
                {staticLinks ? (
                  <span style={ps.navLink}>{next.title}</span>
                ) : (
                  <Link href={`${basePath}/${next.slug}`} style={ps.navLink}>
                    {next.title}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

export { BlogDetailPage };
