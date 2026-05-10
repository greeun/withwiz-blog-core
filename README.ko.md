# blog-core-v2

> `npm install blog-core-v2` 한 줄로 Next.js App Router 프로젝트에 포스트 CRUD, 태그, 댓글, 전문 검색, 예약 발행, SEO를 모두 갖춘 완결된 블로그를 즉시 추가할 수 있는 독립 패키지.

[English](./README.md)

## 주요 기능

- **포스트 CRUD** — 생성, 목록/상세 조회, 수정, 삭제, slug 자동 생성, 일괄 작업
- **태그 시스템** — N:M 관계, 태그 클라우드, 태그별 필터링 (토글 가능)
- **댓글 시스템** — 대댓글, 허니팟 스팸 방지, IP 레이트 리밋, 모더레이션 (토글 가능)
- **전문 검색** — PostgreSQL tsvector 기반 Full-Text Search (토글 가능)
- **예약 발행** — 미래 발행일시 설정, 외부 Cron 연동 (토글 가능)
- **SEO** — Next.js Metadata, JSON-LD, RSS 피드, 사이트맵, OG 이미지
- **i18n** — 200+ 키의 한국어 기본값, 부분 오버라이드 가능
- **기본 관리 UI** — 글 목록, 편집 폼, 대시보드, 태그 피커, 댓글 모더레이션
- **공개 UI** — 글 목록, 상세, 댓글, 태그 클라우드
- **Block Editor 통합** — `@withwiz/block-editor` 선택적 peer dependency
- **카테고리 테마** — CSS 변수 기반 카테고리별 색상 테마
- **스토리지 어댑터** — S3/R2/MinIO 호환 파일 관리
- **Headless 모드** — UI 없이 services + routes만 사용 가능
- **Zod 유효성 검사** — 모든 입력에 대한 스키마, i18n 에러 메시지 주입

## 빠른 시작

### 1. 설치

```bash
npm install blog-core-v2
```

### 2. Prisma 스키마 복사

패키지의 `prisma/blog.prisma` 내용을 프로젝트의 Prisma 스키마 파일에 복사합니다.

```prisma
// schema.prisma에 추가
model BlogPost {
  id            String    @id @default(cuid())
  slug          String    @unique
  category      String
  title         String
  content       String    @db.Text
  excerpt       String?
  coverImageUrl String?   @map("cover_image_url")
  coverImageKey String?   @map("cover_image_key")
  attachments   Json?     @default("[]")
  featured      Boolean   @default(false)
  published     Boolean   @default(false)
  publishedAt   DateTime? @map("published_at")
  authorId      String    @map("author_id")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  tags          PostTag[]
  comments      Comment[]

  @@index([published, publishedAt(sort: Desc)])
  @@index([published, featured, publishedAt(sort: Desc)])
  @@index([category])
  @@map("blog_posts")
}

// Tag, PostTag, Comment, CommentStatus enum도 함께 복사 (prisma/blog.prisma 참조)
```

### 3. 마이그레이션 실행

```bash
npx prisma migrate dev --name add-blog
```

### 4. createBlog() 호출

```typescript
// lib/blog.ts
import { createBlog } from 'blog-core-v2';
import { prisma } from '@/lib/prisma';

export const blog = createBlog({
  prisma,
  modelName: 'blogPost',
  categories: {
    NEWS: {
      key: 'news', main: '#2563eb', heroColor: '37, 99, 235',
      bgTint: '#eff6ff', bgQuote: '#dbeafe',
      border: '#93c5fd', divider: '#bfdbfe', label: '뉴스',
    },
    NOTICE: {
      key: 'notice', main: '#16a34a', heroColor: '22, 163, 74',
      bgTint: '#f0fdf4', bgQuote: '#dcfce7',
      border: '#86efac', divider: '#bbf7d0', label: '공지',
    },
  },
  basePath: '/blog',
  adminBasePath: '/admin/blog',
  apiBasePath: '/api/blog',
  adminApiBasePath: '/api/admin/blog',
  features: {
    tags: true,
    comments: { enabled: true, autoApprove: false, maxDepth: 3 },
    search: true,
    scheduler: { enabled: true, cronSecret: process.env.CRON_SECRET },
  },
});

export const blogService = blog.services.posts;
export const tagService = blog.services.tags;
export const commentService = blog.services.comments;
export const blogRoutes = blog.routes;
```

### 5. API 라우트 연결

```typescript
// app/api/blog/route.ts
import { blog } from '@/lib/blog';
export const GET = blog.routes.public.posts.list.GET;

// app/api/blog/[slug]/route.ts
import { blog } from '@/lib/blog';
export const GET = blog.routes.public.posts.detail.GET;

// app/api/admin/blog/posts/route.ts
import { blog } from '@/lib/blog';
export const GET = blog.routes.admin.posts.list.GET;
export const POST = blog.routes.admin.posts.list.POST;
export const DELETE = blog.routes.admin.posts.list.DELETE;

// app/api/admin/blog/posts/[id]/route.ts
import { blog } from '@/lib/blog';
export const GET = blog.routes.admin.posts.detail.GET;
export const PUT = blog.routes.admin.posts.detail.PUT;
export const DELETE = blog.routes.admin.posts.detail.DELETE;

// app/api/admin/blog/posts/[id]/publish/route.ts
import { blog } from '@/lib/blog';
export const PATCH = blog.routes.admin.posts.publish.PATCH;

// app/api/admin/blog/posts/bulk/route.ts
import { blog } from '@/lib/blog';
export const PATCH = blog.routes.admin.posts.bulk.PATCH;
export const DELETE = blog.routes.admin.posts.bulk.DELETE;

// app/api/admin/blog/posts/slug-check/route.ts
import { blog } from '@/lib/blog';
export const GET = blog.routes.admin.posts.slugCheck.GET;

// app/api/admin/blog/dashboard/route.ts
import { blog } from '@/lib/blog';
export const GET = blog.routes.admin.posts.dashboard.GET;
```

### 6. 관리자 페이지 추가

```tsx
'use client';
import { BlogManagerClient } from 'blog-core-v2/components/admin';

export default function AdminBlogPage() {
  return (
    <BlogManagerClient
      apiBasePath="/api/blog"
      adminApiBasePath="/api/admin/blog"
      categories={categories}
      basePath="/blog"
      enableTags={true}
      enableComments={true}
      enableCta={true}
    />
  );
}
```

## 설정 참조 (BlogConfig)

```typescript
interface BlogConfig {
  // 필수
  prisma: PrismaClientLike;                 // Prisma 클라이언트 인스턴스
  modelName: string;                        // Prisma 모델명 (예: 'blogPost')
  categories: Record<string, CategoryTheme>;// 카테고리 목록 및 테마
  basePath: string;                         // 공개 URL 기본 경로
  adminBasePath: string;                    // 관리자 URL 경로
  apiBasePath: string;                      // 공개 API 경로
  adminApiBasePath: string;                 // 관리자 API 경로

  // 선택
  tagModelName?: string;                    // 태그 모델명 (기본: 'tag')
  postTagModelName?: string;                // PostTag 중계 모델명 (기본: 'postTag')
  commentModelName?: string;                // 댓글 모델명 (기본: 'comment')
  pageSize?: number;                        // 기본 페이지 크기 (기본: 12)
  maxAttachments?: number;                  // 최대 첨부파일 수 (기본: 5)
  enableCta?: boolean;                      // CTA 버튼 기능 (기본: true)
  enableAttachments?: boolean;              // 첨부파일 기능 (기본: true)
  uploadEndpoint?: string;                  // 이미지 업로드 API 경로

  // Feature 토글
  features?: {
    tags?: boolean;                         // 태그 시스템 (기본: true)
    comments?: CommentFeatureConfig;        // 댓글 시스템
    search?: boolean;                       // 전문 검색 (기본: true)
    scheduler?: SchedulerFeatureConfig;     // 예약 발행
  };

  // 어댑터
  storage?: StorageAdapter;                 // 스토리지 어댑터 (S3/R2)
  authMiddleware?: AuthMiddleware;          // 인증 미들웨어

  // 콜백
  onViewCount?: (entityType: string, ids: string[]) => Promise<Map<string, number>>;
  sanitizeContent?: (html: string | null | undefined) => string | null;

  // i18n
  i18n?: Partial<BlogI18nStrings>;          // UI 문자열 오버라이드
}
```

## Feature 토글

비활성화된 기능의 서비스와 라우트는 `null`로 반환됩니다.

```typescript
const blog = createBlog({
  features: {
    tags: false,                      // 태그 비활성화
    comments: { enabled: false },     // 댓글 비활성화
    search: false,                    // 검색 비활성화
    scheduler: { enabled: false },    // 스케줄러 비활성화
  },
});

// blog.services.tags === null
// blog.routes.public.tags === null
```

## API 라우트 매핑

### Public API

| 경로 패턴 | 메서드 | 라우트 핸들러 |
|-----------|--------|--------------|
| `/posts` | GET | `routes.public.posts.list.GET` |
| `/posts/[slug]` | GET | `routes.public.posts.detail.GET` |
| `/posts/featured` | GET | `routes.public.posts.featured.GET` |
| `/tags` | GET | `routes.public.tags?.list.GET` |
| `/tags/cloud` | GET | `routes.public.tags?.cloud.GET` |
| `/[postId]/comments` | GET | `routes.public.comments?.list.GET` |
| `/[postId]/comments` | POST | `routes.public.comments?.create.POST` |
| `/search` | GET | `routes.public.search?.search.GET` |

### Admin API

| 경로 패턴 | 메서드 | 라우트 핸들러 |
|-----------|--------|--------------|
| `/posts` | GET, POST, DELETE | `routes.admin.posts.list.*` |
| `/posts/[id]` | GET, PUT, DELETE | `routes.admin.posts.detail.*` |
| `/posts/[id]/publish` | PATCH | `routes.admin.posts.publish.PATCH` |
| `/posts/bulk` | PATCH, DELETE | `routes.admin.posts.bulk.*` |
| `/posts/slug-check` | GET | `routes.admin.posts.slugCheck.GET` |
| `/dashboard` | GET | `routes.admin.posts.dashboard.GET` |
| `/tags` | GET, POST | `routes.admin.tags?.list.*` |
| `/tags/[id]` | GET, PUT, DELETE | `routes.admin.tags?.detail.*` |
| `/comments` | GET | `routes.admin.comments?.list.GET` |
| `/comments/[id]` | PATCH, DELETE | `routes.admin.comments?.detail.*` |
| `/comments/bulk` | PATCH, DELETE | `routes.admin.comments?.bulk.*` |
| `/scheduler/process` | POST, GET | `routes.admin.scheduler?.process.*` |
| `/scheduler/pending` | GET | `routes.admin.scheduler?.pending.GET` |
| `/scheduler/[id]/cancel` | POST | `routes.admin.scheduler?.cancel.POST` |

## UI 컴포넌트

### 관리자 UI

```tsx
// 올인원 관리 컴포넌트
import { BlogManagerClient } from 'blog-core-v2/components/admin';

// 또는 개별 컴포넌트
import {
  BlogListView,
  BlogEditForm,
  BlogDashboard,
  TagPicker,
  CommentModerationPanel,
} from 'blog-core-v2/components/admin';
```

### 공개 UI

```tsx
import {
  BlogListPage,
  BlogDetailPage,
  CommentList,
  CommentForm,
  TagBadge,
  TagCloud,
} from 'blog-core-v2/components/public';
```

### Block Editor (확장 UI)

`@withwiz/block-editor`를 별도 설치 후 사용합니다.

```tsx
import { BlockEditorForm, createBlockPreset } from 'blog-core-v2/components/admin/editor';

const preset = createBlockPreset({
  news: ['paragraph', 'img-full', 'quote', 'divider'],
  notice: ['paragraph', 'callout', 'divider'],
});
```

## Headless 모드

UI 컴포넌트 없이 services와 routes만 사용할 수 있습니다.

```typescript
import { createBlog } from 'blog-core-v2';
import type { BlogListItem, PaginatedResult } from 'blog-core-v2/types';

const blog = createBlog({ /* config */ });

// 서비스 직접 호출
const posts = await blog.services.posts.listPublished({ page: 1, limit: 10 });

// 라우트 핸들러만 연결
export const GET = blog.routes.public.posts.list.GET;
```

모든 타입, 유틸리티, 에러 코드, i18n 문자열을 별도 서브패스에서 import할 수 있습니다:

```typescript
import type { BlogListItem, CategoryTheme } from 'blog-core-v2/types';
import { generateSlug, buildPaginatedResult } from 'blog-core-v2/utils';
import { BlogError, BLOG_ERROR_CODES } from 'blog-core-v2/errors';
import { resolveI18n, DEFAULT_I18N_KO } from 'blog-core-v2/i18n';
import { CreateBlogPostSchema } from 'blog-core-v2/validators';
import { generateMetadata, createRSSFeed } from 'blog-core-v2/seo';
import { createS3StorageAdapter } from 'blog-core-v2/storage';
```

## i18n 커스터마이징

한국어 기본값이 내장되어 있습니다. 원하는 키만 오버라이드하면 나머지는 기본값으로 채워집니다.

```typescript
const blog = createBlog({
  i18n: {
    adminListTitle: 'News Manager',
    adminCreateButton: '+ New Article',
    publicAllCategory: 'All',
    publicPrevPage: 'Previous',
    publicNextPage: 'Next',
  },
});
```

## 스토리지 어댑터

S3 호환 스토리지(R2, MinIO 등)를 사용하는 경우:

```typescript
import { createS3StorageAdapter } from 'blog-core-v2/storage';

const storage = createS3StorageAdapter({
  bucket: 'my-bucket',
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  publicUrlPrefix: 'https://cdn.example.com',
});

const blog = createBlog({ storage });
```

어댑터를 제공하면 글 삭제 시 커버 이미지, 본문 내 이미지, 첨부파일이 자동 정리됩니다.
어댑터 미제공 시 스토리지 정리 없이 정상 동작합니다.

## SEO 유틸리티

```typescript
import {
  generateMetadata,
  generateListMetadata,
  generateJsonLd,
  generateBreadcrumbJsonLd,
  createRSSFeed,
  createSitemap,
  prepareOGImageData,
} from 'blog-core-v2/seo';

// Next.js generateMetadata에서 사용
export async function generateMetadata({ params }) {
  const post = await blog.services.posts.getPublishedBySlug(params.slug);
  return generateMetadata({
    title: post.title,
    description: post.excerpt,
    url: `https://example.com/blog/${post.slug}`,
    image: post.coverImageUrl,
  });
}

// RSS 피드
const rss = createRSSFeed({
  title: '블로그',
  description: '최신 글',
  siteUrl: 'https://example.com',
  feedUrl: 'https://example.com/feed.xml',
  items: posts.map(p => ({
    title: p.title,
    link: `https://example.com/blog/${p.slug}`,
    pubDate: p.publishedAt,
    description: p.excerpt,
  })),
});
```

## 카테고리 테마

CSS 변수 기반으로 카테고리별 색상 테마를 적용합니다.

```typescript
import { createCategoryThemeVars } from 'blog-core-v2/utils';

const themeVars = createCategoryThemeVars(categories[post.category]);
// { '--blog-cat-main': '#2563eb', '--blog-cat-bg-tint': '#eff6ff', ... }
```

| CSS 변수 | 용도 |
|----------|------|
| `--blog-cat-main` | 주요 색상 |
| `--blog-cat-hero-color` | 히어로 영역 색상 |
| `--blog-cat-bg-tint` | 배경 틴트 |
| `--blog-cat-bg-quote` | 인용 배경 |
| `--blog-cat-border` | 테두리 색상 |
| `--blog-cat-divider` | 구분선 색상 |

## 에러 처리

```typescript
import { BlogError, BLOG_ERROR_CODES } from 'blog-core-v2/errors';

try {
  await blog.services.posts.remove(id);
} catch (err) {
  if (err instanceof BlogError) {
    console.log(err.code);       // 'POST_NOT_FOUND'
    console.log(err.statusCode); // 404
  }
}
```

API 응답 형식:

```json
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": { "code": "POST_NOT_FOUND", "message": "Post not found" } }
```

## 조회수 통합

패키지 자체에 조회수 저장 로직은 포함하지 않고, 콜백 인터페이스만 제공합니다.

```typescript
const blog = createBlog({
  onViewCount: async (entityType, ids) => {
    const counts = await myViewCountService.getCounts(entityType, ids);
    return counts; // Map<string, number>
  },
});
```

## exports map

| 서브패스 | 설명 |
|---------|------|
| `blog-core-v2` | 메인 (createBlog + 모든 re-export) |
| `blog-core-v2/types` | 타입 정의 |
| `blog-core-v2/services` | 서비스 팩토리 함수 |
| `blog-core-v2/routes` | 라우트 핸들러 팩토리 |
| `blog-core-v2/utils` | 유틸리티 함수 |
| `blog-core-v2/errors` | BlogError + 에러 코드 |
| `blog-core-v2/seo` | SEO 유틸리티 |
| `blog-core-v2/i18n` | i18n 문자열 + resolveI18n |
| `blog-core-v2/validators` | Zod 스키마 |
| `blog-core-v2/storage` | 스토리지 어댑터 |
| `blog-core-v2/components/admin` | 관리자 UI 컴포넌트 |
| `blog-core-v2/components/public` | 공개 UI 컴포넌트 |
| `blog-core-v2/components/admin/editor` | Block Editor 통합 |

모든 서브패스는 ESM, CJS, TypeScript 타입을 지원합니다.

## 외부 의존성

| 패키지 | 유형 | 필수 |
|-------|------|------|
| `@prisma/client` >= 5 | peerDependency | 필수 |
| `next` >= 14 | peerDependency | 필수 |
| `react` >= 18 | peerDependency | 필수 |
| `zod` >= 3 | peerDependency | 선택 (validators 사용 시) |
| `@aws-sdk/client-s3` | peerDependency | 선택 (S3 어댑터 사용 시) |
| `@withwiz/block-editor` | peerDependency | 선택 (Block Editor 사용 시) |

`@withwiz/blog-system` 또는 `@withwiz/pms`에 대한 의존성은 없습니다.

## CSS 스코핑

모든 UI 컴포넌트는 인라인 스타일 + CSS 커스텀 프로퍼티(`--blog-*`)를 사용합니다.
전역 CSS를 오염시키지 않으며, 호스트는 CSS 변수를 오버라이드하여 스타일을 커스터마이징할 수 있습니다.

- 관리자 UI: `--blog-bg`, `--blog-text`, `--blog-accent`, `--blog-border`
- 공개 UI: `--blog-public-bg`, `--blog-public-text`, `--blog-public-accent`
- 카테고리: `--blog-cat-main`, `--blog-cat-bg-tint`

## 라이선스

MIT
