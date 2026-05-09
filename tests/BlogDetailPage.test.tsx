// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlogConfig, BlogDetail, BlogNav, Attachment } from '@withwiz/blog-core/types';

// ── next/link mock ──
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

// ── sessionStorage mock ──
const storage: Record<string, string> = {};
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  },
  writable: true,
});

import { BlogDetailPage as BlogDetailPageComponent } from '@withwiz/blog-core/components/public';

// ── 테스트 픽스처 ──

const baseConfig: BlogConfig = {
  categories: {
    NOTICE: {
      key: 'notice', main: '#1976d2', heroColor: '25,118,210',
      bgTint: '#e3f2fd', bgQuote: '#bbdefb', border: '#90caf9', divider: '#64b5f6', label: '공지사항',
    },
  },
  basePath: '/news',
  adminBasePath: '/admin/news',
  apiBasePath: '/api/news',
  adminApiBasePath: '/api/admin/news',
  modelName: 'news',
  uploadEndpoint: '/api/upload',
};

function makePost(overrides: Partial<BlogDetail> = {}): BlogDetail {
  return {
    id: '1',
    slug: 'test-post',
    category: 'NOTICE',
    title: '테스트 제목',
    excerpt: '발췌문 텍스트',
    coverImageUrl: 'https://example.com/cover.jpg',
    coverImageKey: 'covers/key1',
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: '2025-06-15T00:00:00.000Z',
    createdAt: '2025-06-15T00:00:00.000Z',
    updatedAt: '2025-06-15T00:00:00.000Z',
    content: '<p>본문 내용입니다</p>',
    attachments: [],
    authorId: 'author-1',
    ...overrides,
  };
}

const prevNav: BlogNav = { slug: 'prev-post', title: '이전 게시글' };
const nextNav: BlogNav = { slug: 'next-post', title: '다음 게시글' };

describe('BlogDetailPage 컴포넌트', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('제목, 콘텐츠, 카테고리를 렌더링한다', () => {
    render(
      <BlogDetailPageComponent post={makePost()} prev={null} next={null} config={baseConfig} />,
    );
    expect(screen.getByText('테스트 제목')).toBeDefined();
    expect(screen.getByText('공지사항')).toBeDefined();
  });

  it('커버 이미지가 있으면 렌더링한다', () => {
    const { container } = render(
      <BlogDetailPageComponent post={makePost()} prev={null} next={null} config={baseConfig} />,
    );
    const img = container.querySelector('.nbe-pv-fi img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/cover.jpg');
  });

  it('이전/다음 네비게이션 링크를 렌더링한다', () => {
    render(
      <BlogDetailPageComponent post={makePost()} prev={prevNav} next={nextNav} config={baseConfig} />,
    );
    expect(screen.getByText('이전 게시글')).toBeDefined();
    expect(screen.getByText('다음 게시글')).toBeDefined();
    // 링크 href 확인
    const prevLink = screen.getByText('이전 게시글').closest('a');
    expect(prevLink?.getAttribute('href')).toBe('/news/prev-post');
  });

  it('마운트 시 onViewCount를 호출한다', () => {
    const onViewCount = vi.fn();
    render(
      <BlogDetailPageComponent
        post={makePost()}
        prev={null}
        next={null}
        config={baseConfig}
        onViewCount={onViewCount}
      />,
    );
    expect(onViewCount).toHaveBeenCalledWith('test-post');
  });

  it('staticLinks=true일 때 onViewCount를 호출하지 않는다', () => {
    const onViewCount = vi.fn();
    render(
      <BlogDetailPageComponent
        post={makePost()}
        prev={null}
        next={null}
        config={baseConfig}
        staticLinks
        onViewCount={onViewCount}
      />,
    );
    expect(onViewCount).not.toHaveBeenCalled();
  });

  it('첨부파일 목록을 렌더링한다', () => {
    const attachments: Attachment[] = [
      { name: '보고서.pdf', url: 'https://example.com/f.pdf', key: 'k1', size: 2048, type: 'application/pdf' },
    ];
    render(
      <BlogDetailPageComponent
        post={makePost({ attachments, hasAttachments: true })}
        prev={null}
        next={null}
        config={baseConfig}
      />,
    );
    expect(screen.getByText('보고서.pdf')).toBeDefined();
    expect(screen.getByText('2.0KB')).toBeDefined();
  });

  it('imageUrlTransformer를 커버 이미지에 적용한다', () => {
    const transformer = vi.fn((url: string, size: string) => `${url}?w=${size}`);
    const { container } = render(
      <BlogDetailPageComponent
        post={makePost()}
        prev={null}
        next={null}
        config={baseConfig}
        imageUrlTransformer={transformer}
      />,
    );
    expect(transformer).toHaveBeenCalledWith('https://example.com/cover.jpg', 'lg');
    const img = container.querySelector('.nbe-pv-fi img');
    expect(img?.getAttribute('src')).toBe('https://example.com/cover.jpg?w=lg');
  });

  it('linkifyHtml이 콘텐츠 내 URL을 <a> 태그로 변환한다', () => {
    const post = makePost({ content: '<p>방문: https://example.com/page 참고</p>' });
    const { container } = render(
      <BlogDetailPageComponent post={post} prev={null} next={null} config={baseConfig} />,
    );
    const richContent = container.querySelector('.blog-rich-content');
    const link = richContent?.querySelector('a[href="https://example.com/page"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('staticLinks=true일 때 article만 반환한다 (main 래퍼 없음)', () => {
    const { container } = render(
      <BlogDetailPageComponent
        post={makePost()}
        prev={prevNav}
        next={nextNav}
        config={baseConfig}
        staticLinks
      />,
    );
    expect(container.querySelector('main.blog-page')).toBeNull();
    expect(container.querySelector('article.blog-detail-article')).not.toBeNull();
  });

  it('staticLinks=true일 때 네비게이션을 span으로 렌더링한다', () => {
    render(
      <BlogDetailPageComponent
        post={makePost()}
        prev={prevNav}
        next={nextNav}
        config={baseConfig}
        staticLinks
      />,
    );
    const prevSpan = screen.getByText('이전 게시글');
    expect(prevSpan.tagName).toBe('SPAN');
  });
});
