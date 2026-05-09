// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BlogConfig } from '@withwiz/blog-core/types';
import type { BlogItem } from '@withwiz/blog-core/components/admin';

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

import { BlogListPreview } from '@withwiz/blog-core/components/admin';

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
  pageSize: 2,
};

function makeItem(overrides: Partial<BlogItem> = {}): BlogItem {
  return {
    id: '1',
    slug: 'item-1',
    category: 'NOTICE',
    title: '항목 제목',
    excerpt: null,
    coverImageUrl: null,
    hasAttachments: false,
    featured: false,
    published: true,
    publishedAt: '2025-06-15T00:00:00.000Z',
    createdAt: '2025-06-15T00:00:00.000Z',
    updatedAt: '2025-06-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('BlogListPreview 컴포넌트', () => {
  const onSelectItem = vi.fn();

  beforeEach(() => {
    onSelectItem.mockClear();
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('목록 아이템을 미리보기 모드로 렌더링한다', () => {
    const items = [
      makeItem({ id: '1', slug: 'a', title: '글 A' }),
      makeItem({ id: '2', slug: 'b', title: '글 B' }),
    ];
    render(
      <BlogListPreview publishedItems={items} onSelectItem={onSelectItem} config={baseConfig} />,
    );
    expect(screen.getByText('글 A')).toBeDefined();
    expect(screen.getByText('글 B')).toBeDefined();
  });

  it('pageSize 기반 페이지네이션을 처리한다', () => {
    // pageSize=2, 3개 아이템 → 2 페이지
    const items = [
      makeItem({ id: '1', slug: 'a', title: 'A', publishedAt: '2025-06-17T00:00:00Z' }),
      makeItem({ id: '2', slug: 'b', title: 'B', publishedAt: '2025-06-16T00:00:00Z' }),
      makeItem({ id: '3', slug: 'c', title: 'C', publishedAt: '2025-06-15T00:00:00Z' }),
    ];
    render(
      <BlogListPreview publishedItems={items} onSelectItem={onSelectItem} config={baseConfig} />,
    );
    // 페이지네이션이 표시되어야 함
    expect(screen.getByText('1 / 2')).toBeDefined();
  });

  it('카테고리 탭으로 필터링한다', () => {
    const items = [
      makeItem({ id: '1', slug: 'a', title: '공지 글', category: 'NOTICE' }),
      makeItem({ id: '2', slug: 'b', title: '행사 글', category: 'EVENT' }),
    ];
    render(
      <BlogListPreview publishedItems={items} onSelectItem={onSelectItem} config={baseConfig} />,
    );
    // 기본 "전체" 상태 → 둘 다 보임
    expect(screen.getByText('공지 글')).toBeDefined();
    expect(screen.getByText('행사 글')).toBeDefined();

    // "행사" 카테고리 탭 클릭 (버튼 요소에서 찾기)
    const categoryTabs = screen.getAllByText('행사');
    const tabButton = categoryTabs.find(el => el.tagName === 'BUTTON');
    fireEvent.click(tabButton!);
    // 행사 글만 표시
    expect(screen.getByText('행사 글')).toBeDefined();
    expect(screen.queryByText('공지 글')).toBeNull();
  });
});
