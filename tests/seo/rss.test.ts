/**
 * createRSSFeed 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { createRSSFeed, escapeXml, toRfc822 } from '@withwiz/blog-core/seo';
import type { BlogListItem, Tag } from '@withwiz/blog-core';

function makePost(overrides: Partial<BlogListItem> = {}): BlogListItem {
  return {
    id: 'p1',
    slug: 'hello',
    category: 'notice',
    title: '안녕',
    excerpt: '요약',
    coverImageUrl: null,
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeBlogService(posts: BlogListItem[]) {
  return {
    listPublished: vi.fn(async () => ({
      items: posts,
      pagination: {
        page: 1,
        pageSize: posts.length || 20,
        total: posts.length,
        totalPages: 1,
        hasMore: false,
      },
    })),
  } as any;
}

describe('escapeXml', () => {
  it('XML 특수 문자를 모두 escape 한다', () => {
    expect(escapeXml(`<a href="x">&'it</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;it&lt;/a&gt;',
    );
  });
});

describe('toRfc822', () => {
  it('Date 객체를 RFC 822(UTC) 문자열로 변환한다', () => {
    const s = toRfc822(new Date('2026-04-13T10:20:30.000Z'));
    expect(s).toMatch(/^Mon, 13 Apr 2026 10:20:30 GMT$/);
  });
});

describe('createRSSFeed', () => {
  it('기본 RSS 2.0 XML을 생성한다', async () => {
    const posts = [makePost()];
    const xml = await createRSSFeed({
      blogService: makeBlogService(posts),
      siteUrl: 'https://example.com',
      basePath: '/blog',
      feedTitle: '샤하르 블로그',
      feedDescription: '발레단 블로그',
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('<title>샤하르 블로그</title>');
    expect(xml).toContain('<link>https://example.com/blog</link>');
    expect(xml).toContain('<language>ko-kr</language>');
    expect(xml).toContain('<item>');
    expect(xml).toContain('<title>안녕</title>');
    expect(xml).toContain(
      '<guid isPermaLink="true">https://example.com/blog/hello</guid>',
    );
  });

  it('XML 특수 문자를 escape한다', async () => {
    const post = makePost({
      title: '<script>alert("xss")</script>',
      excerpt: 'a & b',
    });
    const xml = await createRSSFeed({
      blogService: makeBlogService([post]),
      siteUrl: 'https://example.com',
      basePath: '/blog',
      feedTitle: 'T & T',
      feedDescription: 'D',
    });
    expect(xml).toContain('&lt;script&gt;');
    expect(xml).toContain('&quot;xss&quot;');
    expect(xml).toContain('a &amp; b');
    expect(xml).toContain('<title>T &amp; T</title>');
    expect(xml).not.toContain('<script>alert');
  });

  it('pubDate는 RFC 822 형식이다', async () => {
    const post = makePost({ publishedAt: new Date('2026-04-01T00:00:00.000Z') });
    const xml = await createRSSFeed({
      blogService: makeBlogService([post]),
      siteUrl: 'https://example.com',
      basePath: '/blog',
      feedTitle: 'F',
      feedDescription: 'D',
    });
    expect(xml).toMatch(/<pubDate>Wed, 01 Apr 2026 00:00:00 GMT<\/pubDate>/);
  });

  it('빈 피드도 유효한 XML을 반환한다', async () => {
    const xml = await createRSSFeed({
      blogService: makeBlogService([]),
      siteUrl: 'https://example.com',
      basePath: '/blog',
      feedTitle: 'F',
      feedDescription: 'D',
    });
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</channel>');
    expect(xml).not.toContain('<item>');
  });

  it('limit 파라미터를 blogService.listPublished에 전달한다', async () => {
    const blogService = makeBlogService([]);
    await createRSSFeed({
      blogService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
      feedTitle: 'F',
      feedDescription: 'D',
      limit: 5,
    });
    expect(blogService.listPublished).toHaveBeenCalledWith({ page: 1, limit: 5 });
  });

  it('태그가 있으면 <category> 요소로 포함한다', async () => {
    const tags: Tag[] = [
      { id: 't1', slug: 'ballet', name: '발레', createdAt: new Date(), updatedAt: new Date() },
    ];
    const post = makePost({ tags });
    const xml = await createRSSFeed({
      blogService: makeBlogService([post]),
      siteUrl: 'https://example.com',
      basePath: '/blog',
      feedTitle: 'F',
      feedDescription: 'D',
    });
    expect(xml).toContain('<category>발레</category>');
  });
});
