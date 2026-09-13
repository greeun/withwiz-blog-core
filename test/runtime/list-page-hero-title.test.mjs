import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlogListPage } from '../../dist/components/public/index.mjs';

// BlogListPage 목록 페이지 최상위 제목(h1) 회귀 가드 (WCAG 1.3.1, 2.4.6)

const categories = {
  news: {
    key: 'news',
    main: '#111111',
    heroColor: '#111111',
    bgTint: '#ffffff',
    bgQuote: '#ffffff',
    border: '#eeeeee',
    divider: '#eeeeee',
    label: '뉴스',
  },
};

const item = {
  id: 'p1',
  slug: 'first-post',
  category: 'news',
  title: '첫 번째 글',
  excerpt: '요약',
  coverImageUrl: null,
  hasAttachments: false,
  featured: false,
  published: true,
  publishedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function render(props = {}, items = []) {
  return renderToStaticMarkup(
    createElement(BlogListPage, {
      result: { items, total: items.length, page: 1, limit: 12, totalPages: 1 },
      categories,
      basePath: '/news',
      ...props,
    }),
  );
}

function h1Of(html) {
  return html.match(/<h1([^>]*)>([^<]*)<\/h1>/);
}

test('BlogListPage: heroTitle 을 h1 텍스트로 렌더링', () => {
  const m = h1Of(render({ heroTitle: '소식' }));
  assert.ok(m, 'h1 없음');
  assert.equal(m[2], '소식');
});

test('BlogListPage: heroTitle 생략 시 기본값 "Blog" 를 h1 으로 렌더링', () => {
  const m = h1Of(render());
  assert.ok(m, 'h1 없음');
  assert.equal(m[2], 'Blog');
});

test('BlogListPage: h1 에 호스트 덮어쓰기용 클래스 blog-public-list__title 설정', () => {
  const m = h1Of(render({ heroTitle: '소식' }));
  assert.ok(m, 'h1 없음');
  assert.match(m[1], /class="blog-public-list__title"/);
});

test('BlogListPage: h1 은 루트의 첫 자식이며 카테고리 탭보다 앞', () => {
  const html = render({ heroTitle: '소식' });
  const firstChild = html.match(/^<div class="blog-public-list"[^>]*><([a-z0-9]+)/);
  assert.ok(firstChild, '루트 요소 없음');
  assert.equal(firstChild[1], 'h1');
  const h1At = html.indexOf('<h1');
  const tabAt = html.indexOf('href="/news?category=news"');
  assert.ok(tabAt > 0, '카테고리 탭 없음');
  assert.ok(h1At < tabAt, 'h1 이 카테고리 탭 뒤에 있음');
});

test('BlogListPage: heroTitle 이 빈 문자열이면 h1 미렌더링', () => {
  const html = render({ heroTitle: '' });
  assert.equal(html.includes('<h1'), false);
});

test('BlogListPage: 제목 수준을 건너뛰지 않음 (h1 다음 항목 제목은 h2)', () => {
  const html = render({ heroTitle: '소식' }, [item]);
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((x) => Number(x[1]));
  assert.equal(levels[0], 1, `첫 제목이 h1 이 아님: ${levels}`);
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] <= levels[i - 1] + 1, `제목 수준 건너뜀: ${levels}`);
  }
  const card = html.match(/<h2([^>]*)>첫 번째 글<\/h2>/);
  assert.ok(card, '항목 제목 h2 없음');
  // 태그만 바꾸고 기존 카드 제목 시각 스타일은 유지
  assert.match(card[1], /font-size:16px/);
  assert.match(card[1], /font-weight:600/);
});
