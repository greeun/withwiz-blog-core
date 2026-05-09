# 10. Zod 검증 스키마

`@withwiz/blog-core/validators`는 Zod 기반 검증 스키마와 팩토리를 제공한다.
모든 스키마는 `validators` 서브패스와 루트 모두에서 export된다.

## 기본 스키마 목록

| 스키마 | 추론 타입 | 용도 |
|---|---|---|
| `slugSchema` | `string` | URL-safe slug (소문자+영숫자+하이픈) |
| `optionalUrlSchema` | `string \| undefined` | 안전한 URL (`javascript:`, `data:`, `file:` 차단) |
| `attachmentSchema` | `Attachment` | 첨부파일 메타 |
| `CreateBlogPostSchema` | `CreateBlogPostData` | 글 생성 |
| `UpdateBlogPostSchema` | `UpdateBlogPostData` | 글 수정 (partial) |
| `BulkUpdateSchema` | `BulkUpdateData` | 일괄 작업 |
| `CreateTagSchema` | `CreateTagData` | 태그 생성 |
| `UpdateTagSchema` | `UpdateTagData` | 태그 수정 |
| `CreateCommentSchema` | `CreateCommentData` | 댓글 생성 (honeypot 포함) |
| `UpdateCommentStatusSchema` | `UpdateCommentStatusData` | 댓글 상태 변경 |

## 사용 패턴

### API 라우트에서

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

### Form 훅에서 (React Hook Form + zod resolver)

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateBlogPostSchema, type CreateBlogPostData } from '@withwiz/blog-core';

const form = useForm<CreateBlogPostData>({
  resolver: zodResolver(CreateBlogPostSchema),
});
```

## `createBlogSchemas` 팩토리 — 설정 주입

기본 스키마는 `maxAttachments=5`로 고정되어 있다. 프로젝트 설정에 따라 조절하려면 팩토리를 사용한다.

```ts
import { createBlogSchemas } from '@withwiz/blog-core';

const { CreateBlogPostSchema, UpdateBlogPostSchema, BulkUpdateSchema } = createBlogSchemas({
  maxAttachments: 10,
});
```

`BlogConfig`에 연동하여 일관된 한계를 유지하자.

```ts
const blogConfig = { maxAttachments: 10, /* ... */ };
const schemas = createBlogSchemas({ maxAttachments: blogConfig.maxAttachments });
```

## `CreateBlogPostSchema` 필드

```ts
{
  title:         string  (1..200, 필수)
  content:       string  (1+, 필수)
  excerpt?:      string  (0..500)
  category:      string  (1+, 필수)     // 호스트에서 정의
  coverImageUrl?: string (URL or '')
  coverImageKey?: string
  attachments?:  Attachment[] (max N, default [])
  featured?:     boolean (default false)
  published?:    boolean (default false)
  publishedAt?:  Date | null (z.coerce.date)
  slug:          slugSchema (필수)
}
```

> **주의**: `publishedAt`은 `z.coerce.date()`다.
> 브라우저가 보내는 `'2026-06-01T09:00'` 같은 ISO 문자열도 `Date`로 자동 변환된다.

## `CreateCommentSchema` — 허니팟 포함

```ts
{
  postId:     string (필수)
  parentId?:  string
  content:    string (1..2000)
  guestName?: string (1..50)
  guestEmail?: string (이메일 형식)
  honeypot?:  string     // 봇 트랩 — 값 있으면 SPAM 처리
}
```

서버에서 `honeypot` 값이 있으면 `commentService`에 넘기기 전에 SPAM으로 분류하거나 400 응답을 돌리자.

```ts
const parsed = CreateCommentSchema.safeParse(body);
if (!parsed.success) return Response.json(parsed.error, { status: 400 });
if (parsed.data.honeypot) {
  return Response.json({ ok: true }, { status: 200 }); // 봇을 속이려면 조용히 200
}
```

## `slugSchema` 직접 사용

```ts
import { slugSchema } from '@withwiz/blog-core';

const r = slugSchema.safeParse('My Post');
// r.success === false
const r2 = slugSchema.safeParse('my-post-01');
// r2.success === true
```

정규식: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` — 소문자/숫자/하이픈만 허용.

## `optionalUrlSchema` — 보안 URL

`javascript:`, `data:`, `file:` 프로토콜은 차단된다. 빈 문자열(`''`)도 허용되므로 폼에서 선택 입력에 쓰기 쉽다.

```ts
optionalUrlSchema.parse('');                 // 통과
optionalUrlSchema.parse('https://a.com');    // 통과
optionalUrlSchema.parse('javascript:alert'); // 실패
```

## 커스텀 확장

예: 회사 도메인만 허용하는 URL 규칙.

```ts
import { z } from 'zod';
import { CreateBlogPostSchema } from '@withwiz/blog-core';

const RestrictedSchema = CreateBlogPostSchema.extend({
  coverImageUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://cdn.example.com/'), {
      message: 'CDN URL만 허용됩니다',
    })
    .optional(),
});
```

## 에러 한국어 메시지

기본 스키마의 에러 메시지는 한국어로 작성되어 있다.
`parsed.error.flatten().fieldErrors`를 폼 상태에 그대로 매핑하면 사용자 친화적 메시지가 나온다.

## 관련 문서

- [03-blog-service.md](./03-blog-service.md) — 스키마 통과 후 넘길 서비스 메서드
- [05-comments.md](./05-comments.md) — honeypot 운영 전략
