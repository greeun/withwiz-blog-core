# 08. SEO 유틸리티

`@withwiz/blog-core/seo`는 Next.js Metadata, Sitemap, RSS, JSON-LD, OG 이미지에 필요한
순수 함수들을 제공한다. 모든 함수는 외부 의존 없이 동작한다.

## `generateMetadata` — 상세 페이지 Metadata

```ts
import { generateMetadata } from '@withwiz/blog-core';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await blogService.getPublishedBySlug(params.slug);
  if (!post) return {};

  return generateMetadata({
    post,
    config: blogConfig,                  // BlogConfig (카테고리/basePath 등)
    siteName: 'DTS Ballet',
    siteUrl: 'https://dts-ballet.com',
    defaultOgImage: 'https://dts-ballet.com/og-default.png',
    locale: 'ko_KR',
    twitter: { handle: '@dtsballet' },
    authorName: post.authorId,
  });
}
```

반환 타입(`Metadata`)은 Next.js `next/Metadata`와 호환된다
(`openGraph`, `twitter`, `alternates.canonical`, `keywords` 포함).

## `generateListMetadata` — 목록/태그/카테고리 페이지

```ts
import { generateListMetadata } from '@withwiz/blog-core';

export async function generateMetadata() {
  return generateListMetadata({
    config: blogConfig,
    siteName: 'DTS Ballet',
    siteUrl: 'https://dts-ballet.com',
    title: '공연 소식',
    description: '발레단 공연 및 뉴스 모음',
    path: '/blog',
  });
}
```

## `createSitemap` — sitemap.xml 엔트리 생성

```ts
// app/sitemap.ts
import { createSitemap } from '@withwiz/blog-core';
import { blogService } from '@/lib/services/blog';

export default async function sitemap() {
  return createSitemap({
    siteUrl: 'https://dts-ballet.com',
    fetchPosts: async () => {
      const { items } = await blogService.listAll({ page: 1, limit: 1000, published: 'true' });
      return items;
    },
    basePath: '/blog',
    staticEntries: [
      { url: '/', changeFrequency: 'daily', priority: 1.0 },
      { url: '/about', changeFrequency: 'monthly', priority: 0.5 },
    ],
  });
}
```

반환은 `SitemapEntry[]`로, Next.js App Router의 `sitemap.ts`가 기대하는 형식.

## `createRSSFeed` — RSS 2.0 XML

```ts
// app/feed.xml/route.ts
import { createRSSFeed } from '@withwiz/blog-core';
import { blogService } from '@/lib/services/blog';

export async function GET() {
  const { items } = await blogService.listPublished({ page: 1, limit: 30 });
  const xml = await createRSSFeed({
    siteName: 'DTS Ballet',
    siteUrl: 'https://dts-ballet.com',
    description: '발레단 최신 소식',
    language: 'ko',
    basePath: '/blog',
    items,
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
```

XML 특수 문자는 `escapeXml`로 자동 이스케이프되며, 날짜는 `toRfc822`로 포맷된다.

## `generateJsonLd` — BlogPosting 구조화 데이터

```tsx
import { generateJsonLd } from '@withwiz/blog-core';

export default async function BlogDetailPage({ params }) {
  const post = await blogService.getPublishedBySlug(params.slug);
  if (!post) return notFound();

  const jsonLd = generateJsonLd({
    post,
    config: blogConfig,
    siteName: 'DTS Ballet',
    siteUrl: 'https://dts-ballet.com',
    authorName: '사하르 발레단',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 본문 */}
    </>
  );
}
```

## `generateBreadcrumbJsonLd` — 빵 부스러기

```ts
import { generateBreadcrumbJsonLd } from '@withwiz/blog-core';

const bc = generateBreadcrumbJsonLd([
  { name: '홈', url: 'https://dts-ballet.com' },
  { name: '소식', url: 'https://dts-ballet.com/blog' },
  { name: post.title, url: `https://dts-ballet.com/blog/${post.slug}` },
]);
```

## `prepareOGImageData` + Next.js opengraph-image.tsx

`prepareOGImageData`는 OG 이미지 렌더링에 필요한 데이터(제목/카테고리/테마/커버)를 뽑아준다.
실제 이미지 생성은 Next.js의 `ImageResponse`로 호스트가 수행한다.

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { prepareOGImageData } from '@withwiz/blog-core';
import { blogService } from '@/lib/services/blog';
import { blogConfig } from '@/lib/config';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await blogService.getPublishedBySlug(params.slug);
  if (!post) return new Response('Not found', { status: 404 });

  const og = prepareOGImageData(post, blogConfig);
  const bg = og.categoryTheme?.bgColor ?? '#0A0A0A';
  const fg = og.categoryTheme?.textColor ?? '#FEFEFE';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', padding: 80,
        background: bg, color: fg, fontFamily: 'Inter',
      }}>
        {og.category && (
          <div style={{ fontSize: 32, opacity: 0.8 }}>{og.category}</div>
        )}
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 20 }}>
          {og.title}
        </div>
      </div>
    ),
    size,
  );
}
```

> **주의**: `ImageResponse`는 Edge Runtime에서만 동작한다. `runtime = 'edge'` 지정을 잊지 말 것.

## BlogConfig와 카테고리 테마

Metadata/JSON-LD/OG 이미지는 모두 `BlogConfig`를 받는다.

```ts
export const blogConfig = {
  basePath: '/blog',
  adminBasePath: '/admin/blog',
  categories: {
    notice: { key: 'notice', label: '공지', bgColor: '#121212', textColor: '#FEFEFE' },
    performance: { key: 'performance', label: '공연', bgColor: '#D4AF37', textColor: '#121212' },
  },
};
```

## 흔한 실수

> **주의**: `siteUrl`은 **끝에 슬래시 없이** 지정. 내부 함수가 정규화하지만, 혼란을 줄이려면
> `'https://example.com'` 형태를 사용하자.

> **주의**: `generateMetadata`가 반환하는 `openGraph.images`는 절대 URL로 변환된다.
> 로컬 개발에서 `http://localhost:3000`을 넘기면 OG 검증기(Facebook, X)가 실패한다.

## 관련 문서

- [README.md](./README.md) — 전체 API 목록
- [03-blog-service.md](./03-blog-service.md) — Metadata에 넘기는 `BlogDetail`
