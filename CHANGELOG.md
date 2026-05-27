# Changelog

All notable changes to `@withwiz/blog-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-05-27

Major rewrite of `@withwiz/blog-core`. Not API-compatible with `0.1.0`.

### Added
- Dual CJS/ESM packaging via tsup, with per-subpath `types`/`import`/`require` exports
  (`./types`, `./services`, `./routes`, `./utils`, `./errors`, `./seo`, `./i18n`,
  `./validators`, `./storage`, `./themes`, `./components/admin`, `./components/public`,
  `./components/admin/editor`).
- Design-system injection: platform-agnostic admin/public components consume UI primitives
  via `BlogThemeProvider` + `useBlogUI`, so host apps can plug in their own design system.
- Default theme files (`themes/default-admin`, `themes/default-public`) exposing
  `--blog-theme-default-{admin,public}-*` CSS custom properties; admin tokens renamed
  `--blog-*` → `--blog-admin-*` for namespace isolation.
- Admin post list: page-size selector, author column, separate updated-at column,
  centered headers, full `YYYY-MM-DD HH:mm:ss` timestamps.
- Block editor entry point (`./components/admin/editor`) with `BlockEditorForm` +
  `createBlockPreset` helpers, gated behind optional `@withwiz/block-editor` peer.
- Zero-dependency `node:test` runtime suite (`test/runtime/*.test.mjs`) covering
  validators, theme exports, slug/pagination utilities, and i18n defaults.
- Author/category theme metadata: `createCategoryThemeVars` + per-category color tokens.
- Storage adapter (`./storage`) for S3/R2/MinIO with safe-by-default deletion fallback
  when `@aws-sdk/client-s3` is not installed.
- Repository, bugs, and homepage metadata in `package.json`.

### Changed
- **BREAKING**: package renamed from `@withwiz/blog-core-v2` (pre-release) /
  `@withwiz/blog-core@0.1.0` → `@withwiz/blog-core@2.0.0`.
- **BREAKING**: client-only exports moved out of the root entry; UI components are now
  only available under `./components/admin`, `./components/public`,
  `./components/admin/editor`. Root entry is server-safe.
- **BREAKING**: route handlers consolidated through `makeRouteKit` helpers
  (`withAuth`, `withPublic`, `handleError`); custom error labels prefixed
  `[@withwiz/blog-core]`.
- **BREAKING**: secrets and runtime config are inject-only — admin routes fail closed
  when auth is unconfigured, and the library never reads `process.env` directly.
  Hosts must pass every secret through `createBlog()` options.
- **BREAKING**: upgraded to Zod v4 — internal validators use `error.issues` and
  `PropertyKey[]` paths instead of v3's `error.errors` shape.
- `@tiptap/*` packages moved from `dependencies` to optional `peerDependencies`
  (`>=3.0.0`); install them only if you use the rich-text editor.
- Admin layout: edit:preview split ratio shifted from 1:1 to 4:7; title/subtitle
  spacing widened.

### Removed
- **BREAKING**: bundled `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, and
  `@tiptap/extension-link` (now optional peers).
- Direct `process.env` reads inside the library.

### Security
- Admin routes are fail-closed when authentication is not configured.
- Comment IP hashing requires an injected secret; the comment route refuses to start
  without one.
- HTML sanitization warns and degrades safely when `isomorphic-dompurify` is missing.

### Migration from 0.1.0
1. Replace the dependency: `npm uninstall @withwiz/blog-core && npm install @withwiz/blog-core@^2`.
2. Move any UI imports from the root entry to the appropriate subpath
   (`@withwiz/blog-core/components/admin`, `/components/public`,
   `/components/admin/editor`).
3. Inject auth, IP-hash secret, and storage config through `createBlog()` options —
   `process.env` lookups inside the library no longer exist.
4. Install rich-text peers only if needed:
   `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link`.
5. If you consume Zod errors emitted by validators, switch from `error.errors` to
   `error.issues`.

## [0.1.0] — 2026-05-10

Initial release.
