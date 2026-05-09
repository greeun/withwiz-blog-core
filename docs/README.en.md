# @withwiz/blog-core

> Reusable Blog/News Core Package for Next.js 15 + Prisma + PostgreSQL

`@withwiz/blog-core` is a standalone package that bundles everything you need to build blog or news features: domain logic (services), Prisma schema references, SEO utilities, Zod validation schemas, and ready-to-use UI components. The host project (Next.js app) only needs to inject its Prisma client and configuration.

## Key Features

- **Prisma DI** -- No global `prisma` import; the host injects it (`createBlogService(prisma, config)`)
- **Flexible model naming** -- Use `BlogPost`, `News`, `Article`, or any name via the `modelName` config
- **Core CRUD** + **Tags (N:M)** + **Comments (threaded, moderation)** + **PostgreSQL FTS** + **Scheduled publishing**
- **SEO** -- `generateMetadata`, Sitemap, RSS 2.0, JSON-LD, OG image data presets
- **UI Components** -- Admin (blog manager / editor) + Public (list / detail / tag widgets / comments)
- **Zod Validation** -- Schema factories for posts, tags, and comments with Korean error messages
- **CSS Custom Properties** -- Fully themeable via `--blog-*` variables
- **i18n** -- Built-in Korean strings with `resolveI18n` override support

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Services](#services)
  - [BlogService](#blogservice)
  - [TagService](#tagservice)
  - [CommentService](#commentservice)
  - [SearchService](#searchservice)
  - [SchedulerService](#schedulerservice)
- [Prisma Schema Integration](#prisma-schema-integration)
- [SEO Utilities](#seo-utilities)
- [UI Components](#ui-components)
- [Validation Schemas](#validation-schemas)
- [Styling & Theming](#styling--theming)
- [Related Packages](#related-packages)
- [Documentation Index](#documentation-index)

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.18+ | Required by Next.js 15 |
| Next.js | 14+ | App Router based |
| Prisma | 5.x | `@prisma/client` + CLI |
| PostgreSQL | 13+ | Required for `SearchService` (FTS) |
| React | 18+ | 19 recommended |

> **Note:** `SearchService` is PostgreSQL-only. For MySQL/SQLite, disable search and use `BlogService.listPublished({ search })` with ILIKE fallback.

## Installation

### From npm

```bash
npm install @withwiz/blog-core
# or
pnpm add @withwiz/blog-core
```

### Monorepo (file reference)

```json
{
  "dependencies": {
    "@withwiz/blog-core": "file:./packages/blog-core"
  }
}
```

**Peer dependencies:** `react >=18`, `next >=14`, `@prisma/client >=5`, `zod >=3`

**Optional peers:** `@withwiz/block-editor >=0.1.5`, `isomorphic-dompurify >=2`

## Quick Start

### 1. Prepare the Prisma Schema

Add the blog models to your host project's `prisma/schema.prisma`. See [02-prisma-schema.md](./02-prisma-schema.md) for full details.

Minimal example:

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

### 2. Run Migrations

```bash
npx prisma migrate dev --name init_blog
npx prisma generate
```

### 3. Create the Blog Service

```ts
// src/lib/services/blog.ts
import { PrismaClient } from '@prisma/client';
import { createBlogService, type BlogService } from '@withwiz/blog-core';

const prisma = new PrismaClient();

export const blogService: BlogService = createBlogService(prisma, {
  modelName: 'news',          // Prisma delegate name (model News -> 'news')
  enableTags: true,           // Include tag relations
  enableR2Cleanup: false,     // Set true if using R2 storage
});
```

### 4. Create Your First Post

```ts
const post = await blogService.create(
  {
    slug: 'hello-world',
    category: 'notice',
    title: 'Hello World',
    content: '<p>This is the first post.</p>',
    excerpt: 'A brief summary',
    published: true,
  },
  'user-id-123', // authorId
);
```

### 5. Connect to Next.js Routes

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

## Architecture Overview

```
Host Next.js App
  |
  +-- injects PrismaClient + config
  |
  +-- @withwiz/blog-core
       |
       +-- Services (BlogService, TagService, CommentService, SearchService, SchedulerService)
       +-- Validators (Zod schemas)
       +-- SEO (Metadata, Sitemap, RSS, JSON-LD, OG)
       +-- UI Components (Admin + Public)
       +-- Presets (Block editor configuration)
       +-- i18n (Korean defaults + override)
       +-- Errors (Domain-specific error codes)
```

All services are created via factory functions that accept a `PrismaClient` instance and configuration -- no global state, no hidden dependencies.

---

## Services

### BlogService

The main service for blog post CRUD, public listings, and dashboard stats.

```ts
import { createBlogService } from '@withwiz/blog-core';

const blogService = createBlogService(prisma, {
  modelName: 'news',
  enableTags: true,
  enableR2Cleanup: false,
});
```

#### Configuration

| Field | Type | Default | Description |
|---|---|---|---|
| `modelName` | `string` | -- (required) | Prisma delegate name (e.g., `'news'`, `'blogPost'`) |
| `enableTags` | `boolean` | `false` | Include `tags` relation in queries |
| `enableR2Cleanup` | `boolean` | `false` | Clean up R2 objects on delete/update |
| `r2Helpers` | `R2Helpers` | -- | R2 storage helpers (required when cleanup is enabled) |
| `sanitizeContent` | `(html: string) => string` | Built-in | Custom HTML sanitizer function |

#### Public Methods

```ts
blogService.listPublished({ page, limit, category?, search?, tagSlug?, tagSlugs? })
blogService.getPublishedBySlug(slug)
blogService.getFeatured(limit?)
blogService.getAdjacentPosts(currentId)
blogService.checkSlugAvailable(slug, excludeId?)
```

#### Admin Methods

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

### TagService

Tag CRUD, tag cloud, and related posts.

```ts
import { createTagService } from '@withwiz/blog-core';

const tagService = createTagService(prisma, {
  modelName: 'tag',
  postModelName: 'news',
  postTagModelName: 'postTag',
});
```

```ts
tagService.create({ slug, name, description? })
tagService.getById(id) / tagService.getBySlug(slug)
tagService.update(id, data)
tagService.remove(id)
tagService.listAll({ page?, limit?, search? })
tagService.getTagCloud(limit?)
tagService.getPostsByTag(tagSlug, { page?, limit? })
tagService.getTagsByPost(postId)
tagService.getRelatedPosts(postId, limit?)
```

### CommentService

Threaded comments with moderation, honeypot, and rate limiting.

```ts
import { createCommentService } from '@withwiz/blog-core';

const commentService = createCommentService(prisma, {
  modelName: 'comment',
  autoApprove: false,
  requireLogin: false,
  maxDepth: 2,
  rateLimit: { maxPerHour: 5 },
  spamFilter: (content) => /viagra|casino/i.test(content),
});
```

| Config | Default | Description |
|---|---|---|
| `autoApprove` | `false` | If true, comments are `APPROVED` immediately |
| `requireLogin` | `false` | If true, `context.userId` is required |
| `maxDepth` | `2` | Max nesting depth (root = 1) |
| `rateLimit.maxPerHour` | `5` | Max comments per IP per hour |
| `spamFilter` | -- | Custom spam detection function |

**Comment statuses:** `PENDING` -> `APPROVED` / `REJECTED` / `SPAM`

```ts
commentService.create(data, { userId?, ipHash? })
commentService.listByPost(postId, { includeReplies? })
commentService.listAll({ page?, limit?, status?, postId? })
commentService.updateStatus(id, status)
commentService.bulkUpdateStatus(ids, status)
commentService.remove(id) / commentService.removeMany(ids)
commentService.getPendingCount()
```

### SearchService

PostgreSQL full-text search with tsvector, GIN index, and unaccent.

```ts
import { createSearchService } from '@withwiz/blog-core';

const searchService = createSearchService(prisma, {
  postModelName: 'news',
  tableName: 'news',       // Actual DB table name (for raw SQL)
  lang: 'simple',          // Recommended for Korean + unaccent
});
```

**Required migration SQL:**

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
searchService.buildQuery(input)   // Safe tsquery conversion
```

### SchedulerService

Scheduled publishing with external cron trigger.

```ts
import { createSchedulerService, createSchedulerRoutes } from '@withwiz/blog-core';

const schedulerService = createSchedulerService(prisma, { modelName: 'news' });

// Next.js route handler factory
const routes = createSchedulerRoutes({
  schedulerService,
  cronSecret: process.env.CRON_SECRET!,
});

// app/api/cron/blog-publish/route.ts
export const GET = routes.publishScheduled.GET;
export const POST = routes.publishScheduled.POST;
```

Requests are authenticated via `Authorization: Bearer <CRON_SECRET>`.

**Supported cron platforms:** node-cron, Docker crontab, GitHub Actions, AWS EventBridge, GCP Cloud Scheduler, Vercel Cron.

Creating a scheduled post:

```ts
await blogService.create(
  {
    slug: 'summer-2026',
    title: 'Summer Event',
    content: '...',
    category: 'performance',
    published: false,
    publishedAt: new Date('2026-06-01T09:00:00+09:00'),
  },
  'author-id',
);
```

---

## Prisma Schema Integration

`@withwiz/blog-core` does not run its own migrations. A reference schema is provided at `prisma/blog.prisma` -- copy and adapt it to your host project's `schema.prisma`.

### Custom Model Names

The package supports any model name. If your model is `News` instead of `BlogPost`:

1. Define the model as `News` in your Prisma schema
2. Use `@@map("news")` for the table name
3. Set `modelName: 'news'` in your service config

### Category Strategy

Categories are treated as strings internally. Use either a Prisma enum or plain string:

```prisma
// Option A: enum
enum NewsCategory { notice performance media }

// Option B: string
model News { category String }
```

### Tags/Comments Are Optional

If you don't need tags or comments, simply omit the `Tag`, `PostTag`, and `Comment` models and don't create those services.

---

## SEO Utilities

All functions are pure and dependency-free. Import from `@withwiz/blog-core` or `@withwiz/blog-core/seo`.

| Function | Purpose |
|---|---|
| `generateMetadata(options)` | Next.js-compatible Metadata for detail pages |
| `generateListMetadata(options)` | Metadata for list/tag/category pages |
| `createSitemap(options)` | `SitemapEntry[]` for Next.js `sitemap.ts` |
| `createRSSFeed(options)` | RSS 2.0 XML string |
| `generateJsonLd(options)` | BlogPosting structured data |
| `generateBreadcrumbJsonLd(items)` | BreadcrumbList structured data |
| `prepareOGImageData(post, config)` | Data for OG image rendering |
| `escapeXml(str)` | XML special character escaping |
| `toRfc822(date)` | RFC 822 date formatting |

Example -- detail page metadata:

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

---

## UI Components

### Admin Components

Import from `@withwiz/blog-core/components/admin`:

| Component | Description |
|---|---|
| `BlogManagerClient` | Blog list with search, filters, bulk actions, pagination |
| `BlogEditForm` | Create/edit form with block editor, cover image, attachments, tags |
| `TagPicker` | Multi-select tag widget with autocomplete and creation |
| `CommentModerationPanel` | Comment moderation table with status filters and bulk actions |

### Public Components

Import from `@withwiz/blog-core/components/public`:

| Component | Description |
|---|---|
| `BlogListPage` | Public list page with category tabs, search, tag filter, pagination |
| `BlogDetailPage` | Single post detail with cover, body, attachments, navigation, comments slot |
| `TagBadge` | Single tag badge |
| `TagCloud` | Tag cloud widget |
| `CommentList` | Threaded comment display |
| `CommentForm` | Comment submission form with built-in honeypot |

### Styles

```ts
import '@withwiz/blog-core/styles/public';        // Public pages
import '@withwiz/blog-core/styles/admin';          // Admin pages
import '@withwiz/blog-core/styles/block-editor';   // Block editor
```

### Client/Server Boundary

| Component | Boundary |
|---|---|
| `BlogManagerClient` | `"use client"` |
| `BlogEditForm` | `"use client"` |
| `TagPicker` | `"use client"` |
| `CommentModerationPanel` | `"use client"` |
| `CommentForm` | `"use client"` |
| `BlogListPage` | Server Component OK |
| `BlogDetailPage` | Server Component OK |
| `CommentList` | Server or Client |

---

## Validation Schemas

All Zod schemas are available from `@withwiz/blog-core` or `@withwiz/blog-core/validators`.

| Schema | Purpose |
|---|---|
| `slugSchema` | URL-safe slug (lowercase + alphanumeric + hyphens) |
| `optionalUrlSchema` | Safe URL (blocks `javascript:`, `data:`, `file:`) |
| `CreateBlogPostSchema` | Post creation |
| `UpdateBlogPostSchema` | Post update (partial) |
| `BulkUpdateSchema` | Bulk operations |
| `CreateTagSchema` | Tag creation |
| `UpdateTagSchema` | Tag update |
| `CreateCommentSchema` | Comment creation (includes honeypot field) |
| `UpdateCommentStatusSchema` | Comment status change |

### Schema Factory

Customize constraints using the factory:

```ts
import { createBlogSchemas } from '@withwiz/blog-core';

const { CreateBlogPostSchema, UpdateBlogPostSchema } = createBlogSchemas({
  maxAttachments: 10,
});
```

### Usage in API Routes

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

---

## Styling & Theming

All styles are plain CSS with CSS custom properties (`--blog-*`). Override them in your host project's `globals.css`:

```css
:root {
  --blog-color-accent: #ff4081;
  --blog-color-card-bg: #fffefa;
  --blog-font-heading: "Playfair Display", serif;
}
```

### Dark Mode

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

See [11-styling.md](./11-styling.md) for the complete list of CSS variables.

---

## Related Packages

| Package | Description |
|---|---|
| `@withwiz/blog-system` | Single/multi-tenant SaaS blog system built on blog-core |
| `@withwiz/toolkit` | Middleware, auth, cache, logger (peer) |
| `@withwiz/block-editor` | Block-based rich text editor (optional peer) |

---

## Documentation Index

| Document | Contents |
|---|---|
| [01-getting-started.md](./01-getting-started.md) | Prerequisites, installation, first post example |
| [02-prisma-schema.md](./02-prisma-schema.md) | Prisma model integration, `@@map`, model name mapping |
| [03-blog-service.md](./03-blog-service.md) | Full `createBlogService` API reference |
| [04-tags.md](./04-tags.md) | Tag CRUD, related posts, tag cloud |
| [05-comments.md](./05-comments.md) | Comment tree, moderation, honeypot, rate limiting |
| [06-search.md](./06-search.md) | PostgreSQL FTS (tsvector / GIN / unaccent) setup |
| [07-scheduler.md](./07-scheduler.md) | Scheduled publishing, cross-platform cron integration |
| [08-seo.md](./08-seo.md) | Metadata / Sitemap / RSS / JSON-LD / OG |
| [09-components.md](./09-components.md) | Admin / Public UI components |
| [10-validators.md](./10-validators.md) | Zod schemas and custom extensions |
| [11-styling.md](./11-styling.md) | CSS variables and theming guide |

## License

MIT
