"use client";

/**
 * 블로그 상세 미리보기 컴포넌트
 */

import { useMemo } from "react";
import type { BlogConfig, BlogDetail } from "../../types";
import type { BlogFormData } from "./constants";
import { getCatClass, hEsc, extractDisplayHtml } from "./constants";
import BlogDetailPage from "../public/BlogDetailPage";

interface Props {
  form: BlogFormData;
  isNew: boolean;
  selectedId: string | null;
  config: BlogConfig;
}

export function BlogDetailPreview({ form, isNew, selectedId, config }: Props) {
  if (!selectedId && !isNew) {
    return (
      <div className="blog-pv" style={{ padding: "60px 20px", textAlign: "center", color: "#999", fontSize: 12 }}>
        &larr; 목록에서 글을 선택하면<br />상세페이지 미리보기가 표시됩니다
      </div>
    );
  }

  // CTA가 활성화된 경우 콘텐츠에 CTA HTML을 주입
  const content = useMemo(() => {
    let html = extractDisplayHtml(form.content);
    if (form.ctaEnabled && form.ctaBtn) {
      const cat = getCatClass(form.category, config);
      html += `<div class="nbe-pvb-cta">${form.ctaMsg ? `<p>${hEsc(form.ctaMsg)}</p>` : ""}<a href="${form.ctaUrl || "#"}" class="nbe-pvb-cta-btn ${cat}">${hEsc(form.ctaBtn)}</a></div>`;
    }
    return html;
  }, [form.content, form.ctaEnabled, form.ctaBtn, form.ctaMsg, form.ctaUrl, form.category, config]);

  // BlogDetail 객체 구성
  const post: BlogDetail = {
    id: selectedId || "new",
    slug: form.slug || "preview",
    category: form.category,
    title: form.title || "제목을 입력하세요",
    excerpt: form.excerpt || null,
    coverImageUrl: form.coverImageUrl || null,
    coverImageKey: form.coverImageKey || null,
    hasAttachments: form.attachments.length > 0,
    featured: form.featured,
    published: form.published,
    publishedAt: form.publishedAt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content,
    attachments: form.attachments,
    authorId: "",
  };

  const prev = { slug: "", title: "이전 글" };
  const next = { slug: "", title: "다음 글" };

  return <BlogDetailPage post={post} prev={prev} next={next} config={config} staticLinks />;
}

export default BlogDetailPreview;
