# @withwiz/blog-core 테스트 분류 체계

작성일: 2026-09-13
갱신일: 2026-09-16 (기준 버전 2.1.5 에 브랜치 `fix/residual-defects` 의 미게시 수정 5건 반영, develop `4454caf` 에서 분기, 코드 마지막 커밋 `bb7addc`)
기준 포맷: `withwiz-block-editor/docs/plans/2026-03-04-test-classification.md`

## 개요

| 항목 | 내용 |
|------|------|
| 대상 | `@withwiz/blog-core` 2.1.5 + 브랜치 `fix/residual-defects`(버전 번호 미변경): Next.js App Router 블로그 패키지(서비스 팩토리, 라우트 핸들러 팩토리, SEO 유틸, React 컴포넌트) |
| 범위 | `src/` 전체(services/, routes/, seo/, utils/, validators/, storage/, themes/, i18n/, errors/, components/, context/)와 `test/` 전체(런타임 테스트 17개 파일, 테스트 헬퍼 1개, 타입 검증 파일 1개) |
| 환경 | Node.js v22.22.0 내장 러너 `node:test` + `node:assert/strict`. `npm test` 는 `npm run build`(tsup 8.5.1)로 `dist/` 를 생성한 뒤 `node --test test/runtime/*.test.mjs` 를 실행한다. 테스트는 `dist/*.mjs` 를 import 하고, 실제 DB 없이 인메모리 fake Prisma 또는 fake 서비스를 주입한다. jsdom 은 직접 쓰지 않으며, 실제 DOMPurify 경로에서 `isomorphic-dompurify` 가 내부적으로 사용한다. 컴포넌트는 `react-dom/server` 의 `renderToStaticMarkup` 으로 정적 마크업만 렌더링한다(2개 파일). HTML 판정이 필요한 2개 파일(`sanitizer-purify`, `detail-linkify`)은 WHATWG HTML 토큰화 규칙의 태그·속성·주석 부분을 옮긴 헬퍼 `test/runtime/helpers/html-inspect.mjs` 를 사용한다. `exports-smoke` 는 `dist` 경로 대신 패키지 이름 자기 참조(`@withwiz/blog-core/<서브패스>`)로 import·require 한다. `test/headless-mode.ts` 는 러너 대상이 아닌 타입 검증 전용 파일이다 |
| 목표 커버리지 | 미설정: `package.json` 에 커버리지 도구와 임계값이 없고, `tsconfig.json`·`tsup.config.ts` 에도 관련 설정이 없다 |
| 실측 실행 결과 | 2026-09-17, 브랜치 `fix/residual-defects`(커밋 `faabcf9`)에서 새로 `npm ci` 후 `npm test` 실행: 파일 17개, 테스트 211건, 통과 211 / 실패 0 / 스킵 0 / 취소 0 / todo 0. `@withwiz/block-editor` 는 설치되지 않은 상태다(선택 peer). 실제 DOMPurify 경로 테스트도 devDependencies 의 `isomorphic-dompurify` 로 기본 실행에서 실행된다. 같은 시점에 `npm run build` 성공, `npm run typecheck` 오류 0건 |
| 이전 실측 (2026-09-15) | 병합 커밋 `2c9fb47`(2.1.5): 파일 15개, 테스트 139건. 기본 `npm test` 는 통과 118 / 스킵 21 이었고, 스킵 21건은 `sanitizer-purify.test.mjs` 가 `isomorphic-dompurify` 를 해석하지 못해 건너뛴 DOMPurify 경로 테스트였다. 호스트 저장소의 isomorphic-dompurify 4.2.0 을 `NODE_PATH` 로 지정하면 139건이 모두 통과했다. `npm run typecheck` 는 `@tiptap/*` 미설치로 오류 4건이었다 |
| 이전 실측 (2026-09-13) | 기준 커밋 `49b7778`(2.1.3): 파일 9개, 테스트 54건, 통과 54 / 스킵 0. 2.1.4 에서 11건(2개 파일), 2.1.5 에서 74건(4개 파일), 2026-09-16 `fix/residual-defects` 에서 71건(새 파일 2개 51건, 기존 파일 2개 20건)이 추가되었다 |
| 타입 검증 실행 결과 | `test/headless-mode.ts` 주석에 기재된 `npx tsc --noEmit --strict test/headless-mode.ts` 는 tsconfig 옵션이 적용되지 않아 오류 57건(`node_modules/zod/v4/locales/index.d.cts` 52건, `src/` 5건)으로 실패한다(2026-09-16 재측정도 같음). tsconfig 와 같은 옵션(`--skipLibCheck --esModuleInterop --target es2020 --module esnext --moduleResolution bundler --jsx react-jsx`)을 지정하면 오류 0건으로 통과한다. 2026-09-13 실측(68건, `node_modules` 63건)과 `node_modules` 오류 수가 다른 것은 설치 방식과 해석 버전이 달라졌기 때문으로 보이며, `src/` 5건은 같다. 저장소 전체 `npm run typecheck`(`tsc --noEmit`)는 2026-09-16 에 `@tiptap/*` 를 devDependencies 에 추가한 뒤 오류 0건으로 통과한다 |
| 의존성 설치 | 커밋 `3cb8973`(2.1.4)이 `package-lock.json` 을 `package.json` 과 동기화해 `npm ci` 가 성공한다(2026-09-16 재확인, Node v22.22.0·npm 11.16.0). 해석된 버전은 next 16.3.5, react 19.3.0, react-dom 19.3.0, typescript 5.9.3, zod 4.4.3, tsup 8.5.1, @withwiz/block-editor 0.3.0, @types/react 19.3.0 이다. 2026-09-16 에 선택적 peer 중 `isomorphic-dompurify`(3.19.0 고정, dompurify 3.4.15·jsdom 29.1.1 해석)와 `@tiptap/react`·`@tiptap/starter-kit`·`@tiptap/extension-link`·`@tiptap/pm`(3.31.3 고정, `@tiptap/core` 3.31.3 은 peer 로 설치)을 devDependencies 에도 추가했다. peer 선언과 선택 여부는 바뀌지 않았고, `@aws-sdk/client-s3` 는 여전히 설치되지 않는다. isomorphic-dompurify 는 호스트가 4.2.0 을 쓰지만, 4.x 와 3.20 이후는 jsdom 30 을 따라 Node `^22.22.2` 를 요구해 저장소 `.npmrc` 의 `engine-strict=true` 에서 Node 22.22.0 설치가 EBADENGINE 으로 실패한다. 3.19.0 은 4.2.0 과 같은 `dompurify ^3.4.12` 조건이라 호스트와 같은 dompurify 3.4.15 를 해석한다 |
| 도메인별 실행 스크립트 | 없음. `package.json` 에는 `build`, `build:types`, `typecheck`, `test` 만 있다 |
| 문서 이력 | 2026-09-13 2.1.3(`49b7778`) 기준 최초 작성: 테스트 54건, SC/TC 49개(✅ 15 / 🔲 34). 2026-09-15 2.1.5(`2c9fb47`) 기준 갱신: 139건, SC/TC 54개(✅ 22 / 🔲 32). 2026-09-16 브랜치 `fix/residual-defects` 기준 갱신: DOMPurify 경로 기본 실행, 댓글 `requireLogin` 공개 작성 라우트 결함, editor 서브패스 선언 파일 누락, `enableValidation:false` 포스트 라우트 원본 body 전달, 폴백 새니타이저 SVG 애니메이션·문서 수준 요소 잔존을 수정하고 테스트 71건 추가. TC-A-004·TC-SM-002 를 🔲 계획에서 ✅ 완료로 전환하고 TC-S-017 을 추가 (210건, SC/TC 55개, ✅ 25 / 🔲 30). 2026-09-17 `faabcf9` 에서 `@withwiz/block-editor` 를 선택 peer 로 바로잡고 TC-SM-002 에 5단계를 추가 (211건). 2026-09-18 `fix/residual-defects-a` 기준 갱신: `BlogService.create()`·`update()` 직접 호출 경로의 허용 필드 제한 결함을 고치고 TC-S-011 에 9~12단계를 추가 (215건, SC/TC 수는 변화 없음) |

### 관련 문서

| 문서 | 성격 | 이 문서와의 관계 |
|------|------|------------------|
| `spec.md` (563줄) | 제품 스펙(Flow, Feature, Definition of Done) | `동시`, `경쟁 조건`, `concurrency`, `race` 검색 결과가 0건이다. 레이트 리밋(Flow 5, 70행)과 예약 발행(Flow 8, 89~95행과 DoD 497~503행)을 단일 요청 관점으로만 서술하므로 Load/Stress 시나리오의 근거로 사용할 수 없다 |
| `CHANGELOG.md` | 변경 이력 | 2.0.0 항목은 런타임 스위트가 "validators, theme exports, slug/pagination utilities, and i18n defaults" 를 검증한다고 서술하지만, validators 와 i18n 을 직접 import 하는 테스트 파일은 없다(`post-routes-validated.test.mjs` 는 라우트를 거쳐 검증 스키마를 간접 실행한다). 2.1.x 항목(2.1.4·2.1.5 포함)도 기록되어 있지 않다 |
| `critique.md`, `generator_report.md`, `sprint_contract.md` | 2026-05 스프린트 산출물 | 빌드·타입 검사 결과와 스프린트 계획을 기록한 문서이며 테스트 시나리오·케이스 문서가 아니다 |
| `WITHWIZ_PACKAGES_TEST_AUDIT.md` (dts-ballet-homepage `tests/doc/`) | 사전 조사 | 테스트 43건 시점에 작성되었다. 이후 2.1.3~2.1.5 가 게시되었고, 2026-09-15 기준 `develop`, `main`, `origin/develop`, `origin/main`(마지막 fetch 기준)이 모두 2.1.5 릴리스 커밋 `b47b2f7` 을 가리키며 npm `latest` dist-tag 는 2.1.5 이다. 따라서 조사 문서에 기록된 "게시 전, 병합 전" 상태는 현재와 다르다 |
| 커밋 `3572744` | 동시성 결함 수정 | 댓글 레이트 리밋 경쟁 조건과 예약 발행 이중 집계의 원인, 선택한 방식, 테스트 11건 추가 내역을 기록한다. 커밋 메시지에 따르면 수정 전 코드에서는 동시성 관련 4건이 실패했다 |
| 커밋 `e0abe17`, `e6fd816`, `3cb8973` (2.1.4) | 접근성 결함 수정, 의존성 정리 | 공개 목록 페이지 h1 렌더링(테스트 6건, TC-AC-004)과 공개 테마 `text-dim` 색 대비 조정(테스트 5건, TC-AC-005)을 기록한다. 커밋 메시지에 따르면 수정 전 코드에서는 h1 테스트 5건과 대비 테스트 1건이 실패했다. `3cb8973` 은 테스트가 import 하는 `react-dom` 을 devDependencies 에 명시하고 lockfile 을 동기화했다 |
| 커밋 `ba37e6e` | 의존성 갱신 | peer 로 설치되는 `@withwiz/block-editor` 를 lockfile 에서 0.3.0 으로 갱신했다. `src/` 는 block-editor 를 import 하지 않는다. `components/admin/editor` 는 편집기 컴포넌트를 props 로 주입받는다(2026-09-17 `faabcf9` 부터 선택 peer 이며 개발 설치에서도 빠졌다). 이 서브패스는 2026-09-16 부터 `exports-smoke.test.mjs` 가 import 와 선언 파일을 확인하지만(TC-SM-002), 컴포넌트 동작은 테스트하지 않는다 |
| 커밋 `5b3876e`, `c0ea2a9`, `d625f08`, `d22f6c6`, `e90268e` (2.1.5, 병합 `4fa864e`) | 저장형 XSS 경로 보안 결함 수정 | 새니타이저 `purify` 주입과 폴백 경로 스캐너 재작성(`sanitizer-purify.test.mjs` 58건, TC-S-013·014·015), 빈 새니타이즈 결과의 원본 복귀 차단(`blog-service-sanitize.test.mjs` 5건, TC-S-013), 상세 페이지 링크 변환 속성 주입 차단(`detail-linkify.test.mjs` 5건, TC-S-016), 관리자 포스트 라우트의 검증 결과 전달(`post-routes-validated.test.mjs` 6건, TC-S-011)과 헬퍼 `html-inspect.mjs` 추가를 기록한다. `e90268e` 는 정규식·문자열 리터럴의 제어 문자를 `\u` 이스케이프로 바꾼 표기 변경이며 커밋 메시지는 동작이 같다고 기록한다 |
| 커밋 `b106c9f`, `56f004a`, `0cf4b3b`, `c499691`, `bb7addc` (브랜치 `fix/residual-defects`, 미병합·미게시) | 잔여 결함 수정과 테스트 보강 | `isomorphic-dompurify` devDependency 추가로 DOMPurify 경로 21건 기본 실행(TC-S-013·015), 공개 댓글 작성 라우트 사용자 식별 설정 추가(`comment-require-login.test.mjs` 8건, TC-A-004), editor 서브패스 선언 파일 생성과 exports 스모크(`exports-smoke.test.mjs` 43건, TC-SM-002), `enableValidation:false` 포스트 라우트 허용 필드 제한(`post-routes-validated.test.mjs` 특성 테스트 1건 교체·2건 추가, TC-S-011), 폴백 새니타이저 SVG 애니메이션·`meta`·`base`·`link` 제거(`sanitizer-purify.test.mjs` 18건, TC-S-013·017)를 기록한다. 각 커밋 메시지에 수정 전 실패 건수가 있다 |
| 커밋 `faabcf9` (브랜치 `fix/residual-defects`, 미병합·미게시) | 의존 선언 정정 | `peerDependenciesMeta` 의 `@withwiz/block-editor` 를 `optional: false` 에서 `true` 로 바꾸고 lockfile 루트 항목을 동기화했다. block-editor 없이 새로 설치한 상태에서 typecheck·build·전체 테스트가 통과한다. TC-SM-002 에 선택 peer 확인 1건을 추가했다(`exports-smoke.test.mjs` 43건 → 44건) |

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
| SC-A-004 | 댓글 requireLogin 설정과 공개 작성 라우트 연동 | API | High | ✅ 완료 |
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
| SC-S-011 | 포스트 관리 입력의 허용 필드 제한 | Security | High | ✅ 완료 |
| SC-S-012 | 500 응답 오류 메시지 노출 | Security | Medium | 🔲 계획 |
| SC-S-013 | 새니타이저 우회 입력과 DOMPurify 경로 | Security | High | ✅ 완료 |
| SC-S-014 | 폴백 새니타이저 토큰 경계 정리 | Security | High | ✅ 완료 |
| SC-S-015 | 새니타이저 purify 주입 계약과 경로 선택 | Security | High | ✅ 완료 |
| SC-S-016 | 상세 본문 URL 링크 변환 속성 주입 차단 | Security | High | ✅ 완료 |
| SC-S-017 | 폴백 새니타이저 SVG 애니메이션·문서 수준 요소 제거 | Security | High | ✅ 완료 |
| SC-P-001 | 예약 발행 건별 조건부 갱신 왕복 수 | Performance | Low | 🔲 계획 |
| SC-P-002 | 폴백 새니타이저 입력 크기별 처리 시간 | Performance | Low | 🔲 계획 |
| SC-AC-001 | 공개 댓글 폼 레이블·오류 알림 | Accessibility | Medium | 🔲 계획 |
| SC-AC-002 | 관리자 토글 스위치 역할·상태·이름 | Accessibility | Medium | 🔲 계획 |
| SC-AC-003 | role="button" 요소 키보드 조작 | Accessibility | Medium | 🔲 계획 |
| SC-AC-004 | 공개 목록 페이지 제목 계층(h1·h2) | Accessibility | Medium | ✅ 완료 |
| SC-AC-005 | 공개 기본 테마 텍스트 색 대비 | Accessibility | Medium | ✅ 완료 |
| SC-L-001 | 댓글 레이트 리밋 동시 요청 | Load/Stress | Critical | ✅ 완료 |
| SC-L-002 | 예약 발행 동시 트리거·조회-갱신 경쟁 | Load/Stress | Critical | ✅ 완료 |
| SC-L-003 | 레이트 리밋 한계 조건 특성 테스트 | Load/Stress | Medium | 🔲 계획 |
| SC-SM-001 | Headless 모드 타입 수준 import 검증 | Smoke | Medium | ✅ 완료 |
| SC-SM-002 | exports 서브패스 14개 dist import·타입 선언 파일 | Smoke | Medium | ✅ 완료 |
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
| **전제조건** | 정적 마크업 단계(1·2·3·5번, 4번의 요소 종류·`href`)는 현재 러너에서 `react-dom/server` 의 `renderToStaticMarkup` 으로 `dist` 컴포넌트를 렌더링해 작성할 수 있다(2.1.4 에서 `react-dom` 을 devDependency 로 명시, `list-page-hero-title`·`detail-linkify` 가 같은 방식 사용). **클릭 단계(4번 클릭, 6번)는 렌더링 테스트 인프라 도입이 선행 조건이다.** `@testing-library/react` 와 jsdom 이 devDependencies 에 없고, 현재 러너(`node:test` + `dist/*.mjs`)는 JSX 소스를 직접 실행하지 않는다. editor 2개가 필요로 하는 `@tiptap/react` 등 선택적 peer 는 2026-09-16 부터 devDependencies 로 설치된다 |
| **테스트 데이터** | 태그 목록, 게스트·로그인 사용자 props |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `BlogThemeProvider` 없이 `useBlogUI()` 사용 컴포넌트 렌더링 | `defaultComponents` 로 렌더링 (컨텍스트가 `null` 이면 기본값 반환) |
| 2 | `BlogThemeProvider components={{ Button: Custom }}` 로 감싸 렌더링 | `Button` 만 교체되고 나머지는 기본 컴포넌트 |
| 3 | `TagCloud tags={[]}` | `t.tagCloudEmpty` 문구가 `<p>` 로 렌더링 |
| 4 | `TagCloud` 에 `onTagClick` 지정 / 미지정 | 지정 시 `<button type="button">` 이고 클릭하면 `onTagClick(tag)` 호출, 미지정 시 `href = <basePath 끝 슬래시 제거>?tag=<slug>` 링크 |
| 5 | `CommentForm` 에 `currentUserId` 미지정 | 이름·이메일 입력이 렌더링되고, `currentUserId` 지정 시 두 입력이 렌더링되지 않음 |
| 6 | `DefaultToggle` 클릭 (`disabled` false / true) | `onChange(!checked)` 호출 / 미호출 |

- **자동화:** 정적 단계 가능 ✅, 클릭 단계는 인프라 도입 후
- **근거:** 2026-09-15 임시 스크립트로 `CommentForm`, `TagCloud`, `defaultComponents.Toggle`, `BlogListView` 가 `renderToStaticMarkup` 에서 예외 없이 렌더링되는 것을 확인했다(예상 결과 값은 확인하지 않음).
- **기존 테스트와의 관계:** `BlogListPage`(TC-AC-004)와 `BlogDetailPage` 본문 영역(TC-S-016)은 정적 렌더링 테스트가 있으나, 이 TC 의 단계는 다루지 않는다.
- **컴포넌트 수 검증:** 2026-09-13 `dist/components/admin/index.mjs` 와 `dist/components/public/index.mjs` 를 import 해 export 를 나열한 결과, PascalCase 컴포넌트는 admin 9개(`BlogThemeProvider` 포함), public 7개(`BlogThemeProvider` 포함)였고 `defaultComponents` 는 8개 키를 가졌다. 2026-09-15 재확인에서도 같다(2.1.5 에서 추가된 `linkify-html.ts` 는 공개 export 가 아니다. public 엔트리의 대문자 export 9개 중 `PUBLIC_THEME_DEFAULTS`, `PUBLIC_VAR_MAP` 은 상수이다). editor 엔트리는 2026-09-15 에는 `@tiptap/react` 미설치로 import 되지 않아 소스(`src/components/admin/editor/index.ts`)에서 2개를 확인했고, 2026-09-16 에 `@tiptap/*` devDependencies 추가 후 `dist/components/admin/editor/index.mjs` 를 import 해 `BlockEditorForm`, `RichTextEditor` 2개를 확인했다. 고유 컴포넌트는 25개이다. 사전 조사의 22개는 admin 8 + public 6 + 기본 UI 8 의 합과 일치하며, 산정 기준은 조사 문서에 기재되어 있지 않다.

---

## 2. Integration Tests (통합 테스트)

**목적:** 실제 서비스 팩토리(`createXxxService`)에 인메모리 fake Prisma 를 주입해 서비스 로직과 Prisma 질의 인자 구성을 함께 검증한다. 실제 DB 는 사용하지 않는다.

**실행 명령:** `npm test` (단일 파일: `npm run build && node --test test/runtime/concurrency-guards.test.mjs`)

**현재 공백:** 서비스 5종 중 `CommentService.create()` 와 `SchedulerService.processScheduledPosts()` 만 fake Prisma 로 로직 전반이 실행된다. `BlogService` 는 2.1.5 에서 추가된 `blog-service-sanitize.test.mjs`(TC-S-013), `post-routes-validated.test.mjs`(TC-S-011), 2026-09-18 에 추가된 `blog-service-input-fields.test.mjs`(TC-S-011)가 `create()`·`update()` 의 Prisma data 를 기록해 본문 새니타이즈 저장값, zod 기본값·`publishedAt` 변환, 스키마 밖 필드 제거를 단언하지만, 이는 보안 회귀 목적의 부분 검증이다. slug 중복, 태그 연결, 조회 조건, 삭제·대시보드는 검증하지 않는다. `TagService`, `SearchService` 를 실행하는 테스트는 `auth-failclosed.test.mjs` 뿐이며, 이 파일은 모든 델리게이트가 빈 결과를 반환하는 Proxy fake 를 사용하므로 질의 조건과 매핑 로직을 단언하지 않는다.

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
| 3 | `sanitizeContent` 주입 후 `content:'<p>ok</p><script>x</script>'` 저장 | 저장 `content` 는 새니타이즈 결과(`sanitize(data.content) ?? ''`). 결과가 빈 문자열이면 빈 문자열, `null` 이면 빈 문자열이 저장된다 (2.1.5 수정 `c0ea2a9`, TC-S-013 7~10번에서 검증) |
| 4 | `published:true`, `publishedAt` 미지정 / 둘 다 미지정 | `publishedAt` 은 현재 시각 `Date` / `null` |
| 5 | `enableTags:true` 와 `tagIds:['t1','t2']` 로 생성 | `$transaction` 안에서 `blogPost.create` 후 `postTag.createMany({ data:[{postId, tagId:'t1'},{postId, tagId:'t2'}], skipDuplicates:true })` |
| 6 | `enableTags:true` 에서 `tagIds:[]`, 또는 `postTag.createMany` 부재 | 트랜잭션 없이 `delegate.create` 1회 |
| 7 | 기존 `published:false` 글을 `update(id, { published:true })` | 트랜잭션 안에서 `findUnique` 후 `publishedAt` 을 현재 시각으로 설정. 기존 `published:true` 면 `publishedAt` 미변경 |
| 8 | `enableTags:true` 에서 `update(id, { tagIds: [] })` | `postTag.deleteMany({ where:{ postId:id } })` 만 호출, `createMany` 미호출 |
| 9 | `update(id, { coverImageUrl:'' })` | `coverImageUrl: null` 로 정규화 |
| 10 | `checkSlugAvailable('hello')`, `('hello','1')`, `('fresh')` | `false`, `true`, `true` |

- **자동화:** 가능 ✅
- **근거:** 1·10번은 2026-09-13 임시 스크립트로 확인했다.
- **부분 커버:** 3번은 `blog-service-sanitize.test.mjs`(TC-S-013)가 검증한다. `post-routes-validated.test.mjs`(TC-S-011 5·6번)는 라우트 경유 `create()` 에서 `coverImageUrl`·`coverImageKey` 미지정 시 `null`, `publishedAt` 문자열의 `Date` 변환을 단언하지만 4·9번의 조건(`published:true` 만 지정, `coverImageUrl:''` 수정)과는 다르다. 나머지 단계는 테스트가 없어 계획 상태를 유지한다.
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
    ↳ 포스트 생성·수정은 검증 통과 시 원본 body 대신 검증 결과 data 를 전달 (2.1.5)
    ↳ 검증 비활성(enableValidation:false)이면 스키마 필드와 같은 허용 필드만 골라 전달 (2026-09-16)
  → (댓글 공개 작성) publicAuthMiddleware 로 로그인 사용자 식별, 미설정·null 이면 게스트 (2026-09-16)
  → service 호출
  → successResponse(data, status, headers)
  ↳ 예외 발생 시 handleError: BlogError 는 statusCode 유지, 그 외 500 INTERNAL_ERROR
```

**실행 명령:** `npm test`

**현재 상태:** 2026-09-16 에 `comment-require-login.test.mjs`(TC-A-004)가 추가되어 API 도메인 첫 파일이 되었다. 라우트 계층을 실행하는 나머지 4개 파일(`auth-failclosed`, `scheduler-cron`, `ip-header-strategy`, `post-routes-validated`)은 인증, IP 처리, 허용 필드 제한이 목적이므로 Security 도메인으로 분류했다. `post-routes-validated` 가 admin 포스트 `list.POST` 201, `detail.PUT` 200, 검증 실패 400 의 상태 코드를 단언하지만, 쿼리 파싱·응답 헤더·오류 본문(`error.code`, 메시지) 계약을 단언하는 테스트는 없다.

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
- **부분 커버:** 4번 중 admin `list.POST` 201 은 TC-S-011 1번이 단언한다. `detail.DELETE` 204 와 나머지 단계는 테스트가 없어 계획 상태를 유지한다.
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
- **부분 커버:** 4번의 상태 코드 400 은 TC-S-011 3번이 포스트 `list.POST`·`detail.PUT` 에서 단언하지만 `VALIDATION_FAILED` 코드와 메시지 형식은 단언하지 않는다.

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

### TC-A-004: 댓글 requireLogin 설정과 공개 작성 라우트 연동

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/comment-require-login.test.mjs` |
| **대상** | `src/routes/comment.routes.ts` `public.create.POST`, `CommentRoutesConfig.publicAuthMiddleware` / `src/types/config.ts` `BlogConfig.commentAuthMiddleware` / `src/index.ts` `createBlog()` 의 전달과 설정 누락 경고 / `src/services/comment.service.ts` `create()` 의 `requireLogin` 검사 (2026-09-16 `56f004a`) |
| **우선순위** | High |
| **전제조건** | 실제 `createCommentService(prisma, { requireLogin })` 와 `createCommentRoutes(svc, { hmacSecret, ...routesConfig })`. Prisma 는 모든 모델 키에 같은 델리게이트를 돌려주는 Proxy fake 이며 `create` data 를 기록한다. 검증 활성(기본) |
| **테스트 데이터** | 본문 `{ content:'hi' }`(게스트 정보·위조 `authorId`·`userId` 추가 변형), `cookie: session=logged-in` 헤더, `params: { postId:'p1' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `requireLogin: true + 사용자 식별 설정 없음 → 기존처럼 403 이고 저장하지 않는다 (fail-closed 유지)` | 403 `COMMENT_LOGIN_REQUIRED`, Prisma `create` 0회 |
| 2 | `requireLogin: true + publicAuthMiddleware 가 사용자를 반환 → 201, 작성자 id 로 저장`: 본문에 `guestName`·`guestEmail` 포함 | 201, 미들웨어가 받은 요청의 `cookie` 헤더가 `session=logged-in`, `create` data 의 `authorId:'user-1'`, `guestName`·`guestEmail` 은 `null` |
| 3 | `requireLogin: true + publicAuthMiddleware 가 null → 403 이고 저장하지 않는다` | 403 `COMMENT_LOGIN_REQUIRED`, `create` 0회 |
| 4 | `관리자 authMiddleware 는 공개 작성 라우트의 사용자 식별에 쓰지 않는다`: 관리자 사용자를 반환하는 `authMiddleware` 만 설정 | 403, 관리자 미들웨어 호출 0회, `create` 0회 |
| 5 | `requireLogin: false 에서 기존 게스트 작성 동작 유지, 본문의 authorId·userId 는 작성자로 쓰지 않는다`: 미들웨어 미설정, `null` 반환 미들웨어 두 경우 | 두 경우 모두 201, `authorId:null`, 미설정 경우 `guestName:'게스트'` 유지 |
| 6 | `requireLogin: false + publicAuthMiddleware 가 사용자를 반환 → 작성자 id 를 기록한다` | 201, `authorId:'user-2'` |
| 7 | `검증 실패는 사용자 식별보다 먼저 400 으로 응답한다`: 본문 `{}` | 400, 미들웨어 호출 0회, `create` 0회 |
| 8 | `createBlog: commentAuthMiddleware 를 공개 댓글 작성 라우트에 전달한다`: `features.comments.requireLogin:true` 로 설정 있음·없음 두 인스턴스 생성 | 설정 있음은 경고 0건이고 POST 201·`authorId:'user-3'`, 설정 없음은 POST 403·저장 없음이고 `commentAuthMiddleware` 를 언급하는 경고가 정확히 1건 |

- **자동화:** 가능 ✅ | **테스트 수:** 8개 (실측)
- **관련 요구사항:** OWASP A01:2021 Broken Access Control (작성자 위조 방지는 본문 대신 주입된 식별 결과만 사용)
- **결함 이력:** 2026-09-13·09-15 판에서는 결함 확인용 🔲 계획 TC 였다. 당시 라우트는 `commentService.create(input, { userId: undefined, ipHash })` 로 사용자 id 를 고정했고, `CommentRoutesConfig` 에는 공개 라우트에서 사용자를 식별할 설정이 없었다(`authMiddleware` 는 admin 핸들러에만 사용). 그래서 `requireLogin:true` 이면 로그인 쿠키·헤더와 무관하게, `createBlog` 경유를 포함해 항상 403 `COMMENT_LOGIN_REQUIRED` 였다(2026-09-13 임시 스크립트 확인). `CommentForm` 컴포넌트는 `currentUserId` prop 으로 로그인 상태를 구분해 UI 와 라우트 동작이 달랐다. 문서의 확인 필요 항목(설계인지 결함인지)은 2026-09-16 에 라우트의 사용자 식별 누락 결함으로 판정했다. `56f004a` 에서 관리자 `authMiddleware` 와 같은 `AuthMiddleware` 형태의 `publicAuthMiddleware`(라우트)·`commentAuthMiddleware`(`createBlog`) 설정을 추가했다. 수정 전 실행에서 2·6·8번 3건이 403 으로 실패했고, 나머지 5건은 기존 동작을 유지하는지 확인하는 테스트라 통과했다.
- **남은 한계:** 설정이 없는 호스트의 동작은 이전과 같다(`requireLogin:true` 이면 403, `createBlog` 는 경고만 출력하고 초기화를 실패시키지 않음). 미들웨어가 예외를 던지는 경우의 응답(TC-A-002 규칙)은 단언하지 않는다. blog-system 은 자체 댓글 라우트를 구현하므로 이 설정의 영향을 받지 않는다.

---

## 4. E2E Tests (엔드-투-엔드 테스트)

**판정:** 미적용

이 패키지는 DB 스키마 적용, Next.js 런타임, 인증을 호스트가 제공하는 라이브러리이므로 브라우저에서 사용자 흐름 전체를 재현하는 E2E 는 호스트 프로젝트 책임으로 판정했다. `dist` 산출물을 실제로 import 하는 소비자 관점 검증은 Smoke(SC-SM-002)로 분류했다. 시나리오와 케이스는 정의하지 않는다.

---

## 5. Security Tests (보안 테스트)

**목적:** 인증 fail-closed, 시크릿 주입 강제, IP 스푸핑 방어, 저장 XSS 방어(저장 전 새니타이즈, 렌더링 시 링크 변환), 입력 허용 필드 제한, SQL 식별자 주입 방어를 검증한다.

**실행 명령:** `npm test`. 실제 DOMPurify 경로(TC-S-013 21건, TC-S-015 1건, TC-S-017 7건)는 2026-09-16 부터 devDependencies 의 `isomorphic-dompurify` 로 기본 실행에서 실행된다. devDependencies 를 설치하지 않아 `isomorphic-dompurify` 를 해석할 수 없는 환경에서만 이 29건을 건너뛰며, 이때는 이전처럼 `NODE_PATH` 로 설치 위치를 지정할 수 있다.

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
| **대상** | `src/utils/html-sanitizer.ts` `sanitizeHtmlContent()`(기본 `createSanitizer()`, `purify` 미지정), 폴백 경로 `fallbackSanitize()`, `warnWeakSanitizerOnce()` |
| **우선순위** | Critical |
| **전제조건** | `dist/utils/index.mjs`(ESM)를 import 한다. ESM 산출물에서는 `require` 가 esbuild `__require` shim 으로 바뀌어 `Dynamic require of "isomorphic-dompurify" is not supported` 로 실패하므로, `isomorphic-dompurify` 설치 여부와 무관하게 폴백 새니타이저를 사용한다. 2026-09-16 devDependencies 설치 상태에서 확인한 결과 패키지에서 `isomorphic-dompurify` 가 해석되지만, ESM `createSanitizer()` 는 `<p>a</p><foo-bar>b</foo-bar>` 를 그대로 반환하고 경고를 1회 냈으며, CJS `createSanitizer()` 는 DOMPurify 를 불러와 `<p>a</p>b` 를 반환했다. 모듈 로드 시 `console.warn` 가로채기 |
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
- **비고:** 2.1.5 에서 폴백 구현이 정규식 치환에서 HTML 토큰 경계 스캐너(`src/utils/html-scan.ts`) 기반으로 바뀌었지만 이 파일은 변경 없이 통과한다. 경고 문구는 여전히 "정규식 기반 폴백" 이다. 5번 테스트 이름("dompurify 미설치 → 정확히 1회 warn")과 달리 ESM 산출물에서는 설치되어 있어도 같은 경고가 나며, 2026-09-16 부터는 기본 실행에서도 설치된 상태로 이 테스트가 통과한다(테스트 이름은 바꾸지 않음).

---

### TC-S-008: HTML 새니타이저 강화 벡터 (R4)

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer.test.mjs` (12건 중 6건) |
| **대상** | `src/utils/html-sanitizer.ts` 폴백 경로의 `cleanStartTag()`, `shouldDropAttribute()`(on*·`srcdoc`·위험 `style` 제거), `isDangerousUrlValue()`(`href`·`src`·`action`·`formaction`·`xlink:href` 값을 문자 참조 디코딩·공백 제거 후 판정), `isDangerousStyleValue()`. 2.1.3 의 `DANGEROUS_PROTOCOL_UNQUOTED`, `OBFUSCATED_JS_PROTOCOL`, `STRIP_SRCDOC`, `DANGEROUS_STYLE` 정규식은 2.1.5 에서 제거되었다 |
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
- **한계 (TC-S-007 공통):** 기본 새니타이저(ESM, 폴백 경로)만 실행하며 DOMPurify 경로는 실행하지 않는다. 단언이 출력 문자열 정규식(`/onerror/i`, `/javascript:/i` 등)이므로 브라우저가 인식하는 속성 기준 판정은 아니다. DOMPurify 경로, 닫는 태그 없는 비신뢰 iframe(2.1.5 에서 제거되도록 수정), 토큰 경계 우회 입력은 TC-S-013·014 가 `html-inspect.mjs` 헬퍼로 검증한다.

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

### TC-S-011: 포스트 관리 입력의 허용 필드 제한

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/post-routes-validated.test.mjs`, `test/runtime/blog-service-input-fields.test.mjs` (9~12번) |
| **대상** | `src/routes/post.routes.ts` admin `list.POST`, `detail.PUT` (검증 통과 시 `check.data` 를 서비스로 전달, 2.1.5 `d22f6c6`. 검증 비활성 시 `pickPostInput()` 으로 허용 필드 `POST_INPUT_FIELDS` 14개만 전달, 2026-09-16 `c499691`) / `src/services/blog.service.ts` `create()`, `update()` 와 거기서 export 하는 `POST_INPUT_FIELDS`·`pickPostInput()` (서비스 직접 호출 경로에도 같은 선별 적용, 2026-09-18 `ca448be`) |
| **우선순위** | High |
| **전제조건** | 1~6번: `create`·`update`·`getById` 인자를 기록하는 fake BlogService. 7·8번: 실제 `createBlogService(prisma, { modelName:'blogPost' })` 에 Prisma `create`·`update` data 를 기록하는 fake 델리게이트와 `$transaction: (fn) => fn(prisma)` 주입. 공통: `authMiddleware` 가 `{ id:'admin-1', role:'admin' }` 반환. 1~3·7·8번은 검증 활성(기본), 4~6번은 `enableValidation:false`. 5번은 `dist/validators/index.mjs` 의 `createBlogSchemas()` 스키마 `shape` 키를 기준으로 사용. 9~12번은 라우트를 거치지 않고 `createBlogService()` 를 직접 호출하며, Prisma `create`·`update` data 를 기록하는 fake 델리게이트와 `$transaction: (fn) => fn(prisma)` 를 주입한다 |
| **테스트 데이터** | 스키마 밖 필드 `INJECTED_FIELDS = { id:'forged-id', createdAt, updatedAt, authorId:'someone-else', author:{ connect }, tags:{ create }, comments:{ create }, viewCount:999 }`, 유효 생성 본문 `{ title:'제목', content:'<p>본문</p>', category:'news', slug:'hello-world', publishedAt:'2026-09-01T00:00:00.000Z' }` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `POST: 검증 결과만 서비스로 전달 (스키마 밖 필드 제거)`: 유효 본문 + `INJECTED_FIELDS` 로 `list.POST` | 201, `create` 1회, 인자 data 에 `INJECTED_FIELDS` 8개 키가 없음, 작성자 인자는 인증 사용자 `'admin-1'`, `title`·`slug` 유지 |
| 2 | `PUT: 검증 결과만 서비스로 전달 (스키마 밖 필드 제거)`: `{ title:'수정', ...INJECTED_FIELDS }` 로 `detail.PUT` | 200, `update('p1', { title:'수정' })` (data 가 정확히 `{ title:'수정' }`) |
| 3 | `POST·PUT: 검증 실패는 기존처럼 400 이고 서비스를 부르지 않는다`: `slug:'Bad Slug'` POST, `{ published:'yes' }` PUT | 두 응답 모두 400, `create`·`update` 호출 0회 |
| 4 | `enableValidation: false 여도 허용 필드만 서비스로 전달 (스키마 밖 필드 제거, 값은 변환하지 않음)`: 유효 본문 + `INJECTED_FIELDS` 로 POST, `{ title:'수정', ...INJECTED_FIELDS }` 로 PUT | 201·200, `create` data 에 주입 키 8개가 없고 data 가 유효 본문과 정확히 같음(zod 기본값·Date 변환 없음), 작성자 인자는 `'admin-1'`, `update` 인자는 `{ id:'p1', data:{ title:'수정' } }` |
| 5 | `enableValidation: false 의 허용 필드는 생성·수정 스키마 필드와 같다`: 스키마 `shape` 의 모든 키에 값을 넣고 `INJECTED_FIELDS` 를 더해 POST·PUT | `create` data 키 목록이 `CreateBlogPostSchema.shape` 키 목록과, `update` data 키 목록이 `UpdateBlogPostSchema.shape` 키 목록과 같음 |
| 6 | `enableValidation: false 의 기본 필수값 검사는 기존처럼 400 이고 서비스를 부르지 않는다`: `slug` 없는 본문 + `INJECTED_FIELDS` 로 POST | 400, `create` 0회 |
| 7 | `서비스 호환: POST 는 zod 기본값을 적용하고 Prisma 에 스키마 밖 필드를 넘기지 않는다`: 본문에 `<img src="x" onerror="alert(1)">` 추가 | 201, Prisma `create` data 에 `authorId` 를 제외한 7개 주입 키가 없음, `authorId:'admin-1'`, `editorType:'rich'`, `attachments:[]`, `featured:false`, `published:false`, `publishedAt` 은 `Date`(`2026-09-01T00:00:00.000Z`), `coverImageUrl`·`coverImageKey` 는 `null`, `content === '<p>본문</p><img src="x">'` |
| 8 | `서비스 호환: PUT 은 보낸 필드만 갱신하고 publishedAt 문자열·null 을 올바르게 저장한다` | 두 응답 모두 200, 첫 `update` data 키는 `['publishedAt','title']` 이고 `publishedAt` 은 `Date`(`2026-09-02T03:04:05.000Z`), 두 번째 data 는 `{ publishedAt:null }` |
| 9 | `create` 를 직접 호출하며 `id`·`viewCount`·`comments` 중첩 쓰기를 넣는다 | Prisma `create` data 에 세 키가 모두 없다 |
| 10 | `create` 를 직접 호출하며 입력에 `authorId:'forged-author'` 를 넣고 인자로 `'author-1'` 을 준다 | Prisma `create` data 의 `authorId` 가 `'author-1'` 이다 |
| 11 | `update` 를 직접 호출하며 `title` 과 함께 `id`·`authorId`·`comments` 중첩 쓰기를 넣는다 | Prisma `update` data 에 `title` 만 있고 나머지 세 키가 없다 |
| 12 | `create`·`update` 를 직접 호출하며 허용 필드(`excerpt`·`editorType`·`featured`·`published`)만 넣는다 | 네 값이 그대로 Prisma data 에 전달된다 |

- **자동화:** 가능 ✅ | **테스트 수:** 12개 (실측. `post-routes-validated.test.mjs` 8건 + `blog-service-input-fields.test.mjs` 4건)
- **관련 요구사항:** OWASP A08:2021 Software and Data Integrity Failures (CWE-915)
- **결함 이력:** 2026-09-13 문서에서는 라우트가 `validateWithSchema()` 결과를 쓰지 않고 원본 `body` 를 전달해 `authorId`, `id` 등이 서비스로 전달되는 현재 동작을 기록했다. 2.1.5 수정 후 검증 활성 상태에서는 1·2·7번과 같이 차단되었다. 2026-09-15 판에서는 `enableValidation:false` 이면 원본 `body` 를 그대로 전달하는 한계를 특성 테스트 `한계(동작 불변): enableValidation: false 이면 스키마가 없어 원본 body 를 그대로 전달`(당시 4번, `create`·`update` data 에 `id:'forged-id'` 포함을 단언)이 고정했고, 태그 라우트(TC-A-003 2번)와 동작이 달랐다. 2026-09-16 `c499691` 에서 검증 비활성 시에도 허용 필드만 넘기도록 수정하고 이 특성 테스트를 4번으로 교체했으며 5·6번을 추가했다. 수정 전 실행에서 4·5번 2건이 실패했고, 6번은 기존 동작 확인용이라 통과했다. 테스트 번호는 5·6번이 7·8번으로 바뀌었다. 2026-09-18 `ca448be` 에서 서비스 직접 호출 경로의 같은 한계를 고쳤다. 허용 목록과 선별 함수를 `blog.service.ts` 로 옮겨 export 하고 `create()`·`update()` 가 구조 분해 전에 적용하게 했으며, 라우트는 같은 정의를 가져다 쓴다. 수정 전 실행에서 9·11번 2건이 실패했고 10·12번은 기존 동작 확인용이라 통과했다.
- **남은 한계:** 검증 비활성 시에는 필드만 제한하고 값의 형식은 검사하지 않는다(설정 의도와 같음). 서비스 직접 호출 경로도 마찬가지로 필드만 제한한다.
- **결정 (2026-09-18):** 서비스 직접 호출 경로의 허용 필드 제한을 라이브러리 책임으로 정했다. 목록 밖 필드는 라우트와 같게 조용히 버린다. 호출 경로 세 곳에 영향이 없음을 먼저 확인했다. 호스트 dts-ballet-homepage 의 `src/lib/services/news.service.ts` 는 `CreateBlogPostInput`·`UpdateBlogPostInput` 을 그대로 쓰고, blog-system `blog-routes.ts` 는 `validateAndParse()` 결과를, `onboarding-service.ts` 는 허용 필드 6개만 넘긴다. blog-system 의 테넌트 격리는 `createTenantProxy()` 가 Prisma 호출 인자에 `tenantId` 를 주입하는 방식이라 서비스 입력 선별보다 뒤 단계이므로 영향받지 않는다.

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

### TC-S-013: 새니타이저 우회 입력과 DOMPurify 경로

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-purify.test.mjs` (76건 중 42건: `defineSharedCases` 의 `[정규식]` 21건, `[DOMPurify]` 21건. 같은 함수의 애니메이션·메타 요소 케이스는 TC-S-017), `test/runtime/blog-service-sanitize.test.mjs` (5건) |
| **대상** | `src/utils/html-sanitizer.ts` `createSanitizer()` 의 두 경로(`fallbackSanitize()`, `dompurifySanitize()`) / `src/services/blog.service.ts` `create()`·`update()` 의 `sanitize(data.content) ?? ''` (2.1.5 `c0ea2a9`, 이전 `sanitize(data.content) \|\| data.content`) |
| **우선순위** | High |
| **전제조건** | 정규식 경로: `createSanitizer({ ...config, purify: null })`. DOMPurify 경로: `createSanitizer({ ...config, purify: <isomorphic-dompurify> })` 이며, 테스트 파일이 `require('isomorphic-dompurify')` 를 해석할 수 있을 때만 실행하고 아니면 건너뛴다(2026-09-16 부터 devDependencies 3.19.0 으로 기본 `npm test` 에서 실행, 2026-09-15 까지는 NODE_PATH 지정 시에만 실행). 판정은 `helpers/html-inspect.mjs` `findUnsafe()` 로 하며, raw text 요소 내용과 CDATA 를 텍스트·마크업으로 보는 4가지 해석 중 하나라도 금지 태그, `on*` 속성, `srcdoc`, 위험 스킴 URL 속성, 비신뢰 iframe 을 인식하면 위험으로 판정한다. 서비스 테스트: `createBlogService(prisma, { modelName:'blogPost' })` 에 Prisma data 를 기록하는 fake 델리게이트 주입(기본 새니타이저는 ESM 산출물이라 폴백 경로) |
| **테스트 데이터** | `BYPASS_INPUTS` 15종, 블록 에디터 데이터 주석 HTML(`nbe-*`, `MARKER_COMMENT_HTML` 의 `abe-blocks`·`pme-data`·`rme-data`), 보존 대상 HTML(`class`·`style`·`target`·신뢰 iframe), 위험 요소만 있는 본문 `<script>alert(1)</script>` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `[정규식]`·`[DOMPurify] 우회 차단: <이름>` 15종: 슬래시 뒤 이벤트 속성, 태그명 뒤 슬래시 이벤트 속성, 따옴표 직후 이벤트 속성, 엔티티 난독화 `javascript:`, 닫는 태그 없는 비신뢰 iframe, self-closing 비신뢰 iframe, 따옴표 속성값 안의 `>` 뒤 이벤트 속성, 작은따옴표 속성값 안의 `>` 뒤 `javascript:` href, 속성명 안의 따옴표 뒤 이벤트 속성, `title`·`noscript`·`xmp`·`textarea` raw text 경계, 신뢰 iframe raw text 경계, svg CDATA 와 주석 경계 | 두 경로 모두 `findUnsafe(out)` 가 빈 배열 |
| 2 | `비신뢰 iframe 제거 후 앞 콘텐츠는 유지`: `<p>a</p><iframe src="https://evil.example/x">` | 출력에 `p` 시작 태그가 남음 |
| 3 | `블록 에디터 데이터 주석 보존` | 주석 3개(` nbe-blocks:eyJ0eXBl...== `, `nbe-cta-start`, `nbe-cta-end`)가 순서대로 남음 |
| 4 | `class·style·target·신뢰 iframe 유지` | `p` 의 `class="lead"`, `style="color:red"`, `a` 의 `href`(디코딩값 `https://ok.example/post?a=1&b=2`)와 `target="_blank"`, youtube iframe 의 `src`, `allow="autoplay"`, `frameborder="0"`, `allowfullscreen` 유지 |
| 5 | `빈 값은 그대로 반환`: `''`, `null`, `undefined` | 입력값 그대로 |
| 6 | `trustedIframeOrigins 옵션 유지`: `['https://ok.example/']` 지정 후 ok.example·youtube iframe 입력 | 남은 iframe `src` 가 `['https://ok.example/embed/1']` (지정하면 기본 youtube origin 은 신뢰하지 않음) |
| 7 | `create: 위험 요소만 있는 본문은 원본이 아니라 빈 문자열로 저장` | Prisma `create` data 의 `content === ''` |
| 8 | `update: 위험 요소만 있는 본문은 원본이 아니라 빈 문자열로 저장` | Prisma `update` data 의 `content === ''` |
| 9 | `create·update: 사용자 새니타이저가 null 을 돌려주면 빈 문자열로 저장` (`sanitizeContent: () => null`) | `create`·`update` data 의 `content` 모두 `''` |
| 10 | `create·update: 새니타이즈 결과를 그대로 저장`: `<p>ok</p><img src="x" onerror="alert(1)">` | `create`·`update` data 의 `content` 모두 `'<p>ok</p><img src="x">'` |
| 11 | `update: content 를 보내지 않으면 content 는 변경 대상에 넣지 않는다`: `update('post-1', { title:'새 제목' })` | `update` data 에 `content` 키 없음 |
| 12 | `[정규식]`·`[DOMPurify] abe-blocks·pme-data·rme-data 데이터 주석 보존`: `<!-- 표식:base64 -->` 주석 3개(base64 에 `+`·`/`·`=` 포함) | 두 경로 모두 주석 3개(` abe-blocks:eyJ0eXBl...PyJ9 `, ` pme-data:eyJ0Ijoi...MiJ9 `, ` rme-data:eyJ0Ijoi...ifQ== `)가 순서대로 남음 (2026-09-16 추가) |

- **자동화:** 가능 ✅ | **테스트 수:** 47개 (실측: 기본 실행 47건 통과. 2026-09-15 에는 45건 중 기본 실행 25건 통과·20건 건너뜀)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)
- **이력:** 2026-09-13 문서에서는 닫는 태그 없는·self-closing 비신뢰 iframe 이 폴백 경로에서 그대로 반환되고, 위험 요소만 있는 본문은 새니타이즈 결과 `''` 가 `||` 연산으로 원본으로 되돌아가 저장되는 현재 동작을 결함 후보로 기록했다. 2.1.5(`5b3876e`, `c0ea2a9`) 수정 후 1·2·7·8번과 같이 제거·빈 문자열 저장으로 바뀌었다.
- **한계:** DOMPurify 경로는 호스트가 쓰는 isomorphic-dompurify 4.2.0 이 아니라 3.19.0 으로 실행한다(Node 엔진 조건, 개요의 의존성 설치 참고). 두 버전은 같은 dompurify 3.4.15 를 해석하지만 jsdom 은 29.1.1 과 30.x 로 다르다. `findUnsafe()` 는 트리 구성 단계의 문맥(svg·math 안인지)을 추적하지 않는 보수적 판정이다. 서비스 테스트는 기본 새니타이저와 `sanitizeContent` 직접 주입만 사용하며 `createBlog({ sanitizeContent })` 경유 전달은 검증하지 않는다. `BlogDetailPage` 는 렌더링 시점에 본문을 새니타이즈하지 않으므로 저장 전 새니타이즈에 의존한다.

---

### TC-S-014: 폴백 새니타이저 토큰 경계 정리

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-purify.test.mjs` (76건 중 10건, `[정규식]` 전용 테스트) |
| **대상** | `src/utils/html-sanitizer.ts` `fallbackSanitize()`(최대 `MAX_FALLBACK_PASSES` 16회 반복), `fallbackSanitizePass()`, `cleanStartTag()`, `shouldDropAttribute()`, `isDangerousUrlValue()`, `decodeCharRefs()`, `isTrustedIframe()` / `src/utils/html-scan.ts` `nextHtmlSegment()`, `parseHtmlTag()`, `findRawTextClose()` |
| **우선순위** | High |
| **전제조건** | `createSanitizer({ purify: null })`, 판정은 `findUnsafe()` 또는 출력 문자열 일치 |
| **테스트 데이터** | 아래 단계별 입력 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `[정규식] 연속·중첩 이벤트 속성 반복 제거`: 구분자 없이 이어진 이벤트 속성, `o<script>1</script>nerror`, `<scr onclick="x"ipt>`, `<<object>img ...>`, `<scr<object>ipt>` 등 7개 | 각 출력의 `findUnsafe()` 가 빈 배열 |
| 2 | `[정규식] URL 속성 엔티티·공백·제어문자 난독화 차단`: 숫자·16진수·이름 문자 참조(`&#106;`, `&#0000106`, `&colon;`, `&Tab;`, `&NewLine;`), 앞 공백, 무따옴표 값, `vbscript:`, `data:text/html`, `xlink:href`, svg `a/href`, math `formaction`·`action`, 다른 속성 값 안의 가짜 `href=`·`src=` 등 16개 | 각 출력의 `findUnsafe()` 가 빈 배열 |
| 3 | `[정규식] data:image/ URL 과 일반 링크는 보존`: `data:image/png` img, 쿼리·해시 링크, 상대 경로, `mailto:` | 출력이 입력과 같음 |
| 4 | `[정규식] 신뢰 origin 판정은 실제 src 속성 기준 (data-src·중복 src 우회 차단)`: `data-src` 에 youtube, 속성값 안의 가짜 `src=`, 첫 `src` 가 비신뢰인 중복 `src`, 닫는 태그 없는 형태, nbsp 가 붙은 `src `, `title=">"` 등 6개 | 각 출력의 `findUnsafe()` 가 빈 배열 |
| 5 | `[정규식] 신뢰 iframe 에 구분자 없이 붙인 srcdoc 제거` | `findUnsafe()` 빈 배열, 신뢰 iframe 시작 태그는 유지 |
| 6 | `[정규식] 태그 밖 본문 텍스트는 바꾸지 않는다`: 문단 안 `"online=true"`, `onclick=y`, `<pre><code>` 안 이스케이프된 `javascript:` 예시 | 출력이 입력과 같음 |
| 7 | `[정규식] 따옴표 속성값 안의 > 를 포함한 태그도 속성값은 보존하며 정리` | `<img title="a>b" onerror="alert(1)">` → `<img title="a>b">`, `<a title='x>y' href="javascript:alert(1)">x</a>` → `<a title='x>y' href="">x</a>` |
| 8 | `[정규식] 끝나지 않은 태그는 제거해 뒤에 이어 붙는 마크업을 속성으로 삼키지 않는다`: `<p>a</p><img src=x onerror=alert(1) ` | 출력 `'<p>a</p>'` |
| 9 | `[정규식] 제거가 새 태그를 만드는 입력은 반복 정리, 16회 안에 수렴하지 않으면 꺾쇠 이스케이프`: `<<object>script>` 형태를 3겹·20겹으로 중첩 | 3겹은 `findUnsafe()` 빈 배열이고 `&lt;` 없음(수렴), 20겹은 출력에 `<` 가 없고 `findUnsafe()` 빈 배열 |
| 10 | `[정규식] 블록 에디터 일반 출력은 변경 없음`: 데이터 주석, `nbe-pvb-text` div, 정렬 style, 링크, lazy 이미지, CTA 주석 | 출력이 입력과 같음 |

- **자동화:** 가능 ✅ | **테스트 수:** 10개 (실측)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)
- **한계:** 폴백 경로의 경계 판정 규칙이 대상이며 DOMPurify 경로는 TC-S-013 이 다룬다. 입력 크기에 따른 처리 시간은 단언하지 않는다(TC-P-002).

---

### TC-S-015: 새니타이저 purify 주입 계약과 경로 선택

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-purify.test.mjs` (76건 중 8건) |
| **대상** | `src/utils/html-sanitizer.ts` `createSanitizer()` 의 `purify` 분기(객체: 주입 인스턴스, `null`: 폴백 강제·경고 없음, 미지정: `tryLoadDomPurify()` 동적 로딩), `dompurifySanitize()` 옵션·`uponSanitizeElement` 훅 등록·해제, `warnWeakSanitizerOnce()` / `DOMPurifyLike`, `SanitizerConfig.purify` 타입 export(`src/utils/index.ts`, `src/index.ts`) |
| **우선순위** | High |
| **전제조건** | 스텁 인스턴스 `createStubPurify()`: `sanitize` 호출 인자와 호출 중 등록된 훅 수를 기록하고 `addHook`·`removeHook` 을 제공. 파일 전체의 `console.warn` 을 모듈 로드 시 가로챈다(경고는 프로세스당 1회이므로 ESM 경고 테스트는 파일 마지막에 배치). 6번은 `isomorphic-dompurify` 를 해석할 수 있을 때만 실행(2026-09-16 부터 기본 실행) |
| **테스트 데이터** | `<p>x</p>`, 빈 값, `allowedTags:['p','a']`·`allowedAttributes`, 훅에 전달하는 가짜 노드(비신뢰·vimeo iframe, `#comment`, `P`), `<p>a</p><foo-bar>b</foo-bar>` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `[정규식] purify: null 명시는 "미설치" 폴백 경고를 내지 않는다` | 이 시점까지(모든 호출이 `purify: null`) `isomorphic-dompurify` 경고 0건 |
| 2 | `[스텁] purify 인스턴스를 넘기면 그 인스턴스와 검증된 옵션을 쓴다` | 반환 `'[purified]<p>x</p>'`, `sanitize` 1회, `ADD_TAGS` `['iframe','#comment']`, `ADD_ATTR` `['allowfullscreen','frameborder','allow','target']`, `FORBID_TAGS` 10개(`script` ~ `style`), `FORCE_BODY:true`, 호출 중 훅 1개·호출 후 0개, 경고 없음 |
| 3 | `[스텁] 빈 입력은 DOMPurify 에 넘기지 않는다 (FORCE_BODY 주석 방지)` | `''`·`null`·`undefined` 그대로 반환, `sanitize` 호출 0회 |
| 4 | `[스텁] allowedTags·allowedAttributes 는 기존처럼 ALLOWED_TAGS·ALLOWED_ATTR 로 전달` | `ALLOWED_TAGS` `['p','a']`, `ALLOWED_ATTR`(정렬) `['class','href','target']` |
| 5 | `[스텁] 훅은 신뢰하지 않는 iframe 노드만 제거한다` | `remove()` 호출이 `['IFRAME:https://evil.example/x']` 뿐 (vimeo iframe, `#comment`, `P` 는 유지) |
| 6 | `[CJS·DOMPurify] purify 미지정은 동적 로딩, purify: null 은 정규식 경로 강제`: `dist/utils/index.cjs` 사용 | `createSanitizer()` 결과 `'<p>a</p>b'`(DOMPurify 가 알 수 없는 태그 제거), `createSanitizer({ purify:null })` 결과는 입력 그대로 |
| 7 | `[ESM] purify 미지정 시 동적 로딩 실패 → 기존처럼 폴백 경고 정확히 1회` | 앞선 `purify` 지정 호출의 경고 0건, 이후 새니타이저 2개로 3회 호출 시 경고 1건, `정규식 기반 폴백` 문구 포함 |
| 8 | `DOMPurifyLike 타입과 purify 설정이 공개 타입 선언에 포함된다` | `dist/utils/index.d.ts`, `dist/index.d.ts` 에 `DOMPurifyLike`, `dist/utils/index.d.ts` 에 `purify?: DOMPurifyLike \| null` |

- **자동화:** 가능 ✅ | **테스트 수:** 8개 (실측: 기본 실행 8건 통과. 2026-09-15 에는 기본 실행 7건 통과·1건(6번) 건너뜀)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)
- **한계:** 7번은 `isomorphic-dompurify` 가 설치된 기본 실행에서도 통과한다. ESM 산출물의 `require` 는 esbuild `__require` shim 이라 설치 여부와 무관하게 동적 로딩이 실패하기 때문이며, 코드 주석은 Next.js Turbopack 서버 번들도 같다고 서술한다(Turbopack 은 확인하지 않음). 따라서 ESM 호스트가 DOMPurify 를 쓰려면 `createSanitizer({ purify })` 를 `sanitizeContent` 로 주입해야 하지만, `createBlog({ sanitizeContent })` 가 서비스로 전달하는 경로(`src/index.ts` 109행)는 테스트하지 않는다. 2~5번 스텁은 DOMPurify 실제 동작이 아니라 옵션·훅 계약만 검증한다. 8번은 문자열 검색이며 타입 컴파일은 하지 않는다.

---

### TC-S-016: 상세 본문 URL 링크 변환 속성 주입 차단

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/detail-linkify.test.mjs` |
| **대상** | `src/components/public/linkify-html.ts` `linkifyHtml()` (내부 전용, 2.1.5 `d625f08` 에서 `BlogDetailPage.tsx` 내부 함수를 분리), `src/components/public/BlogDetailPage.tsx` 본문 렌더링(`dangerouslySetInnerHTML={{ __html: linkifyHtml(displayContent) }}`), `src/utils/html-scan.ts` `nextHtmlSegment()` |
| **우선순위** | High |
| **전제조건** | `linkifyHtml` 은 공개 엔트리가 아니므로 `dist/components/public/index.mjs` 의 `BlogDetailPage` 를 `renderToStaticMarkup` 으로 렌더링한다(`staticLinks:true`, 카테고리 `news`). 본문을 `<!--BEGIN-->`·`<!--END-->` 표식 주석으로 감싸 `div.blog-rich-content` 안의 본문만 추출하고, 판정은 `html-inspect.mjs` 로 한다 |
| **테스트 데이터** | 따옴표로 속성을 끊는 URL 텍스트, `&amp;` 가 포함된 URL, 속성값 안의 URL, 기존 링크·주석 안의 URL |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `href 의 큰따옴표를 이스케이프해 속성 주입을 막는다`: `<p>https://x.com/"onmouseover="alert(1)</p>` | `findUnsafe()` 빈 배열, 생성 링크 속성은 `['href','target','rel']`, `href` 디코딩값은 URL 원문, 마크업은 `href="https://x.com/&quot;onmouseover=&quot;alert(1)"`, 링크 텍스트는 원문 |
| 2 | `href 의 작은따옴표는 &#39; 로 이스케이프한다`: `https://x.com/'onmouseover='alert(1)` | 링크 속성 3개, 마크업 `href="https://x.com/&#39;onmouseover=&#39;alert(1)"`, 링크 텍스트는 원문 |
| 3 | `이미 인코딩된 &amp; 는 href·텍스트 모두 그대로 둔다`: `https://x.com/?a=1&amp;b=2` | `<a href="https://x.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">https://x.com/?a=1&amp;b=2</a>` |
| 4 | `따옴표 속성값 안의 > 뒤 URL 은 태그 안이므로 변환하지 않는다`: `<p title="a > https://x.com/x/onmouseover=alert(1)//">t</p>` | `findUnsafe()` 빈 배열, 출력이 입력과 같음 |
| 5 | `기존 링크 안과 주석 안의 URL 은 변환하지 않는다` | 출력이 입력과 같음 |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (실측)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79)
- **배경:** 2.1.3 의 `linkifyHtml` 은 URL 을 `href="${url}"` 에 그대로 넣고 태그를 `<[^>]+>` 로 판정해, 새니타이즈가 끝난 본문 텍스트나 속성값 안의 URL 이 렌더링 시점에 새 속성이 될 수 있었다(커밋 `d625f08` 메시지).
- **한계:** 본문 영역만 검사하며 CTA 추출 경로(`extractCtaFromContent`, `removeCtaFromContent`)와 `staticLinks:false` 렌더링은 단언하지 않는다. 본문 자체의 위험 요소 제거는 저장 전 새니타이즈(TC-S-013)에 의존한다.

### TC-S-017: 폴백 새니타이저 SVG 애니메이션·문서 수준 요소 제거

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-purify.test.mjs` (76건 중 16건: `defineSharedCases` 의 `[정규식]` 7건·`[DOMPurify]` 7건, `[정규식]` 전용 2건) |
| **대상** | `src/utils/html-sanitizer.ts` 폴백 경로의 `STRIP_TAG_ONLY`(2026-09-16 `bb7addc` 에서 `animate`, `animatemotion`, `animatetransform`, `animatecolor`, `set`, `meta`, `base`, `link` 추가), `fallbackSanitizePass()` 의 시작·종료 태그 제거 / `src/utils/html-scan.ts` `parseHtmlTag()` 의 태그 이름 경계 / DOMPurify 경로 `dompurifySanitize()`(옵션 변경 없음, 같은 입력 제거 확인) |
| **우선순위** | High |
| **전제조건** | TC-S-013 과 같음. 정규식 경로는 `purify: null`, DOMPurify 경로는 devDependencies 의 `isomorphic-dompurify`. 판정 헬퍼 `remainingTags(html, names)` 는 `html-inspect.mjs` `tokenize()` 의 raw text·CDATA 해석 4가지에서 대상 이름의 시작·종료 태그를 찾고, 원문 문자열에서도 `<` 또는 `</` 뒤 대상 이름과 공백·`/`·`>` 경계를 찾는다. 대상 이름은 정규식 경로가 8개 요소 전체(`ANIMATION_META_TAGS`), DOMPurify 경로가 `animate`·`set`·`meta`·`base`·`link` 5개(`DOMPURIFY_REMOVED_TAGS`)이다. `hrefTargetingAttributeNames()` 는 같은 4가지 해석에서 값이 `href`·`xlink:href`(대소문자·앞뒤 공백 무시)인 `attributeName` 속성을 찾는다 |
| **테스트 데이터** | cms-kit 과 같은 정규식 대체 새니타이저 공통 명세 입력 7종(`ANIMATION_META_INPUTS` 6종, `ANIMATION_META_WORDS_HTML`), 대소문자·닫는 태그 변형 입력, 이름이 겹치는 다른 태그 입력 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `[정규식]`·`[DOMPurify] 애니메이션·메타 요소 제거: svg a 안 animate 자체 닫는 태그`: `<svg><a href="#"><animate attributeName="href" to="javascript:alert(1)"/><text>x</text></a></svg>` | 경로별 대상 태그 잔존 없음, `javascript:` 없음, href 대상 `attributeName` 없음, `findUnsafe()` 빈 배열 |
| 2 | `... svg a 안 set 여는·닫는 태그`: `<svg><a><set attributeName="href" to="javascript:alert(1)"></set></a></svg>` | 1번과 같음 |
| 3 | `... 대문자 SVG·A·ANIMATE 와 무따옴표 속성`: `<SVG><A><ANIMATE ATTRIBUTENAME=href TO=javascript:alert(1)></ANIMATE></A></SVG>` | 1번과 같음 |
| 4 | `... meta refresh`: `<meta http-equiv="refresh" content="0;url=javascript:alert(1)">` | 1번과 같음 |
| 5 | `... base href`: `<base href="https://evil.example/">` | 1번과 같음 |
| 6 | `... link stylesheet`: `<link rel="stylesheet" href="https://evil.example/x.css">` | 1번과 같음 |
| 7 | `[정규식]`·`[DOMPurify] 애니메이션·메타 요소 이름이 들어간 본문 단어는 보존`: `<p>settings, link, base, meta, animate 라는 단어</p>` | 출력이 입력과 같음 |
| 8 | `[정규식] 애니메이션·메타 요소는 대소문자·자체 닫는 태그·닫는 태그 형태와 무관하게 제거`: `animateMotion`·`animateTransform`·`AnimateColor`·`SET` 자체 닫는 태그, `</set >`·`</META >`·`</Link>`·`</base>`, `Meta`·`LINK`·`BASE` 시작 태그 | 8개 대상 태그·`javascript:`·href 대상 `attributeName` 없음, 출력이 정확히 `<p>a</p><svg></svg><p>b</p>` |
| 9 | `[정규식] 애니메이션·메타 요소와 이름이 겹치는 다른 태그는 건드리지 않는다`: `<settings>`, `<linkbox>`, `<metadata>`, `<baseline>`, `<animated>`, `<setter/>`, `<set-x>`, `class="set link"` | 출력이 입력과 같음 |

- **자동화:** 가능 ✅ | **테스트 수:** 16개 (실측: 1~7번은 두 경로에서 각 1건씩 14건, 8·9번 2건)
- **관련 요구사항:** OWASP A03:2021 Injection (CWE-79), CWE-601 Open Redirect(`meta refresh`·`base`)
- **결함 이력:** 2.1.5 폴백 새니타이저는 `STRIP_TAG_ONLY` 에 이 8개 요소가 없어 1~6번 입력을 그대로 반환했다. 속성 정리 대상도 아니어서 `animate`·`set` 의 `to` 값, `meta` 의 `content` 값에 든 `javascript:` 가 남았다. 2026-09-16 `bb7addc` 에서 태그만 제거하는 목록에 추가했다. 수정 전 실행에서 정규식 경로 1~6번 6건과 8번 1건이 실패했고, 7·9번은 기존 동작 확인용이라 통과했다. DOMPurify 경로 7건은 수정 전에도 통과했다.
- **경로별 요구 사항 (2026-09-16 공통 명세 조정):** 정규식 경로는 8개 요소를 모두 제거해야 한다. dompurify 3.4.15 기본 SVG 허용 목록에는 `animatemotion`·`animatetransform`·`animatecolor` 가 들어 있어, DOMPurify 는 이 세 요소를 지우지 않고 href 를 가리키는 `attributeName`, `to`·`from`, `javascript:` 로 시작하는 `values` 같은 속성을 지워 무력화한다. 그래서 DOMPurify 경로의 요소 제거 단언은 `animate`·`set`·`meta`·`base`·`link` 로 한정하고, `javascript:` 와 href 대상 `attributeName` 이 남지 않는지는 두 경로 모두 단언한다. DOMPurify 설정은 바꾸지 않았다(`5dca0c8`).
- **한계:** DOMPurify 경로는 공통 명세 입력 1~7 만 확인하며, `animatemotion`·`animatetransform`·`animatecolor` 입력은 넣지 않는다. 2026-09-16 워크트리 밖 확인에서 DOMPurify 는 `<animateTransform attributeName="xlink:href" values="#;javascript:alert(1)">` 의 `attributeName` 만 지우고 `values` 는 남겼으며, `<animateColor attributeName=" HREF " by="javascript:alert(1)">` 는 `by` 를 지우고 `attributeName="HREF"` 를 남겼다. 두 경우 모두 href 를 바꾸는 속성 조합은 남지 않지만, 출력 문자열 기준 단언(`javascript:` 없음, 대소문자 무시 `attributeName`)은 통과하지 않는다. 내용이 있는 애니메이션 요소는 정규식 경로에서 태그만 제거되고 내용 텍스트는 남는다(8번 입력에는 내용이 없음).

---

## 6. Performance Tests (성능 테스트)

**목적:** 서버 측 연산 중 입력 크기나 대상 건수에 비례해 비용이 커지는 지점을 측정한다. 대부분의 조회는 DB 에 위임되므로 대상은 폴백 새니타이저와 건별 예약 갱신으로 한정한다.

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

### TC-P-002: 폴백 새니타이저 입력 크기별 처리 시간 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/sanitizer-perf.test.mjs` (신규) |
| **대상** | `src/utils/html-sanitizer.ts` `fallbackSanitize()` (변화가 없을 때까지 `fallbackSanitizePass()` 최대 16회 반복, raw text 종료 태그 검색 결과는 `createRawTextCloser()` 가 재사용) |
| **우선순위** | Low |
| **전제조건** | `createSanitizer({ purify: null })`, `performance.now()` 측정 |
| **테스트 데이터** | 정상 HTML 약 1MB, 닫히지 않은 `<iframe src="https://evil/">` 반복, 닫히지 않은 `<script>` 반복, `<img src="x" onerror="alert(1)">` 반복, 반복 정리 상한에 도달하는 `<<object>script>` 중첩 입력 |

| # | 단계 | 예상 결과 (2026-09-15 측정값, 3회 중앙값) |
|---|------|---------|
| 1 | 정상 HTML 약 1MB (문단·강조·링크 반복, 1,048,668자) | 19.3ms, 출력이 입력과 같음 |
| 2 | 닫히지 않은 iframe 5,000회 / 10,000회 / 20,000회 (140KB / 280KB / 560KB) | 1.5ms / 2.0ms / 3.6ms, 출력 0자 |
| 3 | 닫히지 않은 `<script>` 5,000회 / 10,000회 / 20,000회 | 각 0.1ms 미만, 출력 0자 |
| 4 | `<img src="x" onerror="alert(1)">` 5,000회 / 10,000회 / 20,000회 (160KB / 320KB / 640KB) | 3.9ms / 5.8ms / 10.1ms, 출력 65,000 / 130,000 / 260,000자 |
| 5 | `<<object>script>` 중첩 20겹 / 1,000겹 / 5,000겹 (16회 안에 수렴하지 않아 꺾쇠 이스케이프) | 0.1ms 미만 / 0.6ms / 0.9ms |
| 6 | 임계값 설정 | 호스트 요청 본문 크기 제한과 함께 결정 |

- **자동화:** 가능 ✅
- **근거:** 1~5번은 2026-09-15 `dist/utils/index.mjs` 대상 임시 스크립트(저장소에 추가하지 않음)로 측정했다.
- **이전 측정과의 차이:** 2026-09-13 에는 정규식 치환 구현(`regexSanitize()`)을 측정했으며, 2번이 70ms / 277ms / 1,098ms(입력 2배에 시간 약 4배)이고 출력이 입력과 같았다(iframe 미제거). 3번은 15ms / 61ms / 246ms 였다. 2.1.5 스캐너 구현에서는 2번이 입력 크기에 대략 비례하는 수준으로, 3번이 0.1ms 미만으로 줄었다. 1번은 입력 구성이 달라 이전 값(6.2ms)과 직접 비교하지 않는다.
- **비고:** 측정 환경은 Node.js v22.22.0, darwin 이며 측정 횟수가 적어 편차가 있다. 입력은 admin 인증 뒤에서만 도달하는 경로(`BlogService.create`·`update`)이다.

---

## 7. Accessibility Tests (접근성 테스트)

**목적:** 공개 API 로 export 되는 React 컴포넌트와 기본 테마의 WCAG 2.1 AA 준수를 검증한다.

**현재 상태:** 2.1.4 에서 정적 검사 2개 파일이 추가되었다. 제목 계층(TC-AC-004)은 `react-dom/server` 의 `renderToStaticMarkup` 으로 `dist` 컴포넌트를 렌더링해 마크업을 검사하고, 색 대비(TC-AC-005)는 테마 상수에 WCAG 대비 공식을 적용한다.

**선행 조건:** 정적 마크업으로 확인할 수 있는 단계(속성·요소 관계)는 현재 러너로 작성할 수 있다. 제출 오류 표시, 키보드 입력, 자동 접근성 검사 도구가 필요한 단계는 렌더링 테스트 인프라 도입이 선행 조건이다(TC-U-009 전제조건과 같음).

**실행 명령:** `npm test` (TC-AC-004·005). 상호작용 단계는 미정

---

### TC-AC-001: 공개 댓글 폼 레이블·오류 알림 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (신규) |
| **대상** | `src/components/public/CommentForm.tsx` |
| **우선순위** | Medium |
| **전제조건** | 1·2번은 `renderToStaticMarkup` 정적 렌더링으로 작성 가능. 3·4번은 선행 조건: 렌더링 테스트 인프라 도입 |
| **테스트 데이터** | `currentUserId` 미지정(게스트), 제출 실패 응답 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | 게스트 모드 렌더링 | `label[for="blog-comment-guest-name"]`, `label[for="blog-comment-guest-email"]`, `label[for="blog-comment-content"]` 가 같은 `id` 입력과 연결 |
| 2 | 허니팟 영역 확인 | 부모 요소 `aria-hidden="true"`, 입력 `tabIndex=-1`, `autoComplete="off"` |
| 3 | 제출 오류 발생 | `role="alert"` 문단에 오류 메시지 표시 |
| 4 | 자동 접근성 검사 도구 실행 | 위반 0건 (도구는 인프라 도입 시 선정) |

- **자동화:** 1·2번 가능 ✅, 3·4번은 인프라 도입 후
- **관련 요구사항:** WCAG 2.1 SC 1.3.1, 3.3.1, 4.1.3

---

### TC-AC-002: 관리자 토글 스위치 역할·상태·이름 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (신규) |
| **대상** | `src/components/ui/DefaultToggle.tsx`, `src/components/admin/BlogListView.tsx` 내부 `ToggleSwitch`, 정렬 헤더 |
| **우선순위** | Medium |
| **전제조건** | 1·3·4번과 2번의 요소 포함 관계는 `renderToStaticMarkup` 정적 렌더링으로 작성 가능. 2번의 접근 가능한 이름 계산은 선행 조건: 렌더링 테스트 인프라 도입 |
| **테스트 데이터** | `checked` true/false, 목록 항목 `published`·`featured` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `DefaultToggle checked` 렌더링 | `button[role="switch"][aria-checked="true"]` |
| 2 | `DefaultToggle label="공개"` 렌더링 | 버튼이 레이블 텍스트와 같은 `<label>` 요소 안에 있어 접근 가능한 이름이 "공개" 로 계산 |
| 3 | `BlogListView` 행 토글 렌더링 | `role="switch"`, `aria-checked` 가 `item.published` 를 반영, 이름은 `title` 속성으로만 제공되며 공개 토글은 상태에 따라 `adminPublishedLabel`/`adminUnpublishedLabel` 로 이름이 바뀜 |
| 4 | `BlogListView` 정렬 헤더 렌더링 | 현재 정렬 열만 `aria-sort="ascending"` 또는 `"descending"`, 나머지 열은 `"none"` |

- **자동화:** 정적 단계 가능 ✅, 이름 계산은 인프라 도입 후
- **관련 요구사항:** WCAG 2.1 SC 4.1.2
- **확인 필요:** 3번에서 이름이 상태에 따라 바뀌면 보조기기가 이름과 `aria-checked` 상태를 중복해서 읽을 수 있다.

---

### TC-AC-003: role="button" 요소 키보드 조작 🔲 계획

| 항목 | 내용 |
|------|------|
| **파일** | 미정 (신규) |
| **대상** | `src/components/admin/BlogDashboard.tsx` 통계 카드(`Card role="button" tabIndex={0}`)와 카테고리 행(`div role="button"`), `src/components/admin/BlogListPreview.tsx` 카드(`div role="button"`) |
| **우선순위** | Medium |
| **전제조건** | 선행 조건: 렌더링 테스트 인프라 도입 (키보드 이벤트가 필요해 정적 렌더링으로는 확인할 수 없음) |
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

### TC-AC-004: 공개 목록 페이지 제목 계층 (h1·h2)

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/list-page-hero-title.test.mjs` |
| **대상** | `src/components/public/BlogListPage.tsx` `heroTitle`(기본값 `"Blog"`)의 h1 렌더링(57~61행)과 목록 항목 제목 h2 / `src/components/public/styles.ts` `ps.heroTitle` / `src/components/public/types.ts` `BlogListPageProps.heroTitle` JSDoc (2.1.4 `e0abe17`) |
| **우선순위** | Medium |
| **전제조건** | `dist/components/public/index.mjs` 의 `BlogListPage` 를 `react-dom/server` `renderToStaticMarkup` 으로 렌더링. `categories` 에 `news` 1개, `basePath:'/news'`, `onCategoryChange` 미지정(카테고리 탭이 링크로 렌더링) |
| **테스트 데이터** | `heroTitle` `'소식'` / 생략 / `''`, 목록 항목 1건(`title:'첫 번째 글'`) |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `BlogListPage: heroTitle 을 h1 텍스트로 렌더링` (`heroTitle:'소식'`) | h1 텍스트 `'소식'` |
| 2 | `BlogListPage: heroTitle 생략 시 기본값 "Blog" 를 h1 으로 렌더링` | h1 텍스트 `'Blog'` |
| 3 | `BlogListPage: h1 에 호스트 덮어쓰기용 클래스 blog-public-list__title 설정` | h1 에 `class="blog-public-list__title"` |
| 4 | `BlogListPage: h1 은 루트의 첫 자식이며 카테고리 탭보다 앞` | 루트 `div.blog-public-list` 의 첫 자식 요소가 `h1`, h1 위치가 `href="/news?category=news"` 탭보다 앞 |
| 5 | `BlogListPage: heroTitle 이 빈 문자열이면 h1 미렌더링` | 출력에 `<h1` 없음 |
| 6 | `BlogListPage: 제목 수준을 건너뛰지 않음 (h1 다음 항목 제목은 h2)` (항목 1건) | 제목 수준 목록의 첫 값이 1이고 인접 증가폭이 1 이하, 항목 제목이 `h2` 이며 `font-size:16px`, `font-weight:600` 스타일 유지 |

- **자동화:** 가능 ✅ | **테스트 수:** 6개 (실측)
- **관련 요구사항:** WCAG 2.1 SC 1.3.1, 2.4.6
- **한계:** 출력 문자열을 정규식으로 검사하므로 h1 텍스트에 자식 요소가 있는 경우는 판정하지 않는다. 태그 클라우드, 페이지네이션 등 선택 props 를 지정한 조합의 제목 계층과 `onCategoryChange` 지정 시 탭 순서는 단언하지 않는다. 호스트 페이지 전체에서 h1 이 하나인지는 호스트 책임이다.

---

### TC-AC-005: 공개 기본 테마 텍스트 색 대비

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/public-theme-contrast.test.mjs` |
| **대상** | `src/themes/default-public.ts` `PUBLIC_THEME_DEFAULTS` 의 `text`(#1a1a1a), `text-muted`(#6b7280), `text-dim`(#6a7383, 2.1.4 `e6fd816` 에서 #9ca3af 에서 변경), `bg`(#ffffff), `bg-card`(#f9f9f9) |
| **우선순위** | Medium |
| **전제조건** | 없음. WCAG 2.x 상대 휘도·대비율 공식을 테스트 파일 안에 구현 |
| **테스트 데이터** | `dist/themes/index.mjs` 의 `PUBLIC_THEME_DEFAULTS`, 기준 색 `#000000`, `#ffffff`, `#777777`, `#767676` |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `contrast: WCAG 기준값 (흑백 21:1, 동일색 1:1)` | 흑백 `'21.00'`, 동일색 1, `#767676` 대 `#ffffff` `'4.54'` |
| 2 | `PUBLIC_THEME_DEFAULTS: text 색은 bg·bg-card 위에서 4.5:1 이상` | 두 배경 모두 4.5 이상 (실측 17.40, 16.53) |
| 3 | `PUBLIC_THEME_DEFAULTS: text-muted 색은 bg·bg-card 위에서 4.5:1 이상` | 두 배경 모두 4.5 이상 (실측 4.83, 4.59) |
| 4 | `PUBLIC_THEME_DEFAULTS: text-dim 색은 bg·bg-card 위에서 4.5:1 이상` | 두 배경 모두 4.5 이상 (실측 4.78, 4.54) |
| 5 | `PUBLIC_THEME_DEFAULTS: text-dim 은 text-muted 보다 어둡지 않음` | 상대 휘도 `text-dim`(0.1696) ≥ `text-muted`(0.1672) |

- **자동화:** 가능 ✅ | **테스트 수:** 5개 (실측)
- **근거:** 괄호 안 실측값은 2026-09-15 같은 공식으로 계산했다.
- **관련 요구사항:** WCAG 2.1 SC 1.4.3 Contrast (Minimum)
- **한계:** 공개 기본 테마의 세 텍스트 색과 두 배경만 검사한다. `ADMIN_THEME_DEFAULTS`, accent·border 등 다른 색 조합, 호스트가 덮어쓴 값, 실제 렌더링 요소의 배경은 검사하지 않는다.
- **비고:** `text-dim` 과 `text-muted` 의 대비는 1.01:1 로 화면에서 거의 구분되지 않는다(커밋 `e6fd816` 메시지에도 기록).

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

**실행 명령:** `npx tsc --noEmit --strict --skipLibCheck --esModuleInterop --target es2020 --module esnext --moduleResolution bundler --jsx react-jsx test/headless-mode.ts` (TC-SM-001, npm 스크립트 미연결), `npm test` (TC-SM-002)

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
| 1 | 파일 주석 명령 `npx tsc --noEmit --strict test/headless-mode.ts` | 실측(2026-09-15, 2026-09-16 동일): 오류 57건 (`node_modules/zod/v4/locales/index.d.cts` 52건, `src` 5건: `--jsx` 미설정 1건, 기본 target 으로 인한 `Set` 순회 3건과 정규식 플래그 1건). 2026-09-13 실측은 68건(`node_modules` 63건) |
| 2 | tsconfig 옵션을 지정한 위 실행 명령 | 실측(2026-09-15, 2026-09-16 동일): 오류 0건 |
| 3 | `createBlog` 반환값의 `services.*`, `routes.public.posts`, `routes.admin.posts` 를 공개 타입에 할당 | 컴파일 통과 |
| 4 | utils, errors, i18n, validators 함수 호출과 SEO 반환 타입 참조 | 컴파일 통과 |

- **자동화:** 부분 (npm 스크립트 미연결, 수동 명령) | **테스트 수:** 런타임 테스트 0건, 타입 검증 파일 1개
- **한계:** `src` 를 대상으로 검사하므로 배포 산출물 `dist/*.d.ts` 의 타입 정합성은 검증하지 않는다(선언 파일 존재·export 이름·상대 참조는 TC-SM-002 가 확인). 파일 주석의 명령은 수정이 필요하다.

---

### TC-SM-002: exports 서브패스 dist import·타입 선언 파일

| 항목 | 내용 |
|------|------|
| **파일** | `test/runtime/exports-smoke.test.mjs` |
| **대상** | `package.json` `exports` 14개 서브패스의 `import`·`require` 조건 `types`·`default` 경로, `tsup.config.ts` 의 `dts.entry`(2026-09-16 `0cf4b3b` 에서 `components/admin/editor/index` 추가) |
| **우선순위** | Medium |
| **전제조건** | `npm test` 가 선행하는 `npm run build`. editor 서브패스가 import 하는 선택적 peer `@tiptap/react`·`@tiptap/starter-kit`·`@tiptap/extension-link`·`@tiptap/pm` 은 devDependencies 로 설치된다. 서브패스는 패키지 이름 자기 참조(`@withwiz/blog-core/<서브패스>`)로 import·require 해 `exports` 해석을 그대로 거친다 |
| **테스트 데이터** | `package.json` `exports`·`peerDependenciesMeta` 객체, `dist/` 의 `.mjs`·`.cjs`·`.js` 산출물 |

| # | 단계 | 예상 결과 |
|---|------|---------|
| 1 | `exports 는 tsup 엔트리와 같은 14개 서브패스를 선언한다` | 키 14개, `./components/admin/editor` 포함 |
| 2 | `[<서브패스>] import·require 조건의 types·default 파일이 dist 에 존재한다` (14건) | 서브패스마다 `import.types`·`import.default`·`require.types`·`require.default` 가 선언되어 있고 누락된 dist 파일 0개 |
| 3 | `[<서브패스>] ESM import 와 CJS require 가 성공하고 export 이름이 같다` (14건) | ESM 네임스페이스와 CJS exports 의 이름 목록(`default`·`__esModule` 제외)이 같음. `./types` 는 타입 전용이라 두 목록이 모두 비어 있음 |
| 4 | `[<서브패스>] 선언 파일(.d.ts·.d.cts)이 런타임 export 이름을 모두 선언한다` (14건) | 두 선언 파일이 존재하고 `export` 를 포함하며, ESM 런타임 export 이름이 모두 단어로 등장하고, 상대 경로로 참조하는 청크 선언 파일(`.js`→`.d.ts`, `.cjs`→`.d.cts`)이 재귀적으로 모두 존재 |
| 5 | `@withwiz/block-editor 는 선택 peer 이고 dist 런타임 코드가 import 하지 않는다` | `peerDependenciesMeta["@withwiz/block-editor"].optional === true`, 선언 파일을 제외한 `dist/` 산출물에서 `from`·`import()`·`require()`·부수 효과 `import` 형태의 block-editor 참조 0개(주석과 설치 안내 문자열은 해당하지 않음) |

- **자동화:** 가능 ✅ | **테스트 수:** 44개 (실측: 1건 + 14개 서브패스 × 3건 + 선택 peer 1건)
- **결함 이력:** 2026-09-13·09-15 판에서는 결함 확인용 🔲 계획 TC 였다. 당시 `tsup.config.ts` 는 `@tiptap/*` 미설치를 이유로 editor dts 생성을 제외했고, `package.json` 은 `./dist/components/admin/editor/index.d.ts`·`index.d.cts` 를 선언했지만 산출물에는 `index.mjs`·`index.cjs` 만 있었다. `@tiptap/*` 미설치 환경이라 editor 서브패스의 ESM import 는 `ERR_MODULE_NOT_FOUND`(`@tiptap/react`), CJS require 는 `MODULE_NOT_FOUND` 였고 나머지 13개는 성공했다(2026-09-13 임시 스크립트, 2026-09-15 산출물 확인). `npm run typecheck` 도 `RichTextEditor.tsx` 의 `@tiptap/*` 모듈 해석 실패 3건과 암시적 `any` 1건으로 실패했다. 2026-09-16 `0cf4b3b` 에서 `@tiptap/*` 를 devDependencies 에 추가하고 editor dts 엔트리를 추가했다. 수정 전 실행에서 editor 서브패스 3건(선언 파일 2개 누락, `@tiptap/react` 해석 실패로 import·선언 대조 실패)이 실패했다. 선언 파일 상대 참조 검사는 2026-09-16 에 청크 선언 파일 하나를 임시로 옮겨 `components/admin`·`components/admin/editor` 2건이 실패하는 것을 확인했다. 2026-09-17 `faabcf9` 이전에는 코드가 block-editor 를 import 하지 않는데도 `peerDependenciesMeta` 가 `optional: false` 여서, block-editor 를 쓰지 않는 소비자도 설치해야 했다(README 두 종은 선택 의존으로 설명). 5단계는 선언을 `false` 로 되돌리거나 block-editor 를 import 하는 임시 산출물을 넣으면 실패함을 확인했다.
- **검증 보강:** 2026-09-16 에 워크트리 밖 소비자 TypeScript 파일에서 `@withwiz/blog-core/components/admin/editor` 의 `RichTextEditor`·`BlockEditorForm`·`createBlockPreset` 과 `RichTextEditorProps`·`BlockPresetConfig` 타입을 import 해 `--moduleResolution nodenext`(ESM `.ts`·CJS `.cts`)와 `bundler` 로 컴파일했고 모두 오류 0건이었다.
- **한계:** 선언 파일 대조는 문자열 수준이며 타입 컴파일은 하지 않는다. `@tiptap/*` 가 설치되지 않은 소비자 환경에서 editor 서브패스를 import 하면 여전히 모듈 해석에 실패한다(선택적 peer 설계와 같음). 공개 컴포넌트의 렌더링 동작은 TC-U-009 가 다룬다.

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
| **API** | 1개 | 8개 | 4 (1/3) | 4 (1/3) |
| **E2E** | 0개 | 0개 | 0 (미적용) | 0 |
| **Security** | 10개 | 128개 (주3) | 17 (14/3) | 17 (14/3) |
| **Performance** | 0개 | 0개 | 2 (0/2) | 2 (0/2) |
| **Accessibility** | 2개 | 11개 | 5 (2/3) | 5 (2/3) |
| **Load/Stress** | 1개 (주1) | 5개 | 3 (2/1) | 3 (2/1) |
| **Smoke** | 2개 (주2) | 44개 | 2 (2/0) | 2 (2/0) |
| **Chaos** | 0개 | 0개 | 3 (0/3) | 3 (0/3) |
| **합계** | **18개** (중복 제외, 주4) | **211개** (주3) | **55 (25/30)** | **55 (25/30)** |

- 주1: `concurrency-guards.test.mjs` 는 11건을 Integration 6건과 Load/Stress 5건으로 나누어 두 도메인에 모두 계산했다. 합계 파일 수는 중복을 제외한 값이다.
- 주2: Smoke 파일 2개는 `test/headless-mode.ts`(러너 대상이 아닌 타입 검증 파일, 테스트 0건)와 `exports-smoke.test.mjs`(44건)이다.
- 주3: 2026-09-17 기본 `npm test` 에서 211건이 모두 실행되어 통과했고 스킵은 0건이다. Security 128건 중 실제 DOMPurify 경로 29건(TC-S-013 21건, TC-S-015 1건, TC-S-017 7건)은 `isomorphic-dompurify` 를 해석할 수 없는 환경에서만 건너뛴다. 2026-09-15 에는 139건 중 21건을 건너뛰었다.
- 주4: 러너 대상 17개 파일과 `test/headless-mode.ts` 의 합이다. 테스트 헬퍼 `test/runtime/helpers/html-inspect.mjs` 는 `*.test.mjs` 가 아니어서 러너가 실행하지 않으므로 파일 수에서 제외했다.
- 커버리지 수치는 측정 도구가 설정되어 있지 않아 기록하지 않는다.
- 2026-09-13 대비 변화(2026-09-15 판): 파일 10개 → 16개, 테스트 54건 → 139건, SC·TC 49개(15/34) → 54개(22/32). 계획에서 완료로 바뀐 TC 는 TC-S-011, TC-S-013 이고, 새로 추가한 TC 는 TC-S-014, TC-S-015, TC-S-016, TC-AC-004, TC-AC-005 이다.
- 2026-09-15 대비 변화(2026-09-16·17 판): 파일 16개 → 18개, 테스트 139건 → 211건(기본 실행 통과 118건 → 211건), SC·TC 54개(22/32) → 55개(25/30). 계획에서 완료로 바뀐 TC 는 TC-A-004, TC-SM-002 이고, 새로 추가한 TC 는 TC-S-017 이다. 기존 TC 의 테스트 수는 TC-S-011 6건 → 8건, TC-S-013 45건 → 47건으로 늘었다.

### 테스트 파일 대조

`find test -type f` 결과 19개 파일 중 테스트 18개 파일을 모두 TC 에 매핑했으며, 누락 파일은 0개이다. 나머지 1개는 헬퍼(`helpers/html-inspect.mjs`)이다. 파일별 테스트 수 합계 211건은 2026-09-17 `npm test` 실측 결과(통과 211, 스킵 0)의 전체 건수와 일치한다. 파일별 건수는 빌드 후 파일마다 `node --test <파일>` 을 실행해 확인했다.

| 파일 | 실측 테스트 수 (기본 통과/스킵) | 매핑 TC (건수) |
|------|-------------|--------------|
| `test/runtime/auth-failclosed.test.mjs` | 6 (6/0) | TC-S-001 (3), TC-S-002 (3) |
| `test/runtime/blog-service-sanitize.test.mjs` | 5 (5/0) | TC-S-013 (5) |
| `test/runtime/blog-service-input-fields.test.mjs` | 4 (4/0) | TC-S-011 (4) |
| `test/runtime/comment-require-login.test.mjs` | 8 (8/0) | TC-A-004 (8) |
| `test/runtime/concurrency-guards.test.mjs` | 11 (11/0) | TC-I-001 (4), TC-I-002 (2), TC-L-001 (3), TC-L-002 (2) |
| `test/runtime/createblog-failfast.test.mjs` | 3 (3/0) | TC-S-004 (3) |
| `test/runtime/detail-linkify.test.mjs` | 5 (5/0) | TC-S-016 (5) |
| `test/runtime/exports-smoke.test.mjs` | 44 (44/0) | TC-SM-002 (44) |
| `test/runtime/ip-hash.test.mjs` | 5 (5/0) | TC-S-005 (5) |
| `test/runtime/ip-header-strategy.test.mjs` | 4 (4/0) | TC-S-006 (4) |
| `test/runtime/list-page-hero-title.test.mjs` | 6 (6/0) | TC-AC-004 (6) |
| `test/runtime/post-routes-validated.test.mjs` | 8 (8/0) | TC-S-011 (8) |
| `test/runtime/public-theme-contrast.test.mjs` | 5 (5/0) | TC-AC-005 (5) |
| `test/runtime/sanitizer-purify.test.mjs` | 76 (76/0) | TC-S-013 (42), TC-S-014 (10), TC-S-015 (8), TC-S-017 (16) |
| `test/runtime/sanitizer.test.mjs` | 12 (12/0) | TC-S-007 (6), TC-S-008 (6) |
| `test/runtime/scheduler-cron.test.mjs` | 4 (4/0) | TC-S-003 (4) |
| `test/runtime/theme.test.mjs` | 6 (6/0) | TC-U-001 (6) |
| `test/runtime/utils-basic.test.mjs` | 3 (3/0) | TC-U-002 (3) |
| `test/headless-mode.ts` | 0 (타입 검증) | TC-SM-001 |
| `test/runtime/helpers/html-inspect.mjs` | - (헬퍼) | TC-S-013, TC-S-014, TC-S-016, TC-S-017 이 판정에 사용 |
| **합계** | **211 (211/0)** | |

`sanitizer-purify.test.mjs` 76건 배분은 다음과 같다. 2026-09-16 에 추가한 테스트는 이름 뒤에 (2026-09-16) 으로 표시했다.

| 테스트 이름 (묶음) | 건수 | 기본 실행 | TC |
|------------|----|----|----|
| `[정규식] 우회 차단: <이름>` 15종, `비신뢰 iframe 제거 후 앞 콘텐츠는 유지`, `블록 에디터 데이터 주석 보존`, `abe-blocks·pme-data·rme-data 데이터 주석 보존`(2026-09-16), `class·style·target·신뢰 iframe 유지`, `빈 값은 그대로 반환`, `trustedIframeOrigins 옵션 유지` | 21 | 통과 | TC-S-013 |
| 위와 같은 이름의 `[DOMPurify]` 테스트 | 21 | 통과 | TC-S-013 |
| `[정규식] 애니메이션·메타 요소 제거: <이름>` 6종, `[정규식] 애니메이션·메타 요소 이름이 들어간 본문 단어는 보존` (2026-09-16) | 7 | 통과 | TC-S-017 |
| 위와 같은 이름의 `[DOMPurify]` 테스트 (2026-09-16) | 7 | 통과 | TC-S-017 |
| `[정규식]` 전용 테스트(연속·중첩 이벤트 속성 ~ 블록 에디터 일반 출력) | 10 | 통과 | TC-S-014 |
| `[정규식] 애니메이션·메타 요소는 대소문자·자체 닫는 태그·닫는 태그 형태와 무관하게 제거`, `[정규식] 애니메이션·메타 요소와 이름이 겹치는 다른 태그는 건드리지 않는다` (2026-09-16) | 2 | 통과 | TC-S-017 |
| `[정규식] purify: null 명시는 "미설치" 폴백 경고를 내지 않는다` | 1 | 통과 | TC-S-015 |
| `[스텁]` 테스트 | 4 | 통과 | TC-S-015 |
| `[CJS·DOMPurify] purify 미지정은 동적 로딩, purify: null 은 정규식 경로 강제` | 1 | 통과 | TC-S-015 |
| `[ESM] purify 미지정 시 동적 로딩 실패 → 기존처럼 폴백 경고 정확히 1회` | 1 | 통과 | TC-S-015 |
| `DOMPurifyLike 타입과 purify 설정이 공개 타입 선언에 포함된다` | 1 | 통과 | TC-S-015 |

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

사전 조사 문서(`WITHWIZ_PACKAGES_TEST_AUDIT.md`)의 판정표에서 blog-core 열을 옮기고, 이 문서 작성 시점의 근거를 추가했다. 근거는 2026-09-15(2.1.5) 기준으로 갱신했다.

| 도메인 | 판정 (사전 조사) | 근거 |
|--------|----------------|------|
| Unit | 적용(얕음) | 순수 유틸·테마 테스트 9건뿐이며, SEO·validators·i18n·storage·검색어 변환 등 순수 함수 테스트는 0건이다 |
| API | 부분 | 라우트 핸들러 팩토리가 공개 API 이다. 2026-09-16 에 댓글 공개 작성 라우트의 사용자 식별 연동 8건(TC-A-004)이 추가되었지만, 라우트를 실행하는 나머지 4개 파일은 인증·IP 처리·허용 필드 제한 목적이고 파싱·응답 헤더·오류 본문 계약은 검증하지 않는다 |
| Integration | 적용(공백 큼) | 서비스 5종 중 댓글 생성과 예약 발행 처리만 fake Prisma 로 로직 전반을 실행한다. BlogService 는 `create()`·`update()` 의 본문 저장값과 라우트 입력 전달만 보안 회귀 목적으로 부분 검증하고, tag·search 서비스는 0건이다 |
| E2E | 미적용 | DB·Next.js 런타임·인증을 호스트가 제공하는 라이브러리이므로 사용자 흐름 E2E 는 호스트 책임이다 |
| Security | 적용(강함) | 211건 중 128건이 fail-closed, HMAC 시크릿, IP 스푸핑, XSS(저장 전 새니타이즈·렌더링 시 링크 변환), 허용 필드 제한 검증이다. 2.1.5 에서 폴백 우회 입력과 DOMPurify 주입 경로가 추가되었고, 2026-09-16 부터 실제 DOMPurify 경로 29건도 기본 실행에서 실행된다. 같은 날 폴백 경로의 SVG 애니메이션·문서 수준 요소 제거(TC-S-017)와 `enableValidation:false` 허용 필드 제한(TC-S-011)이 추가되었다. SQL 식별자 검증, 관리자 라우트 전수 인증, 500 메시지 노출은 여전히 0건이다 |
| Accessibility | 적용, 정적 검사만 | 2.1.4 에서 정적 마크업(제목 계층)과 테마 색 대비 검사 11건이 추가되었다. 3개 엔트리로 컴포넌트 25개를 공개하지만 상호작용·자동 검사 도구에 필요한 jsdom 과 testing-library 는 devDependencies 에 없다(jsdom 29.1.1 은 2026-09-16 부터 `isomorphic-dompurify` 의 의존성으로만 설치된다) |
| Performance | 낮음 | 조회 대부분이 DB 에 위임되며, 측정할 지점은 폴백 새니타이저와 건별 예약 갱신 정도이다 |
| Load/Stress | 적용(사건이 입증) | 2026-09-13 결함 2건이 동시 요청에서만 드러났고, 회귀 테스트 5건이 그 순서를 재현한다 |
| Smoke | 적용 | `npm test` 가 빌드를 선행해 산출물 생성은 매번 확인된다. 2026-09-16 에 14개 서브패스의 import·require, 선언 파일 존재·export 이름·상대 참조 검사 43건과 block-editor 선택 peer 확인 1건(TC-SM-002)이 추가되었고, 이 과정에서 editor 서브패스 선언 파일 누락을 수정했다. headless 타입 검증(TC-SM-001)은 여전히 npm 스크립트에 연결되지 않았다 |
| Chaos | 낮음 | 외부 의존이 호스트가 주입하는 Prisma·StorageAdapter 뿐이며, 부분 실패 경로는 스토리지 정리, 보상 삭제, 예약 발행 중간 실패 3곳이다 |

---

## 우선순위 갭

| 순위 | 항목 | 대상 | 선행 조건 |
|------|------|------|----------|
| 1 | CRUD(`blog.service`)·태그·검색·SEO 서비스 레벨 테스트 부재 (BlogService 는 본문 저장값·라우트 입력 전달만 부분 검증) | SC-I-003, SC-I-004, SC-I-005, SC-I-006, SC-I-007, SC-U-003, SC-U-004, SC-U-005 | `concurrency-guards.test.mjs` 의 `matchWhere` 매처와 fake 델리게이트(`blog-service-sanitize`·`post-routes-validated` 의 Prisma data 기록 fake 포함)를 공용 헬퍼로 분리한다. SEO 와 검색어 변환은 순수 함수이므로 새 러너나 의존성이 필요 없다 |
| 2 | 컴포넌트 25개 렌더링·상호작용 테스트 부족 | SC-U-009, SC-AC-001, SC-AC-002, SC-AC-003 | 정적 마크업 단계는 현재 러너(`node:test` + `dist` + `renderToStaticMarkup`)로 바로 작성할 수 있다. 클릭·키보드·제출 오류·자동 접근성 검사 단계는 `@testing-library/react`·jsdom devDependencies 추가가 필요하다. editor 2개에 필요한 `@tiptap/*` 는 2026-09-16 부터 devDependencies 로 설치된다 |
| 3 | 설계 의도 확인이 필요한 라우트·서비스 동작 | SC-S-011 남은 한계 (`BlogService.create()`·`update()` 직접 호출 시 허용 필드 제한 없음), SC-S-012 (500 메시지 노출) | 의도 결정 후 예상 결과 확정. 서비스 제한은 blog-system 등 서비스를 직접 호출하는 호스트의 추가 필드 전달 여부 확인이 선행되어야 한다 |
| 4 | 라우트 계약과 admin 핸들러 전수 인증 | SC-A-001, SC-A-002, SC-A-003, SC-S-009, SC-S-010 | 없음 |
| 5 | 부분 실패와 한계 조건 | SC-C-001, SC-C-002, SC-C-003, SC-L-003 | SC-L-003 은 커밋 가시성을 제어하는 fake 헬퍼 필요 |
| 6 | headless 타입 검증 자동화 | TC-SM-001 명령 수정 | headless 검증 명령 수정과 npm 스크립트 연결(`package.json` 변경 필요) |
| 7 | 보조 유틸·나머지 서비스 기능·성능 기준 | SC-U-006, SC-U-007, SC-U-008, SC-I-008, SC-I-009, SC-I-010, SC-P-001, SC-P-002 | 없음 |

**해소된 갭 (2.1.4~2.1.5):** 2026-09-13 기준 3순위였던 새니타이저 우회 입력(닫는 태그 없는 iframe, 빈 새니타이즈 결과의 원본 저장)은 `5b3876e`·`c0ea2a9` 로 수정되고 TC-S-013·014 가 검증한다. 4순위 중 SC-S-011(원본 body 전달)은 `d22f6c6` 으로 검증 활성 상태에서 해소되었다. 공통 선행 조건이던 lockfile 불일치는 `3cb8973` 으로 해소되었다.

**해소된 갭 (2026-09-16, 브랜치 `fix/residual-defects`):** 2026-09-15 기준 3순위였던 DOMPurify 경로 건너뜀은 `b106c9f` 로 해소되었다. 4순위 중 SC-A-004(requireLogin 403 고정)는 `56f004a`, SC-S-011 의 `enableValidation:false` 원본 body 전달은 `c499691` 로 해소되었다. 7순위 중 SC-SM-002 는 `0cf4b3b` 로 editor 선언 파일 누락을 수정하며 자동화되었다. 이에 따라 순위를 다시 매겼다.

### 공통 선행 조건

- 도메인별 실행 스크립트(`test:unit`, `test:security` 등)가 없으므로 도메인 단위 실행이 필요하면 파일명 규칙이나 디렉터리 분리를 먼저 정해야 한다.
- 커버리지 목표를 설정하려면 측정 도구(`node --experimental-test-coverage` 등)와 임계값을 먼저 정해야 한다.

### 확인 필요 사항 목록

| # | 내용 | 관련 TC | 상태 (2026-09-16) |
|---|------|--------|------|
| 1 | 위험 마크업만으로 구성된 본문은 새니타이즈 결과가 빈 문자열이 되어 원본이 저장된다 | TC-S-013 | 해소: 2.1.5 `c0ea2a9` 에서 결과(`null` 은 빈 문자열)를 저장하도록 수정, TC-S-013 7~9번이 검증 |
| 2 | 닫는 태그가 없거나 self-closing 형태인 비신뢰 iframe 이 정규식 폴백에서 제거되지 않는다 | TC-S-013 | 해소: 2.1.5 `5b3876e` 에서 여는 태그를 제거하도록 수정, TC-S-013 1·2번이 검증 |
| 3 | `requireLogin:true` 이면 공개 댓글 작성 라우트가 항상 403 을 응답한다 | TC-A-004 | 해소: 라우트의 사용자 식별 누락 결함으로 판정. 2026-09-16 `56f004a` 에서 `publicAuthMiddleware`·`commentAuthMiddleware` 추가, TC-A-004 1~8번이 검증. 설정이 없으면 기존처럼 403 이고 `createBlog` 가 경고 1회 |
| 4 | 포스트 관리 라우트가 검증 결과 대신 원본 body 를 서비스로 전달해 스키마 외 필드(`authorId`, `id` 등)가 Prisma 로 전달된다 | TC-S-011 | 해소: 검증 활성 시 2.1.5 `d22f6c6`(TC-S-011 1·2·7번), 검증 비활성 시 2026-09-16 `c499691`(TC-S-011 4~6번). 남은 한계: `BlogService.create()`·`update()` 직접 호출 시 `...rest` 전개 (미결정) |
| 5 | `BlogError` 가 아닌 예외의 원본 메시지가 500 응답 본문에 포함된다 | TC-S-012 | 미결정 |
| 6 | 태그 클라우드가 정렬 없이 `take` 로 자른 뒤 메모리에서 정렬한다 | TC-I-006 | 미결정 |
| 7 | `featured.GET` 의 숫자가 아닌 `limit` 이 `NaN` 으로 서비스에 전달된다 | TC-A-001 | 미결정 |
| 8 | 스토리지 정리 실패 시 DB 삭제 후 500 을 응답한다 | TC-C-001 | 미결정 |
| 9 | `autoApprove:true` 에서 보상 삭제 실패 시 초과 댓글이 승인 상태로 남아 코드 주석 서술과 다르다 | TC-C-002 | 미결정 |
| 10 | 예약 발행 중간 실패 시 이미 전환된 글 목록이 응답되지 않는다 | TC-C-003 | 미결정 |
| 11 | `./components/admin/editor` 서브패스의 `types` 선언 파일이 산출물에 없다 | TC-SM-002 | 해소: 2026-09-16 `0cf4b3b` 에서 `@tiptap/*` devDependencies 와 editor dts 엔트리 추가, TC-SM-002 가 14개 서브패스를 검증 |
| 12 | `test/headless-mode.ts` 주석의 검증 명령이 실패한다 | TC-SM-001 | 미결정 (2026-09-16 오류 57건, 2026-09-15 와 같음) |
| 13 | `scheduler-cron.test.mjs` fake 반환값 형태가 실제 계약과 다르다 | TC-S-003 | 미결정 |
| 14 | RSS 는 빈 태그 이름을 제외하지 않아 빈 `<category>` 를 출력한다 | TC-U-004 | 미결정 |
| 15 | `CHANGELOG.md` 가 존재하지 않는 validators·i18n 테스트를 서술하고 2.1.x 항목이 없다 | 관련 문서 | 미결정 (2.1.4·2.1.5 항목과 2026-09-16 브랜치 변경 항목도 없음) |
| 16 | `isomorphic-dompurify` 가 devDependencies 에 없어 실제 DOMPurify 경로 21건이 기본 `npm test` 에서 건너뛰어진다 | TC-S-013, TC-S-015 | 해소: 2026-09-16 `b106c9f` 에서 3.19.0 을 devDependencies 에 추가, 기본 실행 스킵 0건 |
| 17 | `sanitizer.test.mjs` 의 테스트 이름("dompurify 미설치 → 정확히 1회 warn")과 달리 ESM 산출물은 설치 여부와 무관하게 폴백을 사용한다. ESM 호스트는 `createSanitizer({ purify })` 를 `sanitizeContent` 로 주입해야 DOMPurify 가 쓰이며, `createBlog` 경유 주입 경로는 테스트가 없다 | TC-S-007, TC-S-015 | 미결정 (2026-09-15 추가). 2026-09-16 에 devDependencies 설치 상태에서도 ESM 은 `Dynamic require` 실패로 폴백하고 CJS 는 DOMPurify 를 쓰는 것을 확인했다 |
| 18 | devDependency `isomorphic-dompurify` 가 호스트의 4.2.0 이 아니라 3.19.0 이다. 4.x 는 Node `^22.22.2` 를 요구해 `.npmrc` `engine-strict=true` 와 Node 22.22.0 에서 설치가 실패한다 | TC-S-013, TC-S-015, TC-S-017 | 미결정 (2026-09-16 추가). 개발 환경 Node 를 22.22.2 이상으로 올리면 4.x 로 맞출지 결정이 필요하다 |

---

## 리뷰 체크리스트

- [x] 10개 도메인 적용성 판정 포함 (E2E 는 미적용으로 명시)
- [x] 테스트 파일 18개를 모두 TC 에 매핑하고 누락 0개 확인 (헬퍼 1개 별도 표기)
- [x] 파일별 테스트 수 합계(211)가 2026-09-17 `npm test` 실측 결과(통과 211, 실패 0, 스킵 0)에 일치
- [x] 완료 TC 의 단계는 실제 테스트 이름과 단언에서 발췌
- [x] 계획 TC 의 단계는 소스 코드 동작에 근거하고, 주요 예상값은 `dist` 대상 임시 스크립트로 확인
- [x] 동시성 테스트 11건을 Integration(순차 동작 6건)과 Load/Stress(경쟁 조건 5건)로 분리
- [x] `sanitizer-purify.test.mjs` 76건을 TC-S-013(공통 케이스 42건), TC-S-014(폴백 전용 10건), TC-S-015(주입 계약 8건), TC-S-017(애니메이션·문서 수준 요소 16건)으로 분리
- [x] 결함을 "현재 동작" 으로 기록했던 TC(TC-S-011, TC-S-013)를 2.1.5 수정 후 동작으로 갱신하고 남은 한계 명시
- [x] 2026-09-16 에 해결한 결함 확인용 TC(TC-A-004, TC-SM-002)를 ✅ 완료로 전환하고, TC-S-011 특성 테스트 교체를 포함해 결함 당시 동작을 "결함 이력"에 기록
- [x] 실제 DOMPurify 경로를 기본 `npm test` 에서 실행 (`b106c9f`)
- [x] fake 서비스를 주입해 라우팅 계층만 검증하는 기존 테스트의 한계 명시 (TC-S-003, TC-S-006)
- [x] 컴포넌트 계획 SC 에 정적 렌더링 가능 단계와 렌더링 테스트 인프라 선행 조건을 구분해 명시
- [x] 보안 기준 명시 (OWASP, CWE, WCAG)
- [x] `package-lock.json` 동기화 (`3cb8973`, 2026-09-16 devDependencies 추가 후 새 `npm ci` 성공)
- [ ] 목표 커버리지 설정 (현재 미설정)
- [ ] 확인 필요 사항 미결정 12건 의사결정 (18건 중 해소 6건)
- [ ] 우선순위 갭 1·2·3 구현
