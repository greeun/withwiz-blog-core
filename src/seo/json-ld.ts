/**
 * Schema.org JSON-LD 생성 유틸리티.
 *
 * BlogPosting 및 BreadcrumbList 스키마를 반환한다.
 */
import type { BlogDetail, BlogConfig } from '../types';

/** generateJsonLd 옵션 */
export interface JsonLdOptions {
  post: BlogDetail;
  config: BlogConfig;
  /** 사이트 루트 URL (예: https://example.com) */
  siteUrl: string;
  /** 작성자 이름 (optional) */
  authorName?: string;
  /** 퍼블리셔(조직) 이름 */
  organizationName?: string;
  /** 퍼블리셔 로고 URL (절대 URL) */
  organizationLogo?: string;
  /** 기본 이미지 URL (coverImage가 없을 때 사용) */
  defaultImage?: string;
}

/** 빵부스러기 항목 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** URL 끝 슬래시 정리 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** 경로 결합 */
function joinUrl(base: string, ...paths: string[]): string {
  const cleanBase = stripTrailingSlash(base);
  const parts = paths.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean);
  return parts.length > 0 ? `${cleanBase}/${parts.join('/')}` : cleanBase;
}

/** Date | string | null을 ISO 문자열로 정규화 (invalid 시 undefined) */
function toIso(value: Date | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * BlogPosting JSON-LD 스키마를 생성한다.
 *
 * schema.org BlogPosting 표준에 따라 headline, description, image, datePublished,
 * dateModified, author, publisher, mainEntityOfPage, keywords를 포함한다.
 */
export function generateJsonLd(options: JsonLdOptions): Record<string, unknown> {
  const {
    post,
    config,
    siteUrl,
    authorName,
    organizationName,
    organizationLogo,
    defaultImage,
  } = options;

  const cleanSiteUrl = stripTrailingSlash(siteUrl);
  const url = joinUrl(cleanSiteUrl, config.basePath, post.slug);
  const image = post.coverImageUrl ?? defaultImage;
  const datePublished = toIso(post.publishedAt);
  const dateModified = toIso(post.updatedAt) ?? toIso(post.createdAt) ?? new Date().toISOString();
  const keywords = Array.isArray(post.tags)
    ? post.tags.map((t) => t.name).filter(Boolean).join(', ')
    : undefined;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? '',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    dateModified,
  };

  if (image) {
    jsonLd.image = [image];
  }
  if (datePublished) {
    jsonLd.datePublished = datePublished;
  }

  if (authorName) {
    jsonLd.author = {
      '@type': 'Person',
      name: authorName,
    };
  }

  if (organizationName) {
    const publisher: Record<string, unknown> = {
      '@type': 'Organization',
      name: organizationName,
    };
    if (organizationLogo) {
      publisher.logo = {
        '@type': 'ImageObject',
        url: organizationLogo,
      };
    }
    jsonLd.publisher = publisher;
  }

  if (keywords) {
    jsonLd.keywords = keywords;
  }

  return jsonLd;
}

/**
 * BreadcrumbList JSON-LD 스키마를 생성한다.
 *
 * items 배열의 순서대로 position을 1부터 부여한다.
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
