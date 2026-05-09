// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BlogConfig, BlogListItem, PaginatedResult } from '@withwiz/blog-core/types';

// ── next/link, next/navigation mock ──
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/news',
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

import { BlogListPage } from '@withwiz/blog-core/components/public';

// ── 테스트 픽스처 ──

const baseConfig: BlogConfig = {
  categories: {
    NOTICE: {
      key: 'notice', main: '#1976d2', heroColor: '25,118,210',
      bgTint: '#e3f2fd', bgQuote: '#bbdefb', border: '#90caf9', divider: '#64b5f6', label: '공지사항',
    },
    EVENT: {
      key: 'event', main: '#388e3c', heroColor: '56,142,60',
      bgTint: '#e8f5e9', bgQuote: '#c8e6c9', border: '#a5d6a7', divider: '#81c784', label: '행사',
    },
  },
  basePath: '/news',
  adminBasePath: '/admin/news',
  apiBasePath: '/api/news',
  adminApiBasePath: '/api/admin/news',
  modelName: 'news',
  uploadEndpoint: '/api/upload',
};

function makeItem(overrides: Partial<BlogListItem> = {}): BlogListItem {
  return {
    id: '1',
    slug: 'test-post',
    category: 'NOTICE',
    title: '테스트 게시글',
    excerpt: '발췌문',
    coverImageUrl: 'https://example.com/img.jpg',
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: '2025-06-15T00:00:00.000Z',
    createdAt: '2025-06-15T00:00:00.000Z',
    updatedAt: '2025-06-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeResult(items: BlogListItem[], page = 1, totalPages = 1): PaginatedResult<BlogListItem> {
  return {
    items,
    pagination: {
      page,
      pageSize: 12,
      total: items.length * totalPages,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

describe('BlogListPage 컴포넌트', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('result.items 목록을 렌더링한다', () => {
    const items = [
      makeItem({ id: '1', slug: 'post-1', title: '첫 번째 글' }),
      makeItem({ id: '2', slug: 'post-2', title: '두 번째 글' }),
    ];
    render(<BlogListPage result={makeResult(items)} config={baseConfig} />);
    expect(screen.getByText('첫 번째 글')).toBeDefined();
    expect(screen.getByText('두 번째 글')).toBeDefined();
  });

  it('아이템이 없을 때 빈 그리드를 렌더링한다', () => {
    const { container } = render(<BlogListPage result={makeResult([])} config={baseConfig} />);
    const grid = container.querySelector('.blog-grid');
    expect(grid).toBeDefined();
    expect(grid!.children.length).toBe(0);
  });

  it('config.categories 기반 카테고리 탭을 렌더링한다', () => {
    render(<BlogListPage result={makeResult([])} config={baseConfig} />);
    // "전체"는 히어로 섹션과 탭 버튼 양쪽에 표시됨
    expect(screen.getAllByText('전체').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('공지사항')).toBeDefined();
    expect(screen.getByText('행사')).toBeDefined();
  });

  it('카테고리 탭 클릭 시 onCategoryChange를 호출한다', () => {
    const onChange = vi.fn();
    render(
      <BlogListPage result={makeResult([])} config={baseConfig} onCategoryChange={onChange} />,
    );
    fireEvent.click(screen.getByText('공지사항'));
    expect(onChange).toHaveBeenCalledWith('NOTICE');
  });

  it('여러 페이지일 때 페이지네이션을 렌더링한다', () => {
    render(
      <BlogListPage result={makeResult([makeItem()], 1, 3)} config={baseConfig} currentPage={1} />,
    );
    expect(screen.getByText('1 / 3')).toBeDefined();
  });

  it('페이지 버튼 클릭 시 onPageChange를 호출한다', () => {
    const onPage = vi.fn();
    render(
      <BlogListPage
        result={makeResult([makeItem()], 2, 3)}
        config={baseConfig}
        currentPage={2}
        onPageChange={onPage}
      />,
    );
    // "다음 >" 버튼 클릭
    const nextBtn = screen.getByText((content) => content.includes('다음'));
    fireEvent.click(nextBtn);
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it('imageUrlTransformer를 커버 이미지에 적용한다', () => {
    const transformer = vi.fn((url: string, size: string) => `${url}?s=${size}`);
    const items = [makeItem({ coverImageUrl: 'https://example.com/pic.jpg' })];
    const { container } = render(
      <BlogListPage result={makeResult(items)} config={baseConfig} imageUrlTransformer={transformer} />,
    );
    expect(transformer).toHaveBeenCalledWith('https://example.com/pic.jpg', 'md');
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/pic.jpg?s=md');
  });

  it('날짜를 YYYY.MM.DD 형식으로 포맷한다', () => {
    const items = [makeItem({ publishedAt: '2025-03-05T00:00:00.000Z' })];
    render(<BlogListPage result={makeResult(items)} config={baseConfig} />);
    expect(screen.getByText('2025.03.05')).toBeDefined();
  });

  it('단일 페이지일 때 페이지네이션을 렌더링하지 않는다', () => {
    const { container } = render(
      <BlogListPage result={makeResult([makeItem()], 1, 1)} config={baseConfig} />,
    );
    expect(container.querySelector('.blog-pagination')).toBeNull();
  });
});
