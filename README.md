# @withwiz/blog-core

> Reusable Blog/News Core Package for Next.js 15 + Prisma + PostgreSQL
>
> Next.js 15 + Prisma + PostgreSQL 기반 재사용 가능한 블로그/뉴스 코어 패키지

**[English](./docs/README.en.md)** | **[한국어](./docs/README.ko.md)**

---

`@withwiz/blog-core` is a standalone package that bundles domain logic (services), Prisma schema references, SEO utilities, Zod validation schemas, and UI components for building blog or news features. The host project (Next.js app) only needs to inject its Prisma client and configuration.

## Key Features

- **Prisma DI** -- No global `prisma` import; the host injects it (`createBlogService(prisma, config)`)
- **Flexible model naming** -- Use `BlogPost`, `News`, `Article`, or any name via `modelName`
- **Core CRUD** + **Tags (N:M)** + **Comments (threaded, moderation)** + **PostgreSQL FTS** + **Scheduled publishing**
- **SEO** -- `generateMetadata`, Sitemap, RSS 2.0, JSON-LD, OG image data presets
- **UI Components** -- Admin (blog manager / editor) + Public (list / detail / tag widgets / comments)
- **Zod Validation** -- Schema factories for posts, tags, and comments
- **CSS Custom Properties** -- Fully themeable via `--blog-*` variables

## Installation

```bash
npm install @withwiz/blog-core
# or
pnpm add @withwiz/blog-core
```

**Peer dependencies:** `react >=18`, `next >=14`, `@prisma/client >=5`, `zod >=3`

## Quick Start

```ts
// src/lib/services/blog.ts
import { PrismaClient } from '@prisma/client';
import { createBlogService } from '@withwiz/blog-core';

const prisma = new PrismaClient();

export const blogService = createBlogService(prisma, {
  modelName: 'news',          // Prisma delegate name
  enableTags: true,           // Include tag relations
  enableR2Cleanup: false,     // Set true if using R2 storage
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

## Documentation / 문서

Full user guides are available in both languages:

| Language | Guide |
|---|---|
| English | [docs/README.en.md](./docs/README.en.md) |
| 한국어 | [docs/README.ko.md](./docs/README.ko.md) |

### Detailed Docs / 상세 문서

| Doc | Contents |
|---|---|
| [01-getting-started](./docs/01-getting-started.md) | Prerequisites, installation, first post |
| [02-prisma-schema](./docs/02-prisma-schema.md) | Prisma model integration, `@@map`, model mapping |
| [03-blog-service](./docs/03-blog-service.md) | Full `createBlogService` API reference |
| [04-tags](./docs/04-tags.md) | Tag CRUD, related posts, tag cloud |
| [05-comments](./docs/05-comments.md) | Comment tree, moderation, honeypot, rate limiting |
| [06-search](./docs/06-search.md) | PostgreSQL FTS (tsvector / GIN / unaccent) |
| [07-scheduler](./docs/07-scheduler.md) | Scheduled publishing, cross-platform cron |
| [08-seo](./docs/08-seo.md) | Metadata / Sitemap / RSS / JSON-LD / OG |
| [09-components](./docs/09-components.md) | Admin / Public UI components |
| [10-validators](./docs/10-validators.md) | Zod schemas and custom extensions |
| [11-styling](./docs/11-styling.md) | CSS variables and theming guide |

## Feature Checklist

- [x] Blog CRUD (`BlogService`)
- [x] Tags N:M + tag cloud + related posts (`TagService`)
- [x] Threaded comments + moderation + honeypot + rate limiting (`CommentService`)
- [x] PostgreSQL full-text search + highlighting (`SearchService`)
- [x] Scheduled publishing + cron route factory (`SchedulerService`)
- [x] SEO metadata / Sitemap / RSS / JSON-LD
- [x] OG image data presets
- [x] Admin / Public UI components
- [x] Zod-based validation schema factories

## Related Packages

| Package | Description |
|---|---|
| [`@withwiz/blog-system`](../../blog-system/docs/README.md) | Single/multi-tenant SaaS blog system |
| `@withwiz/toolkit` | Middleware, auth, cache, logger (peer) |
| `@withwiz/block-editor` | Block-based rich text editor (optional peer) |

## License

MIT
