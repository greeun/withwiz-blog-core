/**
 * generateJsonLd / generateBreadcrumbJsonLd 테스트
 */
import { describe, it, expect } from 'vitest';
import { generateJsonLd, generateBreadcrumbJsonLd } from '@withwiz/blog-core/seo';
import type { BlogDetail, BlogConfig, Tag } from '@withwiz/blog-core';

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
    title: '테스트',
    excerpt: '요약',
    coverImageUrl: null,
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-03-30T00:00:00.000Z'),
    updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    content: '',
    coverImageKey: null,
    attachments: [],
    authorId: 'u1',
    ...overrides,
  };
}

describe('generateJsonLd', () => {
  it('기본 BlogPosting 스키마를 반환한다', () => {
    const jsonLd = generateJsonLd({
      post: makePost(),
      config: mockConfig,
      siteUrl: 'https://example.com',
    });
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('BlogPosting');
    expect(jsonLd.headline).toBe('테스트');
    expect(jsonLd.description).toBe('요약');
    expect(jsonLd.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://example.com/blog/hello-world',
    });
    expect(jsonLd.datePublished).toBe('2026-04-01T00:00:00.000Z');
    expect(jsonLd.dateModified).toBe('2026-04-10T00:00:00.000Z');
  });

  it('authorName을 주면 author.Person 객체를 포함한다', () => {
    const jsonLd = generateJsonLd({
      post: makePost(),
      config: mockConfig,
      siteUrl: 'https://example.com',
      authorName: '홍길동',
    });
    expect(jsonLd.author).toEqual({ '@type': 'Person', name: '홍길동' });
  });

  it('organizationName, organizationLogo를 주면 publisher를 구성한다', () => {
    const jsonLd = generateJsonLd({
      post: makePost({ coverImageUrl: 'https://cdn.example.com/c.jpg' }),
      config: mockConfig,
      siteUrl: 'https://example.com',
      organizationName: '샤하르',
      organizationLogo: 'https://example.com/logo.png',
    });
    expect(jsonLd.publisher).toEqual({
      '@type': 'Organization',
      name: '샤하르',
      logo: {
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      },
    });
    expect(jsonLd.image).toEqual(['https://cdn.example.com/c.jpg']);
  });

  it('태그가 있으면 keywords를 쉼표 문자열로 포함한다', () => {
    const tags: Tag[] = [
      { id: 't1', slug: 'ballet', name: '발레', createdAt: new Date(), updatedAt: new Date() },
      { id: 't2', slug: 'art', name: '예술', createdAt: new Date(), updatedAt: new Date() },
    ];
    const jsonLd = generateJsonLd({
      post: makePost({ tags }),
      config: mockConfig,
      siteUrl: 'https://example.com',
    });
    expect(jsonLd.keywords).toBe('발레, 예술');
  });
});

describe('generateBreadcrumbJsonLd', () => {
  it('빵부스러기 JSON-LD를 생성한다', () => {
    const jsonLd = generateBreadcrumbJsonLd([
      { name: '홈', url: 'https://example.com' },
      { name: '블로그', url: 'https://example.com/blog' },
      { name: '테스트', url: 'https://example.com/blog/hello' },
    ]);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('BreadcrumbList');
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: '홈',
      item: 'https://example.com',
    });
    expect(items[2].position).toBe(3);
  });
});
