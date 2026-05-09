# 04. 태그 시스템

`createTagService`는 태그 CRUD와 포스트-태그 N:M 관계, 태그 클라우드, 관련 글 등 태그 기능 전체를 제공한다.

## 팩토리

```ts
import { createTagService, type TagService } from '@withwiz/blog-core';

const tagService: TagService = createTagService(prisma, {
  modelName: 'tag',           // 기본 'tag'
  postModelName: 'news',      // 필수 — 블로그 모델 delegate
  postTagModelName: 'postTag', // 기본 'postTag'
});
```

### 설정 옵션

| 필드 | 기본값 | 설명 |
|---|---|---|
| `modelName` | `'tag'` | Tag delegate 이름 |
| `postModelName` | — (필수) | 포스트 모델 delegate (예: `'news'`) |
| `postTagModelName` | `'postTag'` | 중계 모델 delegate |

## API

### CRUD

```ts
tagService.create({ slug, name, description? }): Promise<Tag>;
tagService.getById(id: string): Promise<Tag | null>;
tagService.getBySlug(slug: string): Promise<Tag | null>;
tagService.update(id: string, { slug?, name?, description? }): Promise<Tag>;
tagService.remove(id: string): Promise<void>;   // 관계는 cascade로 자동 삭제
```

### 목록 & 태그 클라우드

```ts
tagService.listAll({
  page?: number,
  limit?: number,
  search?: string,
}): Promise<PaginatedResult<TagWithCount>>;

// 사용 빈도가 높은 태그 N개 반환 (default 30)
tagService.getTagCloud(limit?: number): Promise<TagWithCount[]>;
```

`TagWithCount`는 `Tag` + `postCount: number` 필드를 갖는다.

### 포스트 ↔ 태그

```ts
// 특정 태그의 공개 포스트 목록
tagService.getPostsByTag(
  tagSlug: string,
  { page?: number, limit?: number },
): Promise<PaginatedResult<BlogListItem>>;

// 특정 포스트의 태그 목록
tagService.getTagsByPost(postId: string): Promise<Tag[]>;

// 같은 태그를 공유하는 다른 공개 글 (관련 글)
tagService.getRelatedPosts(postId: string, limit?: number): Promise<BlogListItem[]>;
```

## 사용 예제

### 태그 생성 + 포스트에 연결

태그 연결은 `BlogService.create` / `update`의 `tagIds` 필드로 처리한다.
`TagService`는 태그 자체의 CRUD만 담당한다.

```ts
// 1. 태그 생성
const ballet = await tagService.create({ slug: 'ballet', name: '발레' });
const recital = await tagService.create({ slug: 'recital', name: '정기공연' });

// 2. 포스트 생성 시 연결 (BlogService — enableTags: true 필요)
await blogService.create(
  {
    slug: 'spring-recital-2026',
    title: '봄 정기공연',
    content: '...',
    category: 'performance',
    tagIds: [ballet.id, recital.id],
  },
  'author-id',
);
```

### 태그 클라우드 컴포넌트

```tsx
// components/TagCloud.tsx
import { tagService } from '@/lib/services/tags';

export async function TagCloud() {
  const tags = await tagService.getTagCloud(30);
  return (
    <ul className="tag-cloud">
      {tags.map((t) => (
        <li key={t.id}>
          <a href={`/blog/tag/${t.slug}`}>
            {t.name} <span>({t.postCount})</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
```

### 태그별 목록 페이지

```tsx
// app/blog/tag/[slug]/page.tsx
import { tagService } from '@/lib/services/tags';

export default async function TagPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const { items, total } = await tagService.getPostsByTag(params.slug, {
    page,
    limit: 12,
  });
  // ... 렌더링
}
```

### 관련 글 섹션

```tsx
// 글 상세 하단
const related = await tagService.getRelatedPosts(post.id, 5);
```

관련 글 계산 로직:
1. 현재 글이 가진 모든 태그 조회
2. 해당 태그들이 달린 **다른 공개 글** 중 교집합 빈도가 높은 순으로 정렬
3. 자신은 제외하고 `limit`만큼 반환

## 태그 검증 스키마

```ts
import { CreateTagSchema, UpdateTagSchema } from '@withwiz/blog-core';

const result = CreateTagSchema.safeParse(input);
if (!result.success) return Response.json(result.error, { status: 400 });
await tagService.create(result.data);
```

상세는 [10-validators.md](./10-validators.md) 참조.

## 자주 겪는 이슈

> **주의**: 호스트의 중계 모델 FK 컬럼명이 다르다면(예: `news_id`) Prisma 스키마에서 `@map` 처리는 하되,
> **Prisma delegate 필드명은 자동으로 `newsId`로 노출**되므로 TagService 내부 쿼리가 그대로 동작한다.
> 단, `postModelName`과 중계 모델의 관계 필드명(`news`)이 일치해야 한다.

> **주의**: `tagService.remove(id)`는 cascade로 `PostTag`까지 삭제한다.
> 포스트는 삭제되지 않지만 태그 관계는 끊어진다.

## 관련 문서

- [03-blog-service.md](./03-blog-service.md) — `BlogService.listPublished`의 `tagSlug` 필터
- [09-components.md](./09-components.md) — `TagPicker`, `TagBadge`, `TagCloud` UI
