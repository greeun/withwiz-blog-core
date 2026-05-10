/**
 * Next.js Metadata 생성 유틸리티
 *
 * Next.js Metadata 타입과 호환되는 객체를 반환한다.
 */
import type { BlogDetail, CategoryTheme } from '../types/blog';
import type { BlogConfig } from '../types/config';

// ── Next.js Metadata 타입 (next 의존성 없이 로컬 정의) ──

/** Next.js Metadata 형태 */
export interface Metadata {
  title?: string;
  description?: string;
  keywords?: string[];
  authors?: Array<{ name: string }>;
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
    locale?: string;
    type?: 'article' | 'website';
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
  };
  twitter?: {
    card?: 'summary' | 'summary_large_image';
    title?: string;
    description?: string;
    images?: string[];
    creator?: string;
  };
  alternates?: { canonical?: string };
}

// ── 입력 옵션 ──

/** generateMetadata 옵션 */
export interface MetadataOptions {
  /** 블로그 상세 데이터 */
  post: BlogDetail;
  /** 블로그 설정 (카테고리, basePath 등) */
  config: BlogConfig;
  /** 사이트 이름 */
  siteName: string;
  /** 사이트 루트 URL (끝에 슬래시 없이, 예: https://example.com) */
  siteUrl: string;
  /** 기본 OG 이미지 URL (coverImage가 없을 때 사용) */
  defaultOgImage?: string;
  /** 로케일 (예: 'ko_KR') */
  locale?: string;
  /** 트위터 정보 */
  twitter?: { handle?: string };
  /** 작성자 이름 (optional) */
  authorName?: string;
}

/** 카테고리/태그 목록 페이지용 옵션 */
export interface ListMetadataOptions {
  config: BlogConfig;
  siteName: string;
  siteUrl: string;
  defaultOgImage?: string;
  locale?: string;
  /** 목록 페이지 제목 (기본: siteName) */
  title?: string;
  /** 목록 페이지 설명 */
  description?: string;
  /** 목록 페이지 경로 (기본: config.basePath) */
  path?: string;
}

// ── 유틸리티 ──

/** URL 끝 슬래시 정리 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** 경로 결합 (중복 슬래시 제거) */
function joinUrl(base: string, ...paths: string[]): string {
  const cleanBase = stripTrailingSlash(base);
  const parts = paths.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean);
  return parts.length > 0 ? `${cleanBase}/${parts.join('/')}` : cleanBase;
}

/** Date | string | null을 ISO 문자열로 변환 */
function toIsoString(value: Date | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// ── 메인 함수 ──

/**
 * 블로그 상세 페이지의 Next.js Metadata를 생성한다.
 *
 * title, description, openGraph, twitter, alternates.canonical를 포함한다.
 */
export function generateMetadata(options: MetadataOptions): Metadata {
  const {
    post,
    config,
    siteName,
    siteUrl,
    defaultOgImage,
    locale = 'ko_KR',
    twitter,
    authorName,
  } = options;

  const cleanSiteUrl = stripTrailingSlash(siteUrl);
  const canonical = joinUrl(cleanSiteUrl, config.basePath, post.slug);
  const description = post.excerpt ?? '';
  const ogImage = post.coverImageUrl ?? defaultOgImage;
  const tagNames = Array.isArray(post.tags)
    ? post.tags.map((t) => t.name).filter(Boolean)
    : undefined;

  const images = ogImage
    ? [{ url: ogImage, width: 1200, height: 630, alt: post.title }]
    : undefined;

  const publishedTime = toIsoString(post.publishedAt);
  const modifiedTime = toIsoString(post.updatedAt);

  const metadata: Metadata = {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: canonical,
      siteName,
      locale,
      ...(images ? { images } : {}),
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authorName ? { authors: [authorName] } : {}),
      ...(tagNames && tagNames.length > 0 ? { tags: tagNames } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
      ...(twitter?.handle ? { creator: twitter.handle } : {}),
    },
  };

  if (tagNames && tagNames.length > 0) {
    metadata.keywords = tagNames;
  }

  if (authorName) {
    metadata.authors = [{ name: authorName }];
  }

  return metadata;
}

/**
 * 카테고리/태그 목록 페이지용 Metadata를 생성한다.
 */
export function generateListMetadata(options: ListMetadataOptions): Metadata {
  const {
    config,
    siteName,
    siteUrl,
    defaultOgImage,
    locale = 'ko_KR',
    title,
    description = '',
    path,
  } = options;

  const cleanSiteUrl = stripTrailingSlash(siteUrl);
  const pagePath = path ?? config.basePath;
  const canonical = joinUrl(cleanSiteUrl, pagePath);
  const pageTitle = title ?? siteName;

  const images = defaultOgImage
    ? [{ url: defaultOgImage, width: 1200, height: 630, alt: pageTitle }]
    : undefined;

  return {
    title: pageTitle,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: pageTitle,
      description,
      url: canonical,
      siteName,
      locale,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      ...(defaultOgImage ? { images: [defaultOgImage] } : {}),
    },
  };
}

// 카테고리 테마 참조 (타입 export)
export type { CategoryTheme };
