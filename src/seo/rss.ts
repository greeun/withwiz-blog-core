/**
 * RSS 2.0 피드 XML 생성 유틸리티.
 *
 * 순수 문자열 조립으로 XML을 생성한다. 외부 라이브러리 의존성 없음.
 * XML 특수 문자(< > & " ')는 반드시 escape 처리한다.
 */
import type { BlogListItem } from '../types/blog';

/** RSS 피드 아이템 (BlogListItem의 서브셋 + 태그) */
export interface RSSFeedItem {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  tags?: Array<{ name: string }>;
}

/** createRSSFeed 옵션 */
export interface RSSOptions {
  /** 피드에 포함할 포스트 목록 */
  posts: RSSFeedItem[];
  /** 사이트 루트 URL (예: https://example.com) */
  siteUrl: string;
  /** 블로그 경로 (예: '/blog') */
  basePath: string;
  /** 피드 제목 */
  feedTitle: string;
  /** 피드 설명 */
  feedDescription: string;
  /** 언어 코드 (기본 'ko-kr') */
  language?: string;
  /** 피드 자체의 피드 URL (기본: {siteUrl}{basePath}/rss.xml) */
  feedUrl?: string;
}

// ── XML escape 유틸 ──

/** XML 특수 문자 escape */
export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 822 날짜 포맷 (예: Thu, 13 Apr 2026 10:20:30 GMT) */
export function toRfc822(value: Date | string | null | undefined): string {
  const d = value ? (value instanceof Date ? value : new Date(value)) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return safe.toUTCString();
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

/**
 * RSS 2.0 XML 문자열을 생성한다.
 *
 * 각 item: title, link, guid, pubDate, description(excerpt), category(tag 목록).
 * 모든 텍스트 필드는 XML escape 처리된다.
 *
 * v1에서는 blogService를 직접 주입받아 내부에서 listPublished를 호출했으나,
 * v2에서는 순수 함수로 전환하여 호스트가 직접 데이터를 준비한다.
 */
export function createRSSFeed(options: RSSOptions): string {
  const {
    posts,
    siteUrl,
    basePath,
    feedTitle,
    feedDescription,
    language = 'ko-kr',
    feedUrl,
  } = options;

  const cleanSiteUrl = stripTrailingSlash(siteUrl);
  const listUrl = joinUrl(cleanSiteUrl, basePath);
  const selfUrl = feedUrl ?? joinUrl(cleanSiteUrl, basePath, 'rss.xml');

  const itemsXml = posts
    .map((post) => {
      const link = joinUrl(cleanSiteUrl, basePath, post.slug);
      const pubDate = toRfc822(post.publishedAt ?? post.createdAt);
      const description = post.excerpt ?? '';
      const tagLines = Array.isArray(post.tags)
        ? post.tags
            .map((t) => `      <category>${escapeXml(t.name)}</category>`)
            .join('\n')
        : '';

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(description)}</description>`,
        tagLines,
        '    </item>',
      ]
        .filter((line) => line !== '')
        .join('\n');
    })
    .join('\n');

  const lastBuildDate = toRfc822(new Date());

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(feedTitle)}</title>`,
    `    <link>${escapeXml(listUrl)}</link>`,
    `    <description>${escapeXml(feedDescription)}</description>`,
    `    <language>${escapeXml(language)}</language>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`,
    itemsXml,
    '  </channel>',
    '</rss>',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return xml;
}
