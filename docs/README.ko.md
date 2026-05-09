# @withwiz/blog-core

> Next.js 15 + Prisma + PostgreSQL 기반 재사용 가능한 블로그/뉴스 코어 패키지

`@withwiz/blog-core`는 블로그 또는 뉴스 기능을 구현하는 데 필요한 도메인 로직(서비스),
Prisma 스키마 참조, SEO 유틸리티, Zod 검증 스키마, UI 컴포넌트를 한 곳에 모은 **독립 패키지**다.
호스트 프로젝트(Next.js 앱)는 Prisma 클라이언트와 설정만 주입하면 된다.

## 주요 특징

- **Prisma DI** -- 글로벌 `prisma` import 없음; 호스트가 주입 (`createBlogService(prisma, config)`)
- **모델명 유연성** -- `BlogPost`, `News`, `Article` 등 호스트 모델명을 `modelName`으로 지정
- **핵심 CRUD** + **태그(N:M)** + **댓글(트리, 모더레이션)** + **PostgreSQL FTS 검색** + **예약 발행**
- **SEO** -- `generateMetadata`, Sitemap, RSS 2.0, JSON-LD, OG 이미지 데이터 프리셋
- **UI 컴포넌트** -- Admin(블로그 매니저/에디터) + Public(목록/상세/태그 위젯/댓글)
- **Zod 검증** -- 포스트, 태그, 댓글용 스키마 팩토리 (한국어 에러 메시지 내장)
- **CSS 커스텀 프로퍼티** -- `--blog-*` 변수로 완전한 테마 커스터마이징
- **i18n** -- 한국어 기본 문자열 + `resolveI18n` 오버라이드 지원

## 목차

- [전제 조건](#전제-조건)
- [설치](#설치)
- [빠른 시작](#빠른-시작)
- [아키텍처 개요](#아키텍처-개요)
- [서비스](#서비스)
  - [BlogService](#blogservice)
  - [TagService](#tagservice)
  - [CommentService](#commentservice)
  - [SearchService](#searchservice)
  - [SchedulerService](#schedulerservice)
- [Prisma 스키마 통합](#prisma-스키마-통합)
- [SEO 유틸리티](#seo-유틸리티)
- [UI 컴포넌트](#ui-컴포넌트)
- [검증 스키마](#검증-스키마)
- [스타일링 & 테마](#스타일링--테마)
- [관련 패키지](#관련-패키지)
- [문서 가이드](#문서-가이드)

---

## 전제 조건

| 항목 | 최소 버전 | 비고 |
|---|---|---|
| Node.js | 18.18+ | Next.js 15 요구 사항 |
| Next.js | 14 이상 | App Router 기반 |
| Prisma | 5.x | `@prisma/client` + CLI |
| PostgreSQL | 13 이상 | `SearchService`(FTS) 사용 시 필수 |
| React | 18 이상 | 19 권장 |

> **주의:** `SearchService`는 PostgreSQL 전용이다. MySQL/SQLite에서는 검색 기능을 비활성화하고 `BlogService.listPublished({ search })`의 ILIKE 검색으로 대체해야 한다.

## 설치

### npm에서 설치

```bash
npm install @withwiz/blog-core
# 또는
pnpm add @withwiz/blog-core
```

### 모노레포 (file 참조)

```json
{
  "dependencies": {
    "@withwiz/blog-core": "file:./packages/blog-core"
  }
}
```

**Peer dependencies:** `react >=18`, `next >=14`, `@prisma/client >=5`, `zod >=3`

**선택적 peers:** `@withwiz/block-editor >=0.1.5`, `isomorphic-dompurify >=2`

## 빠른 시작

### 1. Prisma 스키마 준비

호스트 프로젝트의 `prisma/schema.prisma`에 블로그 모델을 추가한다. 상세는 [02-prisma-schema.md](./02-prisma-schema.md) 참조.

최소 예:

```prisma
model News {
  id            String   @id @default(cuid())
  slug          String   @unique
  category      String
  title         String
  content       String   @db.Text
  excerpt       String?
  coverImageUrl String?  @map("cover_image_url")
  coverImageKey String?  @map("cover_image_key")
  attachments   Json?    @default("[]")
  featured      Boolean  @default(false)
  published     Boolean  @default(false)
  publishedAt   DateTime? @map("published_at")
  authorId      String   @map("author_id")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([published, publishedAt(sort: Desc)])
  @@map("news")
}
```

### 2. 마이그레이션 실행

```bash
npx prisma migrate dev --name init_blog
npx prisma generate
```

### 3. BlogService 생성

```ts
// src/lib/services/blog.ts
import { PrismaClient } from '@prisma/client';
import { createBlogService, type BlogService } from '@withwiz/blog-core';

const prisma = new PrismaClient();

export const blogService: BlogService = createBlogService(prisma, {
  modelName: 'news',          // Prisma delegate 이름 (model News -> 'news')
  enableTags: true,           // 태그 관계 include
  enableR2Cleanup: false,     // R2 스토리지 사용 시 true
});
```

### 4. 첫 포스트 생성

```ts
const post = await blogService.create(
  {
    slug: 'hello-world',
    category: 'notice',
    title: '안녕하세요',
    content: '<p>첫 번째 글입니다.</p>',
    excerpt: '요약',
    published: true,
  },
  'user-id-123', // authorId
);
```

### 5. Next.js 라우트 연결

```ts
// app/api/blog/route.ts
import { blogService } from '@/lib/services/blog';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Math.min(Number(searchParams.get('limit') ?? 12), 100);

  const result = await blogService.listPublished({ page, limit });
  return Response.json(result);
}
```

---

## 아키텍처 개요

```
호스트 Next.js 앱
  |
  +-- PrismaClient + 설정 주입
  |
  +-- @withwiz/blog-core
       |
       +-- Services (BlogService, TagService, CommentService, SearchService, SchedulerService)
       +-- Validators (Zod 스키마)
       +-- SEO (Metadata, Sitemap, RSS, JSON-LD, OG)
       +-- UI Components (Admin + Public)
       +-- Presets (블록 에디터 설정)
       +-- i18n (한국어 기본 + 오버라이드)
       +-- Errors (도메인 에러 코드)
```

모든 서비스는 `PrismaClient` 인스턴스와 설정을 받는 팩토리 함수로 생성된다 -- 글로벌 상태 없음, 숨겨진 의존성 없음.

---

## 서비스

### BlogService

블로그 포스트의 CRUD, 공개 목록, 대시보드 통계를 제공하는 메인 서비스.

```ts
import { createBlogService } from '@withwiz/blog-core';

const blogService = createBlogService(prisma, {
  modelName: 'news',
  enableTags: true,
  enableR2Cleanup: false,
});
```

#### 설정 옵션

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `modelName` | `string` | -- (필수) | Prisma delegate 이름 (예: `'news'`, `'blogPost'`) |
| `enableTags` | `boolean` | `false` | 쿼리에 `tags` 관계를 include |
| `enableR2Cleanup` | `boolean` | `false` | 삭제/업데이트 시 R2 오브젝트 정리 |
| `r2Helpers` | `R2Helpers` | -- | R2 스토리지 헬퍼 (cleanup 활성화 시 필수) |
| `sanitizeContent` | `(html: string) => string` | 내장 새니타이저 | 사용자 정의 HTML 새니타이즈 함수 |

#### Public 메서드

```ts
blogService.listPublished({ page, limit, category?, search?, tagSlug?, tagSlugs? })
blogService.getPublishedBySlug(slug)
blogService.getFeatured(limit?)
blogService.getAdjacentPosts(currentId)
blogService.checkSlugAvailable(slug, excludeId?)
```

#### Admin 메서드

```ts
blogService.listAll({ page, limit, category?, published?, search?, sortBy? })
blogService.getById(id)
blogService.create(data, authorId)
blogService.update(id, data)
blogService.remove(id)
blogService.removeMany(ids)
blogService.togglePublish(id)
blogService.bulkUpdatePublished(ids, published)
blogService.bulkUpdateFeatured(ids, featured)
blogService.getDashboardStats()
```

#### 데이터 타입

```ts
interface BlogListItem {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  featured: boolean;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasAttachments: boolean;
  tags?: Tag[];   // enableTags=true일 때만
}

interface BlogDetail extends BlogListItem {
  content: string;
  coverImageKey: string | null;
  attachments: Attachment[];
  authorId: string;
}
```

### TagService

태그 CRUD, 태그 클라우드, 관련 글 기능.

```ts
import { createTagService } from '@withwiz/blog-core';

const tagService = createTagService(prisma, {
  modelName: 'tag',
  postModelName: 'news',       // 필수 -- 블로그 모델 delegate
  postTagModelName: 'postTag',
});
```

```ts
tagService.create({ slug, name, description? })
tagService.getById(id) / tagService.getBySlug(slug)
tagService.update(id, data)
tagService.remove(id)           // cascade로 PostTag까지 삭제
tagService.listAll({ page?, limit?, search? })
tagService.getTagCloud(limit?)  // 사용 빈도가 높은 태그 N개 (기본 30)
tagService.getPostsByTag(tagSlug, { page?, limit? })
tagService.getTagsByPost(postId)
tagService.getRelatedPosts(postId, limit?)  // 같은 태그를 공유하는 관련 글
```

### CommentService

트리 구조 댓글 + 상태 기반 모더레이션 + 허니팟 + 레이트 리밋.

```ts
import { createCommentService } from '@withwiz/blog-core';

const commentService = createCommentService(prisma, {
  modelName: 'comment',
  autoApprove: false,          // 기본 false -> 관리자 승인 필요
  requireLogin: false,         // 기본 false -> 게스트 허용
  maxDepth: 2,                 // 루트=1, 대댓글 1단계까지
  rateLimit: { maxPerHour: 5 },
  spamFilter: (content) => /viagra|casino/i.test(content),
});
```

| 설정 | 기본값 | 설명 |
|---|---|---|
| `autoApprove` | `false` | true면 생성 즉시 `APPROVED` |
| `requireLogin` | `false` | true면 `context.userId` 필수 |
| `maxDepth` | `2` | 중첩 최대 깊이 (루트=1) |
| `rateLimit.maxPerHour` | `5` | 동일 IP 1시간당 최대 |
| `spamFilter` | -- | 사용자 정의 스팸 탐지 함수 |

**댓글 상태:** `PENDING` -> `APPROVED` / `REJECTED` / `SPAM`

```ts
// Public
commentService.create(data, { userId?, ipHash? })
commentService.listByPost(postId, { includeReplies? })

// Admin
commentService.listAll({ page?, limit?, status?, postId? })
commentService.updateStatus(id, status)
commentService.bulkUpdateStatus(ids, status)
commentService.remove(id) / commentService.removeMany(ids)
commentService.getPendingCount()   // 배지용
```

#### 허니팟 + IP 해시

```ts
import { hashIp } from '@withwiz/blog-core';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const ipHash = hashIp(ip);
  const body = await req.json();
  await commentService.create(body, { ipHash, userId: session?.userId });
}
```

### SearchService

PostgreSQL tsvector + GIN 인덱스 + unaccent 기반 전문 검색.

```ts
import { createSearchService } from '@withwiz/blog-core';

const searchService = createSearchService(prisma, {
  postModelName: 'news',
  tableName: 'news',       // 실제 DB 테이블명 (raw SQL용)
  lang: 'simple',          // 한국어는 'simple' + unaccent 조합 권장
});
```

**필수 마이그레이션 SQL:**

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE news
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      unaccent(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_news_search_vector
  ON news USING GIN (search_vector);
```

```ts
searchService.search({ query, page?, limit?, category?, highlight? })
searchService.buildQuery(input)   // 안전한 tsquery 변환
```

`highlight: true`이면 `ts_headline` 결과가 `headline` 필드에 포함된다 (`<b>` 태그 포함 HTML).

### SchedulerService

외부 Cron 트리거와 연동하는 예약 발행.

```ts
import { createSchedulerService, createSchedulerRoutes } from '@withwiz/blog-core';

const schedulerService = createSchedulerService(prisma, { modelName: 'news' });

// Next.js 라우트 핸들러 팩토리
const routes = createSchedulerRoutes({
  schedulerService,
  cronSecret: process.env.CRON_SECRET!,
});

// app/api/cron/blog-publish/route.ts
export const GET = routes.publishScheduled.GET;
export const POST = routes.publishScheduled.POST;
```

요청은 `Authorization: Bearer <CRON_SECRET>` 헤더로 인증된다.

**지원 Cron 플랫폼:** node-cron, Docker crontab, GitHub Actions, AWS EventBridge, GCP Cloud Scheduler, Vercel Cron

예약 글 만들기:

```ts
await blogService.create(
  {
    slug: 'summer-2026',
    title: '여름 공연',
    content: '...',
    category: 'performance',
    published: false,                        // 아직 미공개
    publishedAt: new Date('2026-06-01T09:00:00+09:00'),  // 예약 시각
  },
  'author-id',
);
```

`publishedAt`이 미래 + `published=false` 조합이 **예약 상태**로 인식된다.

---

## Prisma 스키마 통합

`@withwiz/blog-core`는 자체 마이그레이션을 실행하지 않는다. 참조용 스키마는 `prisma/blog.prisma`에 있으며, 호스트가 이를 복사/각색하여 자신의 `schema.prisma`에 포함시킨다.

### 모델명 커스터마이즈

패키지는 어떤 모델명이든 지원한다. `BlogPost` 대신 `News`를 쓰려면:

1. Prisma 스키마에서 모델을 `News`로 정의
2. `@@map("news")`로 테이블명 매핑
3. 서비스 설정에서 `modelName: 'news'` 지정

### category 타입 전략

내부적으로 카테고리는 문자열로 처리한다. Prisma enum이든 문자열이든 호환된다:

```prisma
// 방법 A: enum
enum NewsCategory { notice performance media }

// 방법 B: 단순 문자열
model News { category String }
```

### 태그/댓글 없이 사용

태그나 댓글이 필요 없다면 `Tag`, `PostTag`, `Comment` 모델을 생략하고 해당 서비스를 생성하지 않으면 된다.

---

## SEO 유틸리티

모든 함수는 순수 함수이며 외부 의존 없이 동작한다. `@withwiz/blog-core` 또는 `@withwiz/blog-core/seo`에서 import.

| 함수 | 용도 |
|---|---|
| `generateMetadata(options)` | Next.js 호환 상세 페이지 Metadata |
| `generateListMetadata(options)` | 목록/태그/카테고리 페이지 Metadata |
| `createSitemap(options)` | Next.js `sitemap.ts`용 `SitemapEntry[]` |
| `createRSSFeed(options)` | RSS 2.0 XML 문자열 |
| `generateJsonLd(options)` | BlogPosting 구조화 데이터 |
| `generateBreadcrumbJsonLd(items)` | BreadcrumbList 구조화 데이터 |
| `prepareOGImageData(post, config)` | OG 이미지 렌더링용 데이터 |
| `escapeXml(str)` | XML 특수 문자 이스케이프 |
| `toRfc822(date)` | RFC 822 날짜 포맷 |

예 -- 상세 페이지 메타데이터:

```ts
import { generateMetadata } from '@withwiz/blog-core';

return generateMetadata({
  post,
  config: blogConfig,
  siteName: 'My Blog',
  siteUrl: 'https://example.com',
  locale: 'ko_KR',
});
```

예 -- RSS 피드:

```ts
// app/feed.xml/route.ts
import { createRSSFeed } from '@withwiz/blog-core';

export async function GET() {
  const { items } = await blogService.listPublished({ page: 1, limit: 30 });
  const xml = await createRSSFeed({
    siteName: 'My Blog',
    siteUrl: 'https://example.com',
    description: '최신 소식',
    language: 'ko',
    basePath: '/blog',
    items,
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
```

---

## UI 컴포넌트

### Admin 컴포넌트

`@withwiz/blog-core/components/admin`에서 import:

| 컴포넌트 | 설명 |
|---|---|
| `BlogManagerClient` | 검색/필터/일괄 작업/페이지네이션이 통합된 블로그 목록 |
| `BlogEditForm` | 블록 에디터 + 커버 이미지 + 첨부 + 태그가 포함된 생성/수정 폼 |
| `TagPicker` | 자동 완성 + 새 태그 생성이 가능한 다중 선택 위젯 |
| `CommentModerationPanel` | 상태 필터 + 일괄 승인/거부가 가능한 댓글 모더레이션 테이블 |

### Public 컴포넌트

`@withwiz/blog-core/components/public`에서 import:

| 컴포넌트 | 설명 |
|---|---|
| `BlogListPage` | 카테고리 탭, 검색, 태그 필터, 페이지네이션이 포함된 공개 목록 |
| `BlogDetailPage` | 커버, 본문, 첨부 다운로드, 이전/다음 내비게이션, 댓글 영역 슬롯 |
| `TagBadge` | 단일 태그 배지 |
| `TagCloud` | 태그 클라우드 위젯 |
| `CommentList` | 트리 구조 댓글 표시 |
| `CommentForm` | 허니팟 내장 댓글 작성 폼 |

### 스타일

```ts
import '@withwiz/blog-core/styles/public';        // 퍼블릭 페이지
import '@withwiz/blog-core/styles/admin';          // 관리자 페이지
import '@withwiz/blog-core/styles/block-editor';   // 블록 에디터
```

### 클라이언트/서버 경계

| 컴포넌트 | 경계 |
|---|---|
| `BlogManagerClient` | `"use client"` |
| `BlogEditForm` | `"use client"` |
| `TagPicker` | `"use client"` |
| `CommentModerationPanel` | `"use client"` |
| `CommentForm` | `"use client"` |
| `BlogListPage` | 서버 컴포넌트 OK |
| `BlogDetailPage` | 서버 컴포넌트 OK |
| `CommentList` | 서버 또는 클라이언트 |

### 사용 예

```tsx
// 관리자 블로그 목록
'use client';
import { BlogManagerClient } from '@withwiz/blog-core/components/admin';

export default function AdminBlogPage() {
  return (
    <BlogManagerClient
      apiBasePath="/api/admin/blog"
      blogConfig={blogConfig}
    />
  );
}
```

```tsx
// 공개 목록 페이지
import { BlogListPage } from '@withwiz/blog-core/components/public';

export default async function BlogPage({ searchParams }) {
  const data = await blogService.listPublished({
    page: Number(searchParams.page ?? 1),
    limit: 12,
    category: searchParams.category,
  });
  return <BlogListPage data={data} blogConfig={blogConfig} basePath="/blog" />;
}
```

---

## 검증 스키마

모든 Zod 스키마는 `@withwiz/blog-core` 또는 `@withwiz/blog-core/validators`에서 사용 가능.

| 스키마 | 용도 |
|---|---|
| `slugSchema` | URL-safe slug (소문자+영숫자+하이픈) |
| `optionalUrlSchema` | 안전한 URL (`javascript:`, `data:`, `file:` 차단) |
| `CreateBlogPostSchema` | 글 생성 |
| `UpdateBlogPostSchema` | 글 수정 (partial) |
| `BulkUpdateSchema` | 일괄 작업 |
| `CreateTagSchema` | 태그 생성 |
| `UpdateTagSchema` | 태그 수정 |
| `CreateCommentSchema` | 댓글 생성 (honeypot 포함) |
| `UpdateCommentStatusSchema` | 댓글 상태 변경 |

### 스키마 팩토리

팩토리로 제약 조건 커스터마이즈:

```ts
import { createBlogSchemas } from '@withwiz/blog-core';

const { CreateBlogPostSchema, UpdateBlogPostSchema } = createBlogSchemas({
  maxAttachments: 10,
});
```

### API 라우트에서 사용

```ts
import { CreateBlogPostSchema } from '@withwiz/blog-core';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateBlogPostSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const post = await blogService.create(parsed.data, session.userId);
  return Response.json(post, { status: 201 });
}
```

### React Hook Form 연동

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateBlogPostSchema, type CreateBlogPostData } from '@withwiz/blog-core';

const form = useForm<CreateBlogPostData>({
  resolver: zodResolver(CreateBlogPostSchema),
});
```

---

## 스타일링 & 테마

모든 스타일은 CSS 커스텀 프로퍼티(`--blog-*`)를 사용하는 일반 CSS다. 호스트 프로젝트의 `globals.css`에서 오버라이드:

```css
:root {
  --blog-color-accent: #ff4081;
  --blog-color-card-bg: #fffefa;
  --blog-font-heading: "Playfair Display", serif;
}
```

### 다크 모드

```css
@media (prefers-color-scheme: dark) {
  :root {
    --blog-color-bg: #0a0a0a;
    --blog-color-text: #fefefe;
    --blog-color-card-bg: #1a1a1a;
    --blog-color-border: #2a2a2a;
  }
}
```

### 폰트 교체

```css
:root {
  --blog-font-heading: "Bodoni Moda", serif;
  --blog-font-body: "Pretendard", sans-serif;
  --blog-font-korean: "Pretendard", sans-serif;
}
```

전체 CSS 변수 목록은 [11-styling.md](./11-styling.md) 참조.

---

## 관련 패키지

| 패키지 | 설명 |
|---|---|
| `@withwiz/blog-system` | blog-core 기반의 단일/멀티 테넌트 SaaS 블로그 시스템 |
| `@withwiz/toolkit` | 미들웨어, 인증, 캐시, 로거 (peer) |
| `@withwiz/block-editor` | 블록 기반 리치 텍스트 에디터 (선택적 peer) |

---

## 문서 가이드

| 문서 | 내용 |
|---|---|
| [01-getting-started.md](./01-getting-started.md) | 전제 조건, 설치, 첫 글 생성 예제 |
| [02-prisma-schema.md](./02-prisma-schema.md) | Prisma 모델 통합, `@@map`, 모델명 매핑 |
| [03-blog-service.md](./03-blog-service.md) | `createBlogService` API 전체 레퍼런스 |
| [04-tags.md](./04-tags.md) | 태그 CRUD, 관련 글, 태그 클라우드 |
| [05-comments.md](./05-comments.md) | 댓글 트리, 모더레이션, 허니팟/레이트 리밋 |
| [06-search.md](./06-search.md) | PostgreSQL FTS(tsvector/GIN/unaccent) 설정 |
| [07-scheduler.md](./07-scheduler.md) | 예약 발행, 크로스 플랫폼 Cron 연동 |
| [08-seo.md](./08-seo.md) | Metadata/Sitemap/RSS/JSON-LD/OG |
| [09-components.md](./09-components.md) | Admin/Public UI 컴포넌트 |
| [10-validators.md](./10-validators.md) | Zod 스키마 및 커스텀 확장 |
| [11-styling.md](./11-styling.md) | CSS 변수 및 테마 가이드 |

## 라이선스

MIT
