# blog-core-v2

> A complete, self-contained blog package for Next.js App Router. Install, migrate, call `createBlog()` — your blog is live.

[한국어 문서](./README.ko.md)

## Features

- **Post CRUD** — Create, list, detail, update, delete, auto-slug, bulk operations
- **Tag System** — N:M relations, tag cloud, per-tag filtering (toggleable)
- **Comments** — Threaded replies, honeypot spam prevention, IP rate limiting, moderation (toggleable)
- **Full-Text Search** — PostgreSQL tsvector-based FTS with highlighting (toggleable)
- **Scheduled Publishing** — Future publish dates, external cron integration (toggleable)
- **SEO** — Next.js Metadata, JSON-LD, RSS feed, sitemap, OG image helpers
- **i18n** — 200+ Korean default strings, partial override support
- **Admin UI** — Post list, edit form, dashboard, tag picker, comment moderation
- **Public UI** — Post list, detail, comments, tag cloud
- **Block Editor** — Optional `@withwiz/block-editor` integration
- **Category Themes** — CSS custom property-based category styling
- **Storage Adapter** — S3/R2/MinIO compatible file management
- **Headless Mode** — Use services + routes without any UI components
- **Zod Validation** — Schemas for all inputs with i18n error messages

## Quick Start

### 1. Install

```bash
npm install blog-core-v2
```

### 2. Copy Prisma Schema

Copy the contents of the package's `prisma/blog.prisma` into your project's Prisma schema file.

```prisma
// Add to your schema.prisma
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

// Also copy Tag, PostTag, Comment models (see prisma/blog.prisma)
```

### 3. Run Migration

```bash
npx prisma migrate dev --name add-blog
```

### 4. Initialize Blog

```typescript
// lib/blog.ts
import { createBlog } from 'blog-core-v2';
import { prisma } from '@/lib/prisma';

export const blog = createBlog({
  prisma,
  modelName: 'blogPost',
  categories: {
    news: {
      key: 'news', main: '#2563eb', heroColor: '37, 99, 235',
      bgTint: '#eff6ff', bgQuote: '#dbeafe',
      border: '#93c5fd', divider: '#bfdbfe', label: 'News',
    },
    tech: {
      key: 'tech', main: '#16a34a', heroColor: '22, 163, 74',
      bgTint: '#f0fdf4', bgQuote: '#dcfce7',
      border: '#86efac', divider: '#bbf7d0', label: 'Tech',
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
```

### 5. Wire API Routes

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
```

### 6. Add Admin Page

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
    />
  );
}
```

## Configuration Reference

```typescript
interface BlogConfig {
  // Required
  prisma: PrismaClientLike;
  modelName: string;                        // Prisma model name (e.g. 'blogPost')
  categories: Record<string, CategoryTheme>;
  basePath: string;                         // Public URL base (e.g. '/blog')
  adminBasePath: string;                    // Admin URL (e.g. '/admin/blog')
  apiBasePath: string;                      // Public API (e.g. '/api/blog')
  adminApiBasePath: string;                 // Admin API (e.g. '/api/admin/blog')

  // Optional
  tagModelName?: string;                    // default: 'tag'
  postTagModelName?: string;                // default: 'postTag'
  commentModelName?: string;                // default: 'comment'
  pageSize?: number;                        // default: 12
  maxAttachments?: number;                  // default: 5
  enableCta?: boolean;                      // default: true
  enableAttachments?: boolean;              // default: true
  uploadEndpoint?: string;

  // Feature toggles
  features?: {
    tags?: boolean;                         // default: true
    comments?: CommentFeatureConfig;
    search?: boolean;                       // default: true
    scheduler?: SchedulerFeatureConfig;
  };

  // Adapters
  storage?: StorageAdapter;
  authMiddleware?: AuthMiddleware;

  // Callbacks
  onViewCount?: (entityType: string, ids: string[]) => Promise<Map<string, number>>;
  sanitizeContent?: (html: string | null | undefined) => string | null;

  // i18n
  i18n?: Partial<BlogI18nStrings>;
}
```

## Feature Toggles

Disabled features return `null` for both services and routes.

```typescript
const blog = createBlog({
  features: {
    tags: false,                     // Tag system disabled
    comments: { enabled: false },    // Comments disabled
    search: false,                   // Search disabled
    scheduler: { enabled: false },   // Scheduler disabled
  },
});

// blog.services.tags === null
// blog.routes.public.tags === null
```

## API Route Map

### Public

| Route | Method | Handler |
|-------|--------|---------|
| `/posts` | GET | `blog.routes.public.posts.list.GET` |
| `/posts/[slug]` | GET | `blog.routes.public.posts.detail.GET` |
| `/posts/featured` | GET | `blog.routes.public.posts.featured.GET` |
| `/tags` | GET | `blog.routes.public.tags?.list.GET` |
| `/tags/cloud` | GET | `blog.routes.public.tags?.cloud.GET` |
| `/[postId]/comments` | GET | `blog.routes.public.comments?.list.GET` |
| `/[postId]/comments` | POST | `blog.routes.public.comments?.create.POST` |
| `/search` | GET | `blog.routes.public.search?.search.GET` |

### Admin

| Route | Method | Handler |
|-------|--------|---------|
| `/posts` | GET, POST, DELETE | `blog.routes.admin.posts.list.*` |
| `/posts/[id]` | GET, PUT, DELETE | `blog.routes.admin.posts.detail.*` |
| `/posts/[id]/publish` | PATCH | `blog.routes.admin.posts.publish.PATCH` |
| `/posts/bulk` | PATCH, DELETE | `blog.routes.admin.posts.bulk.*` |
| `/posts/slug-check` | GET | `blog.routes.admin.posts.slugCheck.GET` |
| `/dashboard` | GET | `blog.routes.admin.posts.dashboard.GET` |
| `/tags` | GET, POST | `blog.routes.admin.tags?.list.*` |
| `/tags/[id]` | GET, PUT, DELETE | `blog.routes.admin.tags?.detail.*` |
| `/comments` | GET | `blog.routes.admin.comments?.list.GET` |
| `/comments/[id]` | PATCH, DELETE | `blog.routes.admin.comments?.detail.*` |
| `/comments/bulk` | PATCH, DELETE | `blog.routes.admin.comments?.bulk.*` |
| `/scheduler/process` | POST, GET | `blog.routes.admin.scheduler?.process.*` |
| `/scheduler/pending` | GET | `blog.routes.admin.scheduler?.pending.GET` |
| `/scheduler/[id]/cancel` | POST | `blog.routes.admin.scheduler?.cancel.POST` |

## UI Components

### Admin UI

```tsx
import { BlogManagerClient } from 'blog-core-v2/components/admin';

// Or import individual components:
import {
  BlogListView,
  BlogEditForm,
  BlogDashboard,
  TagPicker,
  CommentModerationPanel,
} from 'blog-core-v2/components/admin';
```

### Public UI

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

### Block Editor (Extended UI)

Requires `@withwiz/block-editor` as an optional peer dependency.

```tsx
import { BlockEditorForm, createBlockPreset } from 'blog-core-v2/components/admin/editor';
```

## Headless Mode

Use only services and routes — no UI components needed.

```typescript
import { createBlog } from 'blog-core-v2';
import type { BlogService, BlogListItem, PaginatedResult } from 'blog-core-v2/types';

const blog = createBlog({ /* config */ });

// Direct service calls
const posts = await blog.services.posts.listPublished({ page: 1, limit: 10 });

// Or just wire route handlers
export const GET = blog.routes.public.posts.list.GET;
```

All types, utilities, error codes, and i18n strings are importable from separate subpaths:

```typescript
import type { BlogListItem, CategoryTheme } from 'blog-core-v2/types';
import { generateSlug, buildPaginatedResult } from 'blog-core-v2/utils';
import { BlogError, BLOG_ERROR_CODES } from 'blog-core-v2/errors';
import { resolveI18n, DEFAULT_I18N_KO } from 'blog-core-v2/i18n';
import { CreateBlogPostSchema } from 'blog-core-v2/validators';
import { generateMetadata, createRSSFeed } from 'blog-core-v2/seo';
import { createS3StorageAdapter } from 'blog-core-v2/storage';
```

## i18n

Korean defaults are built-in. Override only the keys you need:

```typescript
const blog = createBlog({
  i18n: {
    adminListTitle: 'News Manager',
    adminCreateButton: '+ New Article',
    publicAllCategory: 'All',
  },
});
```

## Storage Adapter

For S3-compatible storage (R2, MinIO, etc.):

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

When provided, the adapter automatically cleans up files (cover images, inline images, attachments) on post deletion.

## SEO Utilities

```typescript
import {
  generateMetadata,
  generateJsonLd,
  generateBreadcrumbJsonLd,
  createRSSFeed,
  createSitemap,
  prepareOGImageData,
} from 'blog-core-v2/seo';
```

## Error Handling

```typescript
import { BlogError, BLOG_ERROR_CODES } from 'blog-core-v2/errors';

// API responses follow a consistent format:
// Success: { success: true, data: { ... } }
// Error:   { success: false, error: { code: "POST_NOT_FOUND", message: "..." } }
```

## Exports Map

| Subpath | Description |
|---------|-------------|
| `blog-core-v2` | Main entry (createBlog + re-exports) |
| `blog-core-v2/types` | TypeScript type definitions |
| `blog-core-v2/services` | Service factory functions |
| `blog-core-v2/routes` | Route handler factories |
| `blog-core-v2/utils` | Utility functions |
| `blog-core-v2/errors` | BlogError + error codes |
| `blog-core-v2/seo` | SEO utilities |
| `blog-core-v2/i18n` | i18n strings + resolveI18n |
| `blog-core-v2/validators` | Zod schemas |
| `blog-core-v2/storage` | Storage adapter |
| `blog-core-v2/components/admin` | Admin UI components |
| `blog-core-v2/components/public` | Public UI components |
| `blog-core-v2/components/admin/editor` | Block Editor integration |

All subpaths support ESM, CJS, and TypeScript types.

## Peer Dependencies

| Package | Required |
|---------|----------|
| `@prisma/client` >= 5 | Yes |
| `next` >= 14 | Yes |
| `react` >= 18 | Yes |
| `zod` >= 3 | Optional (for validators) |
| `@aws-sdk/client-s3` | Optional (for S3 adapter) |
| `@withwiz/block-editor` | Optional (for Block Editor) |

Zero dependency on `@withwiz/blog-system` or `@withwiz/pms`.

## License

MIT
