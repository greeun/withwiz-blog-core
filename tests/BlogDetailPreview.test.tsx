// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlogConfig } from '@withwiz/blog-core/types';
import type { BlogFormData } from '@withwiz/blog-core/components/admin';

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

import { BlogDetailPreview } from '@withwiz/blog-core/components/admin';

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

function makeFormData(overrides: Partial<BlogFormData> = {}): BlogFormData {
  return {
    title: '미리보기 제목',
    slug: 'preview-slug',
    category: 'NOTICE',
    content: '<p>미리보기 본문</p>',
    excerpt: '미리보기 발췌',
    coverImageUrl: '',
    coverImageKey: '',
    attachments: [],
    featured: false,
    published: false,
    publishedAt: '',
    ctaEnabled: false,
    ctaMsg: '',
    ctaBtn: '',
    ctaUrl: '',
    ...overrides,
  };
}

describe('BlogDetailPreview 컴포넌트', () => {
  it('mock 포스트 데이터를 렌더링한다', () => {
    render(
      <BlogDetailPreview
        form={makeFormData()}
        isNew
        selectedId={null}
        config={baseConfig}
      />,
    );
    expect(screen.getByText('미리보기 제목')).toBeDefined();
  });

  it('카테고리 라벨을 표시한다', () => {
    render(
      <BlogDetailPreview
        form={makeFormData({ category: 'EVENT' })}
        isNew
        selectedId={null}
        config={baseConfig}
      />,
    );
    expect(screen.getByText('행사')).toBeDefined();
  });

  it('선택된 ID도 새 글도 아닌 경우 안내 메시지를 표시한다', () => {
    render(
      <BlogDetailPreview
        form={makeFormData()}
        isNew={false}
        selectedId={null}
        config={baseConfig}
      />,
    );
    expect(screen.getByText(/목록에서 글을 선택하면/)).toBeDefined();
  });

  it('기존 글 편집 시 (selectedId 있음) 미리보기를 표시한다', () => {
    render(
      <BlogDetailPreview
        form={makeFormData({ title: '편집 중인 글' })}
        isNew={false}
        selectedId="existing-id"
        config={baseConfig}
      />,
    );
    expect(screen.getByText('편집 중인 글')).toBeDefined();
  });

  it('발췌문(excerpt)을 렌더링한다', () => {
    render(
      <BlogDetailPreview
        form={makeFormData({ excerpt: '발췌문 표시 테스트' })}
        isNew
        selectedId={null}
        config={baseConfig}
      />,
    );
    expect(screen.getByText('발췌문 표시 테스트')).toBeDefined();
  });
});
