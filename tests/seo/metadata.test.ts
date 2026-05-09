/**
 * generateMetadata / generateListMetadata 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  generateMetadata,
  generateListMetadata,
} from '@withwiz/blog-core/seo';
import type { BlogDetail, BlogConfig, Tag } from '@withwiz/blog-core';

// ── 테스트 fixture ──

const mockConfig: BlogConfig = {
  categories: {
    notice: {
      key: 'notice',
      main: '#000',
      heroColor: '0,0,0',
      bgTint: '#111',
      bgQuote: '#222',
      border: '#333',
      divider: '#444',
      label: '공지',
    },
  },
  basePath: '/blog',
  adminBasePath: '/admin/blog',
  apiBasePath: '/api/blog',
  adminApiBasePath: '/api/admin/blog',
  modelName: 'blogPost',
  uploadEndpoint: '/api/admin/blog/upload',
};

function makePost(overrides: Partial<BlogDetail> = {}): BlogDetail {
  return {
    id: 'p1',
    slug: 'hello-world',
    category: 'notice',
    title: '테스트 글',
    excerpt: '요약 설명',
    coverImageUrl: null,
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-03-30T00:00:00.000Z'),
    updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    content: '<p>본문</p>',
    coverImageKey: null,
    attachments: [],
    authorId: 'u1',
    ...overrides,
  };
}

describe('generateMetadata', () => {
  // SEO-M-01
  it('기본 필드(title, description, canonical)를 반환한다', () => {
    const post = makePost();
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
    });
    expect(m.title).toBe('테스트 글');
    expect(m.description).toBe('요약 설명');
    expect(m.alternates?.canonical).toBe('https://example.com/blog/hello-world');
  });

  // SEO-M-02
  it('siteUrl에 끝 슬래시가 있어도 정상 처리한다', () => {
    const post = makePost();
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com/',
    });
    expect(m.alternates?.canonical).toBe('https://example.com/blog/hello-world');
  });

  // SEO-M-03
  it('커버 이미지가 있을 때 openGraph.images와 twitter.images를 포함한다', () => {
    const post = makePost({ coverImageUrl: 'https://cdn.example.com/cover.jpg' });
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
    });
    expect(m.openGraph?.images?.[0]?.url).toBe('https://cdn.example.com/cover.jpg');
    expect(m.openGraph?.images?.[0]?.width).toBe(1200);
    expect(m.openGraph?.images?.[0]?.height).toBe(630);
    expect(m.twitter?.images?.[0]).toBe('https://cdn.example.com/cover.jpg');
  });

  // SEO-M-04
  it('커버 이미지가 없을 때 defaultOgImage를 사용한다', () => {
    const post = makePost({ coverImageUrl: null });
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
      defaultOgImage: 'https://example.com/og-default.png',
    });
    expect(m.openGraph?.images?.[0]?.url).toBe('https://example.com/og-default.png');
    expect(m.twitter?.images?.[0]).toBe('https://example.com/og-default.png');
  });

  // SEO-M-05
  it('excerpt가 null이면 description을 빈 문자열로 설정한다', () => {
    const post = makePost({ excerpt: null });
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
    });
    expect(m.description).toBe('');
    expect(m.openGraph?.description).toBe('');
  });

  // SEO-M-06
  it('태그가 있으면 keywords와 openGraph.tags에 반영한다', () => {
    const tags: Tag[] = [
      { id: 't1', slug: 'ballet', name: '발레', createdAt: new Date(), updatedAt: new Date() },
      { id: 't2', slug: 'art', name: '예술', createdAt: new Date(), updatedAt: new Date() },
    ];
    const post = makePost({ tags });
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
    });
    expect(m.keywords).toEqual(['발레', '예술']);
    expect(m.openGraph?.tags).toEqual(['발레', '예술']);
  });

  // SEO-M-07
  it('publishedAt, updatedAt을 ISO 문자열로 변환한다', () => {
    const post = makePost();
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
    });
    expect(m.openGraph?.publishedTime).toBe('2026-04-01T00:00:00.000Z');
    expect(m.openGraph?.modifiedTime).toBe('2026-04-10T00:00:00.000Z');
  });

  // SEO-M-08
  it('twitter.handle과 authorName을 지정하면 반영한다', () => {
    const post = makePost();
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
      twitter: { handle: '@shahar' },
      authorName: '홍길동',
      locale: 'ko_KR',
    });
    expect(m.twitter?.creator).toBe('@shahar');
    expect(m.authors?.[0]?.name).toBe('홍길동');
    expect(m.openGraph?.authors).toEqual(['홍길동']);
    expect(m.openGraph?.locale).toBe('ko_KR');
  });

  // SEO-M-09
  it('openGraph.type은 article로 설정된다', () => {
    const post = makePost();
    const m = generateMetadata({
      post,
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
    });
    expect(m.openGraph?.type).toBe('article');
    expect(m.twitter?.card).toBe('summary_large_image');
  });
});

describe('generateListMetadata', () => {
  it('목록 페이지용 메타데이터를 생성한다', () => {
    const m = generateListMetadata({
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
      description: '블로그 목록 페이지',
    });
    expect(m.title).toBe('샤하르');
    expect(m.description).toBe('블로그 목록 페이지');
    expect(m.alternates?.canonical).toBe('https://example.com/blog');
    expect(m.openGraph?.type).toBe('website');
  });

  it('path 오버라이드와 title 커스터마이즈를 지원한다', () => {
    const m = generateListMetadata({
      config: mockConfig,
      siteName: '샤하르',
      siteUrl: 'https://example.com',
      title: '태그: 발레',
      path: '/blog/tag/ballet',
    });
    expect(m.title).toBe('태그: 발레');
    expect(m.alternates?.canonical).toBe('https://example.com/blog/tag/ballet');
  });
});
