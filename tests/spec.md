# @withwiz/blog-core 풀테스트 스펙

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@withwiz/blog-core` 패키지의 모든 순수 함수, Zod 검증, 서비스 로직을 독립 테스트하여 향후 별도 npm 배포 시 품질 보증

**Architecture:** 패키지 내부 `tests/` 폴더에 Vitest 기반 단위 테스트 배치. 루트 vitest.config.ts에 패키지별 프로젝트를 추가하여 `npm run test -- --project blog-core` 로 독립 실행 가능하게 구성. Prisma 의존 서비스는 mock 주입 패턴 사용.

**Tech Stack:** Vitest, TypeScript, vi.mock/vi.fn (Prisma mock)

---

## 인프라 설정

### Task 0: Vitest 프로젝트 설정

**Files:**
- Modify: `vitest.config.ts` — `projects` 배열에 blog-core 프로젝트 추가
- Create: `packages/blog-core/tests/setup.ts` — 패키지 전용 setup

- [ ] **Step 1: setup.ts 생성**

```ts
// packages/blog-core/tests/setup.ts
import { vi } from 'vitest';

// blog-core는 외부 환경변수 불필요 — 순수 로직 패키지
// Next.js 의존 mock (서비스 테스트에서 필요 시)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
```

- [ ] **Step 2: vitest.config.ts에 프로젝트 추가**

루트 `vitest.config.ts`의 `projects` 배열에 추가:

```ts
{
  extends: true,
  test: {
    name: 'blog-core',
    include: ['packages/blog-core/tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./packages/blog-core/tests/setup.ts'],
  },
},
```

- [ ] **Step 3: 실행 확인**

```bash
npx vitest run --project blog-core
# Expected: "No test files found" (아직 테스트 없음, 에러 없이 종료)
```

- [ ] **Step 4: 커밋**

```bash
git add packages/blog-core/tests/setup.ts vitest.config.ts
git commit -m "test(blog-core): vitest 프로젝트 설정 추가"
```

---

## Sprint 1 — 순수 유틸리티 함수 (mock 불필요)

### Task 1: date 유틸리티

**Files:**
- Test: `packages/blog-core/tests/date.test.ts`
- Source: `packages/blog-core/src/utils/date.ts`

**테스트 대상:** `toLocalDatetime`, `formatDateTime`, `formatDate`

| TC ID | 설명 | 입력 | 기대 결과 |
|-------|------|------|-----------|
| BC-D-01 | ISO → datetime-local 변환 | `new Date(2025,2,15,14,30).toISOString()` | `'2025-03-15T14:30'` |
| BC-D-02 | null → 빈 문자열 | `null` | `''` |
| BC-D-03 | 무효 날짜 → 빈 문자열 | `'invalid'` | `''` |
| BC-D-04 | 빈 문자열 → 빈 문자열 | `''` | `''` |
| BC-D-05 | 0-padding | 월=1,일=5 | `'2025-01-05T09:05'` |
| BC-D-06 | formatDateTime 정상 | ISO 문자열 | `'YYYY.MM.DD HH:MM'` |
| BC-D-07 | formatDateTime null | `null` | `'-'` |
| BC-D-08 | formatDateTime 무효 | `'not-a-date'` | `'-'` |
| BC-D-09 | formatDate 정상 | ISO 문자열 | `'YYYY.MM.DD'` |
| BC-D-10 | formatDate null | `null` | `'-'` |

- [ ] **Step 1: 테스트 파일 작성** — 위 10개 케이스
- [ ] **Step 2: `npx vitest run --project blog-core` 실행 → 전체 PASS 확인**
- [ ] **Step 3: 커밋** `test(blog-core): date 유틸리티 테스트 10건`

---

### Task 2: pagination 유틸리티

**Files:**
- Test: `packages/blog-core/tests/pagination.test.ts`
- Source: `packages/blog-core/src/utils/pagination.ts`

**테스트 대상:** `buildPaginatedResult`

| TC ID | 설명 | 입력 | 기대 결과 |
|-------|------|------|-----------|
| BC-P-01 | 정상 계산 | items=3개, total=10, page=1, limit=3 | totalPages=4, hasMore=true |
| BC-P-02 | 마지막 페이지 | items=1개, total=10, page=4, limit=3 | totalPages=4, hasMore=false |
| BC-P-03 | total=0 | items=[], total=0, page=1, limit=10 | totalPages=0, hasMore=false |
| BC-P-04 | 단일 페이지 | items=5개, total=5, page=1, limit=10 | totalPages=1, hasMore=false |
| BC-P-05 | limit=1 | items=1개, total=100, page=50, limit=1 | totalPages=100, hasMore=true |
| BC-P-06 | items 배열 보존 | 입력 items | result.items === 입력 items (참조 동일) |
| BC-P-07 | 정확한 page/pageSize 반환 | page=3, limit=20 | pagination.page=3, pageSize=20 |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): pagination 유틸리티 테스트 7건`

---

### Task 3: slug 유틸리티

**Files:**
- Test: `packages/blog-core/tests/slug.test.ts`
- Source: `packages/blog-core/src/utils/slug.ts`

**테스트 대상:** `generateSlug`, `isValidSlug`

| TC ID | 설명 | 입력 | 기대 결과 |
|-------|------|------|-----------|
| BC-S-01 | 영문 대문자 → 소문자 | `'Hello World'` | `'hello-world'` |
| BC-S-02 | 공백 → 하이픈 | `'my title here'` | `'my-title-here'` |
| BC-S-03 | 특수문자 제거 | `'hello@world!'` | `'helloworld'` 또는 유사 |
| BC-S-04 | 한글 입력 | `'안녕하세요'` | 빈 문자열 (slugify strict) |
| BC-S-05 | isValidSlug 유효 | `'abc-123'` | `true` |
| BC-S-06 | isValidSlug 대문자 | `'Abc'` | `false` |
| BC-S-07 | isValidSlug 하이픈 시작 | `'-abc'` | `false` |
| BC-S-08 | isValidSlug 하이픈 끝 | `'abc-'` | `false` |
| BC-S-09 | isValidSlug 연속 하이픈 | `'a--b'` | `false` |
| BC-S-10 | isValidSlug 빈 문자열 | `''` | `false` |
| BC-S-11 | isValidSlug 숫자만 | `'123'` | `true` |
| BC-S-12 | isValidSlug 언더스코어 | `'a_b'` | `false` |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): slug 유틸리티 테스트 12건`

---

### Task 4: file-helpers 유틸리티

**Files:**
- Test: `packages/blog-core/tests/file-helpers.test.ts`
- Source: `packages/blog-core/src/utils/file-helpers.ts`

**테스트 대상:** `formatFileSize`, `getFileIcon`

| TC ID | 설명 | 입력 | 기대 결과 |
|-------|------|------|-----------|
| BC-F-01 | 0 바이트 | `0` | `'0B'` |
| BC-F-02 | KB 미만 | `512` | `'512B'` |
| BC-F-03 | 정확히 1KB | `1024` | `'1.0KB'` |
| BC-F-04 | KB 소수점 | `1536` | `'1.5KB'` |
| BC-F-05 | 정확히 1MB | `1048576` | `'1.0MB'` |
| BC-F-06 | MB 소수점 | `2621440` | `'2.5MB'` |
| BC-F-07 | PDF 아이콘 | `'application/pdf'` | 문서 이모지 |
| BC-F-08 | Word 아이콘 | `'application/...wordprocessingml...'` | 메모 이모지 |
| BC-F-09 | HWP 아이콘 | `'application/haansofthwp'` | 메모 이모지 |
| BC-F-10 | Excel 아이콘 | `'application/vnd.ms-excel'` | 차트 이모지 |
| BC-F-11 | 이미지 아이콘 | `'image/jpeg'` | 이미지 이모지 |
| BC-F-12 | ZIP 아이콘 | `'application/zip'` | 박스 이모지 |
| BC-F-13 | 기본 아이콘 | `'application/octet-stream'` | 클립 이모지 |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): file-helpers 유틸리티 테스트 13건`

---

### Task 5: html-sanitizer

**Files:**
- Test: `packages/blog-core/tests/html-sanitizer.test.ts`
- Source: `packages/blog-core/src/utils/html-sanitizer.ts`

**테스트 대상:** `sanitizeHtmlContent`

| TC ID | 설명 | 입력 | 기대 결과 |
|-------|------|------|-----------|
| BC-H-01 | null 반환 | `null` | `null` |
| BC-H-02 | undefined 반환 | `undefined` | falsy |
| BC-H-03 | 빈 문자열 보존 | `''` | `''` |
| BC-H-04 | 안전한 HTML 보존 | `'<p>Hello <strong>world</strong></p>'` | 그대로 |
| BC-H-05 | img 보존 | `'<img src="https://..." alt="">'` | 그대로 |
| BC-H-06 | script 태그+내용 제거 | `'<script>alert(1)</script>'` | `''` |
| BC-H-07 | style 태그+내용 제거 | `'<style>body{}</style><p>ok</p>'` | `'<p>ok</p>'` |
| BC-H-08 | 비신뢰 iframe 제거 | `'<iframe src="https://evil.com">'` | iframe 미포함 |
| BC-H-09 | YouTube iframe 보존 | `'<iframe src="https://www.youtube.com/...">'` | 그대로 |
| BC-H-10 | Vimeo iframe 보존 | `'<iframe src="https://player.vimeo.com/...">'` | 그대로 |
| BC-H-11 | onclick 제거 | `'<div onclick="alert(1)">text</div>'` | onclick 미포함 |
| BC-H-12 | onerror 제거 | `'<img onerror="alert(1)" src="x">'` | onerror 미포함 |
| BC-H-13 | javascript: 프로토콜 무력화 | `'<a href="javascript:void(0)">'` | `href=""` |
| BC-H-14 | vbscript: 무력화 | `'<a href="vbscript:...">'` | `href=""` |
| BC-H-15 | data:text/html 무력화 | `'<img src="data:text/html,...">'` | `src=""` |
| BC-H-16 | data:image 보존 | `'<img src="data:image/png;base64,...">'` | 그대로 |
| BC-H-17 | object 태그 제거 | `'<object data="x">'` | object 미포함 |
| BC-H-18 | embed 태그 제거 | `'<embed src="x">'` | embed 미포함 |
| BC-H-19 | form+input 제거 | `'<form><input type="text"></form>'` | form/input 미포함 |
| BC-H-20 | 복합 XSS | script+onclick+javascript 혼합 | 모두 제거, 안전 태그 보존 |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): html-sanitizer 테스트 20건`

---

### Task 6: defaults 상수

**Files:**
- Test: `packages/blog-core/tests/defaults.test.ts`
- Source: `packages/blog-core/src/utils/defaults.ts`

| TC ID | 설명 | 기대 결과 |
|-------|------|-----------|
| BC-DF-01 | authRefreshPath 존재 | `'/api/admin/auth/refresh'` |
| BC-DF-02 | loginPath 존재 | `'/admin/login'` |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): defaults 상수 스냅샷 테스트 2건`

---

## Sprint 2 — Zod 검증 + 컴포넌트 헬퍼

### Task 7: blog.validator (Zod 스키마)

**Files:**
- Test: `packages/blog-core/tests/blog-validator.test.ts`
- Source: `packages/blog-core/src/validators/blog.validator.ts`

**테스트 대상:** `slugSchema`, `optionalUrlSchema`, `attachmentSchema`, `CreateBlogPostSchema`, `UpdateBlogPostSchema`, `BulkUpdateSchema`, `createBlogSchemas`

| TC ID | 설명 |
|-------|------|
| BC-V-01 | slugSchema: 유효 slug 통과 |
| BC-V-02 | slugSchema: 빈 문자열 실패 (min 1) |
| BC-V-03 | slugSchema: 201자 실패 (max 200) |
| BC-V-04 | slugSchema: 대문자 실패 (regex) |
| BC-V-05 | optionalUrlSchema: 유효 https URL 통과 |
| BC-V-06 | optionalUrlSchema: 빈 문자열 통과 |
| BC-V-07 | optionalUrlSchema: file:// 차단 |
| BC-V-08 | optionalUrlSchema: javascript: 차단 |
| BC-V-09 | optionalUrlSchema: data: 차단 |
| BC-V-10 | attachmentSchema: 필수 필드 누락 실패 |
| BC-V-11 | attachmentSchema: 유효 데이터 통과 |
| BC-V-12 | CreateBlogPostSchema: 유효 데이터 통과 |
| BC-V-13 | CreateBlogPostSchema: 제목 빈 문자열 실패 + 에러 메시지 확인 |
| BC-V-14 | CreateBlogPostSchema: content 빈 문자열 실패 |
| BC-V-15 | CreateBlogPostSchema: featured/published 기본값 false |
| BC-V-16 | CreateBlogPostSchema: attachments 기본값 [] |
| BC-V-17 | CreateBlogPostSchema: attachments 6개 실패 (max 5) |
| BC-V-18 | CreateBlogPostSchema: publishedAt 문자열 → Date 강제 변환 |
| BC-V-19 | UpdateBlogPostSchema: 빈 객체 통과 (partial) |
| BC-V-20 | BulkUpdateSchema: 빈 ids 배열 실패 + '대상을 선택해주세요' 메시지 |
| BC-V-21 | BulkUpdateSchema: ids 1개 이상 통과 |
| BC-V-22 | createBlogSchemas: maxAttachments=3 → 4개 실패 |
| BC-V-23 | createBlogSchemas: maxAttachments=3 → 3개 통과 |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): blog validator Zod 스키마 테스트 23건`

---

### Task 8: admin/constants 헬퍼 함수

**Files:**
- Test: `packages/blog-core/tests/admin-constants.test.ts`
- Source: `packages/blog-core/src/components/admin/constants.ts`

**테스트 대상:** `createEmptyForm`, `deserializeCta`, `stripCtaFromContent`, `serializeCta`, `hEsc`, `extractDisplayHtml`, `formatDateOnly`, `getCatClass`, `getCatLabel`

| TC ID | 설명 |
|-------|------|
| BC-C-01 | hEsc: `&` → `&amp;` |
| BC-C-02 | hEsc: `<` → `&lt;` |
| BC-C-03 | hEsc: `>` → `&gt;` |
| BC-C-04 | hEsc: 빈 문자열 → `''` |
| BC-C-05 | hEsc: null/undefined → `''` (falsy 처리) |
| BC-C-06 | serializeCta + deserializeCta 라운드트립 |
| BC-C-07 | deserializeCta: 마커 없는 콘텐츠 → `{enabled: false}` |
| BC-C-08 | deserializeCta: 손상된 base64 → fallback |
| BC-C-09 | stripCtaFromContent: CTA 마커 라인 제거 |
| BC-C-10 | stripCtaFromContent: CTA HTML 블록 제거 |
| BC-C-11 | stripCtaFromContent: 마커 없으면 원본 반환 |
| BC-C-12 | extractDisplayHtml: nbe-blocks 마커 이전 HTML만 반환 |
| BC-C-13 | extractDisplayHtml: 마커 없으면 전체 반환 |
| BC-C-14 | formatDateOnly: null → `'-'` |
| BC-C-15 | formatDateOnly: 유효 날짜 → `'YYYY.MM.DD'` |
| BC-C-16 | createEmptyForm: 첫 번째 카테고리를 기본값 사용 |
| BC-C-17 | createEmptyForm: 빈 categories → category `''` |
| BC-C-18 | getCatClass: config에 있는 카테고리 → key 반환 |
| BC-C-19 | getCatClass: config에 없는 카테고리 → toLowerCase fallback |
| BC-C-20 | getCatLabel: config에 있는 카테고리 → label 반환 |
| BC-C-21 | getCatLabel: config에 없는 카테고리 → 그대로 반환 |

- [ ] **Step 1: 테스트 파일 작성**
- [ ] **Step 2: 실행 확인**
- [ ] **Step 3: 커밋** `test(blog-core): admin constants 헬퍼 함수 테스트 21건`

---

## Sprint 3 — 서비스 계층 (mock Prisma)

### Task 9: blog.service (createBlogService)

**Files:**
- Test: `packages/blog-core/tests/blog-service.test.ts`
- Source: `packages/blog-core/src/services/blog.service.ts`

**mock 전략:** `createBlogService(mockPrisma, config)` — Prisma delegate를 vi.fn()으로 mock

| TC ID | 설명 |
|-------|------|
| BC-BS-01 | config.modelName이 prisma에 없으면 Error throw |
| BC-BS-02 | listPublished: page<1 → 1로 보정 |
| BC-BS-03 | listPublished: limit<1 → 1로 보정 |
| BC-BS-04 | listPublished: 카테고리 필터 적용 |
| BC-BS-05 | listPublished: 검색어 필터 적용 |
| BC-BS-06 | listPublished: 페이지네이션 결과 구조 |
| BC-BS-07 | getPublishedBySlug: 존재하는 slug → 상세 반환 |
| BC-BS-08 | getPublishedBySlug: 없는 slug → null |
| BC-BS-09 | getFeatured: 기본 limit=1 |
| BC-BS-10 | checkSlugAvailable: 사용 가능 → true |
| BC-BS-11 | checkSlugAvailable: 중복 → false |
| BC-BS-12 | checkSlugAvailable: excludeId 자기 자신 제외 |
| BC-BS-13 | create: published=true, publishedAt 없을 때 자동 설정 |
| BC-BS-14 | create: slug 충돌 시 suffix 자동 증가 |
| BC-BS-15 | create: sanitizeHtmlContent 호출 |
| BC-BS-16 | update: published 전환 시 $transaction 사용 |
| BC-BS-17 | togglePublish: 존재하지 않는 id → Error |
| BC-BS-18 | togglePublish: true → false 토글 |
| BC-BS-19 | remove: enableR2Cleanup=false → R2 미호출 |
| BC-BS-20 | removeMany: 여러 id 삭제 |
| BC-BS-21 | bulkUpdatePublished: ids 배열로 일괄 변경 |
| BC-BS-22 | bulkUpdateFeatured: ids 배열로 일괄 변경 |
| BC-BS-23 | getDashboardStats: unpublished = total - published 계산 |
| BC-BS-24 | toListItem: attachments 존재 → hasAttachments=true |
| BC-BS-25 | toListItem: attachments 빈 배열 → hasAttachments=false |

- [ ] **Step 1: mock Prisma 헬퍼 작성** (파일 상단)
- [ ] **Step 2: 테스트 파일 작성**
- [ ] **Step 3: 실행 확인**
- [ ] **Step 4: 커밋** `test(blog-core): blog service 테스트 25건`

---

### Task 10: block-editor preset

**Files:**
- Test: `packages/blog-core/tests/block-editor-preset.test.ts`
- Source: `packages/blog-core/src/presets/block-editor.ts`

**mock 전략:** `@withwiz/block-editor` mock 필요

| TC ID | 설명 |
|-------|------|
| BC-BE-01 | BLOG_CAT_CLASSES 상수값 확인 |
| BC-BE-02 | BLOG_PRESET.categories 배열 확인 |
| BC-BE-03 | BLOG_PRESET.marker = 'nbe-blocks:' |
| BC-BE-04 | createBlogPreset([]) → enableCategoryFilter=false |
| BC-BE-05 | createBlogPreset(카테고리) → enableCategoryFilter=true |

- [ ] **Step 1: @withwiz/block-editor mock 작성**
- [ ] **Step 2: 테스트 파일 작성**
- [ ] **Step 3: 실행 확인**
- [ ] **Step 4: 커밋** `test(blog-core): block-editor preset 테스트 5건`

---

## Definition of Done

- [ ] 모든 테스트 파일이 `packages/blog-core/tests/` 하위에 존재
- [ ] `npx vitest run --project blog-core` 전체 PASS
- [ ] 테스트 수 합계: ~138건 이상
- [ ] 각 Task 완료 후 독립 커밋 존재
- [ ] mock Prisma 테스트가 실제 서비스 함수 시그니처와 일치
