/**
 * prepareOGImageData 테스트
 */
import { describe, it, expect } from 'vitest';
import { prepareOGImageData } from '@withwiz/blog-core/seo';
import type { BlogDetail, BlogConfig } from '@withwiz/blog-core';

const theme = {
  key: 'notice',
  main: '#000',
  heroColor: '0,0,0',
  bgTint: '#111',
  bgQuote: '#222',
  border: '#333',
  divider: '#444',
  label: '공지사항',
};

const mockConfig: BlogConfig = {
  categories: { notice: theme },
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
    slug: 's',
    category: 'notice',
    title: '제목',
    excerpt: null,
    coverImageUrl: null,
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    content: '',
    coverImageKey: null,
    attachments: [],
    authorId: 'u1',
    ...overrides,
  };
}

describe('prepareOGImageData', () => {
  it('커버 이미지가 없는 경우 coverImageUrl은 undefined', () => {
    const data = prepareOGImageData(makePost(), mockConfig);
    expect(data.title).toBe('제목');
    expect(data.coverImageUrl).toBeUndefined();
    expect(data.category).toBe('공지사항');
    expect(data.categoryTheme).toBe(theme);
  });

  it('커버 이미지가 있으면 coverImageUrl을 포함한다', () => {
    const data = prepareOGImageData(
      makePost({ coverImageUrl: 'https://cdn.example.com/c.jpg' }),
      mockConfig,
    );
    expect(data.coverImageUrl).toBe('https://cdn.example.com/c.jpg');
  });

  it('카테고리 테마가 없으면 category 원본 문자열을 사용한다', () => {
    const data = prepareOGImageData(makePost({ category: 'unknown' }), mockConfig);
    expect(data.category).toBe('unknown');
    expect(data.categoryTheme).toBeUndefined();
  });
});
