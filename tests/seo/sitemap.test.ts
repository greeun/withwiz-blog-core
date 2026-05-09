/**
 * createSitemap 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { createSitemap } from '@withwiz/blog-core/seo';
import type { BlogConfig, BlogListItem, Tag } from '@withwiz/blog-core';

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
    event: {
      key: 'event',
      main: '#111',
      heroColor: '0,0,0',
      bgTint: '#222',
      bgQuote: '#333',
      border: '#444',
      divider: '#555',
      label: '행사',
    },
  },
  basePath: '/blog',
  adminBasePath: '/admin/blog',
  apiBasePath: '/api/blog',
  adminApiBasePath: '/api/admin/blog',
  modelName: 'blogPost',
  uploadEndpoint: '/api/admin/blog/upload',
};

function makePost(slug: string, updatedAt: Date): BlogListItem {
  return {
    id: slug,
    slug,
    category: 'notice',
    title: slug,
    excerpt: null,
    coverImageUrl: null,
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: updatedAt,
    createdAt: updatedAt,
    updatedAt,
  };
}

function makeBlogService(allPosts: BlogListItem[], pageSize = 100) {
  return {
    listPublished: vi.fn(async (opts: { page: number; limit: number }) => {
      const total = allPosts.length;
      const totalPages = Math.max(1, Math.ceil(total / opts.limit));
      const start = (opts.page - 1) * opts.limit;
      const items = allPosts.slice(start, start + opts.limit);
      return {
        items,
        pagination: {
          page: opts.page,
          pageSize: opts.limit,
          total,
          totalPages,
          hasMore: opts.page < totalPages,
        },
      };
    }),
  } as any;
}

function makeTagService(tags: Tag[]) {
  return {
    listAll: vi.fn(async () => ({
      items: tags,
      pagination: { page: 1, pageSize: 100, total: tags.length, totalPages: 1, hasMore: false },
    })),
  } as any;
}

describe('createSitemap', () => {
  it('공개된 포스트가 없을 때도 목록 페이지는 포함한다', async () => {
    const blogService = makeBlogService([]);
    const entries = await createSitemap({
      blogService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
    });
    expect(entries.length).toBe(1);
    expect(entries[0].url).toBe('https://example.com/blog');
    expect(entries[0].priority).toBe(0.8);
  });

  it('각 공개 포스트마다 URL 엔트리를 포함한다', async () => {
    const posts = [
      makePost('hello', new Date('2026-04-01')),
      makePost('world', new Date('2026-04-02')),
    ];
    const blogService = makeBlogService(posts);
    const entries = await createSitemap({
      blogService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
    });
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://example.com/blog/hello');
    expect(urls).toContain('https://example.com/blog/world');
  });

  it('config.categories 제공 시 카테고리 페이지도 포함한다', async () => {
    const blogService = makeBlogService([]);
    const entries = await createSitemap({
      blogService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
      config: mockConfig,
    });
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://example.com/blog/category/notice');
    expect(urls).toContain('https://example.com/blog/category/event');
  });

  it('tagService 제공 시 태그 페이지도 포함한다', async () => {
    const blogService = makeBlogService([]);
    const tags: Tag[] = [
      { id: 't1', slug: 'ballet', name: '발레', createdAt: new Date(), updatedAt: new Date() },
    ];
    const tagService = makeTagService(tags);
    const entries = await createSitemap({
      blogService,
      tagService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
    });
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://example.com/blog/tag/ballet');
  });

  it('pageSize보다 큰 데이터도 모두 순회한다 (페이지네이션)', async () => {
    const posts = Array.from({ length: 55 }, (_, i) =>
      makePost(`post-${i}`, new Date('2026-04-01')),
    );
    const blogService = makeBlogService(posts);
    const entries = await createSitemap({
      blogService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
      pageSize: 20,
    });
    // 목록 1 + 포스트 55
    expect(entries.length).toBeGreaterThanOrEqual(56);
    expect(blogService.listPublished).toHaveBeenCalledTimes(3); // 20+20+15
  });

  it('extraEntries는 그대로 배열에 포함된다', async () => {
    const blogService = makeBlogService([]);
    const entries = await createSitemap({
      blogService,
      siteUrl: 'https://example.com',
      basePath: '/blog',
      extraEntries: [
        { url: 'https://example.com/about', lastModified: new Date(), priority: 0.3 },
      ],
    });
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://example.com/about');
  });
});
