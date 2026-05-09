# 09. UI 컴포넌트

`@withwiz/blog-core`는 Admin과 Public 양쪽에서 바로 쓸 수 있는 React 컴포넌트를 제공한다.
스타일은 CSS 파일로 분리돼 있으며, CSS 커스텀 프로퍼티로 테마를 오버라이드할 수 있다.

## 임포트 경로

```ts
// Admin 컴포넌트
import {
  BlogManagerClient,
  BlogEditForm,
  TagPicker,
  CommentModerationPanel,
} from '@withwiz/blog-core/components/admin';

// Public 컴포넌트
import {
  BlogListPage,
  BlogDetailPage,
  TagBadge,
  TagCloud,
  CommentList,
  CommentForm,
} from '@withwiz/blog-core/components/public';

// 스타일 (전역 import 1회)
import '@withwiz/blog-core/styles/admin';    // 관리자 전용
import '@withwiz/blog-core/styles/public';   // 퍼블릭 공용
import '@withwiz/blog-core/styles/block-editor';  // 에디터 전용
```

## Admin 컴포넌트

### `BlogManagerClient`

관리자용 블로그 목록 + 검색/필터/일괄 작업 + 페이지네이션 통합 셸.

```tsx
'use client';
import { BlogManagerClient } from '@withwiz/blog-core/components/admin';

export default function AdminBlogPage() {
  return (
    <BlogManagerClient
      apiBasePath="/api/admin/blog"
      blogConfig={blogConfig}
      // onRowClick / onCreate 등 옵셔널 콜백
    />
  );
}
```

- 내부에서 `fetch(apiBasePath)` → 서버 라우트는 `BlogService.listAll`로 응답.
- 일괄 공개/비공개/추천/삭제 버튼 내장.

### `BlogEditForm`

블로그 생성/수정 폼 (블록 에디터 + 커버 이미지 + 첨부 + 태그).

```tsx
<BlogEditForm
  mode="create"                     // 'create' | 'edit'
  initialData={post}                // edit일 때 BlogDetail
  blogConfig={blogConfig}
  apiBasePath="/api/admin/blog"
  uploadEndpoint="/api/upload"
  enableTags={true}
  tagService={{
    listAll: async () => tagService.listAll({ page: 1, limit: 200 }),
  }}
/>
```

### `TagPicker`

태그 다중 선택 위젯 (autocomplete + 새 태그 생성).

```tsx
<TagPicker
  selectedTagIds={tagIds}
  onChange={setTagIds}
  fetchTags={async (q) => tagService.listAll({ search: q, limit: 50 })}
  onCreate={async (name) => tagService.create({ name, slug: slugify(name) })}
/>
```

### `CommentModerationPanel`

댓글 모더레이션 테이블 — 상태 필터, 일괄 승인/거부, 스팸 이동.

```tsx
<CommentModerationPanel
  apiBasePath="/api/admin/comments"
  pendingCountEndpoint="/api/admin/comments/pending-count"
/>
```

## Public 컴포넌트

### `BlogListPage`

공개 목록 페이지 — 카테고리 탭, 검색, 태그 필터, 페이지네이션.

```tsx
import { BlogListPage } from '@withwiz/blog-core/components/public';

export default async function BlogPage({ searchParams }) {
  const data = await blogService.listPublished({
    page: Number(searchParams.page ?? 1),
    limit: 12,
    category: searchParams.category,
    tagSlug: searchParams.tag,
  });
  return (
    <BlogListPage
      data={data}
      blogConfig={blogConfig}
      basePath="/blog"
    />
  );
}
```

### `BlogDetailPage`

단일 글 상세 — 커버, 본문, 첨부 다운로드, 이전/다음, 관련 글, 댓글 영역 슬롯.

```tsx
<BlogDetailPage
  post={post}
  adjacent={{ prev, next }}
  relatedPosts={related}
  blogConfig={blogConfig}
  basePath="/blog"
  commentsSlot={<CommentList postId={post.id} />}
/>
```

### `TagBadge` / `TagCloud`

```tsx
<TagBadge tag={{ slug: 'ballet', name: '발레' }} href="/blog/tag/ballet" />

<TagCloud
  tags={await tagService.getTagCloud(30)}
  hrefFor={(t) => `/blog/tag/${t.slug}`}
/>
```

### `CommentList` / `CommentForm`

```tsx
<CommentList
  postId={post.id}
  fetchComments={() => commentService.listByPost(post.id, { includeReplies: true })}
/>

<CommentForm
  postId={post.id}
  submitEndpoint="/api/blog/comments"
  requireLogin={false}
  // honeypot 필드는 내장됨
/>
```

> **주의**: `CommentForm`은 **허니팟 + `content` 필드 + optional `guestName`/`guestEmail`**을 제출한다.
> 서버 라우트에서 `CreateCommentSchema.parse(body)`로 검증하고 `commentService.create`를 호출하자.

## 스타일링 (CSS 커스텀 프로퍼티)

`blog-public.css`와 `blog-admin.css`는 아래 변수를 노출한다. 호스트에서 `:root`에 오버라이드하면 테마가 바뀐다.

```css
:root {
  --blog-color-bg: #0A0A0A;
  --blog-color-fg: #FEFEFE;
  --blog-color-primary: #121212;
  --blog-color-accent: #D4AF37;     /* 샴페인 골드 */
  --blog-color-muted: #888;
  --blog-font-heading: 'Instrument Serif', 'Noto Serif KR', serif;
  --blog-font-body: 'Inter', 'Sora', sans-serif;
  --blog-radius: 8px;
  --blog-gap: 1rem;
}
```

## Tailwind 통합

CSS 파일은 일반 CSS다. Tailwind와 함께 써도 충돌하지 않는다.
Tailwind 유틸만 쓰려면 CSS 파일을 import하지 않아도 된다 (대신 스타일을 직접 작성해야 함).

## 클라이언트/서버 경계

| 컴포넌트 | 경계 |
|---|---|
| `BlogManagerClient` | `"use client"` |
| `BlogEditForm` | `"use client"` |
| `TagPicker` | `"use client"` |
| `CommentModerationPanel` | `"use client"` |
| `BlogListPage` | 서버 컴포넌트 OK |
| `BlogDetailPage` | 서버 컴포넌트 OK |
| `CommentList` | 서버 OR 클라이언트 (fetchComments 주입 방식에 따름) |
| `CommentForm` | `"use client"` |

> **주의**: 서버 컴포넌트에 클라이언트 컴포넌트를 사용할 때는 `"use client"` 경계를 한 번만 넘으면 된다.
> Next.js 15의 서버 액션을 쓰면 더 깔끔하게 구성할 수 있다.

## 관련 문서

- [03-blog-service.md](./03-blog-service.md) — 컴포넌트가 기대하는 데이터 모양
- [04-tags.md](./04-tags.md) / [05-comments.md](./05-comments.md)
