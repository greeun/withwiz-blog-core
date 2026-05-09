# 01. 시작하기

## 전제 조건

| 항목 | 최소 버전 | 비고 |
|---|---|---|
| Node.js | 18.18+ | Next.js 15 요구 사항 |
| Next.js | 14 이상 | App Router 기반 |
| Prisma | 5.x | `@prisma/client` + CLI |
| PostgreSQL | 13 이상 | FTS 사용 시 `unaccent` 확장 가능 버전 |
| React | 18 이상 | 19 권장 |

> **주의**: 검색(`SearchService`) 기능은 PostgreSQL 전용이다.
> MySQL/SQLite 등에서는 검색 기능을 비활성화해야 한다.

## 설치

### 1. 패키지 연결 (file: 참조)

모노레포 형태라면 호스트 `package.json`에서 file 참조로 연결한다.

```json
{
  "dependencies": {
    "@withwiz/blog-core": "file:./packages/blog-core",
    "@withwiz/block-editor": "file:./packages/block-editor"
  }
}
```

### 2. Prisma 스키마 준비

호스트의 `prisma/schema.prisma`에 블로그 모델을 추가한다.
상세는 [02-prisma-schema.md](./02-prisma-schema.md) 참조.

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

### 3. 마이그레이션

```bash
npx prisma migrate dev --name init_blog
npx prisma generate
```

## 기본 설정 — BlogService 생성

```ts
// src/lib/services/blog.ts
import { PrismaClient } from '@prisma/client';
import { createBlogService, type BlogService } from '@withwiz/blog-core';

const prisma = new PrismaClient();

export const blogService: BlogService = createBlogService(prisma, {
  modelName: 'news',          // prisma.news delegate
  enableTags: false,          // 태그 비활성화
  enableR2Cleanup: false,     // R2 스토리지 미사용
});
```

`modelName`은 Prisma가 생성하는 delegate 이름이다. 모델이 `News`면 `'news'`, `BlogPost`면 `'blogPost'`.

## 첫 포스트 생성

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

## Next.js 라우트 연결

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

## 다음 단계

- Prisma 스키마 상세: [02-prisma-schema.md](./02-prisma-schema.md)
- BlogService API 전체: [03-blog-service.md](./03-blog-service.md)
- 태그/댓글/검색/스케줄러 기능 추가: [04-tags.md](./04-tags.md) 외

> **주의**: `@withwiz/blog-system`을 사용하는 경우, `createBlogService`를 직접 호출할 필요 없이
> `createBlogSystem({ mode: 'single', ... })`이 모든 서비스를 조립해 준다.
> 개별 패키지만 쓰는 경우에만 이 문서의 경로를 따른다.
