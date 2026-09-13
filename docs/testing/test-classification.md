# @withwiz/blog-core 테스트 분류 체계

작성일: 2026-09-13
기준 포맷: `withwiz-block-editor/docs/plans/2026-03-04-test-classification.md`

## 개요

| 항목 | 내용 |
|------|------|
| 대상 | `@withwiz/blog-core` 2.1.3: Next.js App Router 블로그 패키지(서비스 팩토리, 라우트 핸들러 팩토리, SEO 유틸, React 컴포넌트) |
| 범위 | `src/` 전체(services/, routes/, seo/, utils/, validators/, storage/, themes/, i18n/, errors/, components/, context/)와 `test/` 전체(런타임 테스트 9개 파일, 타입 검증 파일 1개) |
| 환경 | Node.js v22.22.0 내장 러너 `node:test` + `node:assert/strict`. `npm test` 는 `npm run build`(tsup 8.5.1)로 `dist/` 를 생성한 뒤 `node --test test/runtime/*.test.mjs` 를 실행한다. 테스트는 `dist/*.mjs` 를 import 하고, 실제 DB 와 jsdom 없이 인메모리 fake Prisma 또는 fake 서비스를 주입한다. `test/headless-mode.ts` 는 러너 대상이 아닌 타입 검증 전용 파일이다 |
| 목표 커버리지 | 미설정: `package.json` 에 커버리지 도구와 임계값이 없고, `tsconfig.json`·`tsup.config.ts` 에도 관련 설정이 없다 |
| 실측 실행 결과 | 2026-09-13, 브랜치 `docs/test-classification`(기준 커밋 `49b7778`)에서 `npm test` 실행: 파일 9개, 테스트 54건, 통과 54 / 실패 0 / 스킵 0 / 취소 0 / todo 0, 러너 소요 108ms |
| 타입 검증 실행 결과 | `test/headless-mode.ts` 주석에 기재된 `npx tsc --noEmit --strict test/headless-mode.ts` 는 tsconfig 옵션이 적용되지 않아 오류 68건(`node_modules` 선언 파일 63건, `src/` 5건)으로 실패한다. tsconfig 와 같은 옵션(`--skipLibCheck --esModuleInterop --target es2020 --module esnext --moduleResolution bundler --jsx react-jsx`)을 지정하면 오류 0건으로 통과한다 |
| 의존성 설치 | `package-lock.json` 이 `package.json` 과 일치하지 않아(`next` 15.5.18 고정 대 `^16.2.9` 요구 등) `npm ci` 가 거부된다. lockfile 을 변경하지 않도록 `npm install --package-lock=false` 로 설치했으며, 해석된 버전은 next 16.3.5, react 19.3.0, typescript 5.9.3, zod 4.6.4 이다. 선택적 peer 인 `isomorphic-dompurify`, `@tiptap/*`, `@aws-sdk/client-s3` 는 설치되지 않았다 |
| 도메인별 실행 스크립트 | 없음. `package.json` 에는 `build`, `build:types`, `typecheck`, `test` 만 있다 |

### 관련 문서

| 문서 | 성격 | 이 문서와의 관계 |
|------|------|------------------|
| `spec.md` (563줄) | 제품 스펙(Flow, Feature, Definition of Done) | `동시`, `경쟁 조건`, `concurrency`, `race` 검색 결과가 0건이다. 레이트 리밋(Flow 5, 70행)과 예약 발행(Flow 8, 89~95행과 DoD 497~503행)을 단일 요청 관점으로만 서술하므로 Load/Stress 시나리오의 근거로 사용할 수 없다 |
| `CHANGELOG.md` | 변경 이력 | 2.0.0 항목은 런타임 스위트가 "validators, theme exports, slug/pagination utilities, and i18n defaults" 를 검증한다고 서술하지만, validators 와 i18n 을 import 하는 테스트 파일은 없다. 2.1.x 항목도 기록되어 있지 않다 |
| `critique.md`, `generator_report.md`, `sprint_contract.md` | 2026-05 스프린트 산출물 | 빌드·타입 검사 결과와 스프린트 계획을 기록한 문서이며 테스트 시나리오·케이스 문서가 아니다 |
| `WITHWIZ_PACKAGES_TEST_AUDIT.md` (dts-ballet-homepage `tests/doc/`) | 사전 조사 | 테스트 43건 시점에 작성되었다. 이후 `fix/concurrency-guards` 가 `develop`(병합 커밋 `f943bb1`)과 `main` 에 포함되었고(`origin/develop`, `origin/main` 추적 브랜치도 포함, 마지막 fetch 기준), 2.1.3 릴리스 커밋(`49b7778`)이 추가되었으며 npm `latest` dist-tag 는 2.1.3 이다. 따라서 조사 문서에 기록된 "게시 전, 병합 전" 상태는 현재와 다르다 |
| 커밋 `3572744` | 동시성 결함 수정 | 댓글 레이트 리밋 경쟁 조건과 예약 발행 이중 집계의 원인, 선택한 방식, 테스트 11건 추가 내역을 기록한다. 커밋 메시지에 따르면 수정 전 코드에서는 동시성 관련 4건이 실패했다 |

---

## 시나리오 목록

| ID | 시나리오 | 유형 | 우선순위 | 상태 |
|----|---------|------|---------|------|
| SC-U-001 | 테마 CSS 변수 토큰 export 규약 | Unit | Medium | ✅ 완료 |
| SC-U-002 | slug·페이지네이션·날짜 유틸 기본 동작 | Unit | Medium | ✅ 완료 |
| SC-U-003 | SEO 메타데이터 생성 | Unit | High | 🔲 계획 |
| SC-U-004 | JSON-LD·RSS·Sitemap·OG 이미지 데이터 생성 | Unit | High | 🔲 계획 |
| SC-U-005 | 검색어 tsquery 변환 | Unit | High | 🔲 계획 |
| SC-U-006 | 입력 검증 스키마(blog·tag·comment) | Unit | Medium | 🔲 계획 |
| SC-U-007 | i18n·파일·날짜·카테고리 테마 보조 유틸 | Unit | Low | 🔲 계획 |
| SC-U-008 | S3 스토리지 어댑터 URL 키 추출 | Unit | Medium | 🔲 계획 |
| SC-U-009 | React 컴포넌트 렌더링(25개) | Unit | Medium | 🔲 계획 |
| SC-I-001 | 댓글 생성 경로 순차 동작(fake Prisma) | Integration | High | ✅ 완료 |
| SC-I-002 | 예약 발행 단일 실행 결과 계약 | Integration | High | ✅ 완료 |
| SC-I-003 | BlogService 공개 조회 조건 구성 | Integration | Critical | 🔲 계획 |
| SC-I-004 | BlogService 작성·수정(slug 중복, 새니타이즈, 발행 시각, 태그 연결) | Integration | Critical | 🔲 계획 |
| SC-I-005 | BlogService 삭제·발행 전환·일괄 변경·대시보드 | Integration | High | 🔲 계획 |
| SC-I-006 | TagService CRUD·태그 클라우드·관련 글 | Integration | Critical | 🔲 계획 |
| SC-I-007 | SearchService SQL·파라미터 구성 | Integration | Critical | 🔲 계획 |
| SC-I-008 | CommentService 조회 트리·관리 기능 | Integration | High | 🔲 계획 |
| SC-I-009 | SchedulerService 예약 목록·취소 | Integration | Medium | 🔲 계획 |
| SC-I-010 | createBlog 기능 토글 조합 | Integration | Medium | 🔲 계획 |
| SC-A-001 | 포스트 라우트 요청 파싱·응답 계약 | API | High | 🔲 계획 |
| SC-A-002 | 라우트 오류 응답 매핑(BlogError, 일반 예외) | API | High | 🔲 계획 |
| SC-A-003 | 태그·검색·댓글 라우트 요청 파싱 | API | Medium | 🔲 계획 |
| SC-A-004 | 댓글 requireLogin 설정과 공개 작성 라우트 연동 | API | High | 🔲 계획 |
| SC-S-001 | 관리자 라우트 인증 미설정 시 fail-closed | Security | Critical | ✅ 완료 |
| SC-S-002 | 예약 발행 처리 엔드포인트 인증 fail-closed | Security | Critical | ✅ 완료 |
| SC-S-003 | cronSecret Bearer 상수시간 비교 | Security | Critical | ✅ 완료 |
| SC-S-004 | 댓글 IP 해시 시크릿 미주입 시 fail-fast | Security | Critical | ✅ 완료 |
| SC-S-005 | IP 해시 HMAC 시크릿 필수 | Security | High | ✅ 완료 |
| SC-S-006 | 클라이언트 IP 헤더 신뢰 전략(스푸핑 방어) | Security | High | ✅ 완료 |
| SC-S-007 | HTML 새니타이저 기본 XSS 벡터·폴백 경고 | Security | Critical | ✅ 완료 |
| SC-S-008 | HTML 새니타이저 강화 벡터(R4) | Security | Critical | ✅ 완료 |
| SC-S-009 | 검색 SQL 식별자 검증(tableName, lang) | Security | Critical | 🔲 계획 |
| SC-S-010 | 관리자 라우트 전수 fail-closed(태그·댓글·스케줄러 포함) | Security | High | 🔲 계획 |
| SC-S-011 | 포스트 관리 입력의 허용 필드 제한 | Security | High | 🔲 계획 |
| SC-S-012 | 500 응답 오류 메시지 노출 | Security | Medium | 🔲 계획 |
| SC-S-013 | 새니타이저 우회 입력과 dompurify 경로 | Security | High | 🔲 계획 |
| SC-P-001 | 예약 발행 건별 조건부 갱신 왕복 수 | Performance | Low | 🔲 계획 |
| SC-P-002 | 정규식 새니타이저 입력 크기별 처리 시간 | Performance | Low | 🔲 계획 |
| SC-AC-001 | 공개 댓글 폼 레이블·오류 알림 | Accessibility | Medium | 🔲 계획 |
| SC-AC-002 | 관리자 토글 스위치 역할·상태·이름 | Accessibility | Medium | 🔲 계획 |
| SC-AC-003 | role="button" 요소 키보드 조작 | Accessibility | Medium | 🔲 계획 |
| SC-L-001 | 댓글 레이트 리밋 동시 요청 | Load/Stress | Critical | ✅ 완료 |
| SC-L-002 | 예약 발행 동시 트리거·조회-갱신 경쟁 | Load/Stress | Critical | ✅ 완료 |
| SC-L-003 | 레이트 리밋 한계 조건 특성 테스트 | Load/Stress | Medium | 🔲 계획 |
| SC-SM-001 | Headless 모드 타입 수준 import 검증 | Smoke | Medium | ✅ 완료 |
| SC-SM-002 | exports 서브패스 14개 dist import·타입 선언 파일 | Smoke | Medium | 🔲 계획 |
| SC-C-001 | 스토리지 정리 실패 시 게시글 삭제 응답 | Chaos | Medium | 🔲 계획 |
| SC-C-002 | 레이트 리밋 보상 삭제 실패 | Chaos | Low | 🔲 계획 |
| SC-C-003 | 예약 발행 중간 실패 후 재실행 | Chaos | Low | 🔲 계획 |

---

## 1. Unit Tests (단위 테스트)

**목적:** 순수 함수와 상수 export 를 외부 의존 없이 검증한다. 이 패키지에서는 `dist/` 서브패스 모듈을 직접 import 해 반환값을 단언한다.

**실행 명령:** `npm test` (전체). 도메인별 스크립트가 없으므로 단일 파일은 `npm run build && node --test test/runtime/theme.test.mjs` 처럼 실행한다.

---

### TC-U-001: 테마 CSS 변수 토큰 export 규약

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/theme.test.mjs` |
| **대상** | `src/themes/default-admin.ts`, `src/themes/default-public.ts` (`dist/themes/index.mjs`): `ADMIN_THEME_DEFAULTS`, `ADMIN_VAR_MAP`, `adminThemeVars()`, `PUBLIC_THEME_DEFAULTS`, `PUBLIC_VAR_MAP`, `publicThemeVars()` |
| **우선순위** | Medium |
| **전제조건** | `npm run build` 로 `dist/themes/index.mjs` 생성 |
| **테스트 데이터** | 없음 (상수 객체 검사) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `ADMIN_THEME_DEFAULTS` 키 전수 검사 | 키가 1개 이상이고 모두 `--blog-theme-default-admin-` 로 시작 |
| 2 | `ADMIN_VAR_MAP` 항목 전수 검사 | 키는 `--blog-admin-`, 값은 `var(--blog-theme-default-admin-` 로 시작 |
| 3 | `adminThemeVars()` 호출 | `--blog-theme-default-admin-*` 키 수가 `ADMIN_THEME_DEFAULTS` 키 수와 같고, `--blog-admin-*` 키 수가 `ADMIN_VAR_MAP` 키 수와 같음 |
| 4 | `PUBLIC_VAR_MAP` 항목 전수 검사 | 키는 `--blog-public-`, 값은 `var(--blog-theme-default-public-` 로 시작 |
| 5 | `publicThemeVars()` 호출 | 테마 기본값 키와 `--blog-public-*` 키가 각각 1개 이상 |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (실측)
- **한계:** admin 과 달리 public 은 키 개수 일치를 단언하지 않는다. `*_VAR_MAP` 값이 참조하는 변수가 `*_THEME_DEFAULTS` 에 실제로 존재하는지도 단언하지 않는다.

---

### TC-U-002: slug·페이지네이션·날짜 유틸 기본 동작

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/utils-basic.test.mjs` |
| **대상** | `src/utils/slug.ts` `generateSlug()`, `isValidSlug()` / `src/utils/pagination.ts` `buildPaginatedResult()` / `src/utils/date.ts` `formatDate()` |
| **우선순위** | Medium |
| **전제조건** | `dist/utils/index.mjs` 생성 |
| **테스트 데이터** | `'Hello World! 안녕'`, `'valid-slug-123'`, `'Invalid Slug'`, `([1,2,3], 23, 2, 10)`, `null`, `new Date('2026-05-16')` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `generateSlug('Hello World! 안녕')` 호출 | 길이 1 이상인 문자열 |
| 2 | `isValidSlug('valid-slug-123')`, `isValidSlug('Invalid Slug')` 호출 | `true`, `false` |
| 3 | `buildPaginatedResult([1,2,3], 23, 2, 10)` 호출 | `items` 가 `[1,2,3]`, `total` 23, `page` 2, `limit` 10 |
| 4 | `formatDate(null)` 호출 | 문자열 반환 |
| 5 | `formatDate(new Date('2026-05-16'))` 호출 | 예외 없음 |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (실측)
- **한계:** `generateSlug` 결과값(실측 `'hello-world'`, 한글 제거), `totalPages`(실측 3), `formatDate(null)` 의 실제 반환값(실측 `'-'`)은 단언하지 않는다. 파일 주석은 "Phase 7 순수 추출(blog.service.internal 등) 회귀 가드" 라고 설명하지만 `blog.service.internal` 을 실행하지 않는다.

---

### TC-U-003: SEO 메타데이터 생성 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/seo-metadata.test.mjs` (신규) |
| **대상** | `src/seo/metadata.ts` `generateMetadata()`, `generateListMetadata()` |
| **우선순위** | High |
| **전제조건** | 없음 (순수 함수, `dist/seo/index.mjs`) |
| **테스트 데이터** | `post = { slug:'hello', title:'T', excerpt:null, coverImageUrl:null, publishedAt:'2026-01-02T03:04:05Z', updatedAt:'invalid', tags:[{name:'js'},{name:''}] }`, `config.basePath = '/blog/'`, `siteUrl = 'https://ex.com///'` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `generateMetadata({ post, config, siteName:'S', siteUrl })` 호출 | `alternates.canonical === 'https://ex.com/blog/hello'` (끝 슬래시와 중복 슬래시 정리) |
| 2 | 1번 결과의 설명·유형 확인 | `description === ''` (excerpt null), `openGraph.type === 'article'`, `openGraph.locale === 'ko_KR'` |
| 3 | `defaultOgImage` 지정 (`coverImageUrl` 없음) | `openGraph.images[0]` 가 `{ url: defaultOgImage, width:1200, height:630, alt: post.title }`, `twitter.images` 가 `[defaultOgImage]` |
| 4 | `coverImageUrl`, `defaultOgImage` 모두 없음 | `openGraph.images`, `twitter.images` 키 자체가 없음 |
| 5 | `updatedAt: 'invalid'` 확인 | `openGraph.modifiedTime` 키 없음, `openGraph.publishedTime === '2026-01-02T03:04:05.000Z'` |
| 6 | 태그 `[{name:'js'},{name:''}]` 확인 | `keywords` 와 `openGraph.tags` 가 모두 `['js']` (빈 이름 제외) |
| 7 | `authorName:'A'`, `twitter:{ handle:'@h' }` 지정 | `authors === [{ name:'A' }]`, `openGraph.authors === ['A']`, `twitter.creator === '@h'` |
| 8 | `generateListMetadata({ config, siteName:'S', siteUrl:'https://ex.com/' })` 호출 | `title === 'S'`, `alternates.canonical === 'https://ex.com/blog'`, `openGraph.type === 'website'`, `images` 키 없음 |

- **자동화:** 가능 ✅
- **근거:** 1·2·3·5·6·8번 예상값은 2026-09-13 `dist` 대상 임시 스크립트로 확인했다.

---

### TC-U-004: JSON-LD·RSS·Sitemap·OG 이미지 데이터 생성 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/seo-feeds.test.mjs` (신규) |
| **대상** | `src/seo/json-ld.ts` `generateJsonLd()`, `generateBreadcrumbJsonLd()` / `src/seo/rss.ts` `createRSSFeed()`, `escapeXml()`, `toRfc822()` / `src/seo/sitemap.ts` `createSitemap()` / `src/seo/og-image.ts` `prepareOGImageData()` |
| **우선순위** | High |
| **전제조건** | 없음 (순수 함수) |
| **테스트 데이터** | TC-U-003 의 `post` 에 `title:'T & "q"'`, `createdAt: new Date('2026-01-01T00:00:00Z')`, `category:'news'` 추가, `config.categories = { news: { key:'news', label:'뉴스' } }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `generateJsonLd({ post, config, siteUrl:'https://ex.com', organizationName:'O' })` 호출 | `@type === 'BlogPosting'`, `mainEntityOfPage['@id'] === 'https://ex.com/blog/hello'`, `dateModified` 는 `updatedAt` 이 무효라 `createdAt` ISO, `datePublished` 는 `publishedAt` ISO |
| 2 | 1번 결과의 발행자·작성자 확인 | `publisher === { '@type':'Organization', name:'O' }` (logo 키 없음), `authorName` 미지정이라 `author` 키 없음, `keywords === 'js'` |
| 3 | `generateBreadcrumbJsonLd([{name:'a',url:'u1'},{name:'b',url:'u2'}])` 호출 | `itemListElement` 의 `position` 이 1, 2 순서 |
| 4 | `createRSSFeed({ posts:[post], siteUrl:'https://ex.com', basePath:'/blog', feedTitle:'A<B', feedDescription:'d' })` 호출 | `<title>A&lt;B</title>`, `<title>T &amp; &quot;q&quot;</title>`, `<atom:link href="https://ex.com/blog/rss.xml" ...>`, `<category>js</category>` 와 빈 `<category></category>` 가 함께 출력 |
| 5 | `toRfc822('2026-04-13T10:20:30Z')`, `escapeXml("<a href=\"x\">'&'</a>")` 호출 | `'Mon, 13 Apr 2026 10:20:30 GMT'`, `'&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'` |
| 6 | `createSitemap([{ url:'https://ex.com/a?b=1&c=2', lastModified:'bad', priority:0.75, changeFrequency:'weekly' }], { entries:[], includeXmlDeclaration:false })` 호출 | XML 선언 없음, `<loc>` 에 `&amp;` 이스케이프, `<priority>0.8</priority>`, `<lastmod>` 는 실행 시각 ISO 문자열 |
| 7 | `prepareOGImageData(post, config)`, `prepareOGImageData({ ...post, category:'etc', coverImageUrl:'c.png' }, config)` 호출 | 첫 결과는 `category:'뉴스'` 와 `categoryTheme` 포함, 둘째 결과는 `category:'etc'`, `coverImageUrl:'c.png'`, `categoryTheme` 없음 |

- **자동화:** 가능 ✅
- **근거:** 1~7번 예상값은 2026-09-13 `dist` 대상 임시 스크립트로 확인했다.
- **비고:** 4번에서 RSS 는 메타데이터(TC-U-003 6번)와 달리 빈 태그 이름을 제외하지 않는다. 이 차이를 의도로 볼지 확인이 필요하다.

---

### TC-U-005: 검색어 tsquery 변환 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/search-query.test.mjs` (신규) |
| **대상** | `src/services/search.service.ts` 내부 `buildTsQuery()` (공개 경로: `createSearchService(...).buildQuery()`) |
| **우선순위** | High |
| **전제조건** | `createSearchService` 생성에 `prisma[postModelName]` 존재와 유효한 `tableName` 이 필요하므로 `{ blogPost: {}, $queryRawUnsafe }` fake 를 주입 |
| **테스트 데이터** | 한글 검색어, 특수문자 검색어, SQL 조각 문자열, 빈 값 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `buildQuery('태그 검색')` | `'태그:* & 검색:*'` |
| 2 | `buildQuery('hello-world!!!')` | `'hello:* & world:*'` |
| 3 | `buildQuery('')`, `buildQuery('  !!! ')` | `''` |
| 4 | `buildQuery("'; DROP TABLE x; --")` | `'DROP:* & TABLE:* & x:*'` (따옴표, 세미콜론, 하이픈 제거) |
| 5 | `buildQuery(123)` (문자열 아님) | `''` |

- **자동화:** 가능 ✅
- **근거:** 1~4번은 2026-09-13 임시 스크립트로 확인했고, 5번은 `typeof input !== 'string'` 분기에 근거한다.

---

### TC-U-006: 입력 검증 스키마 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/validators.test.mjs` (신규) |
| **대상** | `src/validators/blog.validator.ts` `createBlogSchemas()`, `CreateBlogPostSchema`, `BulkUpdateSchema` / `src/validators/tag.validator.ts` `createTagSchemas()` / `src/validators/comment.validator.ts` `createCommentSchemas()` |
| **우선순위** | Medium |
| **전제조건** | `dist/validators/index.mjs` 가 zod 4 를 import 하므로 devDependency `zod` 설치 |
| **테스트 데이터** | 필수 필드 최소 입력 `{ title:'t', content:'c', category:'news', slug:'a-b' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `CreateBlogPostSchema.safeParse({ ...최소 입력, slug:'Invalid Slug' })` | `success: false`, 첫 이슈 경로 `['slug']` |
| 2 | `CreateBlogPostSchema.safeParse(최소 입력)` | `success: true`, `data.editorType === 'rich'`, `attachments` `[]`, `featured` `false`, `published` `false` (기본값 적용) |
| 3 | `coverImageUrl` 에 `'javascript:alert(1)'`, `'data:text/html,x'`, `''` 지정 | 앞의 두 값은 `success: false`, 빈 문자열은 `success: true` |
| 4 | `createBlogSchemas({ maxAttachments: 1 })` 에 첨부 2개 입력 | `success: false`, 메시지가 `DEFAULT_I18N_KO.adminAttachmentMaxExceeded` |
| 5 | `createBlogSchemas({ i18n: { validationTitleRequired: 'Title required' } })` 에 `title: ''` 입력 | 첫 이슈 메시지 `'Title required'` |
| 6 | `BulkUpdateSchema.safeParse({ ids: [] })` | `success: false` |
| 7 | `createCommentSchemas().CreateCommentSchema` 에 2001자 `content`, `guestEmail: 'x'` 입력 | 각각 `success: false` |
| 8 | `createTagSchemas({ maxNameLength: 3 })` 에 `name: 'abcd'` 입력 | `success: false` |

- **자동화:** 가능 ✅
- **근거:** 1~8번 예상값은 2026-09-13 `dist` 대상 임시 스크립트로 확인했다.

---

### TC-U-007: i18n·파일·날짜·카테고리 테마 보조 유틸 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/utils-extra.test.mjs` (신규) |
| **대상** | `src/i18n/index.ts` `resolveI18n()` / `src/utils/file-helpers.ts` `formatFileSize()`, `getFileIcon()` / `src/utils/date.ts` `formatDate()`, `formatDateRelative()` / `src/utils/category-theme.ts` `createCategoryThemeVars()` |
| **우선순위** | Low |
| **전제조건** | 없음 (순수 함수) |
| **테스트 데이터** | 경계 크기 1023, 1536, 1048576 바이트, MIME 문자열, 고정 `now` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `resolveI18n()` | `DEFAULT_I18N_KO` 와 같은 참조 (`===`) |
| 2 | `resolveI18n({ adminListTitle: 'Blog Manager' })` | 해당 키만 교체되고 나머지 키는 기본값 |
| 3 | `formatFileSize(1023)`, `formatFileSize(1536)`, `formatFileSize(1048576)` | `'1023B'`, `'1.5KB'`, `'1.0MB'` |
| 4 | `getFileIcon('application/pdf')`, `getFileIcon('application/octet-stream')` | `'\u{1F4C4}'`, `'\u{1F4CE}'` |
| 5 | `formatDate(null)`, `formatDate('2026-05-16T00:00:00')` | `'-'`, `'2026.05.16'` |
| 6 | `formatDateRelative(new Date(now - 3 * 86400000), 'ko', now)` | `Intl.RelativeTimeFormat('ko', { numeric:'auto' }).format(-3, 'day')` 과 같은 문자열 |
| 7 | `createCategoryThemeVars(null)`, 테마 객체 입력 | `{}`, `--blog-cat-main` 부터 `--blog-cat-divider` 까지 6개 키 |

- **자동화:** 가능 ✅
- **근거:** 1~7번 예상값은 2026-09-13 임시 스크립트로 확인했다(6번 결과 `'3일 전'`).

---

### TC-U-008: S3 스토리지 어댑터 URL 키 추출 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/storage-adapter.test.mjs` (신규) |
| **대상** | `src/storage/s3-adapter.ts` `createS3StorageAdapter()`: `collectKeysFromHtml()`, 내부 `createDefaultUrlToKey()`, `deleteKeys()` 미설치 폴백 |
| **우선순위** | Medium |
| **전제조건** | 6번 단계는 `@aws-sdk/client-s3` 미설치 환경 (현재 설치 상태와 같음) |
| **테스트 데이터** | `{ bucket:'b', region:'auto', endpoint:'https://acc.r2.cloudflarestorage.com/', keyPrefix:'blog/' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `collectKeysFromHtml('<img src="https://acc.r2.cloudflarestorage.com/b/blog/a%20b.jpg">')` | `['blog/a b.jpg']` (endpoint 끝 슬래시 제거, `decodeURIComponent` 적용) |
| 2 | `keyPrefix` 로 시작하지 않는 URL (`.../b/other/x.jpg`) | `[]` |
| 3 | 같은 URL 이 `src` 와 `href` 에 중복 | 중복이 제거된 키 1개 |
| 4 | `publicUrlPattern: /cdn\.ex\.com\/(.+)$/` 지정 | 첫 캡처 그룹을 키로 사용 |
| 5 | `collectKeysFromHtml(null)` | `[]` |
| 6 | `deleteKeys(['k'])` | 예외 없이 resolve, `console.error` 에 `@aws-sdk/client-s3 is not installed. Storage cleanup skipped.` 기록 |
| 7 | `deleteKeys([])` | 즉시 resolve, 모듈 import 시도 없음 |

- **자동화:** 가능 ✅
- **근거:** 1~7번 예상값은 2026-09-13 임시 스크립트로 확인했다(6·7번을 연속 실행했을 때 `console.error` 기록은 1건).

---

### TC-U-009: React 컴포넌트 렌더링 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (러너 결정 후 신규) |
| **대상** | `components/admin` 8개(`BlogManagerClient`, `BlogListView`, `BlogEditForm`, `BlogDetailPreview`, `BlogListPreview`, `TagPicker`, `CommentModerationPanel`, `BlogDashboard`), `components/public` 6개(`BlogListPage`, `BlogDetailPage`, `CommentList`, `CommentForm`, `TagBadge`, `TagCloud`), `defaultComponents` 기본 UI 8개(Button, Toggle, Input, Textarea, Select, Badge, Card, Link), `components/admin/editor` 2개(`BlockEditorForm`, `RichTextEditor`), `BlogThemeProvider` 1개 |
| **우선순위** | Medium |
| **전제조건** | **선행 조건: 렌더링 테스트 인프라 도입.** `@testing-library/react` 와 jsdom 이 devDependencies 에 없고, 현재 러너(`node:test` + `dist/*.mjs`)는 JSX 소스를 직접 실행하지 않는다. editor 2개는 `@tiptap/react` 등 선택적 peer 설치가 추가로 필요하다 |
| **테스트 데이터** | 태그 목록, 게스트·로그인 사용자 props |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `BlogThemeProvider` 없이 `useBlogUI()` 사용 컴포넌트 렌더링 | `defaultComponents` 로 렌더링 (컨텍스트가 `null` 이면 기본값 반환) |
| 2 | `BlogThemeProvider components={{ Button: Custom }}` 로 감싸 렌더링 | `Button` 만 교체되고 나머지는 기본 컴포넌트 |
| 3 | `TagCloud tags={[]}` | `t.tagCloudEmpty` 문구가 `<p>` 로 렌더링 |
| 4 | `TagCloud` 에 `onTagClick` 지정 / 미지정 | 지정 시 `<button type="button">` 이고 클릭하면 `onTagClick(tag)` 호출, 미지정 시 `href = <basePath 끝 슬래시 제거>?tag=<slug>` 링크 |
| 5 | `CommentForm` 에 `currentUserId` 미지정 | 이름·이메일 입력이 렌더링되고, `currentUserId` 지정 시 두 입력이 렌더링되지 않음 |
| 6 | `DefaultToggle` 클릭 (`disabled` false / true) | `onChange(!checked)` 호출 / 미호출 |

- **자동화:** 가능 ✅ (인프라 도입 후)
- **컴포넌트 수 검증:** 2026-09-13 `dist/components/admin/index.mjs` 와 `dist/components/public/index.mjs` 를 import 해 export 를 나열한 결과, PascalCase 컴포넌트는 admin 9개(`BlogThemeProvider` 포함), public 7개(`BlogThemeProvider` 포함)였고 `defaultComponents` 는 8개 키를 가졌다. editor 엔트리는 `@tiptap/react` 미설치로 import 되지 않아 소스(`src/components/admin/editor/index.ts`)에서 2개를 확인했다. 고유 컴포넌트는 25개이다. 사전 조사의 22개는 admin 8 + public 6 + 기본 UI 8 의 합과 일치하며, 산정 기준은 조사 문서에 기재되어 있지 않다.

---

## 2. Integration Tests (통합 테스트)

**목적:** 실제 서비스 팩토리(`createXxxService`)에 인메모리 fake Prisma 를 주입해 서비스 로직과 Prisma 질의 인자 구성을 함께 검증한다. 실제 DB 는 사용하지 않는다.

**실행 명령:** `npm test` (단일 파일: `npm run build && node --test test/runtime/concurrency-guards.test.mjs`)

**현재 공백:** 서비스 5종 중 `CommentService.create()` 와 `SchedulerService.processScheduledPosts()` 만 fake Prisma 로 실행된다. `BlogService`, `TagService`, `SearchService` 를 실행하는 테스트는 `auth-failclosed.test.mjs` 뿐이며, 이 파일은 모든 델리게이트가 빈 결과를 반환하는 Proxy fake 를 사용하므로 질의 조건과 매핑 로직을 단언하지 않는다.

---

### TC-I-001: 댓글 생성 경로 순차 동작 (fake Prisma)

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/concurrency-guards.test.mjs` (11건 중 4건) |
| **대상** | `src/services/comment.service.ts` `createCommentService().create()` |
| **우선순위** | High |
| **전제조건** | `createFakeCommentPrisma()`: `count`, `create`, `delete`, `findUnique`, `findMany` 가 매크로태스크 한 틱을 양보하는 인메모리 델리게이트이며 호출 횟수(`calls`)를 기록 |
| **테스트 데이터** | `rateLimit.maxPerHour` 1~2, `ipHash:'ip-A'`, `honeypot:'filled'`, `spamFilter: (c) => c.includes('casino')`, `maxDepth: 1` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 제한 2건에서 순차로 3번째 요청 (`순차 초과 요청은 삽입 없이 사전 차단`) | `COMMENT_RATE_LIMIT_EXCEEDED`, `statusCode` 429, 저장 2건, `calls.create === 2`, `calls.delete === 0` |
| 2 | `ipHash` 없이 제한 1건에 2회 생성 | 저장 2건, `calls.count === 0` |
| 3 | 기존 1건으로 제한(1)을 채운 상태에서 `honeypot:'filled'` 요청 | `status === 'SPAM'` 으로 저장, 429 아님, 저장 2건 |
| 4 | `autoApprove:true` 생성, `spamFilter` 적중 생성 | `APPROVED`, `SPAM` |
| 5 | `maxDepth:1` 에서 대댓글 생성, 존재하지 않는 `parentId:'nope'` 로 생성 | `COMMENT_MAX_DEPTH_EXCEEDED`, `COMMENT_PARENT_NOT_FOUND` |

- **자동화:** 가능 ✅ | **테스트 수:** 4개 (실측)

---

### TC-I-002: 예약 발행 단일 실행 결과 계약

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/concurrency-guards.test.mjs` (11건 중 2건) |
| **대상** | `src/services/scheduler.service.ts` `processScheduledPosts()` |
| **우선순위** | High |
| **전제조건** | `createFakeSchedulerPrisma()`: `updateMany` 는 한 틱 양보 후 조건 평가와 변경을 동기로 수행해 단일 UPDATE 문의 원자성을 모사 |
| **테스트 데이터** | 과거 예약 `p1`·`p2`(`publishedAt: ago(5)`), 미래 예약 `future`, `publishedAt:null` 인 `draft`, 발행 완료 `live` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 혼합 데이터로 1회 실행 | `processed === 2`, 정렬한 `postIds` 가 `['p1','p2']` |
| 2 | 1번 실행 후 `future`, `draft` 확인 | 두 글 모두 `published === false` 유지 |
| 3 | 대상 0건으로 실행 | `{ processed: 0, postIds: [] }` |

- **자동화:** 가능 ✅ | **테스트 수:** 2개 (실측)

---

### TC-I-003: BlogService 공개 조회 조건 구성 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/blog-service-public.test.mjs` (신규) |
| **대상** | `src/services/blog.service.ts` `listPublished()`, `getPublishedBySlug()`, `getFeatured()`, `getAdjacentPosts()` / `src/services/blog.service.internal.ts` `toListItem()`, `flattenTags()` |
| **우선순위** | Critical |
| **전제조건** | `createBlogService({ blogPost: delegate }, { modelName:'blogPost', enableTags })` 에 `findMany`, `count`, `findFirst`, `findUnique` 인자를 기록하는 fake 델리게이트 주입. `blog.service.internal` 은 dist 서브패스로 노출되지 않으므로 서비스 반환값으로 관찰한다. `concurrency-guards.test.mjs` 의 `matchWhere` 매처를 공용 헬퍼로 분리하면 재사용할 수 있다 |
| **테스트 데이터** | `{ page: NaN, limit: 0, category:'news', search:'q', tagSlug:'js' }`, `tagSlugs:['a','b']` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `enableTags` 미지정으로 `listPublished({ page:NaN, limit:0, category:'news', search:'q', tagSlug:'js' })` | `findMany` 인자 `where = { published:true, category:'news', OR:[{ title:{ contains:'q', mode:'insensitive' } }] }`, `skip:0`, `take:1`, `orderBy:{ publishedAt:'desc' }`. 태그 비활성이라 `tags` 조건 없음 |
| 2 | `enableTags:true` 와 `tagSlugs:['a','b']` 로 호출 | `where.tags = { some:{ tag:{ slug:{ in:['a','b'] } } } }` |
| 3 | `enableTags:true` 에서 `tagSlug` 와 `tagSlugs` 동시 지정 | `tagSlug` 단일 조건만 적용 |
| 4 | `getPublishedBySlug('x')` | `findFirst` 의 `where = { slug:'x', published:true }`, 결과가 없으면 `null` |
| 5 | `findMany` 가 `attachments: []`, `tags:[{ tag:{ id:'t' } }]` 행을 반환 | 항목에 `attachments` 키가 없고 `hasAttachments:false`, `tags` 는 `[{ id:'t' }]` 로 평탄화 |
| 6 | 현재 글 `publishedAt:null` 로 `getAdjacentPosts(id)` | `{ prev:null, next:null }`, 추가 `findFirst` 호출 없음 |
| 7 | `getFeatured()` (인자 없음) | `where:{ published:true, featured:true }`, `take:1` |

- **자동화:** 가능 ✅
- **근거:** 1·2번은 2026-09-13 임시 스크립트로 확인했다.
- **기존 테스트 한계:** 공개 포스트 라우트를 호출하는 기존 테스트가 없으며, `auth-failclosed.test.mjs` 는 admin 목록 라우트를 빈 결과 fake 로만 실행한다.

---

### TC-I-004: BlogService 작성·수정 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/blog-service-write.test.mjs` (신규) |
| **대상** | `src/services/blog.service.ts` `create()`, `update()`, `checkSlugAvailable()` / `src/services/blog.service.internal.ts` `uniqueSlug()` |
| **우선순위** | Critical |
| **전제조건** | fake 델리게이트, `$transaction: (fn) => fn(prisma)`, `postTag.createMany`·`deleteMany` 인자 기록 |
| **테스트 데이터** | 기존 slug `hello`(id 1), `hello-2`(id 2), `hello-world`(id 3) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `create({ slug:'hello', ... }, 'u1')` | 저장 slug `'hello-3'` (정확 일치가 있으면 `hello-` 접두 slug 를 모아 비어 있는 최소 접미사 선택) |
| 2 | `create({ slug:'fresh', ... })` | 접두 조회(`findMany`) 없이 `'fresh'` 저장 |
| 3 | `sanitizeContent` 주입 후 `content:'<p>ok</p><script>x</script>'` 저장 | 저장 `content` 는 새니타이즈 결과. 결과가 빈 문자열이면 원본 `content` 가 저장된다 (TC-S-013 3번 참조) |
| 4 | `published:true`, `publishedAt` 미지정 / 둘 다 미지정 | `publishedAt` 은 현재 시각 `Date` / `null` |
| 5 | `enableTags:true` 와 `tagIds:['t1','t2']` 로 생성 | `$transaction` 안에서 `blogPost.create` 후 `postTag.createMany({ data:[{postId, tagId:'t1'},{postId, tagId:'t2'}], skipDuplicates:true })` |
| 6 | `enableTags:true` 에서 `tagIds:[]`, 또는 `postTag.createMany` 부재 | 트랜잭션 없이 `delegate.create` 1회 |
| 7 | 기존 `published:false` 글을 `update(id, { published:true })` | 트랜잭션 안에서 `findUnique` 후 `publishedAt` 을 현재 시각으로 설정. 기존 `published:true` 면 `publishedAt` 미변경 |
| 8 | `enableTags:true` 에서 `update(id, { tagIds: [] })` | `postTag.deleteMany({ where:{ postId:id } })` 만 호출, `createMany` 미호출 |
| 9 | `update(id, { coverImageUrl:'' })` | `coverImageUrl: null` 로 정규화 |
| 10 | `checkSlugAvailable('hello')`, `('hello','1')`, `('fresh')` | `false`, `true`, `true` |

- **자동화:** 가능 ✅
- **근거:** 1·10번은 2026-09-13 임시 스크립트로 확인했다.
- **비고:** 1번 `uniqueSlug()` 는 조회와 삽입 사이에 원자성이 없어 동시 작성 시 같은 slug 가 계산될 수 있다. 패키지 스키마(`prisma/blog.prisma`)는 `BlogPost.slug` 에 `@unique` 를 선언하므로 두 번째 삽입은 DB 제약 오류가 되며, 이 오류는 `BlogError` 가 아니어서 라우트에서 500 으로 응답된다(TC-A-002 2번).

---

### TC-I-005: BlogService 삭제·발행 전환·일괄 변경·대시보드 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/blog-service-admin.test.mjs` (신규) |
| **대상** | `src/services/blog.service.ts` `remove()`, `removeMany()`, `togglePublish()`, `bulkUpdatePublished()`, `bulkUpdateFeatured()`, `getDashboardStats()`, `listAll()` |
| **우선순위** | High |
| **전제조건** | fake 델리게이트와 호출을 기록하는 fake `StorageAdapter`(`collectKeysFromHtml`, `deleteKeys`) |
| **테스트 데이터** | `p1 = { coverImageKey:'cover.jpg', content:'<img src="x">', attachments:[{ key:'att1' }] }`, `collectKeysFromHtml` 반환 `['body.jpg']` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `remove('missing')` | `BlogError` `POST_NOT_FOUND`, `statusCode` 404, `delete` 미호출 |
| 2 | storage 주입 후 `remove('p1')` | `delete` 후 `storage.deleteKeys(['cover.jpg','body.jpg','att1'])` 1회 |
| 3 | storage 미주입 `remove('p1')` | `delete` 만 호출 |
| 4 | storage 주입 후 두 글이 같은 키를 공유하는 `removeMany(ids)` | `deleteKeys` 인자에서 중복 제거, `deleteMany` 반환 `count` 를 반환 |
| 5 | 기존 `published:false` 글 `togglePublish(id)` | `update` data `{ published:true, publishedAt: Date }`. 반대 경우 `publishedAt:null` |
| 6 | `count` 10/4/2, `groupBy` `[{ category:'news', _count:{ _all:3 } }]` 로 `getDashboardStats()` | `{ total:10, published:4, unpublished:6, featured:2, byCategory:{ news:3 } }`, `recentPosts` 는 `orderBy:{ createdAt:'desc' }`, `take:5` 조회 결과 |
| 7 | `onViewCount` 주입 후 `listAll({ page:1, limit:10, published:'false', sortBy:'author', sortDir:'asc' })` | `where:{ published:false }`, `orderBy:{ author:{ name:'asc' } }`, `onViewCount('BLOGPOST', ids)` 호출, 맵에 없는 id 는 `viewCount:0` |

- **자동화:** 가능 ✅
- **근거:** 1·2·5번은 2026-09-13 임시 스크립트로 확인했다.

---

### TC-I-006: TagService CRUD·태그 클라우드·관련 글 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/tag-service.test.mjs` (신규) |
| **대상** | `src/services/tag.service.ts` `createTagService()` 전체 메서드 |
| **우선순위** | Critical |
| **전제조건** | `{ tag, postTag, blogPost }` fake 델리게이트, `postModelName:'blogPost'` |
| **테스트 데이터** | 기존 태그 `{ id:'t1', slug:'dup' }`, 클라우드 행 `a(_count.posts 1)`, `b(5)`, `c(_count 없음)`, 관련 글 후보 `r1(tag x)`, `r2(tag x, y)` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `create({ slug:'dup', name:'d' })` | `TAG_DUPLICATE_SLUG`, `statusCode` 409, `create` 미호출 |
| 2 | `update('t1', { slug:'dup' })`, `update('t2', { slug:'dup' })` | 자기 자신은 통과, 다른 id 는 409 |
| 3 | `remove('nope')` | `TAG_NOT_FOUND`, `statusCode` 404 |
| 4 | `listAll({ search:'js' })` | `where.OR` 에 `name`·`slug` 의 `contains` + `mode:'insensitive'`, `include:{ _count:{ select:{ posts:true } } }`, `orderBy:{ name:'asc' }`, 기본 `take:20` |
| 5 | `getTagCloud(10000)`, `getTagCloud(NaN)`, `getTagCloud(0)` | `take` 가 각각 500, 30, 1. 결과는 `postCount` 내림차순 `b:5, a:1, c:0` (`_count` 없는 행은 0) |
| 6 | `getPostsByTag('js')` | `blogPost.findMany` 의 `where = { published:true, tags:{ some:{ tag:{ slug:'js' } } } }`, 기본 `take:12` |
| 7 | 현재 글 태그 `x`, `y` 로 `getRelatedPosts('p', 2)` | `blogPost.findMany` 의 `where = { id:{ not:'p' }, published:true, tags:{ some:{ tagId:{ in:['x','y'] } } } }`, `take:6`, 반환 순서 `r2, r1` (공유 태그 수 내림차순) |
| 8 | 현재 글에 태그가 없을 때 `getRelatedPosts('p')` | `[]`, `blogPost.findMany` 미호출 |
| 9 | `getTagsByPost('p')` 에서 관계 행 중 `tag:null` 포함 | `null` 태그 제외 |
| 10 | `postTag` 모델이 없는 prisma 로 생성 | `Prisma model "postTag" not found. Check TagServiceConfig.postTagModelName.` throw |

- **자동화:** 가능 ✅
- **근거:** 1~3, 5, 7, 9, 10번은 2026-09-13 임시 스크립트로 확인했다.
- **확인 필요:** 5번에서 DB 조회는 `orderBy` 없이 `take` 만 적용한 뒤 메모리에서 정렬한다. 태그 수가 `take` 보다 많으면 사용 수 상위 태그가 결과에서 빠질 수 있다.

---

### TC-I-007: SearchService SQL·파라미터 구성 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/search-service.test.mjs` (신규) |
| **대상** | `src/services/search.service.ts` `search()` |
| **우선순위** | Critical |
| **전제조건** | `$queryRawUnsafe(sql, ...params)` 인자를 기록하고, SQL 에 `COUNT` 가 있으면 `[{ count:3 }]`, 없으면 결과 행을 반환하는 fake |
| **테스트 데이터** | 결과 행 `{ id:'a', attachments:[{}], rank:0.5 }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `search({ query:'!!!' })` | `{ items:[], total:0, page:1, limit:12, totalPages:0 }`, `$queryRawUnsafe` 미호출 |
| 2 | `search({ query:'hello', category:'news', page:2, limit:5, highlight:true })` 의 목록 SQL | 파라미터 `['hello:*', 5, 5, 'news']`, SQL 에 `ts_headline('simple', content, ...)`, `FROM blog_posts`, `AND published = true`, `AND category = $4`, `ORDER BY rank DESC, published_at DESC NULLS LAST LIMIT $2 OFFSET $3` 포함 |
| 3 | 2번 호출의 COUNT SQL | 파라미터 `['hello:*', 'news']`, SQL 에 `AND category = $2` 포함 |
| 4 | `category`, `highlight` 미지정 | 목록 파라미터 3개, COUNT 파라미터 1개, SQL 에 `category =` 와 `ts_headline` 없음 |
| 5 | 2번 호출의 반환값 | 항목 `{ id:'a', rank:0.5, hasAttachments:true }` (`attachments` 키 제거), `total:3`, `page:2`, `limit:5`, `totalPages:1` |
| 6 | `config.lang:'korean'` 지정, `options.lang` 미지정 | SQL 에 `to_tsquery('korean', unaccent($1))` |
| 7 | COUNT 결과가 `[]` | `total: 0` |

- **자동화:** 가능 ✅
- **근거:** 1·2·3·5번은 2026-09-13 임시 스크립트로 확인했다.
- **한계:** 실제 PostgreSQL 에 `search_vector` 생성 컬럼과 `unaccent` 확장이 있는지는 fake 로 검증할 수 없으며, 호스트 통합 환경이 필요하다.

---

### TC-I-008: CommentService 조회 트리·관리 기능 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/comment-service-admin.test.mjs` (신규) |
| **대상** | `src/services/comment.service.ts` `listByPost()`, `listAll()`, `updateStatus()`, `bulkUpdateStatus()`, `remove()`, `removeMany()`, `getPendingCount()`, `create()` 의 `requireLogin`·깊이·작성자 필드 처리 |
| **우선순위** | High |
| **전제조건** | `concurrency-guards.test.mjs` 의 `createFakeCommentPrisma()` 를 공용 헬퍼로 분리해 `updateMany`, `deleteMany` 를 추가 |
| **테스트 데이터** | 승인 댓글 `a(parentId null)`, `b(parentId a)`, `c(parentId zz)` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `listByPost('p')` | `where = { postId:'p', status:'APPROVED' }`, `orderBy:{ createdAt:'asc' }`, 반환 루트 `a(replies:[b])`, `c(replies:[])` (승인 목록에 없는 부모를 가진 댓글은 루트로 표시) |
| 2 | `listByPost('p', { includeReplies:false })` | `parentId` 없는 `a` 만, `replies: []` |
| 3 | `requireLogin:true` 에서 `context.userId` 없이 `create()` | `COMMENT_LOGIN_REQUIRED`, `statusCode` 403, `count`·`create` 미호출 |
| 4 | `maxDepth:2` 에서 부모 체인 `b → a` 에 대댓글 | `COMMENT_MAX_DEPTH_EXCEEDED`, `statusCode` 400 (계산 깊이 3) |
| 5 | `create(..., { userId:'u1' })` 에 `guestName` 입력 | 저장 data 에 `authorId:'u1'`, `guestName:null`, `guestEmail:null` |
| 6 | `bulkUpdateStatus([], 'SPAM')`, `removeMany([])`, `bulkUpdateStatus(['x'], 'SPAM')` | `0`, `0` (델리게이트 미호출), `updateMany` 결과 `count` |
| 7 | `updateStatus('missing', 'APPROVED')`, `remove('missing')` | `COMMENT_NOT_FOUND`, `statusCode` 404 |
| 8 | `listAll({ status:'PENDING', postId:'p' })`, `getPendingCount()` | `where = { status:'PENDING', postId:'p' }`, `orderBy:{ createdAt:'desc' }`, 기본 `take:20` / `count({ where:{ status:'PENDING' } })` |

- **자동화:** 가능 ✅
- **근거:** 1·2·3·4·6번은 2026-09-13 임시 스크립트로 확인했다.

---

### TC-I-009: SchedulerService 예약 목록·취소 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/scheduler-service.test.mjs` (신규) |
| **대상** | `src/services/scheduler.service.ts` `listScheduled()`, `cancelSchedule()`, 팩토리 모델 검증 |
| **우선순위** | Medium |
| **전제조건** | 인자를 기록하는 fake `blogPost` 델리게이트 |
| **테스트 데이터** | `{ id:'f', attachments:null }` 행 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `listScheduled({ limit:-1 })` | `take:50`, `where = { published:false, publishedAt:{ not:null, gt: Date } }`, `orderBy:{ publishedAt:'asc' }` |
| 2 | 1번 결과 항목 확인 | `hasAttachments:false`, `attachments` 키 제거 |
| 3 | `cancelSchedule('p9')` | `update({ where:{ id:'p9' }, data:{ publishedAt:null } })` |
| 4 | `blogPost` 가 없는 prisma 로 기본 생성 | `Prisma model "blogPost" not found. Check SchedulerServiceConfig.modelName.` throw |
| 5 | `createSchedulerService(prisma, { modelName:'post' })` | `prisma.post` 델리게이트 사용 |

- **자동화:** 가능 ✅
- **근거:** 1~3번은 2026-09-13 임시 스크립트로 확인했다.

---

### TC-I-010: createBlog 기능 토글 조합 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/createblog-features.test.mjs` (신규) |
| **대상** | `src/index.ts` `createBlog()` |
| **우선순위** | Medium |
| **전제조건** | `auth-failclosed.test.mjs` 와 같은 Proxy fake Prisma. 4번은 Proxy fake 의 `count` 가 항상 0 을 반환하므로 `comment` 모델에 행을 저장하는 fake(`createFakeCommentPrisma()` 공용화 결과)를 지정 |
| **테스트 데이터** | `features` 조합, `searchTableName` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `features` 미지정 | `services.tags`, `services.search` 는 객체이고 `services.comments`, `services.scheduler` 는 `null` (태그·검색은 기본 활성, 댓글·스케줄러는 명시해야 활성) |
| 2 | `features:{ tags:false, search:false }` | `services.tags`, `routes.public.tags`, `routes.admin.tags`, `services.search`, `routes.public.search` 가 모두 `null` |
| 3 | `features:{ scheduler:{ enabled:false } }` | `services.scheduler`, `routes.admin.scheduler` 가 `null` |
| 4 | `features:{ comments:{ enabled:true, rateLimit:{ maxPerHour:1 } } }` + `commentHmacSecret` 에서 같은 `ipHash` 로 순차 2회 `services.comments.create()` | 두 번째 요청이 `COMMENT_RATE_LIMIT_EXCEEDED` (설정값이 서비스로 전달됨) |
| 5 | `searchTableName:'bad name'` | `createBlog` 가 `Invalid SQL identifier: bad name` throw |

- **자동화:** 가능 ✅
- **기존 테스트와의 관계:** `createblog-failfast.test.mjs` 3번 테스트가 `comments.enabled:false` 일 때 `services.comments === null` 을 이미 단언한다.

---

## 3. API Tests (라우트 핸들러 계약 테스트)

**목적:** `createXxxRoutes()` 가 반환하는 Next.js 라우트 핸들러에 `Request` 를 전달해 쿼리 파싱, 입력 검증, 상태 코드, 응답 본문과 헤더 계약을 검증한다. 서비스는 인자를 기록하는 fake 로 대체한다.

```
요청 처리 흐름:
Request
  → withPublic / withAuth (authMiddleware 검사)
  → parsePagination / getSearchParam / getRouteParam
  → validateWithSchema (enableValidation 기본 true)
  → service 호출
  → successResponse(data, status, headers)
  ↳ 예외 발생 시 handleError: BlogError 는 statusCode 유지, 그 외 500 INTERNAL_ERROR
```

**실행 명령:** `npm test`

**현재 상태:** 라우트 계층을 실행하는 기존 3개 파일(`auth-failclosed`, `scheduler-cron`, `ip-header-strategy`)은 인증과 IP 처리가 목적이므로 Security 도메인으로 분류했다. 파싱과 오류 매핑 계약을 단언하는 테스트는 없다.

---

### TC-A-001: 포스트 라우트 요청 파싱·응답 계약 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/post-routes.test.mjs` (신규) |
| **대상** | `src/routes/post.routes.ts` `createPostRoutes()`, `src/routes/_shared.ts` `parsePagination()`, `getRouteParam()` |
| **우선순위** | High |
| **전제조건** | 인자를 기록하는 fake `BlogService`, `authMiddleware: async () => ({ id:'u1' })` |
| **테스트 데이터** | 쿼리 문자열 `?page=-3&limit=999&sortBy=password&sortDir=ASC` 등 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | admin `list.GET` `?page=-3&limit=999&sortBy=password&sortDir=ASC` | `listAll` 인자 `{ page:1, limit:50, sortBy:'updatedAt', sortDir:'desc' }` (정렬 키 화이트리스트, `sortDir` 은 소문자 `asc` 만 허용) |
| 2 | public `list.GET` `?page=abc&limit=0` | `listPublished` 인자 `page:1`, `limit:12` (`limit=0` 은 기본값으로 대체) |
| 3 | public `detail.GET` 에서 서비스가 `null` 반환 / 객체 반환 | 404 `POST_NOT_FOUND` 이고 `Cache-Control` 헤더 없음 / 200 과 `public, s-maxage=300, stale-while-revalidate=600` |
| 4 | admin `detail.DELETE`, admin `list.POST` 성공 | 204 (본문 없음), 201 |
| 5 | admin `bulk.PATCH` `{ ids:['a'], published:true, featured:false }` | `bulkUpdatePublished` 와 `bulkUpdateFeatured` 반환값의 합계를 `{ count }` 로 응답 |
| 6 | admin `slugCheck.GET` `?slug=%20%20` / 정상 slug | 400 `slug parameter is required` / 200 과 `Cache-Control: private, max-age=10` |
| 7 | public `featured.GET` `?limit=abc` | 서비스에 `NaN` 이 전달됨 (`getFeatured(limit = 1)` 기본값은 `undefined` 에만 적용) |
| 8 | `context` 없이 public `detail.GET` 호출 | 400 `VALIDATION_FAILED`, 메시지 `Missing route parameter: slug` |

- **자동화:** 가능 ✅
- **근거:** 1·2·3·7번은 2026-09-13 임시 스크립트로 확인했다.
- **확인 필요:** 7번에서 `NaN` 이 Prisma `take` 로 전달되면 실제 Prisma 가 오류를 던질 가능성이 있으며, 이 경우 500 으로 응답된다. 실제 Prisma 동작은 확인하지 않았다.

---

### TC-A-002: 라우트 오류 응답 매핑 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/route-errors.test.mjs` (신규) |
| **대상** | `src/routes/_shared.ts` `makeRouteKit()` (`handleError`, `withAuth`, `withPublic`), `validateWithSchema()`, `validateIds()` |
| **우선순위** | High |
| **전제조건** | 지정한 예외를 던지는 fake 서비스 |
| **테스트 데이터** | `new BlogError('TAG_DUPLICATE_SLUG', msg, 409)`, `new Error('db exploded')`, JSON 이 아닌 본문 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 서비스가 `BlogError(..., 409)` throw | 409, 본문 `{ success:false, error:{ code:'TAG_DUPLICATE_SLUG', message } }` |
| 2 | 서비스가 일반 `Error('db exploded')` throw | 500 `INTERNAL_ERROR`, `message` 는 원본 `err.message`, `console.error` 에 라우트 그룹 라벨(`[@withwiz/blog-core] Unhandled error:`) 출력 |
| 3 | `authMiddleware` 가 throw | `withAuth` 의 catch 에서 1·2번과 같은 규칙으로 매핑 |
| 4 | 스키마 검증 실패 | 400 `VALIDATION_FAILED`, 메시지 `'<이슈 경로>: <첫 이슈 메시지>'` |
| 5 | `ids` 가 빈 배열 또는 배열이 아님 | 400 `ids array is required` |
| 6 | 요청 본문이 JSON 이 아님 (`req.json()` 실패) | 500 `INTERNAL_ERROR` (현재 코드는 파싱 오류를 400 으로 구분하지 않음) |

- **자동화:** 가능 ✅
- **근거:** 2번은 2026-09-13 임시 스크립트로 확인했다. 6번은 `req.json()` 이 `SyntaxError` 를 던지고 `handleError` 가 `BlogError` 가 아닌 예외를 500 으로 변환하는 코드에 근거한다.

---

### TC-A-003: 태그·검색·댓글 라우트 요청 파싱 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/tag-search-comment-routes.test.mjs` (신규) |
| **대상** | `src/routes/tag.routes.ts`, `src/routes/search.routes.ts`, `src/routes/comment.routes.ts` |
| **우선순위** | Medium |
| **전제조건** | 인자를 기록하는 fake 서비스, admin 핸들러는 사용자 반환 `authMiddleware` |
| **테스트 데이터** | 아래 단계별 쿼리와 본문 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | tag public `cloud.GET` `?limit=abc` | `getTagCloud(undefined)`, `Cache-Control: public, s-maxage=600, stale-while-revalidate=1800` |
| 2 | `enableValidation:false` 로 tag admin `list.POST` `{ slug:' js ', name:' JS ', extra:1 }` | 서비스 인자 `{ slug:'js', name:'JS', description:undefined }` (허용 필드만 전달, 공백 제거), 201 |
| 3 | tag admin `detail.PUT` 에서 대상 없음 | 스키마 검증 전에 404 `TAG_NOT_FOUND` |
| 4 | search `search.GET` `?query=abc&highlight=1&limit=500` | 서비스 인자 `query:'abc'`, `limit:50`, `highlight:true`, `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`. `q` 와 `query` 가 함께 있으면 `q` 우선 |
| 5 | comment admin `detail.PATCH` `{ status:'DELETED' }` | 400 `status must be one of: PENDING, APPROVED, REJECTED, SPAM` |
| 6 | comment admin `list.GET` `?status=bogus` | `listAll` 인자 `status: undefined` |
| 7 | comment public `list.GET` `?includeReplies=false` | `listByPost(postId, { includeReplies:false })`, `Cache-Control: public, s-maxage=60, stale-while-revalidate=120` |
| 8 | 검증 활성 상태에서 comment public `create.POST` 본문 `{}` | 400 `VALIDATION_FAILED` |

- **자동화:** 가능 ✅
- **근거:** 4번의 파라미터 전달은 2026-09-13 임시 스크립트(검색 라우트 + 실제 SearchService)로 확인했다.

---

### TC-A-004: 댓글 requireLogin 설정과 공개 작성 라우트 연동 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/comment-require-login.test.mjs` (신규) |
| **대상** | `src/routes/comment.routes.ts` `public.create.POST`, `src/services/comment.service.ts` `create()` 의 `requireLogin` 검사 |
| **우선순위** | High |
| **전제조건** | 실제 `createCommentService(prisma, { requireLogin:true })` 와 `createCommentRoutes(svc, { hmacSecret:'s' })` |
| **테스트 데이터** | 본문 `{ content:'hi' }`, `params: { postId:'p1' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 로그인 쿠키·헤더 여부와 무관하게 POST | 403 `COMMENT_LOGIN_REQUIRED` |
| 2 | 라우트 코드 경로 확인 | `commentService.create(input, { userId: undefined, ipHash })` 로 고정되어 있고, `CommentRoutesConfig` 에는 공개 라우트에서 사용자를 식별하는 설정이 없음 (`authMiddleware` 는 admin 핸들러에만 사용) |
| 3 | `createBlog({ features:{ comments:{ enabled:true, requireLogin:true } }, commentHmacSecret })` 경유 POST | 1번과 같은 403 |

- **자동화:** 가능 ✅
- **근거:** 1번은 2026-09-13 임시 스크립트로 확인했다.
- **확인 필요:** `requireLogin` 을 켠 호스트에서는 로그인 사용자도 공개 라우트로 댓글을 작성할 수 없다. 호스트가 서비스를 직접 호출하는 방식만 지원하려는 설계인지, 라우트가 사용자 식별을 누락한 결함인지 결정한 뒤 예상 결과를 확정한다. `CommentForm` 컴포넌트는 `currentUserId` prop 으로 로그인 상태를 구분하므로 UI 와 라우트 동작이 일치하지 않는다.

---

## 4. E2E Tests (엔드-투-엔드 테스트)

**판정:** 미적용

이 패키지는 DB 스키마 적용, Next.js 런타임, 인증을 호스트가 제공하는 라이브러리이므로 브라우저에서 사용자 흐름 전체를 재현하는 E2E 는 호스트 프로젝트 책임으로 판정했다. `dist` 산출물을 실제로 import 하는 소비자 관점 검증은 Smoke(SC-SM-002)로 분류했다. 시나리오와 케이스는 정의하지 않는다.

---

## 5. Security Tests (보안 테스트)

**목적:** 인증 fail-closed, 시크릿 주입 강제, IP 스푸핑 방어, 저장 XSS 방어, SQL 식별자 주입 방어를 검증한다.

**실행 명령:** `npm test`

---

### TC-S-001: 관리자 라우트 인증 미설정 시 fail-closed

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/auth-failclosed.test.mjs` (6건 중 3건) |
| **대상** | `src/routes/_shared.ts` `makeRouteKit().withAuth()`, `createBlog().routes.admin.posts.list.GET` |
| **우선순위** | Critical |
| **전제조건** | 모든 모델 키에 빈 결과 델리게이트를 반환하는 Proxy fake Prisma 를 `createBlog` 에 주입 (실제 서비스와 라우트 사용) |
| **테스트 데이터** | `authMiddleware` 미주입 / `async () => null` / `async () => ({ id:'admin-1', role:'admin' })` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `authMiddleware` 미주입 상태로 GET | 401, `success:false`, `error.code === 'UNAUTHORIZED'` |
| 2 | `authMiddleware` 가 `null` 반환 | 401 |
| 3 | `authMiddleware` 가 사용자 반환 | 200, `success:true` |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (실측)
- **관련 요구사항:** OWASP A01:2021 Broken Access Control
- **한계:** admin 핸들러 24개 중 `posts.list.GET` 1개만 호출한다. 나머지는 SC-S-010 에서 다룬다.

---

### TC-S-002: 예약 발행 처리 엔드포인트 인증 fail-closed

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/auth-failclosed.test.mjs` (6건 중 3건) |
| **대상** | `src/routes/scheduler.routes.ts` `processHandler` (`createBlog` 경유) |
| **우선순위** | Critical |
| **전제조건** | TC-S-001 과 같은 Proxy fake Prisma, `features.scheduler.enabled:true` |
| **테스트 데이터** | `cronSecret:'s3cr3t'`, `Authorization: Bearer s3cr3t`, 사용자 반환 `authMiddleware` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `cronSecret` 과 `authMiddleware` 모두 미주입 상태로 `process.POST` | 401, `error.code === 'UNAUTHORIZED'` |
| 2 | `cronSecret:'s3cr3t'` 과 `Authorization: Bearer s3cr3t` | 200 |
| 3 | `cronSecret` 없음, `authMiddleware` 가 사용자 반환 | 200 (admin 인증 폴백) |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (실측)
- **관련 요구사항:** OWASP A01:2021 Broken Access Control
- **한계:** 실제 `createSchedulerService` 가 실행되지만 fake `findMany` 가 `[]` 를 반환하므로 전환 로직은 실행되지 않는다. `process.GET`(Vercel Cron 경로)은 같은 핸들러를 참조하지만 호출하지 않는다.

---

### TC-S-003: cronSecret Bearer 상수시간 비교

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/scheduler-cron.test.mjs` |
| **대상** | `src/routes/scheduler.routes.ts` `verifyCronSecret()`, `constantTimeEquals()` (SHA-256 다이제스트 후 `timingSafeEqual`) |
| **우선순위** | Critical |
| **전제조건** | `createSchedulerRoutes(fakeScheduler, { cronSecret:'top-secret' })`: 서비스는 고정값을 반환하는 fake 객체 |
| **테스트 데이터** | `Bearer top-secret`, `Bearer wrong`, 헤더 없음, `'Bearer ' + 'a'.repeat(500)` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `Authorization: Bearer top-secret` | 200, `success:true` |
| 2 | `Authorization: Bearer wrong` | 401 |
| 3 | `Authorization` 헤더 없음 | 401 |
| 4 | 길이 507자 토큰 | 401, 길이 불일치로 인한 `timingSafeEqual` 예외 없음 |

- **자동화:** 가능 ✅ | **테스트 수:** 4개 (실측)
- **관련 요구사항:** CWE-208 Observable Timing Discrepancy
- **한계:** fake 서비스를 주입해 라우팅·인증 계층만 검증하며 실제 `SchedulerService` 경로는 실행하지 않는다. fake `processScheduledPosts()` 의 반환값 `{ published:0, ids:[] }` 은 실제 계약 `ProcessScheduledResult`(`{ processed, postIds }`)와 형태가 다르지만, 응답 본문 `data` 를 단언하지 않아 드러나지 않는다.

---

### TC-S-004: 댓글 IP 해시 시크릿 미주입 시 fail-fast

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/createblog-failfast.test.mjs` |
| **대상** | `src/index.ts` `createBlog()` → `src/routes/comment.routes.ts` `createCommentRoutes()` 시크릿 검사 |
| **우선순위** | Critical |
| **전제조건** | Proxy fake Prisma |
| **테스트 데이터** | `features.comments.enabled` true/false, `commentHmacSecret:'injected-secret'` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 댓글 활성, `commentHmacSecret` 미주입 | `createBlog` 가 `/IP 해시 시크릿 주입이 필수/` 메시지로 throw |
| 2 | 댓글 활성, 시크릿 주입 | `services.posts` 가 객체, `routes.public.comments` 존재 |
| 3 | 댓글 비활성, 시크릿 없음 | 정상 생성, `services.comments === null` |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (실측)
- **관련 요구사항:** OWASP A05:2021 Security Misconfiguration
- **한계:** 빈 문자열 시크릿(`commentHmacSecret:''`)은 검증하지 않는다. 코드상으로는 `hmacSecret.length === 0` 조건으로 같은 오류가 발생한다.

---

### TC-S-005: IP 해시 HMAC 시크릿 필수

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/ip-hash.test.mjs` |
| **대상** | `src/utils/ip-hash.ts` `hashIp()`, `createIpHasher()` |
| **우선순위** | High |
| **전제조건** | 없음 (Node `crypto` 사용 순수 함수) |
| **테스트 데이터** | `'1.2.3.4'`, `'9.9.9.9'`, 시크릿 `'secret-A'`, `'secret-B'`, `''`, `'s'` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `hashIp('1.2.3.4')` | `/시크릿이 주입되지 않았습니다/` throw |
| 2 | `hashIp('1.2.3.4', '')` | 1번과 같은 throw |
| 3 | 같은 IP·시크릿으로 2회, 다른 시크릿으로 1회 호출 | 64자 소문자 hex, 앞의 두 값은 동일, 시크릿이 다르면 상이 |
| 4 | `createIpHasher('')` | `/비어 있을 수 없습니다/` throw |
| 5 | `createIpHasher('s')('9.9.9.9')` | 64자 hex |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (실측)

---

### TC-S-006: 클라이언트 IP 헤더 신뢰 전략 (스푸핑 방어)

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/ip-header-strategy.test.mjs` |
| **대상** | `src/routes/comment.routes.ts` 내부 `extractClientIp()` (`ipHeader`: `'auto'`, `'none'`, 헤더명) |
| **우선순위** | High |
| **전제조건** | `create()` 인자를 캡처하는 fake CommentService, `enableValidation:false`, `hmacSecret:'test-secret'` |
| **테스트 데이터** | `cf-connecting-ip: 8.8.8.8`, `x-real-ip: 7.7.7.7`, `x-forwarded-for: 9.9.9.9, 1.1.1.1`, 본문 `{ content:'hello world' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `ipHeader` 미지정 (`'auto'`) | 201, `ipHash` 가 64자 hex |
| 2 | `ipHeader:'none'` | 201, `ipHash === undefined` |
| 3 | `'x-forwarded-for'` 와 `'auto'` 결과 비교 | 두 해시가 상이 (9.9.9.9 대 8.8.8.8) |
| 4 | `'none'` 에서 서비스 입력 확인 | `content === 'hello world'` 로 댓글 생성 요청 |

- **자동화:** 가능 ✅ | **테스트 수:** 4개 (실측)
- **관련 요구사항:** CWE-348 Use of Less Trusted Source
- **한계:** fake 서비스를 주입해 라우팅 계층만 검증하며, 계산된 해시가 실제 `CommentService` 의 레이트 리밋 조회에 쓰이는 경로는 실행하지 않는다. `'auto'` 에서 `cf-connecting-ip` 가 없을 때 `x-real-ip` 로 넘어가는 순서와 IP 헤더가 전혀 없는 경우는 단언하지 않는다.

---

### TC-S-007: HTML 새니타이저 기본 XSS 벡터·폴백 경고

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer.test.mjs` (12건 중 6건) |
| **대상** | `src/utils/html-sanitizer.ts` `sanitizeHtmlContent()`, `createSanitizer()` 정규식 폴백 경로, `warnWeakSanitizerOnce()` |
| **우선순위** | Critical |
| **전제조건** | `isomorphic-dompurify` 미설치 (정규식 폴백 사용), 모듈 로드 시 `console.warn` 가로채기 |
| **테스트 데이터** | `<script>`, `onerror`, `javascript:` 링크, youtube·비신뢰 iframe |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `<p>ok</p><script>alert(1)</script>` | `<script` 없음, `<p>ok</p>` 유지 |
| 2 | `<img src="x" onerror="alert(1)">` | `onerror` 제거 |
| 3 | `<a href="javascript:alert(1)">x</a>` | `javascript:` 제거 |
| 4 | `https://www.youtube.com/embed/abc` iframe, `https://evil.example/x` iframe | 전자 유지, 후자 제거 |
| 5 | 여러 번 sanitize 후 경고 로그 확인 | `isomorphic-dompurify` 를 언급하는 경고가 정확히 1회, `정규식 기반 폴백` 문구 포함 |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (실측)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)

---

### TC-S-008: HTML 새니타이저 강화 벡터 (R4)

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer.test.mjs` (12건 중 6건) |
| **대상** | `src/utils/html-sanitizer.ts` `DANGEROUS_PROTOCOL_UNQUOTED`, `OBFUSCATED_JS_PROTOCOL`, `STRIP_SRCDOC`, `DANGEROUS_STYLE` |
| **우선순위** | Critical |
| **전제조건** | TC-S-007 과 같음 |
| **테스트 데이터** | 무따옴표 속성, `xlink:href`, `srcdoc`, `style`, 개행 난독화 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `<a href=javascript:alert(1)>x</a>` | `javascript:` 제거 |
| 2 | `<a xlink:href="javascript:alert(1)">x</a>` | `javascript:` 제거 |
| 3 | 신뢰 youtube iframe 에 `srcdoc="<img src=q onerror=alert(1)>"` | iframe 유지, `srcdoc` 제거 |
| 4 | `style="background:url(javascript:alert(1))"`, `style="color:red"` | 전자 제거, 후자 유지 |
| 5 | `<a href="java\nscript:alert(1)">x</a>` | 공백으로 쪼갠 `javascript:` 패턴 없음 |
| 6 | `<p>hello</p><a href="https://ok.example/post">link</a>` | 그대로 유지 (회귀 가드) |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (실측)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)
- **한계 (TC-S-007 공통):** 정규식 폴백만 실행하며 `isomorphic-dompurify` 경로는 실행하지 않는다. 닫는 태그가 없는 비신뢰 iframe 은 테스트되지 않으며, 2026-09-13 실측에서 제거되지 않았다 (TC-S-013).

---

### TC-S-009: 검색 SQL 식별자 검증 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/search-identifier.test.mjs` (신규) |
| **대상** | `src/services/search.service.ts` 내부 `validateIdentifier()` (`tableName` 은 생성 시, `lang` 은 검색 시 검증) |
| **우선순위** | Critical |
| **전제조건** | `$queryRawUnsafe` 호출을 기록하는 fake prisma |
| **테스트 데이터** | `'blog_posts; DROP TABLE users'`, `"simple'); DROP"`, `'_t1'`, `'1table'` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `createSearchService(prisma, { postModelName:'blogPost', tableName:'blog_posts; DROP TABLE users' })` | `Invalid SQL identifier: blog_posts; DROP TABLE users` throw |
| 2 | `search({ query:'a', lang:"simple'); DROP" })` | `Invalid SQL identifier` 로 reject, `$queryRawUnsafe` 미호출 |
| 3 | `config.lang:'bad lang'` 로 생성 후 `search({ query:'a' })` | 생성은 성공하고 검색 호출에서 reject |
| 4 | 검색어 `"'; DROP TABLE x; --"` 로 검색 | SQL 문자열에 검색어 원문이 없고, `$1` 파라미터로 `'DROP:* & TABLE:* & x:*'` 만 전달 |
| 5 | `tableName:'_t1'`, `tableName:'1table'` | 전자 허용, 후자 throw |
| 6 | `createBlog({ searchTableName:'bad name' })` | 검색이 기본 활성이므로 `createBlog` 단계에서 throw |

- **자동화:** 가능 ✅
- **근거:** 1·2번은 2026-09-13 임시 스크립트로 확인했다.
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-89)

---

### TC-S-010: 관리자 라우트 전수 fail-closed 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/auth-failclosed-all.test.mjs` (신규) |
| **대상** | `createBlog()` 가 반환하는 admin 핸들러 24개: posts 11개(list GET·POST·DELETE, detail GET·PUT·DELETE, publish PATCH, bulk PATCH·DELETE, slugCheck GET, dashboard GET), tags 5개(list GET·POST, detail GET·PUT·DELETE), comments 6개(list GET, detail PATCH·DELETE, bulk PATCH·DELETE, pendingCount GET), scheduler 2개(pending GET, cancel POST) |
| **우선순위** | High |
| **전제조건** | 호출 여부를 기록하는 Proxy fake Prisma, 태그·댓글(`commentHmacSecret` 포함)·스케줄러 활성 |
| **테스트 데이터** | `authMiddleware` 미주입 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 24개 핸들러를 각각 호출 | 모두 401 `UNAUTHORIZED`, Prisma 델리게이트 호출 없음 |
| 2 | scheduler `process.GET` (`cronSecret`·`authMiddleware` 없음) | 401 |
| 3 | `cronSecret` 설정, 틀린 토큰, `authMiddleware` 가 사용자 반환 | 401 (`cronSecret` 이 설정되면 admin 인증으로 폴백하지 않음) |
| 4 | `authMiddleware` 가 사용자 반환할 때 scheduler `pending.GET` `?limit=abc` | `listScheduled({ limit:50 })` 호출 |

- **자동화:** 가능 ✅
- **관련 요구사항:** OWASP A01:2021 Broken Access Control

---

### TC-S-011: 포스트 관리 입력의 허용 필드 제한 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/post-mass-assignment.test.mjs` (신규) |
| **대상** | `src/routes/post.routes.ts` admin `list.POST`, `detail.PUT` / `src/services/blog.service.ts` `create()`, `update()` 의 `...rest` 전개 |
| **우선순위** | High |
| **전제조건** | 인자를 기록하는 fake BlogService, 사용자 반환 `authMiddleware`, 검증 활성(기본) |
| **테스트 데이터** | PUT 본문 `{ title:'t', authorId:'attacker', viewCount:999 }`, POST 본문 `{ title:'t', content:'c', category:'news', slug:'a-b', id:'forced-id' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `detail.PUT` 에 스키마 외 필드 포함 본문 전달 | 현재 동작: 200, `blogService.update` 인자에 `authorId:'attacker'`, `viewCount:999` 가 그대로 포함 |
| 2 | `list.POST` 에 스키마 외 필드 `id` 포함 | 현재 동작: 201, `blogService.create` 인자에 `id:'forced-id'` 포함, Zod 기본값(`editorType:'rich'` 등) 미적용 |
| 3 | 원인 코드 확인 | 라우트가 `validateWithSchema()` 결과의 `data` 를 사용하지 않고 원본 `body` 를 서비스로 전달하며, `update()` 는 `...rest` 를 Prisma `update` data 로 전개한다 (`create()` 는 `authorId` 를 뒤에서 덮어쓰지만 `id` 등은 전달) |
| 4 | 기대 동작 확정 후 | 검증을 통과한 `check.data`(Zod 가 알 수 없는 키를 제거한 결과)만 서비스로 전달되는지 단언 |

- **자동화:** 가능 ✅
- **근거:** 1·2번은 2026-09-13 임시 스크립트로 확인했다.
- **관련 요구사항:** OWASP A08:2021 Software and Data Integrity Failures (CWE-915)
- **확인 필요:** 허용 필드 제한을 호스트 책임으로 볼지 라이브러리 책임으로 볼지 결정이 필요하다. 태그 라우트와 댓글 라우트는 필드를 골라 서비스로 전달하므로 포스트 라우트만 동작이 다르다.

---

### TC-S-012: 500 응답 오류 메시지 노출 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/route-error-exposure.test.mjs` (신규) |
| **대상** | `src/routes/_shared.ts` `makeRouteKit().handleError()` |
| **우선순위** | Medium |
| **전제조건** | 일반 `Error` 를 던지는 fake 서비스 |
| **테스트 데이터** | `new Error('db exploded: password=xyz')` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | admin `dashboard.GET` 에서 서비스가 위 오류를 throw | 현재 동작: 500, 본문 `error.message === 'db exploded: password=xyz'` |
| 2 | public 라우트(`withPublic`)에서 같은 오류 | 1번과 같이 원본 메시지가 응답에 포함 |
| 3 | 기대 동작 확정 후 | 일반 예외는 고정 메시지로 응답하고 원본은 `console.error` 로만 기록되는지 단언 |

- **자동화:** 가능 ✅
- **근거:** 1번은 2026-09-13 임시 스크립트로 확인했다.
- **관련 요구사항:** CWE-209 Generation of Error Message Containing Sensitive Information
- **확인 필요:** Prisma 오류 메시지에는 쿼리·필드 정보가 포함될 수 있으므로 공개 라우트에서 원본 메시지를 노출할지 결정이 필요하다.

---

### TC-S-013: 새니타이저 우회 입력과 dompurify 경로 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-bypass.test.mjs` (신규), dompurify 경로는 별도 파일 |
| **대상** | `src/utils/html-sanitizer.ts` `UNTRUSTED_IFRAME` 정규식, `dompurifySanitize()` / `src/services/blog.service.ts` `create()`·`update()` 의 `sanitize(data.content) \|\| data.content` |
| **우선순위** | High |
| **전제조건** | 1~3번은 현재 환경(dompurify 미설치), 4·5번은 `isomorphic-dompurify` 설치 환경 |
| **테스트 데이터** | 닫는 태그 없는 iframe, self-closing iframe, 위험 마크업만으로 구성된 본문 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `sanitizeHtmlContent('<p>a</p><iframe src="https://evil.example/x">')` | 현재 동작: 입력이 그대로 반환됨. `UNTRUSTED_IFRAME` 은 `</iframe>` 까지 매칭되어야 제거한다 |
| 2 | `sanitizeHtmlContent('<p>a</p><iframe src="https://evil.example/x" />')` | 현재 동작: 입력이 그대로 반환됨 |
| 3 | `BlogService.create()`·`update()` 에 `content:'<script>alert(1)</script>'` 또는 `'<iframe src="https://evil.example/x"></iframe>'` 만 전달 | 현재 동작: 새니타이즈 결과가 `''` 이므로 `\|\|` 연산에 의해 원본 `content` 가 저장됨. `BlogDetailPage` 는 본문을 `dangerouslySetInnerHTML` 로 렌더링한다 |
| 4 | dompurify 설치 환경에서 1~3번과 TC-S-007·008 입력 | 신뢰 origin 외 iframe 제거(`uponSanitizeElement` 훅), `FORBID_TAGS` 적용 |
| 5 | `createSanitizer({ trustedIframeOrigins:['https://player.example/'] })` | 기본 youtube origin iframe 제거, 지정 origin iframe 유지 |

- **자동화:** 가능 ✅
- **근거:** 1·2·3번은 2026-09-13 `dist` 대상 임시 스크립트로 확인했다(3번은 `create` 의 script 단독·iframe 단독, `update` 의 script 단독 입력).
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)
- **확인 필요 (결함 후보):** 본문 작성·수정은 admin 인증 뒤에서만 가능하지만, 1~3번은 새니타이저가 목적한 방어를 수행하지 못하는 입력이다. 수정 여부를 결정한 뒤 예상 결과를 "제거됨" 으로 확정한다.

---

## 6. Performance Tests (성능 테스트)

**목적:** 서버 측 연산 중 입력 크기나 대상 건수에 비례해 비용이 커지는 지점을 측정한다. 대부분의 조회는 DB 에 위임되므로 대상은 정규식 새니타이저와 건별 예약 갱신으로 한정한다.

**실행 명령:** `npm test` (측정 테스트는 환경 편차가 크므로 별도 스크립트 분리를 권장)

---

### TC-P-001: 예약 발행 건별 조건부 갱신 왕복 수 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/scheduler-roundtrip.test.mjs` (신규) |
| **대상** | `src/services/scheduler.service.ts` `processScheduledPosts()` 의 `for ... of` 순차 `updateMany` |
| **우선순위** | Low |
| **전제조건** | 호출 수와 동시 진행 수를 기록하는 fake 델리게이트 (틱당 지연 고정) |
| **테스트 데이터** | 과거 예약 100건, 0건 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 과거 예약 100건으로 1회 실행 | `findMany` 1회, `updateMany` 100회, 동시에 진행 중인 `updateMany` 는 최대 1개 |
| 2 | 대상 0건 | `updateMany` 0회 |
| 3 | 소요 시간 기록 | 호출 수에 비례해 증가. 임계값은 기준 측정 후 설정 |

- **자동화:** 가능 ✅
- **근거:** 코드 주석은 "커넥션 풀 부담을 피하려 병렬화하지 않는다" 고 명시한다.

---

### TC-P-002: 정규식 새니타이저 입력 크기별 처리 시간 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-perf.test.mjs` (신규) |
| **대상** | `src/utils/html-sanitizer.ts` `regexSanitize()` |
| **우선순위** | Low |
| **전제조건** | dompurify 미설치, `performance.now()` 측정 |
| **테스트 데이터** | 정상 HTML 약 1MB, 닫히지 않은 `<iframe src="https://evil/">` 반복, 닫히지 않은 `<script>` 반복 |

| # | 단계 | 예상 결과 (2026-09-13 1회 측정값) |
|---|------|---------|
| 1 | 정상 HTML 약 1MB | 6.2ms |
| 2 | 닫히지 않은 iframe 5,000회 / 10,000회 / 20,000회 (140KB / 280KB / 560KB) | 70ms / 277ms / 1,098ms (입력 2배에 시간 약 4배), 출력 길이는 입력과 같음 |
| 3 | 닫히지 않은 `<script>` 5,000회 / 10,000회 / 20,000회 | 15ms / 61ms / 246ms, 출력 0자 |
| 4 | 임계값 설정 | 호스트 요청 본문 크기 제한과 함께 결정 |

- **자동화:** 가능 ✅
- **비고:** 측정 환경은 Node.js v22.22.0, darwin 이며 1회 측정이라 편차가 있다. 2번 입력은 admin 인증 뒤에서만 도달하는 경로(`BlogService.create`·`update`)이다.

---

## 7. Accessibility Tests (접근성 테스트)

**목적:** 공개 API 로 export 되는 React 컴포넌트의 WCAG 2.1 AA 준수를 검증한다.

**선행 조건:** 렌더링 테스트 인프라 도입 (TC-U-009 전제조건과 같음). 현재는 실행할 수 없다.

**실행 명령:** 미정

---

### TC-AC-001: 공개 댓글 폼 레이블·오류 알림 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (신규) |
| **대상** | `src/components/public/CommentForm.tsx` |
| **우선순위** | Medium |
| **전제조건** | 선행 조건: 렌더링 테스트 인프라 도입 |
| **테스트 데이터** | `currentUserId` 미지정(게스트), 제출 실패 응답 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 게스트 모드 렌더링 | `label[for="blog-comment-guest-name"]`, `label[for="blog-comment-guest-email"]`, `label[for="blog-comment-content"]` 가 같은 `id` 입력과 연결 |
| 2 | 허니팟 영역 확인 | 부모 요소 `aria-hidden="true"`, 입력 `tabIndex=-1`, `autoComplete="off"` |
| 3 | 제출 오류 발생 | `role="alert"` 문단에 오류 메시지 표시 |
| 4 | 자동 접근성 검사 도구 실행 | 위반 0건 (도구는 인프라 도입 시 선정) |

- **자동화:** 가능 ✅ (인프라 도입 후)
- **관련 요구사항:** WCAG 2.1 SC 1.3.1, 3.3.1, 4.1.3

---

### TC-AC-002: 관리자 토글 스위치 역할·상태·이름 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (신규) |
| **대상** | `src/components/ui/DefaultToggle.tsx`, `src/components/admin/BlogListView.tsx` 내부 `ToggleSwitch`, 정렬 헤더 |
| **우선순위** | Medium |
| **전제조건** | 선행 조건: 렌더링 테스트 인프라 도입 |
| **테스트 데이터** | `checked` true/false, 목록 항목 `published`·`featured` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `DefaultToggle checked` 렌더링 | `button[role="switch"][aria-checked="true"]` |
| 2 | `DefaultToggle label="공개"` 렌더링 | 버튼이 레이블 텍스트와 같은 `<label>` 요소 안에 있어 접근 가능한 이름이 "공개" 로 계산 |
| 3 | `BlogListView` 행 토글 렌더링 | `role="switch"`, `aria-checked` 가 `item.published` 를 반영, 이름은 `title` 속성으로만 제공되며 공개 토글은 상태에 따라 `adminPublishedLabel`/`adminUnpublishedLabel` 로 이름이 바뀜 |
| 4 | `BlogListView` 정렬 헤더 렌더링 | 현재 정렬 열만 `aria-sort="ascending"` 또는 `"descending"`, 나머지 열은 `"none"` |

- **자동화:** 가능 ✅ (인프라 도입 후)
- **관련 요구사항:** WCAG 2.1 SC 4.1.2
- **확인 필요:** 3번에서 이름이 상태에 따라 바뀌면 보조기기가 이름과 `aria-checked` 상태를 중복해서 읽을 수 있다.

---

### TC-AC-003: role="button" 요소 키보드 조작 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (신규) |
| **대상** | `src/components/admin/BlogDashboard.tsx` 통계 카드(`Card role="button" tabIndex={0}`)와 카테고리 행(`div role="button"`), `src/components/admin/BlogListPreview.tsx` 카드(`div role="button"`) |
| **우선순위** | Medium |
| **전제조건** | 선행 조건: 렌더링 테스트 인프라 도입 |
| **테스트 데이터** | `onNavigate`, `onSelectItem` spy |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 통계 카드에 포커스 후 Enter, Space 입력 | 현재 코드에는 키보드 핸들러가 없어 `card.onClick` 이 호출되지 않을 것으로 판단 (`src/components` 전체에서 `onKeyDown` 은 `TagPicker.tsx` 346행 입력창 1곳뿐이며 `DefaultCard` 도 `onClick` 만 전달) |
| 2 | 카테고리 행, 미리보기 카드에 같은 입력 | 1번과 같음 |
| 3 | 기대 동작 확정 후 | Enter, Space 로 `onClick` 과 같은 동작 실행 |

- **자동화:** 가능 ✅ (인프라 도입 후)
- **관련 요구사항:** WCAG 2.1 SC 2.1.1 Keyboard
- **확인 필요:** 1번 판단은 코드 검색 결과에 근거하며 렌더링으로 확인하지 않았다. 호스트가 `BlogThemeProvider` 로 `Card` 를 교체하면 통계 카드 동작은 주입된 컴포넌트에 따라 달라진다.

---

## 8. Load/Stress Tests (부하·경쟁 조건 테스트)

**목적:** 라이브러리 맥락에서 이 도메인을 "동시 호출 시 결과 일관성" 으로 해석한다. 인메모리 fake Prisma 의 모든 메서드가 시작 시 매크로태스크 한 틱을 양보하므로, `Promise.all`/`Promise.allSettled` 로 실행한 동시 호출은 모든 사전 조회가 끝난 뒤 모든 쓰기가 실행되는 순서로 인터리빙된다. 이 순서는 커밋 `3572744` 이 기록한 실제 DB 최악 순서를 모사한다.

**실행 명령:** `npm run build && node --test test/runtime/concurrency-guards.test.mjs`

**배경:** 2026-09-13 호스트 QA 에서 댓글 레이트 리밋 경쟁 조건(제한 5건에 동시 6건 요청 시 6건 생성)과 예약 발행 이중 집계(크론 동시 3회 트리거 시 세 응답이 같은 `postIds` 반환)가 발견되었다. 두 결함 모두 동시 요청에서만 드러났다.

---

### TC-L-001: 댓글 레이트 리밋 동시 요청

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/concurrency-guards.test.mjs` (11건 중 3건) |
| **대상** | `src/services/comment.service.ts` `create()` 의 사전 `count()` 와 `enforceRateLimitRank()` 사후 순번 검증·보상 삭제 |
| **우선순위** | Critical |
| **전제조건** | `createFakeCommentPrisma({ fixedCreatedAt })`: 삽입 행의 `createdAt` 을 같은 값으로 고정해 (createdAt, id) 타이브레이크를 검증 |
| **테스트 데이터** | 제한 5에 동시 6건 / 기존 4건 + 동시 3건(제한 5) / 제한 2에 `ip-A` 2건과 `ip-B` 2건 동시 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 제한 5, `Promise.allSettled` 로 동시 6건 | 성공 5, 거부 1(`COMMENT_RATE_LIMIT_EXCEEDED`, 429), 저장 5건 |
| 2 | 1번의 호출 기록 확인 | `calls.create === 6` (사전 검사는 6건 모두 통과), `calls.delete === 1` (초과 1건 보상 삭제) |
| 3 | 1번에서 살아남은 댓글 확인 | id 5개가 모두 다르고 모두 저장소에 존재 |
| 4 | 기존 4건 + 동시 3건 | 성공 1, 429 거부 2, 저장 5건 |
| 5 | `ip-A` 2건, `ip-B` 2건 동시 (제한 2) | 4건 모두 성공, 저장 4건 |

- **자동화:** 가능 ✅ | **테스트 수:** 3개 (실측)
- **관련 요구사항:** CWE-362 Race Condition

---

### TC-L-002: 예약 발행 동시 트리거·조회-갱신 경쟁

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/concurrency-guards.test.mjs` (11건 중 2건) |
| **대상** | `src/services/scheduler.service.ts` `processScheduledPosts()` 의 건별 조건부 `updateMany`(compare-and-set) |
| **우선순위** | Critical |
| **전제조건** | `createFakeSchedulerPrisma(posts, { beforeUpdateMany })`: 갱신 직전 외부 변경을 끼워 넣는 훅 제공 |
| **테스트 데이터** | 과거 예약 3건(`p1`~`p3`) / 과거 예약 2건과 첫 갱신 직전 `p2` 예약을 60분 뒤로 옮기는 훅 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `processScheduledPosts()` 동시 3회 | 전체 반환 id 3개, 중복 없음, 정렬 결과 `['p1','p2','p3']` |
| 2 | 1번의 호출별 결과 확인 | 각 호출 `processed === postIds.length`, `processed` 합계 3, `processed:0` 이고 `postIds:[]` 인 호출이 1개 이상 |
| 3 | 1번 실행 후 저장소 확인 | 3건 모두 `published === true` |
| 4 | 조회와 갱신 사이에 `p2` 예약이 미래로 변경 | `postIds` 가 `['p1']`, `processed === 1`, `p2` 는 `published === false` |

- **자동화:** 가능 ✅ | **테스트 수:** 2개 (실측)
- **관련 요구사항:** CWE-367 Time-of-check Time-of-use Race Condition

---

### TC-L-003: 레이트 리밋 한계 조건 특성 테스트 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/concurrency-limits.test.mjs` (신규) |
| **대상** | `src/services/comment.service.ts` `enforceRateLimitRank()` 주석의 "한계" 절 |
| **우선순위** | Medium |
| **전제조건** | 행별 커밋 가시성을 제어할 수 있는 fake `count` (예: 특정 행을 지정한 시점 이후에만 보이게 설정) |
| **테스트 데이터** | 제한 1, 요청 A(`createdAt` 이 이른 행)와 요청 B(늦은 행) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | B 가 순번을 계산하는 시점에 A 행이 아직 보이지 않도록 설정하고 A·B 동시 실행 | A 순번 1, B 순번 1 로 둘 다 통과해 제한을 1건 초과한 2건이 저장 (코드 주석에 명시된 한계) |
| 2 | `create()` 결과 행에 `createdAt` 이 없는 경우 (커스텀 select) | 사후 순번 검증을 건너뛰고 사전 검사 결과만 적용되어 동시 요청에서 제한 초과가 발생 |
| 3 | `create()` 결과 행의 `createdAt` 이 ISO 문자열 | `Date` 로 변환해 순번 검증 수행 |

- **자동화:** 가능 ✅
- **비고:** 이 TC 는 결함을 막는 테스트가 아니라 현재 한계를 고정해 두는 특성 테스트이다. 완전한 차단이 필요하면 코드 주석이 제시한 Serializable 격리 또는 DB 측 원자적 INSERT 가 필요하다.

---

## 9. Smoke Tests (스모크 테스트)

**목적:** 빌드 산출물과 공개 진입점이 소비자 관점에서 로드되는지 확인한다. `npm test` 는 매번 빌드를 선행하므로 빌드 성공 자체는 매 실행마다 확인된다.

**실행 명령:** `npx tsc --noEmit --strict --skipLibCheck --esModuleInterop --target es2020 --module esnext --moduleResolution bundler --jsx react-jsx test/headless-mode.ts` (TC-SM-001, npm 스크립트 미연결)

---

### TC-SM-001: Headless 모드 타입 수준 import 검증

| 항목 | 내용 |
|------|------|
| **파일** | `test/headless-mode.ts` |
| **대상** | 루트, `types`, `services`, `routes`, `utils`, `errors`, `seo`, `i18n`, `validators`, `storage` 서브패스에 해당하는 `src` 공개 심볼 (UI 컴포넌트 제외) |
| **우선순위** | Medium |
| **전제조건** | 런타임 실행 없이 `tsc` 타입 검사만 수행 |
| **테스트 데이터** | `PrismaClientLike` 형태의 가짜 prisma, 카테고리 테마 1개, 모든 기능을 켠 `createBlog` 설정 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 파일 주석 명령 `npx tsc --noEmit --strict test/headless-mode.ts` | 실측: 오류 68건 (`node_modules` 63건, `src` 5건: `--jsx` 미설정 1건, 기본 target 으로 인한 `Set` 순회 3건과 정규식 플래그 1건) |
| 2 | tsconfig 옵션을 지정한 위 실행 명령 | 실측: 오류 0건 |
| 3 | `createBlog` 반환값의 `services.*`, `routes.public.posts`, `routes.admin.posts` 를 공개 타입에 할당 | 컴파일 통과 |
| 4 | utils, errors, i18n, validators 함수 호출과 SEO 반환 타입 참조 | 컴파일 통과 |

- **자동화:** 부분 (npm 스크립트 미연결, 수동 명령) | **테스트 수:** 런타임 테스트 0건, 타입 검증 파일 1개
- **한계:** `src` 를 대상으로 검사하므로 배포 산출물 `dist/*.d.ts` 의 타입 정합성은 검증하지 않는다. 파일 주석의 명령은 수정이 필요하다.

---

### TC-SM-002: exports 서브패스 dist import·타입 선언 파일 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/exports-smoke.test.mjs` (신규) |
| **대상** | `package.json` `exports` 14개 서브패스의 `import`, `require`, `types` 경로 |
| **우선순위** | Medium |
| **전제조건** | `npm run build` 완료, 선택적 peer 설치 여부를 테스트 조건으로 명시 |
| **테스트 데이터** | `package.json` `exports` 객체 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 14개 서브패스 각각 ESM `import()` | `@tiptap/*` 미설치 환경에서 13개 성공, `./components/admin/editor` 는 `ERR_MODULE_NOT_FOUND` (`@tiptap/react`) |
| 2 | 14개 서브패스 각각 CJS `require()` | 1번과 같이 13개 성공, editor 는 `MODULE_NOT_FOUND` |
| 3 | 각 서브패스 `types` 경로(`.d.ts`, `.d.cts`) 파일 존재 확인 | 13개 존재, `./components/admin/editor` 는 두 파일 모두 없음 (`tsup.config.ts` 가 editor dts 생성을 제외했으나 `package.json` 은 경로를 선언) |
| 4 | `@tiptap/*` 설치 환경에서 editor 서브패스 import | 성공 |

- **자동화:** 가능 ✅
- **근거:** 1~3번은 2026-09-13 임시 스크립트로 확인했다.
- **확인 필요:** 3번은 editor 서브패스를 TypeScript 로 import 하는 소비자에게 선언 파일 누락 오류를 일으킬 수 있다.

---

## 10. Chaos Tests (장애 주입 테스트)

**목적:** 호스트가 주입하는 외부 의존(Prisma, StorageAdapter)이 도중에 실패할 때 부분 완료 상태와 응답이 어떻게 되는지 검증한다. 이 패키지의 부분 실패 경로는 아래 3곳이다.

**실행 명령:** `npm test`

---

### TC-C-001: 스토리지 정리 실패 시 게시글 삭제 응답 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/chaos-storage.test.mjs` (신규) |
| **대상** | `src/services/blog.service.ts` `remove()`, `removeMany()`, `src/routes/post.routes.ts` admin `detail.DELETE`, `bulk.DELETE` |
| **우선순위** | Medium |
| **전제조건** | `deleteKeys` 가 reject 하는 사용자 정의 `StorageAdapter` |
| **테스트 데이터** | TC-I-005 의 `p1` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `remove('p1')` | `delegate.delete` 완료 후 `deleteKeys(['cover.jpg','body.jpg','att1'])` 의 reject 가 전파되어 `remove()` 가 reject |
| 2 | admin `detail.DELETE` 경유 | DB 행은 삭제되었지만 응답은 500 `INTERNAL_ERROR` |
| 3 | `removeMany(ids)` 에서 같은 실패 | `deleteMany` 이후 reject 가 전파되어 삭제 건수가 응답되지 않음 |
| 4 | 기본 `createS3StorageAdapter` 사용 시 S3 배치 삭제 실패 | 어댑터가 `console.error` 로 기록하고 삼키므로 1~3번 현상이 발생하지 않음 |

- **자동화:** 가능 ✅
- **근거:** 1번은 2026-09-13 임시 스크립트로 확인했다.
- **확인 필요:** 삭제가 완료된 뒤 500 을 응답하는 동작을 허용할지 결정이 필요하다.

---

### TC-C-002: 레이트 리밋 보상 삭제 실패 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/chaos-comment.test.mjs` (신규) |
| **대상** | `src/services/comment.service.ts` `enforceRateLimitRank()` 의 보상 삭제 `try/catch` |
| **우선순위** | Low |
| **전제조건** | `createFakeCommentPrisma()` 에서 `delete` 가 throw 하도록 변경 |
| **테스트 데이터** | 제한 1에 동시 2건 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 초과 요청의 보상 삭제가 실패 | `console.warn('[blog-core] rate limit 초과 댓글 보상 삭제 실패 ...')` 기록 후 429 `COMMENT_RATE_LIMIT_EXCEEDED` 로 reject |
| 2 | `autoApprove:false` 에서 저장소 확인 | 초과 행이 `PENDING` 상태로 남음 |
| 3 | `autoApprove:true` 에서 저장소 확인 | 초과 행이 `APPROVED` 상태로 남아 `listByPost()` 결과에 포함 |

- **자동화:** 가능 ✅
- **확인 필요:** 코드 주석은 보상 삭제 실패 시 "미승인 상태라 노출되지 않음" 이라고 서술하지만, 3번처럼 `autoApprove:true` 이면 승인 상태로 저장되므로 서술과 동작이 다르다.

---

### TC-C-003: 예약 발행 중간 실패 후 재실행 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/chaos-scheduler.test.mjs` (신규) |
| **대상** | `src/services/scheduler.service.ts` `processScheduledPosts()`, `src/routes/scheduler.routes.ts` `processHandler` |
| **우선순위** | Low |
| **전제조건** | 두 번째 `updateMany` 호출에서 throw 하는 fake 델리게이트 |
| **테스트 데이터** | 과거 예약 `p1`, `p2` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 1회 실행 | `processScheduledPosts()` 가 reject 되고, `p1` 은 이미 전환되었지만 전환 목록은 반환되지 않음 |
| 2 | process 라우트 경유 | 500 `INTERNAL_ERROR` |
| 3 | 장애 해소 후 재실행 | `p2` 만 전환되어 `{ processed:1, postIds:['p2'] }` (`p1` 은 `published:false` 조건 불일치로 count 0) |

- **자동화:** 가능 ✅
- **근거:** 1번은 2026-09-13 임시 스크립트로 확인했다.
- **확인 필요:** 1번에서 `p1` 전환 사실이 응답에 포함되지 않으므로, 호출자가 수행하는 후처리(알림, 캐시 무효화)가 `p1` 에 대해 누락될 수 있다. 코드 주석은 "다음 크론 실행이 나머지를 이어서 처리한다" 고 서술하며, 이는 3번과 일치한다.

---

## 분류 요약

| 유형 | 현재 파일 수 | 현재 테스트 수 | SC 수 (✅/🔲) | TC 수 (✅/🔲) |
|------|------------|-------------|--------------|--------------|
| **Unit** | 2개 | 9개 | 9 (2/7) | 9 (2/7) |
| **Integration** | 1개 (주1) | 6개 | 10 (2/8) | 10 (2/8) |
| **API** | 0개 | 0개 | 4 (0/4) | 4 (0/4) |
| **E2E** | 0개 | 0개 | 0 (미적용) | 0 |
| **Security** | 6개 | 34개 | 13 (8/5) | 13 (8/5) |
| **Performance** | 0개 | 0개 | 2 (0/2) | 2 (0/2) |
| **Accessibility** | 0개 | 0개 | 3 (0/3) | 3 (0/3) |
| **Load/Stress** | 1개 (주1) | 5개 | 3 (2/1) | 3 (2/1) |
| **Smoke** | 1개 (주2) | 0개 | 2 (1/1) | 2 (1/1) |
| **Chaos** | 0개 | 0개 | 3 (0/3) | 3 (0/3) |
| **합계** | **10개** (중복 제외) | **54개** | **49 (15/34)** | **49 (15/34)** |

- 주1: `concurrency-guards.test.mjs` 는 11건을 Integration 6건과 Load/Stress 5건으로 나누어 두 도메인에 모두 계산했다. 합계 파일 수는 중복을 제외한 값이다.
- 주2: `test/headless-mode.ts` 는 러너 대상이 아닌 타입 검증 파일이므로 테스트 수는 0건으로 계산했다.
- 커버리지 수치는 측정 도구가 설정되어 있지 않아 기록하지 않는다.

### 테스트 파일 대조

`find test -type f` 결과 10개 파일을 모두 TC 에 매핑했으며, 누락 파일은 0개이다. 파일별 테스트 수 합계 54건은 `npm test` 실측 결과와 일치한다.

| 파일 | 실측 테스트 수 | 매핑 TC (건수) |
|------|-------------|--------------|
| `test/runtime/auth-failclosed.test.mjs` | 6 | TC-S-001 (3), TC-S-002 (3) |
| `test/runtime/concurrency-guards.test.mjs` | 11 | TC-I-001 (4), TC-I-002 (2), TC-L-001 (3), TC-L-002 (2) |
| `test/runtime/createblog-failfast.test.mjs` | 3 | TC-S-004 (3) |
| `test/runtime/ip-hash.test.mjs` | 5 | TC-S-005 (5) |
| `test/runtime/ip-header-strategy.test.mjs` | 4 | TC-S-006 (4) |
| `test/runtime/sanitizer.test.mjs` | 12 | TC-S-007 (6), TC-S-008 (6) |
| `test/runtime/scheduler-cron.test.mjs` | 4 | TC-S-003 (4) |
| `test/runtime/theme.test.mjs` | 6 | TC-U-001 (6) |
| `test/runtime/utils-basic.test.mjs` | 3 | TC-U-002 (3) |
| `test/headless-mode.ts` | 0 (타입 검증) | TC-SM-001 |
| **합계** | **54** | |

`concurrency-guards.test.mjs` 11건 배분은 다음과 같다.

| 테스트 이름 | TC |
|------------|----|
| 댓글 동시 생성: 제한 5건에 동시 6건 → 5건만 살아남고 1건은 429 | TC-L-001 |
| 댓글 동시 생성: 기존 4건 + 동시 3건(제한 5) → 1건만 성공 | TC-L-001 |
| 댓글 레이트 리밋: 서로 다른 ipHash 는 서로에게 영향을 주지 않는다 | TC-L-001 |
| 댓글 레이트 리밋: 순차 초과 요청은 삽입 없이 사전 차단(빠른 경로 유지) | TC-I-001 |
| 댓글 레이트 리밋: ipHash 가 없으면 제한을 적용하지 않는다 | TC-I-001 |
| 댓글 허니팟: 제한을 채운 상태에서도 SPAM 으로 저장되고 429 가 아니다 | TC-I-001 |
| 댓글 생성 기존 동작 유지: autoApprove / spamFilter / 깊이 제한 | TC-I-001 |
| 예약 발행 동시 트리거: 3회 동시 실행 시 postId 가 중복 집계되지 않는다 | TC-L-002 |
| 예약 발행: 단일 실행은 기존과 동일하게 모든 대상 id 를 반환 | TC-I-002 |
| 예약 발행: 대상 없음 → processed 0 | TC-I-002 |
| 예약 발행: 조회와 갱신 사이에 예약이 미래로 변경되면 전환하지 않는다 | TC-L-002 |

---

## 도메인 적용성 판정

사전 조사 문서(`WITHWIZ_PACKAGES_TEST_AUDIT.md`)의 판정표에서 blog-core 열을 옮기고, 이 문서 작성 시점의 근거를 추가했다.

| 도메인 | 판정 (사전 조사) | 근거 |
|--------|----------------|------|
| Unit | 적용(얕음) | 순수 유틸·테마 테스트 9건뿐이며, SEO·validators·i18n·storage·검색어 변환 등 순수 함수 테스트는 0건이다 |
| API | 부분 | 라우트 핸들러 팩토리가 공개 API 이지만, 라우트를 실행하는 기존 3개 파일은 인증·IP 처리 목적이고 파싱·오류 매핑 계약은 검증하지 않는다 |
| Integration | 적용(공백 큼) | 서비스 5종 중 댓글 생성과 예약 발행 처리만 fake Prisma 로 로직을 실행하고, blog·tag·search 서비스는 0건이다 |
| E2E | 미적용 | DB·Next.js 런타임·인증을 호스트가 제공하는 라이브러리이므로 사용자 흐름 E2E 는 호스트 책임이다 |
| Security | 적용(강함) | 54건 중 34건이 fail-closed, HMAC 시크릿, IP 스푸핑, XSS 검증이다. 다만 닫는 태그 없는 iframe 등 우회 입력과 dompurify 경로는 검증하지 않는다 |
| Accessibility | 적용, 인프라 0 | 3개 엔트리로 컴포넌트 25개를 공개하지만 jsdom 과 testing-library 가 devDependencies 에 없다 |
| Performance | 낮음 | 조회 대부분이 DB 에 위임되며, 측정할 지점은 정규식 새니타이저와 건별 예약 갱신 정도이다 |
| Load/Stress | 적용(사건이 입증) | 2026-09-13 결함 2건이 동시 요청에서만 드러났고, 회귀 테스트 5건이 그 순서를 재현한다 |
| Smoke | 부분 | `npm test` 가 빌드를 선행해 산출물 생성은 매번 확인되지만, 14개 서브패스 import 와 타입 선언 파일 존재는 검증하지 않는다 (editor 서브패스 선언 파일 누락을 실측으로 확인) |
| Chaos | 낮음 | 외부 의존이 호스트가 주입하는 Prisma·StorageAdapter 뿐이며, 부분 실패 경로는 스토리지 정리, 보상 삭제, 예약 발행 중간 실패 3곳이다 |

---

## 우선순위 갭

| 순위 | 항목 | 대상 | 선행 조건 |
|------|------|------|----------|
| 1 | CRUD(`blog.service`)·태그·검색·SEO 서비스 레벨 테스트 전무 | SC-I-003, SC-I-004, SC-I-005, SC-I-006, SC-I-007, SC-U-003, SC-U-004, SC-U-005 | `concurrency-guards.test.mjs` 의 `matchWhere` 매처와 fake 델리게이트를 공용 헬퍼로 분리한다. SEO 와 검색어 변환은 순수 함수이므로 새 러너나 의존성이 필요 없다 |
| 2 | 컴포넌트 25개 테스트 인프라 부재 | SC-U-009, SC-AC-001, SC-AC-002, SC-AC-003 | 렌더링 테스트 인프라 도입: `@testing-library/react`·jsdom devDependencies 추가, 러너 결정(`node:test` 로 dist 렌더링 또는 별도 러너 도입), editor 2개는 `@tiptap/*` peer 설치 |
| 3 | 새니타이저 우회 입력 (닫는 태그 없는 iframe, 새니타이즈 결과가 빈 문자열일 때 원본 저장) | SC-S-013 | 결함 여부 결정. dompurify 경로는 선택적 peer 설치 환경 필요 |
| 4 | 설계 의도 확인이 필요한 라우트 동작 | SC-A-004 (requireLogin 403 고정), SC-S-011 (원본 body 전달), SC-S-012 (500 메시지 노출) | 의도 결정 후 예상 결과 확정 |
| 5 | 라우트 계약과 admin 핸들러 전수 인증 | SC-A-001, SC-A-002, SC-A-003, SC-S-009, SC-S-010 | 없음 |
| 6 | 부분 실패와 한계 조건 | SC-C-001, SC-C-002, SC-C-003, SC-L-003 | SC-L-003 은 커밋 가시성을 제어하는 fake 헬퍼 필요 |
| 7 | 스모크 자동화 | SC-SM-002, TC-SM-001 명령 수정 | editor 서브패스 `types` 경로 정리 방침 결정, headless 검증 명령 수정과 npm 스크립트 연결(`package.json` 변경 필요) |
| 8 | 보조 유틸·나머지 서비스 기능·성능 기준 | SC-U-006, SC-U-007, SC-U-008, SC-I-008, SC-I-009, SC-I-010, SC-P-001, SC-P-002 | 없음 |

### 공통 선행 조건

- `package-lock.json` 과 `package.json` 불일치를 해소해야 `npm ci` 로 고정 설치를 재현할 수 있다.
- 도메인별 실행 스크립트(`test:unit`, `test:security` 등)가 없으므로 도메인 단위 실행이 필요하면 파일명 규칙이나 디렉터리 분리를 먼저 정해야 한다.
- 커버리지 목표를 설정하려면 측정 도구(`node --experimental-test-coverage` 등)와 임계값을 먼저 정해야 한다.

### 확인 필요 사항 목록

| # | 내용 | 관련 TC |
|---|------|--------|
| 1 | 위험 마크업만으로 구성된 본문은 새니타이즈 결과가 빈 문자열이 되어 원본이 저장된다 | TC-S-013 |
| 2 | 닫는 태그가 없거나 self-closing 형태인 비신뢰 iframe 이 정규식 폴백에서 제거되지 않는다 | TC-S-013 |
| 3 | `requireLogin:true` 이면 공개 댓글 작성 라우트가 항상 403 을 응답한다 | TC-A-004 |
| 4 | 포스트 관리 라우트가 검증 결과 대신 원본 body 를 서비스로 전달해 스키마 외 필드(`authorId`, `id` 등)가 Prisma 로 전달된다 | TC-S-011 |
| 5 | `BlogError` 가 아닌 예외의 원본 메시지가 500 응답 본문에 포함된다 | TC-S-012 |
| 6 | 태그 클라우드가 정렬 없이 `take` 로 자른 뒤 메모리에서 정렬한다 | TC-I-006 |
| 7 | `featured.GET` 의 숫자가 아닌 `limit` 이 `NaN` 으로 서비스에 전달된다 | TC-A-001 |
| 8 | 스토리지 정리 실패 시 DB 삭제 후 500 을 응답한다 | TC-C-001 |
| 9 | `autoApprove:true` 에서 보상 삭제 실패 시 초과 댓글이 승인 상태로 남아 코드 주석 서술과 다르다 | TC-C-002 |
| 10 | 예약 발행 중간 실패 시 이미 전환된 글 목록이 응답되지 않는다 | TC-C-003 |
| 11 | `./components/admin/editor` 서브패스의 `types` 선언 파일이 산출물에 없다 | TC-SM-002 |
| 12 | `test/headless-mode.ts` 주석의 검증 명령이 실패한다 | TC-SM-001 |
| 13 | `scheduler-cron.test.mjs` fake 반환값 형태가 실제 계약과 다르다 | TC-S-003 |
| 14 | RSS 는 빈 태그 이름을 제외하지 않아 빈 `<category>` 를 출력한다 | TC-U-004 |
| 15 | `CHANGELOG.md` 가 존재하지 않는 validators·i18n 테스트를 서술하고 2.1.x 항목이 없다 | 관련 문서 |

---

## 리뷰 체크리스트

- [x] 10개 도메인 적용성 판정 포함 (E2E 는 미적용으로 명시)
- [x] 테스트 파일 10개를 모두 TC 에 매핑하고 누락 0개 확인
- [x] 파일별 테스트 수 합계(54)가 `npm test` 실측 결과(통과 54, 실패 0, 스킵 0)와 일치
- [x] 완료 TC 의 단계는 실제 테스트 이름과 단언에서 발췌
- [x] 계획 TC 의 단계는 소스 코드 동작에 근거하고, 주요 예상값은 `dist` 대상 임시 스크립트로 확인
- [x] 동시성 테스트 11건을 Integration(순차 동작 6건)과 Load/Stress(경쟁 조건 5건)로 분리
- [x] fake 서비스를 주입해 라우팅 계층만 검증하는 기존 테스트의 한계 명시 (TC-S-003, TC-S-006)
- [x] 컴포넌트 계획 SC 에 렌더링 테스트 인프라 선행 조건 명시
- [x] 보안 기준 명시 (OWASP, CWE, WCAG)
- [ ] 목표 커버리지 설정 (현재 미설정)
- [ ] 확인 필요 사항 15건 의사결정
- [ ] 우선순위 갭 1·2 구현
- [ ] `package-lock.json` 동기화
