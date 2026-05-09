# @withwiz/blog-core

> Next.js 15 + Prisma + PostgreSQL 기반 재사용 가능한 블로그/뉴스 코어 패키지

`@withwiz/blog-core`는 블로그 또는 뉴스 기능을 구현하는 데 필요한 도메인 로직(서비스),
Prisma 스키마 참조, SEO 유틸리티, 검증 스키마, UI 컴포넌트를 한 곳에 모은 **독립 패키지**다.
호스트 프로젝트(Next.js 앱)는 Prisma 클라이언트와 설정만 주입하면 된다.

## 주요 특징

- **Prisma DI**: 글로벌 `prisma` import 없음 — 호스트가 주입 (`createBlogService(prisma, config)`)
- **모델명 유연성**: `BlogPost`, `News`, `Article` 등 호스트 모델명을 `modelName`으로 지정
- **핵심 CRUD** + **태그(N:M)** + **댓글(트리, 모더레이션)** + **PostgreSQL FTS 검색** + **예약 발행**
- **SEO**: `generateMetadata`, Sitemap, RSS, JSON-LD, OG 이미지 데이터 프리셋
- **UI 컴포넌트**: Admin(블로그 매니저/에디터) + Public(목록/상세/태그 위젯/댓글)
- **ZERO `@withwiz/pms` 의존**: `@withwiz/toolkit`(peer) 위에서만 동작

## 설치

호스트 Next.js 프로젝트의 `package.json`에서 file: 참조로 연결한다.

```json
{
  "dependencies": {
    "@withwiz/blog-core": "file:./packages/blog-core"
  }
}
```

`peerDependencies`: `react >=18`, `next >=14`, `@prisma/client >=5`, `zod >=3`.

## 빠른 시작

```ts
// src/lib/services/blog.ts
import { PrismaClient } from '@prisma/client';
import { createBlogService } from '@withwiz/blog-core';

const prisma = new PrismaClient();

export const blogService = createBlogService(prisma, {
  modelName: 'news',          // Prisma delegate 이름
  enableTags: true,           // 태그 관계 include
  enableR2Cleanup: false,     // R2 스토리지 미사용 시 false
});
```

```ts
// app/api/news/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? 1);
  const result = await blogService.listPublished({ page, limit: 12 });
  return Response.json(result);
}
```

## 문서 가이드

| 문서 | 내용 |
|---|---|
| [01-getting-started.md](./01-getting-started.md) | 전제 조건, 설치, 첫 글 생성 예제 |
| [02-prisma-schema.md](./02-prisma-schema.md) | Prisma 모델 통합, `@@map`, `News` 매핑 |
| [03-blog-service.md](./03-blog-service.md) | `createBlogService` API 전체 |
| [04-tags.md](./04-tags.md) | 태그 CRUD, 관련 글, 태그 클라우드 |
| [05-comments.md](./05-comments.md) | 댓글 트리, 모더레이션, 허니팟/레이트 리밋 |
| [06-search.md](./06-search.md) | PostgreSQL FTS(tsvector/GIN/unaccent) 설정 |
| [07-scheduler.md](./07-scheduler.md) | 예약 발행, 크로스 플랫폼 Cron 연동 |
| [08-seo.md](./08-seo.md) | Metadata/Sitemap/RSS/JSON-LD/OG |
| [09-components.md](./09-components.md) | Admin/Public UI 컴포넌트 |
| [10-validators.md](./10-validators.md) | Zod 스키마 및 커스텀 확장 |

## 기능 체크리스트

- [x] 블로그 CRUD (`BlogService`)
- [x] 태그 N:M 관계 + 태그 클라우드 + 관련 글 (`TagService`)
- [x] 댓글 트리 + 상태 기반 모더레이션 + 허니팟 + 레이트 리밋 (`CommentService`)
- [x] PostgreSQL 전문 검색 + 하이라이팅 (`SearchService`)
- [x] 예약 발행 + Cron 라우트 팩토리 (`SchedulerService`)
- [x] SEO 메타데이터 / Sitemap / RSS / JSON-LD
- [x] OG 이미지 데이터 프리셋
- [x] Admin/Public UI 컴포넌트
- [x] Zod 기반 검증 스키마 팩토리

## 관련 패키지

- [`@withwiz/blog-system`](../../blog-system/docs/README.md): 단일/멀티 테넌트 SaaS 시스템
- `@withwiz/toolkit`: 미들웨어, 인증, 캐시, 로거 (peer)
- `@withwiz/block-editor`: 블록 기반 에디터 (blog-core 의존)
