# 03. BlogService

`createBlogService(prisma, config)`는 블로그 포스트의 CRUD, 공개 목록, 대시보드 통계를 제공하는
불변(immutable) 서비스 객체를 반환한다.

## 팩토리 시그니처

```ts
import { createBlogService, type BlogServiceConfig } from '@withwiz/blog-core';

function createBlogService(prisma: PrismaClient, config: BlogServiceConfig): BlogService;
```

### `BlogServiceConfig`

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `modelName` | `string` | — (필수) | Prisma delegate 이름 (예: `'news'`, `'blogPost'`) |
| `enableTags` | `boolean` | `false` | true면 `tags` 관계를 include |
| `enableR2Cleanup` | `boolean` | `false` | true면 삭제/업데이트 시 R2 오브젝트 정리 |
| `r2Helpers` | `R2Helpers` | — | R2 스토리지 헬퍼 (cleanup 활성화 시 필수) |
| `sanitizeContent` | `(html: string) => string` | 내장 새니타이저 | 사용자 정의 HTML 새니타이즈 함수 |

```ts
export const blogService = createBlogService(prisma, {
  modelName: 'news',
  enableTags: true,
  enableR2Cleanup: true,
  r2Helpers: r2,   // @withwiz/pms/utils의 R2Helpers 등
});
```

## 전체 API

### Public 메서드

```ts
// 공개 목록 (페이지네이션, 카테고리/검색어/태그 필터)
blogService.listPublished({
  page: 1,
  limit: 12,
  category?: string,
  search?: string,
  tagSlug?: string,       // 단일 태그 slug
  tagSlugs?: string[],    // 여러 태그 OR
}): Promise<PaginatedResult<BlogListItem>>;

// 슬러그로 공개 글 상세
blogService.getPublishedBySlug(slug: string): Promise<BlogDetail | null>;

// 피처드 글
blogService.getFeatured(limit?: number): Promise<BlogListItem[]>;

// 이전/다음 글
blogService.getAdjacentPosts(currentId: string): Promise<{
  prev: BlogNav | null;
  next: BlogNav | null;
}>;

// 슬러그 중복 체크 (excludeId: 자기 자신 제외)
blogService.checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean>;
```

### Admin 메서드

```ts
// 전체 목록 (공개 여부와 무관, 정렬 가능)
blogService.listAll({
  page: number,
  limit: number,
  category?: string,
  published?: 'true' | 'false',  // 문자열 필터
  search?: string,
  sortBy?: 'createdAt' | 'publishedAt' | 'updatedAt',
}): Promise<PaginatedResult<BlogListItem>>;

// ID로 조회
blogService.getById(id: string): Promise<BlogDetail | null>;

// 생성
blogService.create(data: CreateBlogPostInput, authorId: string): Promise<BlogDetail>;

// 수정
blogService.update(id: string, data: UpdateBlogPostInput): Promise<BlogDetail>;

// 단건 삭제 / 일괄 삭제 (삭제된 개수 반환)
blogService.remove(id: string): Promise<void>;
blogService.removeMany(ids: string[]): Promise<number>;

// 공개 토글 (publishedAt 자동 세팅/해제)
blogService.togglePublish(id: string): Promise<{
  published: boolean;
  publishedAt: Date | null;
}>;

// 일괄 수정
blogService.bulkUpdatePublished(ids: string[], published: boolean): Promise<number>;
blogService.bulkUpdateFeatured(ids: string[], featured: boolean): Promise<number>;

// 대시보드 통계
blogService.getDashboardStats(): Promise<DashboardStats>;
```

## 데이터 타입 요약

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

interface Attachment {
  key: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}
```

## 사용 예제

### 생성 + 태그 연결

```ts
const post = await blogService.create(
  {
    slug: 'spring-recital-2026',
    category: 'performance',
    title: '2026 봄 정기공연',
    content: '<p>공연 소개...</p>',
    excerpt: '봄 정기공연 안내',
    coverImageUrl: 'https://cdn.example.com/2026-spring.jpg',
    coverImageKey: 'blog/2026-spring.jpg',
    published: true,
    featured: true,
    tagIds: ['tag-id-1', 'tag-id-2'],   // enableTags=true면 바로 연결
  },
  'author-user-id',
);
```

### 공개 페이지 목록 API

```ts
// app/api/blog/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await blogService.listPublished({
    page: Number(searchParams.get('page') ?? 1),
    limit: 12,
    category: searchParams.get('category') ?? undefined,
    search: searchParams.get('q') ?? undefined,
    tagSlug: searchParams.get('tag') ?? undefined,
  });
  return Response.json(result);
}
```

### 관리자 일괄 공개

```ts
await blogService.bulkUpdatePublished(
  ['id1', 'id2', 'id3'],
  true,
);
```

## R2 스토리지 정리

`enableR2Cleanup: true` + `r2Helpers` 주입 시:
- 글 삭제 → `coverImageKey` + `attachments[].key` 전부 삭제
- 커버 이미지 교체 → 이전 `coverImageKey` 삭제
- 첨부 제거 → 제거된 `key` 삭제

> **주의**: R2 키 규칙은 호스트 스토리지 설계에 맞춰야 한다.
> `coverImageKey`는 반드시 **오브젝트 키 전체**(경로 포함)를 저장하자.

## HTML 새니타이저 교체

기본 내장 새니타이저는 XSS 방지 수준이다. 프로젝트별 요구 사항이 다르면 주입한다.

```ts
import DOMPurify from 'isomorphic-dompurify';

createBlogService(prisma, {
  modelName: 'news',
  sanitizeContent: (html) => DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen'],
  }),
});
```

> **주의**: 새니타이저를 절대 생략하지 말 것. 관리자 입력도 공개 페이지에 출력되므로 XSS 위험이 동일하다.

## 관련 문서

- [02-prisma-schema.md](./02-prisma-schema.md) — 모델 매핑
- [10-validators.md](./10-validators.md) — `CreateBlogPostSchema` 등 Zod 검증
