/**
 * Next.js sitemap.ts 호환 sitemap 엔트리 생성 유틸리티.
 *
 * 공개된 포스트, 카테고리 목록, 태그 목록(optional)을 모두 순회하여
 * SitemapEntry[] 배열을 반환한다.
 */
import type { BlogService, TagService } from '../services';
import type { BlogConfig } from '../types';

/** Sitemap 엔트리 변경 빈도 */
export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

/** Next.js sitemap.ts와 호환되는 엔트리 */
export interface SitemapEntry {
  url: string;
  lastModified: Date | string;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
}

/** createSitemap 옵션 */
export interface SitemapOptions {
  /** 블로그 서비스 (포스트 목록 조회용) */
  blogService: BlogService;
  /** 태그 서비스 (optional, 주어지면 태그 페이지도 포함) */
  tagService?: TagService;
  /** 사이트 루트 URL (예: https://example.com) */
  siteUrl: string;
  /** 블로그 기본 경로 (예: '/blog', '/news') */
  basePath: string;
  /** 블로그 설정 (카테고리 순회용, optional) */
  config?: BlogConfig;
  /** 글 엔트리 기본 변경 빈도 (default: 'weekly') */
  changeFrequency?: SitemapChangeFrequency;
  /** 글 엔트리 기본 우선순위 (default: 0.7) */
  priority?: number;
  /** 순회할 최대 페이지 크기 (default: 100) */
  pageSize?: number;
  /** 추가 정적 엔트리 */
  extraEntries?: SitemapEntry[];
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

/** Date | string | null을 Date로 정규화 */
function toDate(value: Date | string | null | undefined): Date {
  if (value === null || value === undefined) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * sitemap 엔트리를 생성한다.
 *
 * 포함되는 엔트리:
 * - 목록 페이지: {siteUrl}{basePath}
 * - 각 공개 포스트: {siteUrl}{basePath}/{slug}
 * - 각 카테고리 (config.categories 제공 시): {siteUrl}{basePath}/category/{key}
 * - 각 태그 (tagService 제공 시): {siteUrl}{basePath}/tag/{slug}
 * - extraEntries: 그대로 추가
 */
export async function createSitemap(options: SitemapOptions): Promise<SitemapEntry[]> {
  const {
    blogService,
    tagService,
    siteUrl,
    basePath,
    config,
    changeFrequency = 'weekly',
    priority = 0.7,
    pageSize = 100,
    extraEntries = [],
  } = options;

  const cleanSiteUrl = stripTrailingSlash(siteUrl);
  const entries: SitemapEntry[] = [];

  // 1. 목록 페이지
  entries.push({
    url: joinUrl(cleanSiteUrl, basePath),
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  });

  // 2. 모든 공개 포스트 순회 (페이지네이션)
  let page = 1;
  let totalPages = 1;
  do {
    const result = await blogService.listPublished({ page, limit: pageSize });
    for (const post of result.items) {
      entries.push({
        url: joinUrl(cleanSiteUrl, basePath, post.slug),
        lastModified: toDate(post.updatedAt),
        changeFrequency,
        priority,
      });
    }
    totalPages = result.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  // 3. 카테고리 페이지 (config 있을 때)
  if (config?.categories) {
    for (const key of Object.keys(config.categories)) {
      entries.push({
        url: joinUrl(cleanSiteUrl, basePath, 'category', key),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  // 4. 태그 페이지 (tagService 있을 때)
  if (tagService) {
    const tags = await tagService.listAll({ limit: 1000 });
    const items = Array.isArray(tags) ? tags : (tags?.items ?? []);
    for (const tag of items) {
      entries.push({
        url: joinUrl(cleanSiteUrl, basePath, 'tag', tag.slug),
        lastModified: toDate(tag.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  // 5. extraEntries
  entries.push(...extraEntries);

  return entries;
}
