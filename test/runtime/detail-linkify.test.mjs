/**
 * 공개 상세 페이지 본문 URL 링크 변환(linkifyHtml) 속성 주입 회귀 테스트
 *
 * linkifyHtml 은 내부 함수라 공개 엔트리로 노출하지 않는다. dist 를 대상으로 하는 테스트
 * 구조를 유지하기 위해 이 함수의 유일한 사용처인 BlogDetailPage 를 렌더링해 본문 출력을
 * 검증한다. 판정은 helpers/html-inspect.mjs 의 토큰화 결과로 한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlogDetailPage } from '../../dist/components/public/index.mjs';
import { findUnsafe, startTags, attrOf, attrNames } from './helpers/html-inspect.mjs';

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

function renderContent(content) {
  const html = renderToStaticMarkup(
    createElement(BlogDetailPage, {
      post: {
        id: 'p1',
        slug: 'first-post',
        category: 'news',
        title: '첫 번째 글',
        excerpt: null,
        // 본문 영역만 잘라내기 위한 표식 주석
        content: `<!--BEGIN-->${content}<!--END-->`,
        editorType: 'rich',
        coverImageUrl: null,
        coverImageKey: null,
        attachments: [],
        hasAttachments: false,
        authorId: 'a1',
        featured: false,
        published: true,
        publishedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      prev: null,
      next: null,
      categories,
      basePath: '/news',
      staticLinks: true,
    }),
  );
  const m = html.match(/<div class="blog-rich-content"[^>]*><!--BEGIN-->([\s\S]*)<!--END--><\/div>/);
  assert.ok(m, `본문 영역을 찾지 못함: ${html}`);
  return m[1];
}

const linksTo = (html, prefix) =>
  startTags(html).filter((t) => t.name === 'a' && (attrOf(t, 'href') ?? '').startsWith(prefix));

test('href 의 큰따옴표를 이스케이프해 속성 주입을 막는다', () => {
  const out = renderContent('<p>https://x.com/"onmouseover="alert(1)</p>');
  assert.deepEqual(findUnsafe(out), [], out);
  const [link] = linksTo(out, 'https://x.com/');
  assert.ok(link, `링크 생성: ${out}`);
  assert.deepEqual(attrNames(link), ['href', 'target', 'rel']);
  assert.equal(attrOf(link, 'href'), 'https://x.com/"onmouseover="alert(1)');
  assert.match(out, /href="https:\/\/x\.com\/&quot;onmouseover=&quot;alert\(1\)"/);
  // 링크 텍스트는 그대로
  assert.match(out, />https:\/\/x\.com\/"onmouseover="alert\(1\)<\/a>/);
});

test('href 의 작은따옴표는 &#39; 로 이스케이프한다', () => {
  const out = renderContent("<p>https://x.com/'onmouseover='alert(1)</p>");
  const [link] = linksTo(out, 'https://x.com/');
  assert.deepEqual(attrNames(link), ['href', 'target', 'rel']);
  assert.match(out, /href="https:\/\/x\.com\/&#39;onmouseover=&#39;alert\(1\)"/);
  assert.match(out, />https:\/\/x\.com\/'onmouseover='alert\(1\)<\/a>/);
});

test('이미 인코딩된 &amp; 는 href·텍스트 모두 그대로 둔다', () => {
  const out = renderContent('<p>참고 https://x.com/?a=1&amp;b=2 끝</p>');
  assert.match(
    out,
    /<a href="https:\/\/x\.com\/\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">https:\/\/x\.com\/\?a=1&amp;b=2<\/a>/,
  );
});

test('따옴표 속성값 안의 > 뒤 URL 은 태그 안이므로 변환하지 않는다', () => {
  const content = '<p title="a > https://x.com/x/onmouseover=alert(1)//">t</p>';
  const out = renderContent(content);
  assert.deepEqual(findUnsafe(out), [], out);
  assert.equal(out, content);
});

test('기존 링크 안과 주석 안의 URL 은 변환하지 않는다', () => {
  const content =
    '<p><a href="https://ok.example/">https://ok.example/</a> <a>https://ok.example/b</a></p>' +
    '<!-- https://hidden.example/ -->';
  assert.equal(renderContent(content), content);
});
