# Sprint Plan Overview

blog-core-v2 전체 스펙을 7개 스프린트로 분할한다. 각 스프린트는 이전 스프린트의 산출물 위에 구축되며, 매 스프린트 종료 시 Evaluator가 검증 가능한 상태여야 한다.

## Sprint 1: Foundation — 패키지 스캐폴딩, 핵심 타입, BlogService, 라우트 핸들러 팩토리, createBlog()

패키지 빌드 파이프라인(tsup + TypeScript), Prisma 스키마, 핵심 데이터 타입, BlogService(포스트 CRUD 전체), API 라우트 핸들러 팩토리(Public + Admin 포스트 라우트), `createBlog()` 팩토리 함수, 에러 시스템(BlogError + BLOG_ERROR_CODES), 기본 유틸리티(slug, pagination, sanitizer, ip-hash)를 구현한다.

## Sprint 2: Tags + Comments — TagService, CommentService, 관련 라우트

태그 CRUD(TagService), 태그 클라우드, 포스트-태그 N:M 관계 동기화, 댓글/대댓글(CommentService), 허니팟 스팸 방지, IP 해시 레이트 리밋, 모더레이션 4단계 상태, 태그/댓글 Public + Admin 라우트 핸들러를 구현한다. feature 토글(`features.tags`, `features.comments`)이 동작해야 한다.

## Sprint 3: Search + Scheduler + SEO — SearchService, SchedulerService, SEO 유틸리티

PostgreSQL Full-Text Search(tsvector/to_tsquery) 기반 SearchService, 예약 발행 SchedulerService(process/pending/cancel), SEO 유틸리티 전체(generateMetadata, JSON-LD, RSS, Sitemap, OG Image), 관련 라우트 핸들러를 구현한다. feature 토글(`features.search`, `features.scheduler`)이 동작해야 한다.

## Sprint 4: i18n + Validators + Storage Adapter — i18n 프레임워크, Zod 스키마, StorageAdapter

150+ 키의 i18n 문자열 인터페이스 + 한국어 기본값, `resolveI18n()` 병합 함수, 모든 입력에 대한 Zod 스키마(팩토리 함수로 i18n 에러 메시지 주입), StorageAdapter 인터페이스 + S3 호환 기본 어댑터, 글 삭제 시 스토리지 파일 자동 정리 로직을 구현한다.

## Sprint 5: Basic Admin UI — 관리자 목록, 편집 폼, 대시보드, 태그 피커, 댓글 모더레이션

React 클라이언트 컴포넌트로 관리자 UI를 구현한다: 글 목록(페이지네이션, 검색, 카테고리 필터, 정렬, 일괄 작업), 글 편집 폼(slug 자동 생성/중복 체크, 대표 이미지 드롭존, 첨부파일 관리, CTA 편집, 공개/추천 토글), 미리보기(상세/목록), 태그 피커, 댓글 모더레이션 패널, 대시보드를 구현한다.

## Sprint 6: Public UI + Block Editor — 공개 목록/상세, 댓글 컴포넌트, 태그 클라우드, Block Editor 통합

공개 페이지 UI 컴포넌트(글 목록, 글 상세, 이전/다음 네비게이션, 첨부파일, CTA 버튼), 댓글 목록(트리 구조) + 작성 폼, 태그 클라우드/배지, `@withwiz/block-editor` 선택적 통합(확장 에디터 컴포넌트, 프리셋, CTA 블록 직렬화)을 구현한다.

## Sprint 7: Integration + Polish — 카테고리 테마, Headless 모드 검증, exports map 완성, 통합 테스트

카테고리 테마(CSS 변수 기반), 조회수 콜백(`onViewCount`) 통합, package.json exports map 최종 검증, Headless 모드(UI 없이 services + routes만 사용) 동작 확인, CSS 스코핑(전역 스타일 오염 방지), 전체 빌드/타입 체크 통과, 통합 테스트를 수행한다.

---

# Sprint 1 Contract: Foundation

## 목표

blog-core-v2 패키지의 기반을 구축한다. 이 스프린트 완료 후, 호스트 프로젝트가 `createBlog()`를 호출하면 포스트 CRUD API가 즉시 동작하는 상태가 되어야 한다.

## 구현할 기능

### 1. 패키지 스캐폴딩

- `package.json` — name: `blog-core-v2`, tsup 빌드, exports map (초기 엔트리), peerDependencies (`@prisma/client`, `next`, `react`, `zod`)
- `tsconfig.json` — strict, JSX react-jsx, module ESNext, moduleResolution bundler
- `tsup.config.ts` — 다중 엔트리포인트, format: ['esm', 'cjs'], dts: true, splitting: true
- 디렉토리 구조: `src/`, `prisma/`

### 2. Prisma 스키마 (`prisma/blog.prisma`)

- BlogPost, Tag, PostTag, Comment 모델 — spec.md 섹션 5의 데이터 모델을 정확히 반영
- CommentStatus enum (PENDING, APPROVED, REJECTED, SPAM)
- 인덱스: `[published, publishedAt DESC]`, `[published, featured, publishedAt DESC]`, `[category]`
- 참고: 호스트가 모델명/관계를 자유롭게 변경할 수 있도록 문서화

### 3. 핵심 타입 (`src/types/`)

- `blog.ts` — Attachment, BlogListItem, BlogDetail, BlogNav, CreateBlogPostInput, UpdateBlogPostInput, CategoryTheme, DashboardStats
- `comment.ts` — Comment, CommentStatus, CreateCommentInput, UpdateCommentStatusInput
- `tag.ts` — Tag, TagWithCount, CreateTagInput, UpdateTagInput
- `common.ts` — PaginatedResult<T>, SortOrder
- `config.ts` — BlogConfig (createBlog 설정), BlogFeatures (feature 토글)
- `index.ts` — 모든 타입 re-export

### 4. 에러 시스템 (`src/errors/`)

- `BlogError` 클래스 — code(BlogErrorCode) + message
- `BLOG_ERROR_CODES` 상수 객체 — 댓글, 태그, 포스트, 공통 에러 코드
- `BlogErrorCode` union 타입

### 5. 유틸리티 (`src/utils/`)

- `slug.ts` — generateSlug(), isValidSlug()
- `pagination.ts` — buildPaginatedResult()
- `html-sanitizer.ts` — sanitizeHtmlContent(), createSanitizer()
- `ip-hash.ts` — hashIp(), createIpHasher()
- `date.ts` — toLocalDatetime(), formatDateTime(), formatDate(), formatDateISO(), formatDateRelative()
- `file-helpers.ts` — formatFileSize(), getFileIcon()
- `index.ts` — 모든 유틸리티 re-export

### 6. BlogService (`src/services/blog.service.ts`)

spec.md F1(포스트 CRUD) + F18(조회수 콜백 인터페이스)를 구현한다:

- **Public 메서드**:
  - `listPublished(options)` — 공개 글 목록 (page, limit, category, search, tagSlug)
  - `getPublishedBySlug(slug)` — 공개 글 상세
  - `getFeatured(limit?)` — 추천 글 목록
  - `getAdjacentPosts(currentId)` — 이전/다음 글
  - `checkSlugAvailable(slug, excludeId?)` — slug 중복 확인

- **Admin 메서드**:
  - `listAll(options)` — 관리자 글 목록 (page, limit, category, published, search, sortBy)
  - `getById(id)` — 관리자 글 상세
  - `create(data, authorId)` — 글 생성 (slug 자동 suffix)
  - `update(id, data)` — 글 수정 (태그 동기화 포함)
  - `remove(id)` — 글 삭제
  - `removeMany(ids)` — 일괄 삭제
  - `togglePublish(id)` — 공개/비공개 토글
  - `bulkUpdatePublished(ids, published)` — 일괄 공개/비공개
  - `bulkUpdateFeatured(ids, featured)` — 일괄 추천
  - `getDashboardStats()` — 대시보드 통계

- PrismaDelegate 덕 타이핑 (호스트 Prisma 인스턴스에서 모델명 기반 접근)
- `onViewCount` 콜백 인터페이스 (optional)
- slug 중복 시 자동 suffix(-2, -3...)
- HTML 콘텐츠 새니타이즈

### 7. API 라우트 핸들러 팩토리 (`src/routes/`)

Next.js App Router 호환 라우트 핸들러를 구조화된 객체로 반환한다:

- `createPostRoutes(blogService, config)` → 포스트 관련 라우트 핸들러 맵:
  - **Public**: `GET /posts` (목록), `GET /posts/[slug]` (상세), `GET /posts/featured` (추천)
  - **Admin**: `GET/POST /admin/posts`, `GET/PUT/DELETE /admin/posts/[id]`, `PATCH /admin/posts/[id]/publish`, `PATCH /admin/posts/bulk`, `DELETE /admin/posts` (일괄), `GET /admin/posts/slug-check`, `GET /admin/dashboard`
- 각 핸들러는 `(req: NextRequest, context?: { params: ... }) => Promise<NextResponse>` 시그니처
- BlogError를 HTTP 상태 코드로 변환 (`{ success: false, error: { code, message } }`)
- 성공 응답: `{ success: true, data: ... }`

### 8. createBlog() 팩토리 함수 (`src/index.ts`)

```typescript
function createBlog(config: BlogConfig): {
  services: {
    posts: BlogService;
    tags: TagService | null;       // Sprint 2에서 구현, 현재 null
    comments: CommentService | null; // Sprint 2에서 구현, 현재 null
    search: SearchService | null;    // Sprint 3에서 구현, 현재 null
    scheduler: SchedulerService | null; // Sprint 3에서 구현, 현재 null
  };
  routes: {
    public: { posts: PostPublicRoutes; ... };
    admin: { posts: PostAdminRoutes; ... };
  };
}
```

- BlogConfig에서 Prisma 인스턴스, 카테고리, 경로, feature 토글 등을 받는다
- feature 토글에 따라 서비스/라우트를 null로 반환 (Sprint 2-3에서 채워진다)
- 내부에서 BlogService를 생성하고, 라우트 핸들러를 생성하여 반환

## 파일 구조 (최종 산출물)

```
blog-core-v2/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── prisma/
│   └── blog.prisma
└── src/
    ├── index.ts                    # createBlog() + re-exports
    ├── types/
    │   ├── index.ts
    │   ├── blog.ts
    │   ├── comment.ts
    │   ├── tag.ts
    │   ├── common.ts
    │   └── config.ts
    ├── errors/
    │   └── index.ts
    ├── utils/
    │   ├── index.ts
    │   ├── slug.ts
    │   ├── pagination.ts
    │   ├── html-sanitizer.ts
    │   ├── ip-hash.ts
    │   ├── date.ts
    │   └── file-helpers.ts
    ├── services/
    │   ├── index.ts
    │   └── blog.service.ts
    └── routes/
        ├── index.ts
        └── post.routes.ts
```

## 검증 체크리스트

Evaluator는 다음 항목을 순서대로 검증한다:

### 빌드 & 타입 체크

1. `cd /Users/uni4love/project/workspace/211-withwiz/node-packages/blog-core-v2 && npm install` — 의존성 설치 성공
2. `npm run build` (tsup) — 빌드 에러 없이 `dist/` 디렉토리에 `.js`, `.mjs`, `.d.ts` 파일 생성
3. `npx tsc --noEmit` — TypeScript 타입 체크 에러 없음

### 파일 존재 확인

4. `prisma/blog.prisma` — BlogPost, Tag, PostTag, Comment 모델과 CommentStatus enum 존재
5. `src/types/config.ts` — BlogConfig 타입에 `prisma`, `categories`, `basePath`, `features` 필드 존재
6. `src/errors/index.ts` — BlogError 클래스와 BLOG_ERROR_CODES 상수 export 확인

### 타입 검증

7. `BlogConfig` 타입이 다음 필수 필드를 포함: `prisma`, `modelName`, `categories`, `basePath`, `adminBasePath`, `apiBasePath`, `adminApiBasePath`
8. `BlogConfig.features` 필드에 `tags`, `comments`, `search`, `scheduler` 토글이 포함
9. `BlogService` 인터페이스가 `listPublished`, `getPublishedBySlug`, `getFeatured`, `getAdjacentPosts`, `checkSlugAvailable`, `listAll`, `getById`, `create`, `update`, `remove`, `removeMany`, `togglePublish`, `bulkUpdatePublished`, `bulkUpdateFeatured`, `getDashboardStats` 메서드를 포함
10. `PaginatedResult<T>` 타입이 `items`, `total`, `page`, `limit`, `totalPages` 필드를 포함

### createBlog() 팩토리 검증

11. `createBlog` 함수가 `src/index.ts`에서 named export로 제공
12. 반환 타입이 `services` 객체 (posts, tags, comments, search, scheduler)와 `routes` 객체 (public, admin)를 포함
13. Sprint 1에서 `services.tags`, `services.comments`, `services.search`, `services.scheduler`는 null 허용 타입

### 라우트 핸들러 검증

14. 라우트 핸들러가 `(req: Request) => Promise<Response>` 또는 `NextRequest/NextResponse` 시그니처를 따름
15. Public 포스트 라우트: list(GET), detail(GET), featured(GET) 핸들러 존재
16. Admin 포스트 라우트: list(GET), create(POST), getById(GET), update(PUT), delete(DELETE), togglePublish(PATCH), bulkUpdate(PATCH), bulkDelete(DELETE), slugCheck(GET), dashboard(GET) 핸들러 존재

### 에러 응답 형식 검증

17. `BLOG_ERROR_CODES`에 최소 `POST_NOT_FOUND`, `POST_DUPLICATE_SLUG`, `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN` 코드 포함
18. BlogError가 `code`와 `message` 속성을 가진 Error 서브클래스

### 유틸리티 검증

19. `generateSlug('Hello World')` 호출 시 `'hello-world'` 형태의 문자열 반환
20. `buildPaginatedResult(items, 100, 1, 10)` 호출 시 `{ items, total: 100, page: 1, limit: 10, totalPages: 10 }` 형태 반환

### exports map 검증

21. `package.json`의 `exports` 필드에 `.`, `./types`, `./services`, `./routes`, `./utils`, `./errors` 엔트리 존재
22. 각 엔트리에 `types`, `import`, `require` 조건 매핑 존재

## 빌드 & 테스트 명령

```bash
# 의존성 설치
cd /Users/uni4love/project/workspace/211-withwiz/node-packages/blog-core-v2
npm install

# 빌드
npm run build

# 타입 체크
npx tsc --noEmit

# 테스트 (Sprint 1에서는 유틸리티 단위 테스트만)
npm run test
```

## 성공 기준

1. **빌드 통과**: `npm run build`가 에러 없이 완료되고, `dist/` 디렉토리에 ESM(.mjs) + CJS(.js) + 타입(.d.ts) 파일이 생성된다.
2. **타입 체크 통과**: `npx tsc --noEmit`이 에러 없이 완료된다.
3. **Prisma 스키마 유효**: `prisma/blog.prisma`가 4개 모델(BlogPost, Tag, PostTag, Comment)과 1개 enum(CommentStatus)을 정확히 정의한다.
4. **createBlog() 동작**: 팩토리 함수가 config를 받아 `{ services, routes }` 객체를 반환하며, `services.posts`가 BlogService 인터페이스를 구현한다.
5. **라우트 핸들러 구조**: `routes.public.posts`와 `routes.admin.posts`가 spec.md S11의 Public/Admin 포스트 API 표면을 커버한다.
6. **에러 체계**: BlogError 클래스와 BLOG_ERROR_CODES가 올바르게 export되며, 라우트 핸들러가 BlogError를 HTTP 상태 코드로 변환한다.
7. **exports map**: `package.json`의 exports가 서브패스별 ESM/CJS/타입 진입점을 정확히 매핑한다.
8. **외부 의존성 0**: `@withwiz/blog-system`, `@withwiz/pms`에 대한 import/require가 없다.
