# @withwiz/blog-core

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
npm install @withwiz/blog-core
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
import { createBlog } from '@withwiz/blog-core';
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
  // Secrets are INJECTED by the host. This library never reads process.env.
  // `commentHmacSecret` is REQUIRED when comments are enabled — createBlog()
  // throws at construction if it is missing (fail-closed).
  commentHmacSecret: hostCommentHmacSecret, // host-provided (e.g. from host config/secret manager)
  features: {
    tags: true,
    comments: { enabled: true, autoApprove: false, maxDepth: 3 },
    search: true,
    scheduler: { enabled: true, cronSecret: hostCronSecret }, // host-provided
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
import { BlogManagerClient } from '@withwiz/blog-core/components/admin';

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
import { BlogManagerClient } from '@withwiz/blog-core/components/admin';

// Or import individual components:
import {
  BlogListView,
  BlogEditForm,
  BlogDashboard,
  TagPicker,
  CommentModerationPanel,
} from '@withwiz/blog-core/components/admin';
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
} from '@withwiz/blog-core/components/public';
```

Public components do **not** depend on `next/link`. They render a plain `<a>`
by default. To get client-side navigation/prefetch (e.g. Next.js), inject your
own link adapter via `BlogThemeProvider` — the same design-system injection
used for Button/Card/etc.:

```tsx
import NextLink from 'next/link';
import { BlogThemeProvider } from '@withwiz/blog-core/components/admin';

<BlogThemeProvider
  components={{
    Link: ({ href, children, ...rest }) => (
      <NextLink href={href} {...rest}>{children}</NextLink>
    ),
  }}
>
  {/* BlogListPage / BlogDetailPage / TagBadge / TagCloud ... */}
</BlogThemeProvider>;
```

Without a provider, `useBlogUI()` falls back to the built-in `DefaultLink`
(plain `<a>`), so the package stays platform-agnostic.

### Block Editor (Extended UI)

Requires `@withwiz/block-editor` as an optional peer dependency.

```tsx
import { BlockEditorForm, createBlockPreset } from '@withwiz/blog-core/components/admin/editor';
```

## Headless Mode

Use only services and routes — no UI components needed.

```typescript
import { createBlog } from '@withwiz/blog-core';
import type { BlogService, BlogListItem, PaginatedResult } from '@withwiz/blog-core/types';

const blog = createBlog({ /* config */ });

// Direct service calls
const posts = await blog.services.posts.listPublished({ page: 1, limit: 10 });

// Or just wire route handlers
export const GET = blog.routes.public.posts.list.GET;
```

All types, utilities, error codes, and i18n strings are importable from separate subpaths:

```typescript
import type { BlogListItem, CategoryTheme } from '@withwiz/blog-core/types';
import { generateSlug, buildPaginatedResult } from '@withwiz/blog-core/utils';
import { BlogError, BLOG_ERROR_CODES } from '@withwiz/blog-core/errors';
import { resolveI18n, DEFAULT_I18N_KO } from '@withwiz/blog-core/i18n';
import { CreateBlogPostSchema } from '@withwiz/blog-core/validators';
import { generateMetadata, createRSSFeed } from '@withwiz/blog-core/seo';
import { createS3StorageAdapter } from '@withwiz/blog-core/storage';
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
import { createS3StorageAdapter } from '@withwiz/blog-core/storage';

// Credentials are INJECTED by the host. This library never reads process.env;
// the host reads its own config/secret manager and passes plain values.
const storage = createS3StorageAdapter({
  bucket: 'my-bucket',
  region: 'auto',
  endpoint: hostR2Endpoint,
  accessKeyId: hostR2AccessKey,
  secretAccessKey: hostR2SecretKey,
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
} from '@withwiz/blog-core/seo';
```

## Default Theme

### Overview

The theme system has two layers:

| Layer | Variable pattern | Role |
|-------|-----------------|------|
| **Theme layer** | `--blog-theme-default-admin-*` / `--blog-theme-default-public-*` | Holds actual color/size values |
| **Component layer** | `--blog-admin-*` / `--blog-public-*` | What components reference (points to theme layer) |

Components only ever reference `var(--blog-admin-accent)`. The value of `--blog-admin-accent` is supplied by `var(--blog-theme-default-admin-accent)` in the theme layer. Override the theme layer to change colors globally; override the component layer for fine-grained control.

### Basic usage (no changes needed)

`rootVars()` / `publicRootVars()` merge both layers and are applied internally by the built-in components. No extra setup required.

```tsx
import { BlogManagerClient } from '@withwiz/blog-core/components/admin';
import { BlogListPage } from '@withwiz/blog-core/components/public';
```

### Inject theme vars directly (custom wrapper)

```tsx
import { adminThemeVars, publicThemeVars } from '@withwiz/blog-core/themes';

<div style={adminThemeVars()}>
  <BlogManagerClient ... />
</div>

<div style={publicThemeVars()}>
  <BlogListPage ... />
</div>
```

### Customization — override theme variables (recommended)

Override `--blog-theme-default-*` variables to retheme all components at once:

```css
/* globals.css or :root */
:root {
  /* Admin UI */
  --blog-theme-default-admin-accent: #7c3aed;
  --blog-theme-default-admin-accent-hover: #6d28d9;
  --blog-theme-default-admin-bg: #f5f3ff;

  /* Public UI */
  --blog-theme-default-public-accent: #059669;
  --blog-theme-default-public-accent-hover: #047857;
}
```

### Fine-grained override — component variables

```tsx
<div style={{ '--blog-admin-accent': '#e11d48' } as React.CSSProperties}>
  <TagPicker ... />
</div>
```

### Theme variable reference

#### Admin UI (`--blog-theme-default-admin-*`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `--blog-theme-default-admin-bg` | `#fafafa` | Background |
| `--blog-theme-default-admin-bg-card` | `#ffffff` | Card background |
| `--blog-theme-default-admin-bg-input` | `#ffffff` | Input background |
| `--blog-theme-default-admin-bg-hover` | `#f0f0f0` | Hover background |
| `--blog-theme-default-admin-bg-selected` | `#e8f0fe` | Selected background |
| `--blog-theme-default-admin-text` | `#171717` | Body text |
| `--blog-theme-default-admin-text-muted` | `#737373` | Muted text |
| `--blog-theme-default-admin-text-dim` | `#a3a3a3` | Dim text |
| `--blog-theme-default-admin-border` | `#e5e5e5` | Border |
| `--blog-theme-default-admin-border-focus` | `#bbb` | Focus border |
| `--blog-theme-default-admin-accent` | `#4A90D9` | Accent color |
| `--blog-theme-default-admin-accent-hover` | `#3a7bc8` | Accent hover |
| `--blog-theme-default-admin-danger` | `#ef4444` | Danger |
| `--blog-theme-default-admin-danger-hover` | `#dc2626` | Danger hover |
| `--blog-theme-default-admin-success` | `#22c55e` | Success |
| `--blog-theme-default-admin-warning` | `#f59e0b` | Warning |
| `--blog-theme-default-admin-info` | `#3b82f6` | Info |
| `--blog-theme-default-admin-radius` | `6px` | Border radius |
| `--blog-theme-default-admin-radius-sm` | `4px` | Small border radius |
| `--blog-theme-default-admin-font` | system-ui | Font family |
| `--blog-theme-default-admin-font-mono` | SF Mono / Fira Code | Monospace font |

#### Public UI (`--blog-theme-default-public-*`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `--blog-theme-default-public-bg` | `#ffffff` | Background |
| `--blog-theme-default-public-bg-card` | `#f9f9f9` | Card background |
| `--blog-theme-default-public-bg-hover` | `#f0f0f0` | Hover background |
| `--blog-theme-default-public-text` | `#1a1a1a` | Body text |
| `--blog-theme-default-public-text-muted` | `#6b7280` | Muted text |
| `--blog-theme-default-public-text-dim` | `#9ca3af` | Dim text |
| `--blog-theme-default-public-border` | `#e5e7eb` | Border |
| `--blog-theme-default-public-accent` | `#2563eb` | Accent color |
| `--blog-theme-default-public-accent-hover` | `#1d4ed8` | Accent hover |
| `--blog-theme-default-public-danger` | `#ef4444` | Danger |
| `--blog-theme-default-public-success` | `#22c55e` | Success |
| `--blog-theme-default-public-radius` | `8px` | Border radius |
| `--blog-theme-default-public-radius-sm` | `4px` | Small border radius |
| `--blog-theme-default-public-font` | system-ui | Font family |
| `--blog-theme-default-public-font-size` | `15px` | Base font size |
| `--blog-theme-default-public-max-width` | `1200px` | Container max width |

### Exports

```typescript
import {
  ADMIN_THEME_DEFAULTS,  // Record<string, string> — raw default values
  ADMIN_VAR_MAP,         // Record<string, string> — component var → theme var mapping
  adminThemeVars,        // () => CSSProperties — both layers merged

  PUBLIC_THEME_DEFAULTS,
  PUBLIC_VAR_MAP,
  publicThemeVars,
} from '@withwiz/blog-core/themes';
```

## Error Handling

```typescript
import { BlogError, BLOG_ERROR_CODES } from '@withwiz/blog-core/errors';

// API responses follow a consistent format:
// Success: { success: true, data: { ... } }
// Error:   { success: false, error: { code: "POST_NOT_FOUND", message: "..." } }
```

## Exports Map

| Subpath | Description |
|---------|-------------|
| `@withwiz/blog-core` | Main entry (createBlog + re-exports) |
| `@withwiz/blog-core/types` | TypeScript type definitions |
| `@withwiz/blog-core/services` | Service factory functions |
| `@withwiz/blog-core/routes` | Route handler factories |
| `@withwiz/blog-core/utils` | Utility functions |
| `@withwiz/blog-core/errors` | BlogError + error codes |
| `@withwiz/blog-core/seo` | SEO utilities |
| `@withwiz/blog-core/i18n` | i18n strings + resolveI18n |
| `@withwiz/blog-core/validators` | Zod schemas |
| `@withwiz/blog-core/storage` | Storage adapter |
| `@withwiz/blog-core/themes` | Default theme variables + injection helpers |
| `@withwiz/blog-core/components/admin` | Admin UI components |
| `@withwiz/blog-core/components/public` | Public UI components |
| `@withwiz/blog-core/components/admin/editor` | Block Editor integration |

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
| `isomorphic-dompurify` >= 2 | Optional (strong HTML sanitizer; without it a best-effort regex fallback is used and warns once) |

Zero dependency on `@withwiz/blog-system` or `@withwiz/pms`.

## Injection Contract & Server/Client Boundaries

This package **never reads `process.env`** (or any system environment
variable). All secrets/credentials/strategy are **injected** by the host.
Reading config from the environment is the host's responsibility — the host
reads its own config/secret manager and passes plain values in.

- **`commentHmacSecret` is required when comments are enabled.** It is used to
  HMAC client IPs (privacy). If missing, `createBlog()` **throws at
  construction** (fail-closed) — there is no env fallback and no hardcoded
  default.
- **Cron auth (`scheduler.cronSecret`)** is injected and compared in constant
  time.
- **IP header trust is configurable** via `features.comments.ipHeader`:
  `'auto'` (default: `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for[0]`),
  `'none'` (trust no proxy header), or an explicit header name.
- **Server/client separation:** server entries (`.`, `/services`, `/routes`,
  `/storage`) are server-only; UI lives under `/components/*` (client). The
  boundary is enforced by separate entry points + `'use client'` directives +
  the server modules' Node-only nature (`node:crypto`, Prisma). Client barrels
  additionally carry a `client-only` guard, which throws **only** if a client
  component is pulled into the React Server Components server graph (its intended
  protection) and is a harmless no-op everywhere else (plain Node, SSR, tests).
  No `server-only` marker is used: it would also throw in legitimate non-RSC
  server environments (plain Node scripts, non-Next SSR, test runners), so the
  package stays platform-agnostic and runs under any runtime.
- **Dual package:** ESM is `*.mjs`, CommonJS is `*.cjs`, with conditional
  `exports` (`import`/`require` each carrying their own types). Required
  because `package.json` is `"type":"module"`.

## License

MIT
