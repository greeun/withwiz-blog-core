# Product Spec: blog-core-v2

## 1. One-line pitch

`npm install blog-core-v2` 한 줄로 Next.js App Router 프로젝트에 포스트 CRUD, 태그, 댓글, 전문 검색, 예약 발행, SEO를 모두 갖춘 완결된 블로그를 즉시 추가할 수 있는 독립 패키지.

---

## 2. Target user & core job-to-be-done

**타겟 사용자**: Next.js App Router 기반 웹사이트를 운영하는 개발자 (withwiz 내부 프로젝트 및 외부 오픈소스 사용자 모두 포함)

**핵심 과업**: "내 Next.js 프로젝트에 블로그 기능이 필요한데, 직접 만들면 2-3주 걸린다. 패키지 하나 설치하고 Prisma 스키마 복사한 뒤 `createBlog()` 호출하면 서비스/라우트가 즉시 동작하여 블로그 운영을 바로 시작하고 싶다."

**사용 시나리오 요약**:
- 회사 홈페이지에 뉴스/공지 블로그 추가
- 포트폴리오 사이트에 블로그 섹션 추가
- 커뮤니티 사이트에 게시판 형태의 블로그 운영
- 기존 withwiz 프로젝트(dts-ballet 등)에서 blog-core v1 + blog-system 조합을 단일 패키지로 교체

---

## 3. Primary user flows (numbered, step-by-step)

### Flow 1: 최초 설치 및 블로그 가동

1. 개발자가 `npm install blog-core-v2`를 실행한다.
2. 패키지가 제공하는 Prisma 스키마 파일(`prisma/blog.prisma`)을 자신의 프로젝트 Prisma 스키마 디렉토리에 복사한다.
3. `npx prisma migrate dev`를 실행하여 블로그 관련 테이블을 생성한다.
4. 프로젝트 코드에서 `createBlog()` 팩토리 함수를 호출하며 설정 객체(Prisma 인스턴스, 카테고리, 경로 등)를 전달한다.
5. 반환된 `blog` 객체에서 `blog.services` (BlogService, TagService 등)와 `blog.routes` (API 라우트 핸들러 맵)를 꺼낸다.
6. Next.js App Router의 `route.ts` 파일에서 `blog.routes.public.posts.list.GET`처럼 라우트 핸들러를 연결한다.
7. 블로그가 즉시 동작한다 -- 글 작성, 목록 조회, 상세 조회가 API를 통해 가능하다.

### Flow 2: 기본 UI로 관리자 블로그 운영

1. 개발자가 패키지의 기본 관리 UI 컴포넌트를 import하여 자신의 관리자 페이지에 배치한다.
2. 관리자가 관리 UI에 접속하면 블로그 글 목록이 표시된다 (페이지네이션, 검색, 카테고리 필터, 정렬).
3. "새 글 추가" 버튼을 클릭하면 편집 폼이 열린다.
4. 편집 폼에서 제목 입력 시 slug가 자동 생성되고, 디바운스로 중복 여부가 실시간 체크된다.
5. 카테고리를 선택하고, 기본 에디터(textarea/rich-text)로 본문을 작성한다.
6. 대표 이미지를 드래그&드롭 또는 파일 선택으로 업로드한다.
7. 첨부파일을 추가한다 (최대 개수 제한 적용).
8. 요약(excerpt)을 입력한다 (선택).
9. "공개" 토글을 켜고 저장하면 글이 즉시 공개된다. 또는 발행 예정일시를 미래로 설정하면 예약 발행 상태가 된다.
10. 목록에서 여러 글을 체크박스로 선택하여 일괄 공개/비공개/추천/삭제할 수 있다.

### Flow 3: 확장 UI (Block Editor) 사용

1. 개발자가 `@withwiz/block-editor`를 별도로 설치한다 (선택적 peer dependency).
2. 패키지의 확장 에디터 컴포넌트를 import한다.
3. 관리자가 편집 폼에서 Block Editor를 사용한다 -- 텍스트, 이미지, 인용, 구분선, 코드 등의 블록을 자유롭게 배치한다.
4. 카테고리별로 허용되는 블록 타입이 다르게 설정될 수 있다 (개발자가 프리셋으로 정의).
5. CTA 버튼 블록을 추가할 수 있다 (메시지, 버튼 텍스트, URL).
6. 저장 시 블록 데이터가 직렬화되어 저장된다 (기존 block-editor 포맷 유지).

### Flow 4: 공개 페이지에서 블로그 소비

1. 방문자가 블로그 목록 페이지에 접속한다.
2. 카테고리 탭으로 필터링하거나, 태그를 클릭하여 관련 글만 볼 수 있다.
3. 글 제목을 클릭하면 상세 페이지로 이동한다.
4. 상세 페이지에서 대표 이미지, 본문, 첨부파일 다운로드 링크, 태그 목록을 볼 수 있다.
5. 하단에 이전/다음 글 네비게이션이 표시된다.
6. 댓글이 활성화된 경우, 댓글 목록과 작성 폼이 표시된다.

### Flow 5: 댓글 작성 및 모더레이션

1. 방문자가 상세 페이지 하단의 댓글 폼에 이름, (선택)이메일, 내용을 입력하고 제출한다.
2. 허니팟 필드가 채워져 있으면 자동으로 SPAM 처리된다 (방문자에게는 성공으로 표시).
3. 레이트 리밋 초과 시 에러 메시지가 표시된다 ("너무 많은 댓글을 작성하셨습니다").
4. 정상 제출된 댓글은 설정에 따라 PENDING(관리자 승인 대기) 또는 APPROVED(즉시 표시) 상태로 저장된다.
5. 기존 댓글에 "답글" 버튼을 클릭하면 대댓글 폼이 열린다 (최대 깊이 제한 적용).
6. 관리자 모더레이션 패널에서 PENDING 댓글을 승인/거부/스팸 처리하거나 일괄 작업할 수 있다.

### Flow 6: 태그 관리

1. 관리자가 태그 관리 페이지에서 태그를 생성한다 (이름, slug, 설명).
2. 글 편집 폼에서 태그 피커를 사용하여 기존 태그를 검색하거나 새 태그를 즉석 생성한다.
3. 공개 페이지에서 태그 클라우드를 표시한다 (사용 빈도에 비례한 크기).
4. 태그를 클릭하면 해당 태그가 붙은 글 목록으로 이동한다.

### Flow 7: 검색

1. 방문자 또는 관리자가 검색어를 입력한다.
2. PostgreSQL Full-Text Search가 실행되어 제목과 본문에서 매칭되는 글을 관련도(rank) 순으로 반환한다.
3. 검색 결과에 하이라이팅된 요약(headline)이 표시된다.
4. 카테고리 필터와 함께 사용할 수 있다.

### Flow 8: 예약 발행

1. 관리자가 글 편집 시 발행일시를 미래 날짜/시간으로 설정하고 저장한다.
2. 글은 `published=false` 상태로 저장되며, 목록에 "예약 발행" 표시가 된다.
3. 외부 스케줄러(Vercel Cron 등)가 주기적으로 스케줄러 API 엔드포인트를 호출한다.
4. 현재 시각이 발행일시를 지난 예약 글이 자동으로 `published=true`로 전환된다.
5. 관리자는 예약 발행 목록을 조회하거나, 특정 글의 예약을 취소할 수 있다.

### Flow 9: SEO 메타데이터 적용

1. 개발자가 패키지의 SEO 유틸리티를 사용하여 Next.js `generateMetadata`에서 각 페이지의 메타 태그를 생성한다.
2. 상세 페이지에 JSON-LD (BlogPosting + BreadcrumbList) 구조화 데이터가 삽입된다.
3. RSS 피드 엔드포인트(`/feed.xml`)가 제공된다.
4. 사이트맵 생성 유틸리티로 모든 공개 글의 URL을 포함한 sitemap.xml을 생성할 수 있다.
5. OG 이미지 데이터 준비 유틸리티로 소셜 미디어 공유 시 최적화된 미리보기를 생성할 수 있다.

### Flow 10: 커스텀 UI 사용 (Headless 모드)

1. 개발자가 패키지의 기본 UI를 사용하지 않고, `blog.services`와 `blog.routes`만 사용한다.
2. 자체 디자인 시스템에 맞는 컴포넌트를 직접 구현한다.
3. 서비스 메서드를 직접 호출하거나, 생성된 API 라우트 핸들러에 HTTP 요청을 보내 데이터를 주고받는다.
4. 패키지가 제공하는 타입 정의, Zod 스키마, i18n 문자열을 재사용한다.

### Flow 11: 대시보드 확인

1. 관리자가 대시보드 페이지에 접속한다.
2. 전체 글 수, 공개/비공개 글 수, 추천 글 수, 카테고리별 글 수를 확인한다.
3. 최근 작성된 글 목록이 표시된다.

---

## 4. Feature list

### F1: 포스트 CRUD
- **설명**: 블로그 글의 생성, 조회(목록/상세), 수정, 삭제. slug 자동 생성 및 중복 시 suffix 부여. 카테고리(문자열 기반, enum 미사용)별 분류. 추천(featured) 플래그. 일괄 공개/비공개/추천/삭제.
- **사용자 가치**: 관리자가 별도 개발 없이 글을 관리할 수 있다.
- **토글 가능**: N (핵심 기능)

### F2: 태그 시스템
- **설명**: 태그 CRUD (이름, slug, 설명). N:M 관계로 글에 여러 태그 연결. 태그 클라우드 (게시글 수 기반). 태그별 글 필터링. 글 편집 시 태그 피커 (검색, 즉석 생성).
- **사용자 가치**: 방문자가 관심 주제별로 글을 탐색할 수 있다.
- **토글 가능**: Y (`features.tags`)

### F3: 댓글 시스템
- **설명**: 댓글/대댓글 (트리 구조, 최대 깊이 설정 가능). 게스트 및 로그인 사용자 모두 지원 (설정 가능). 모더레이션 4단계 상태 (PENDING, APPROVED, REJECTED, SPAM). 관리자 모더레이션 패널. 허니팟 스팸 방지. IP 해시 기반 레이트 리밋. 커스텀 스팸 필터 콜백.
- **사용자 가치**: 방문자가 글에 피드백을 남기고, 관리자가 스팸을 제어할 수 있다.
- **토글 가능**: Y (`features.comments`)

### F4: 전문 검색 (Full-Text Search)
- **설명**: PostgreSQL tsvector/to_tsquery 기반 전문 검색. 제목 + 본문 대상. 관련도 순 정렬(ts_rank). 검색어 하이라이팅(ts_headline). 카테고리 필터 결합 가능.
- **사용자 가치**: 방문자가 키워드로 원하는 글을 빠르게 찾을 수 있다.
- **토글 가능**: Y (`features.search`)

### F5: 예약 발행
- **설명**: 미래 발행일시 설정 시 비공개 저장. 외부 스케줄러(Vercel Cron 등)가 호출하는 API 엔드포인트 제공. 발행 시각 도래 시 자동 공개 전환. 예약 목록 조회 및 취소.
- **사용자 가치**: 관리자가 콘텐츠를 미리 준비하고 원하는 시점에 자동 공개할 수 있다.
- **토글 가능**: Y (`features.scheduler`)

### F6: SEO 유틸리티
- **설명**: Next.js `generateMetadata` 호환 메타데이터 생성 (글 상세, 목록 페이지). JSON-LD 구조화 데이터 (BlogPosting, BreadcrumbList). RSS 피드 (RSS 2.0 XML). 사이트맵 생성. OG 이미지 데이터 준비.
- **사용자 가치**: 검색 엔진 최적화로 블로그 노출이 극대화된다.
- **토글 가능**: N (유틸리티로 항상 사용 가능, 사용 여부는 개발자가 결정)

### F7: i18n (다국어 지원)
- **설명**: 150+ 키의 UI 문자열 인터페이스. 한국어 기본값 세트 내장. 호스트가 원하는 키만 오버라이드 가능. 관리자 UI, 공개 UI, 댓글, 태그 피커, 모더레이션, 에러 메시지 등 전 영역 커버.
- **사용자 가치**: 한국어 외 다른 언어로 블로그를 운영할 수 있다.
- **토글 가능**: N (항상 내장, 오버라이드 가능)

### F8: 스토리지 어댑터
- **설명**: 파일 업로드/삭제를 위한 StorageAdapter 인터페이스 정의. S3 호환 기본 어댑터 내장 (R2, S3, MinIO 등). 업로드 시 키 추적, 삭제 시 연관 파일 정리 (커버 이미지, 본문 내 이미지, 첨부파일). 어댑터 미제공 시 스토리지 정리 건너뜀.
- **사용자 가치**: 파일 관리를 신경 쓰지 않아도 고아 파일이 자동 정리된다.
- **토글 가능**: N (인터페이스 항상 존재, 어댑터 주입은 선택)

### F9: 기본 관리 UI
- **설명**: 패키지에 동봉되는 기본 관리 UI 컴포넌트 세트. 글 목록 (페이지네이션, 검색, 카테고리 필터, 정렬, 체크박스 선택, 일괄 작업 toolbar). 글 편집 폼 (slug 자동 생성 + 중복 체크, 카테고리 선택, 기본 에디터(textarea/rich-text), 대표 이미지 드롭존, 첨부파일 관리, 요약, 공개 토글, 발행일시 선택, CTA 버튼 편집). 미리보기 (상세 미리보기, 목록 미리보기). 태그 피커. 댓글 모더레이션 패널. 대시보드.
- **사용자 가치**: UI를 직접 만들지 않아도 즉시 블로그를 관리할 수 있다.
- **토글 가능**: N (사용 여부는 개발자의 import 선택)

### F10: 확장 UI (Block Editor 통합)
- **설명**: `@withwiz/block-editor`를 선택적 peer dependency로 통합. Block Editor 기반 편집 폼 컴포넌트. 카테고리별 블록 프리셋 설정 (허용 블록 타입, 샘플 콘텐츠). CTA 블록 직렬화. 기존 block-editor 저장 포맷 하위 호환.
- **사용자 가치**: 리치 콘텐츠(이미지, 인용, 코드 등)를 시각적으로 편집할 수 있다.
- **토글 가능**: Y (peer dependency 설치 여부에 따라 자동 감지 또는 명시적 설정)

### F11: 공개 UI 컴포넌트
- **설명**: 패키지에 동봉되는 공개 페이지 UI 컴포넌트 세트. 글 목록 페이지 (카테고리 탭, 태그 필터, 페이지네이션). 글 상세 페이지 (대표 이미지, 본문 렌더링, 첨부파일 목록, 태그 배지, 이전/다음 네비게이션). 댓글 목록 (트리 구조 렌더링). 댓글 작성 폼. 태그 클라우드. 태그 배지.
- **사용자 가치**: 공개 페이지도 직접 만들지 않아도 즉시 사용할 수 있다.
- **토글 가능**: N (사용 여부는 개발자의 import 선택)

### F12: 카테고리 테마
- **설명**: 카테고리별 색상 테마 (main, heroColor, bgTint, bgQuote, border, divider). CSS 변수 기반으로 호스트가 자유롭게 오버라이드 가능. 기본 테마 세트 내장.
- **사용자 가치**: 카테고리별로 시각적 구분이 되어 사용자 경험이 향상된다.
- **토글 가능**: N (설정만 하면 자동 적용)

### F13: Zod 기반 유효성 검사
- **설명**: 글 생성/수정, 태그 생성/수정, 댓글 생성, 상태 변경 등 모든 입력에 대한 Zod 스키마. 팩토리 함수로 i18n 에러 메시지 주입 가능. 호스트가 커스텀 스키마로 확장/교체 가능.
- **사용자 가치**: 잘못된 입력이 사전에 걸러져 데이터 무결성이 보장된다.
- **토글 가능**: N (항상 내장)

### F14: 도메인 에러 코드
- **설명**: 코드 기반 에러 체계 (COMMENT_HONEYPOT_TRIGGERED, TAG_DUPLICATE_SLUG 등). 에러 코드 상수 객체 + BlogError 클래스. UI 계층에서 에러 코드를 i18n 키로 사용하여 사용자 메시지 매핑.
- **사용자 가치**: 에러 메시지를 다국어로 일관되게 표시할 수 있다.
- **토글 가능**: N (항상 내장)

### F15: API 라우트 핸들러 팩토리
- **설명**: Next.js App Router 호환 라우트 핸들러를 구조화된 객체로 반환. Public 라우트 (목록, 상세, 추천, 검색, 태그 클라우드, 댓글 목록). Admin 라우트 (CRUD, 일괄 작업, slug 중복 체크, 대시보드, 태그 관리, 댓글 모더레이션, 스케줄러). 미들웨어(인증, 권한)가 이미 래핑된 상태로 반환.
- **사용자 가치**: 개발자가 `route.ts`에서 `export const GET = blog.routes.public.posts.list.GET`처럼 한 줄로 연결할 수 있다.
- **토글 가능**: N (핵심 기능)

### F16: 대표 이미지/첨부파일 관리
- **설명**: 대표 이미지 드래그&드롭 업로드. 첨부파일 관리 (추가/삭제, 최대 개수 제한, 파일 크기 표시, 파일 타입 아이콘). 업로드 진행 상태 표시.
- **사용자 가치**: 관리자가 편리하게 미디어를 관리할 수 있다.
- **토글 가능**: Y (첨부파일은 `enableAttachments`로 토글, 대표 이미지는 항상 지원)

### F17: CTA 버튼
- **설명**: 글 하단에 표시되는 Call-to-Action 버튼. 메시지, 버튼 텍스트, URL을 설정할 수 있다. 활성/비활성 토글.
- **사용자 가치**: 글을 읽은 방문자를 특정 행동(신청, 구매 등)으로 유도할 수 있다.
- **토글 가능**: Y (`enableCta`)

### F18: 조회수 통합
- **설명**: `onViewCount` 콜백 인터페이스. 호스트가 자체 조회수 시스템을 연결하면 목록에 조회수가 표시된다. 패키지 자체에 조회수 저장 로직은 포함하지 않고 인터페이스만 제공.
- **사용자 가치**: 조회수 기반 인기 글 파악이 가능하다.
- **토글 가능**: N (콜백 미제공 시 자동 비활성)

---

## 5. Data model (entities, fields, relationships -- conceptual, not schema)

### BlogPost (블로그 글)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | 문자열 (cuid) | 고유 식별자 |
| slug | 문자열 (unique) | URL용 고유 주소 |
| category | 문자열 | 카테고리 (enum 아닌 문자열, 호스트가 자유 정의) |
| title | 문자열 | 제목 |
| content | 장문 텍스트 | 본문 (HTML 또는 Block Editor JSON 직렬화) |
| excerpt | 문자열 (nullable) | 요약/부제 |
| coverImageUrl | 문자열 (nullable) | 대표 이미지 공개 URL |
| coverImageKey | 문자열 (nullable) | 대표 이미지 스토리지 키 (삭제용) |
| attachments | JSON 배열 | 첨부파일 목록 [{name, url, key, size, type}] |
| featured | 불리언 | 추천/홈 표시 여부 |
| published | 불리언 | 공개 여부 |
| publishedAt | 날짜시간 (nullable) | 발행 시각 (예약 발행 시 미래 값) |
| authorId | 문자열 | 작성자 ID (호스트의 User 모델 참조) |
| createdAt | 날짜시간 | 생성 시각 |
| updatedAt | 날짜시간 | 마지막 수정 시각 |

**관계**: BlogPost 1:N Comment, BlogPost N:M Tag (PostTag 중계)

### Tag (태그)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | 문자열 (cuid) | 고유 식별자 |
| slug | 문자열 (unique) | URL용 slug |
| name | 문자열 | 표시명 |
| description | 문자열 (nullable) | 설명 |
| createdAt | 날짜시간 | 생성 시각 |
| updatedAt | 날짜시간 | 수정 시각 |

**관계**: Tag N:M BlogPost (PostTag 중계)

### PostTag (N:M 중계)
| 필드 | 타입 | 설명 |
|------|------|------|
| postId | 문자열 | 블로그 글 ID (FK) |
| tagId | 문자열 | 태그 ID (FK) |
| assignedAt | 날짜시간 | 연결 시각 |

**복합 PK**: (postId, tagId)

### Comment (댓글)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | 문자열 (cuid) | 고유 식별자 |
| postId | 문자열 | 대상 글 ID (FK) |
| parentId | 문자열 (nullable) | 부모 댓글 ID (대댓글 시) |
| authorId | 문자열 (nullable) | 로그인 사용자 ID |
| guestName | 문자열 (nullable) | 게스트 이름 |
| guestEmail | 문자열 (nullable) | 게스트 이메일 |
| content | 장문 텍스트 | 댓글 본문 |
| status | 열거 (PENDING/APPROVED/REJECTED/SPAM) | 모더레이션 상태 |
| ipHash | 문자열 (nullable) | 작성자 IP 해시 (레이트 리밋용) |
| createdAt | 날짜시간 | 생성 시각 |
| updatedAt | 날짜시간 | 수정 시각 |

**관계**: Comment N:1 BlogPost, Comment (self-reference) 1:N replies

### Attachment (값 객체, 별도 테이블 없음)
BlogPost.attachments JSON 배열의 각 항목:
| 필드 | 타입 | 설명 |
|------|------|------|
| name | 문자열 | 원본 파일명 |
| url | 문자열 | 공개 URL |
| key | 문자열 | 스토리지 키 |
| size | 숫자 | 파일 크기 (바이트) |
| type | 문자열 | MIME 타입 |

### CategoryTheme (설정 객체, DB 저장 아님)
| 필드 | 타입 | 설명 |
|------|------|------|
| key | 문자열 | CSS 클래스 접미사 |
| main | 문자열 | 주요 색상 (hex) |
| heroColor | 문자열 | 히어로 영역 색상 |
| bgTint | 문자열 | 배경 틴트 |
| bgQuote | 문자열 | 인용 배경 |
| border | 문자열 | 테두리 색상 |
| divider | 문자열 | 구분선 색상 |
| label | 문자열 | 카테고리 표시명 |

### DashboardStats (응답 객체, DB 저장 아님)
| 필드 | 타입 | 설명 |
|------|------|------|
| total | 숫자 | 전체 글 수 |
| published | 숫자 | 공개 글 수 |
| unpublished | 숫자 | 비공개 글 수 |
| featured | 숫자 | 추천 글 수 |
| byCategory | Record<string, number> | 카테고리별 글 수 |
| recentPosts | BlogListItem[] | 최근 글 목록 |

---

## 6. Screens / surfaces

### S1: 관리자 -- 글 목록 화면
- **표시 항목**: 글 제목, 카테고리 라벨, 공개/비공개 상태 배지, 추천 배지, 첨부파일 아이콘, 발행일/등록일/수정일, 조회수(있을 경우)
- **가능한 행동**:
  - 카테고리 드롭다운 필터 (전체 + 각 카테고리)
  - 텍스트 검색 (제목 기준)
  - 정렬 변경 (등록일순, 발행일순, 수정일순)
  - 페이지네이션 이동
  - "새 글 추가" 버튼 클릭 -> 편집 폼 진입
  - 글 클릭 -> 편집 폼 진입
  - 체크박스로 여러 글 선택 -> 일괄 작업 toolbar 표시 (일괄 공개, 일괄 비공개, 일괄 추천, 일괄 추천 해제, 일괄 삭제, 선택 해제)
  - 전체 선택/해제

### S2: 관리자 -- 글 편집 폼 (기본 UI)
- **표시 항목 / 입력 필드**:
  - 제목 입력 (필수)
  - Slug 표시 (자동 생성, 수동 편집 가능, 실시간 중복 체크 상태 표시: idle/checking/available/duplicate/invalid)
  - 카테고리 선택 드롭다운 (필수)
  - 본문 에디터 -- 기본: textarea 또는 간단한 rich-text
  - 요약(excerpt) 입력 (선택)
  - 대표 이미지 -- 드래그&드롭 존 + 파일 선택 버튼, 미리보기, 삭제 버튼
  - 첨부파일 -- 파일 추가 버튼, 파일 목록 (이름, 크기, 타입 아이콘, 삭제 버튼), 최대 개수 표시
  - CTA 버튼 설정 (토글, 메시지, 버튼 텍스트, URL) -- enableCta=true일 때만 표시
  - 공개 토글 스위치
  - 추천 토글 스위치
  - 발행일시 선택 (datetime picker)
  - 태그 피커 (검색, 선택, 새 태그 생성) -- tags 기능 활성화 시만 표시
- **가능한 행동**:
  - 저장 (생성 또는 수정)
  - 취소 (목록으로 돌아가기)
  - 탭 전환 (편집 / 상세 미리보기 / 목록 미리보기)

### S3: 관리자 -- 글 편집 폼 (확장 UI, Block Editor)
- S2와 동일하되, 본문 에디터 영역이 Block Editor로 교체됨
- **추가 표시 항목**:
  - Block Editor 도구 모음 (블록 추가/삭제/이동)
  - 카테고리별 허용 블록 타입 제한 (프리셋 기반)
  - 샘플 콘텐츠 로드 버튼

### S4: 관리자 -- 태그 관리 화면
- **표시 항목**: 태그 이름, slug, 설명, 연결된 글 수
- **가능한 행동**:
  - 태그 생성 (이름, slug, 설명 입력)
  - 태그 수정
  - 태그 삭제
  - 태그 목록 조회 (페이지네이션)

### S5: 관리자 -- 댓글 모더레이션 화면
- **표시 항목**: 댓글 내용, 작성자(회원명 또는 게스트명), 대상 글 제목, 상태 배지, 작성일
- **가능한 행동**:
  - 상태 탭 필터 (전체, PENDING, APPROVED, REJECTED, SPAM)
  - 개별 댓글 상태 변경 (승인, 거부, 스팸 처리)
  - 개별 댓글 삭제
  - 체크박스 선택 -> 일괄 승인/거부/스팸/삭제

### S6: 관리자 -- 대시보드 화면
- **표시 항목**: 전체 글 수, 공개 글 수, 비공개 글 수, 추천 글 수, 카테고리별 글 수, 최근 글 목록 (5건)
- **가능한 행동**: 숫자/목록 클릭 시 해당 필터의 글 목록으로 이동

### S7: 공개 -- 글 목록 페이지
- **표시 항목**: 글 목록 (제목, 요약, 대표 이미지 썸네일, 카테고리 배지, 발행일, 태그 배지들)
- **가능한 행동**:
  - 카테고리 탭 전환 (전체 + 각 카테고리)
  - 태그 클릭 -> 해당 태그 필터
  - 페이지네이션 이동
  - 글 클릭 -> 상세 페이지 이동

### S8: 공개 -- 글 상세 페이지
- **표시 항목**: 대표 이미지 (전폭), 제목, 카테고리 배지, 발행일, 태그 배지들, 본문 (HTML 렌더링 또는 Block Editor 블록 렌더링), 첨부파일 목록 (다운로드 링크), CTA 버튼 (있을 경우), 이전/다음 글 네비게이션
- **가능한 행동**:
  - 첨부파일 다운로드
  - CTA 버튼 클릭
  - 이전/다음 글 이동
  - 태그 클릭 -> 목록 페이지로 이동
  - 댓글 보기/작성 (댓글 기능 활성화 시)

### S9: 공개 -- 댓글 영역 (글 상세 페이지 하단)
- **표시 항목**: 댓글 목록 (트리 구조로 대댓글 들여쓰기), 각 댓글의 작성자명, 작성일, 내용, "답글" 버튼
- **가능한 행동**:
  - 댓글 작성 (이름, 이메일(선택), 내용 입력 + 제출)
  - 답글 작성 (특정 댓글에 대한 대댓글 폼)
  - 로그인 필요 설정 시 로그인 유도 메시지 표시

### S10: 공개 -- 태그 클라우드 위젯
- **표시 항목**: 모든 태그를 게시글 수 비례 크기로 표시
- **가능한 행동**: 태그 클릭 -> 해당 태그 글 목록으로 이동

### S11: API 표면 (라우트 핸들러 맵)

**Public API**:
| 경로 패턴 | 메서드 | 설명 |
|-----------|--------|------|
| /posts | GET | 공개 글 목록 (page, limit, category, search, tagSlug 파라미터) |
| /posts/[slug] | GET | 공개 글 상세 |
| /posts/featured | GET | 추천 글 목록 |
| /tags | GET | 공개 태그 목록 |
| /tags/cloud | GET | 태그 클라우드 (게시글 수 포함) |
| /posts/[postId]/comments | GET | 글별 공개 댓글 목록 (트리) |
| /posts/[postId]/comments | POST | 댓글 작성 |
| /search | GET | 전문 검색 |
| /feed.xml | GET | RSS 피드 |

**Admin API** (인증 필수):
| 경로 패턴 | 메서드 | 설명 |
|-----------|--------|------|
| /admin/posts | GET | 관리자 글 목록 (page, limit, category, published, search, sortBy) |
| /admin/posts | POST | 글 생성 |
| /admin/posts | DELETE | 일괄 삭제 |
| /admin/posts/[id] | GET | 관리자 글 상세 |
| /admin/posts/[id] | PUT | 글 수정 |
| /admin/posts/[id] | DELETE | 글 삭제 |
| /admin/posts/[id]/publish | PATCH | 공개/비공개 토글 |
| /admin/posts/bulk | PATCH | 일괄 상태 변경 (published, featured) |
| /admin/posts/slug-check | GET | slug 중복 확인 |
| /admin/dashboard | GET | 대시보드 통계 |
| /admin/tags | GET | 관리자 태그 목록 |
| /admin/tags | POST | 태그 생성 |
| /admin/tags/[id] | PUT | 태그 수정 |
| /admin/tags/[id] | DELETE | 태그 삭제 |
| /admin/comments | GET | 관리자 댓글 목록 (status 필터) |
| /admin/comments/[id] | PATCH | 댓글 상태 변경 |
| /admin/comments/[id] | DELETE | 댓글 삭제 |
| /admin/comments/bulk | PATCH | 일괄 상태 변경 |
| /admin/comments/bulk | DELETE | 일괄 삭제 |
| /admin/scheduler/process | POST | 예약 발행 처리 (Cron에서 호출) |
| /admin/scheduler/pending | GET | 예약 대기 글 목록 |
| /admin/scheduler/[id]/cancel | POST | 예약 취소 |

---

## 7. Non-goals (명시적으로 범위 밖)

1. **멀티테넌트**: blog-core-v2는 단일 블로그 인스턴스만 다룬다. 멀티테넌트는 별도 레이어(blog-system 등)의 책임이다.
2. **인증 시스템 자체 구현**: 인증(로그인, 회원가입, JWT 발급/갱신, OAuth)은 패키지 범위 밖이다. 호스트 프로젝트 또는 `@withwiz/toolkit` auth 모듈이 제공하는 인증을 전제한다. 패키지는 API 미들웨어에서 인증 결과(사용자 ID, 역할)를 받아 사용한다.
3. **사용자/회원 관리**: User 모델은 호스트 프로젝트의 책임이다. 패키지는 `authorId`만 문자열로 참조한다.
4. **이메일 알림**: 댓글 작성 시 이메일 알림은 포함하지 않는다.
5. **이미지 리사이즈/최적화**: 패키지는 업로드된 파일을 그대로 저장한다. 이미지 최적화는 CDN(R2 variant 등) 또는 호스트의 책임이다.
6. **관리자 권한 세분화**: 관리자/비관리자 이분법만 지원한다. 역할 기반 세밀한 권한(편집자, 기고자 등)은 포함하지 않는다.
7. **분석/통계 대시보드**: 조회수 트래킹 자체 구현은 하지 않는다. 콜백 인터페이스만 제공한다.
8. **프론트엔드 라우팅 자동 생성**: Next.js App Router의 `page.tsx`/`route.ts` 파일을 자동 생성하지 않는다. 개발자가 수동으로 라우트 핸들러를 연결한다.
9. **데이터베이스 마이그레이션 자동 실행**: 패키지는 Prisma 스키마 파일만 제공하고, `prisma migrate`는 개발자가 직접 실행한다.
10. **React Server Component 전용 컴포넌트**: UI 컴포넌트는 'use client' 클라이언트 컴포넌트로 제공한다. 서버 컴포넌트 래퍼가 필요하면 호스트가 구현한다.

---

## 8. Definition of Done (모든 항목이 참이어야 완료)

### 설치 및 초기화
- [ ] `npm install blog-core-v2`로 패키지가 정상 설치된다.
- [ ] 패키지 내 `prisma/blog.prisma` 파일을 복사한 후 `npx prisma migrate dev`가 에러 없이 실행되어 BlogPost, Tag, PostTag, Comment 테이블이 생성된다.
- [ ] `createBlog({ prisma, ... })` 호출 시 services 객체와 routes 객체가 반환된다.
- [ ] 반환된 routes 핸들러를 Next.js `route.ts`에 연결하면 API가 즉시 동작한다.

### 포스트 CRUD
- [ ] POST /admin/posts로 제목, 본문, 카테고리를 포함한 글을 생성할 수 있다.
- [ ] 동일 slug가 이미 존재하면 자동으로 suffix(-2, -3...)가 붙는다.
- [ ] GET /admin/posts로 관리자 글 목록을 page, limit, category, published, search, sortBy 파라미터로 조회할 수 있다.
- [ ] PUT /admin/posts/[id]로 글을 수정할 수 있다.
- [ ] DELETE /admin/posts/[id]로 글을 삭제할 수 있으며, 연관 스토리지 파일이 정리된다 (StorageAdapter 제공 시).
- [ ] DELETE /admin/posts (body: ids[])로 여러 글을 일괄 삭제할 수 있다.
- [ ] PATCH /admin/posts/[id]/publish로 공개/비공개를 토글할 수 있다.
- [ ] PATCH /admin/posts/bulk로 여러 글의 published/featured 상태를 일괄 변경할 수 있다.
- [ ] GET /admin/posts/slug-check?slug=xxx로 slug 중복 여부를 확인할 수 있다.
- [ ] GET /posts로 공개(published=true) 글만 발행일 역순으로 조회된다.
- [ ] GET /posts/[slug]로 공개 글 상세를 조회할 수 있다.
- [ ] GET /posts/featured로 추천 글 목록을 조회할 수 있다.

### 태그 (features.tags 활성화 시)
- [ ] 태그 CRUD (생성, 조회, 수정, 삭제) API가 동작한다.
- [ ] 글 생성/수정 시 tagIds를 전달하면 PostTag 관계가 생성/동기화된다.
- [ ] GET /tags/cloud로 게시글 수가 포함된 태그 목록이 반환된다.
- [ ] GET /posts?tagSlug=xxx로 특정 태그의 글만 필터링된다.

### 댓글 (features.comments 활성화 시)
- [ ] POST /posts/[postId]/comments로 댓글을 작성할 수 있다.
- [ ] parentId를 전달하면 대댓글로 저장되며, 최대 깊이 초과 시 에러(COMMENT_MAX_DEPTH_EXCEEDED)가 반환된다.
- [ ] 허니팟 필드가 채워진 요청은 SPAM 상태로 저장되며 클라이언트에는 성공 응답이 반환된다.
- [ ] 동일 IP에서 1시간 내 maxPerHour 초과 요청 시 에러(COMMENT_RATE_LIMIT_EXCEEDED)가 반환된다.
- [ ] GET /posts/[postId]/comments로 APPROVED 댓글이 트리 구조로 반환된다.
- [ ] 관리자가 PATCH /admin/comments/[id]로 상태를 변경할 수 있다.
- [ ] 관리자가 PATCH /admin/comments/bulk로 여러 댓글의 상태를 일괄 변경할 수 있다.

### 검색 (features.search 활성화 시)
- [ ] GET /search?query=xxx로 제목+본문 기준 전문 검색이 수행된다.
- [ ] 결과가 관련도(rank) 순으로 정렬된다.
- [ ] highlight=true 파라미터 시 하이라이팅된 요약(headline)이 포함된다.

### 예약 발행 (features.scheduler 활성화 시)
- [ ] publishedAt을 미래 시각으로 설정하고 published=false로 저장하면 예약 상태가 된다.
- [ ] POST /admin/scheduler/process 호출 시 발행 시각이 지난 글이 자동으로 published=true로 전환된다.
- [ ] 반환값에 전환된 글 수와 ID 목록이 포함된다.
- [ ] GET /admin/scheduler/pending으로 예약 대기 중인 글 목록을 조회할 수 있다.
- [ ] POST /admin/scheduler/[id]/cancel로 예약을 취소(publishedAt=null)할 수 있다.
- [ ] cronSecret이 설정된 경우, 올바른 시크릿 없이 process 호출 시 401이 반환된다.

### SEO
- [ ] generateMetadata() 함수가 Next.js Metadata 객체를 반환한다.
- [ ] generateJsonLd() 함수가 BlogPosting 구조화 데이터 객체를 반환한다.
- [ ] generateBreadcrumbJsonLd() 함수가 BreadcrumbList 구조화 데이터를 반환한다.
- [ ] createRSSFeed() 함수가 유효한 RSS 2.0 XML 문자열을 반환한다.
- [ ] createSitemap() 함수가 유효한 sitemap XML 문자열을 반환한다.
- [ ] prepareOGImageData() 함수가 OG 이미지 생성에 필요한 데이터 객체를 반환한다.

### i18n
- [ ] 아무 i18n 설정 없이 초기화하면 한국어 기본값이 모든 UI 문자열에 적용된다.
- [ ] 특정 키만 오버라이드하면 나머지는 기본값이 유지된다.
- [ ] Zod 검증 에러 메시지에도 i18n 문자열이 적용된다.

### 스토리지
- [ ] StorageAdapter를 주입하면 글 삭제 시 커버 이미지, 본문 내 이미지, 첨부파일의 스토리지 키가 자동 정리된다.
- [ ] StorageAdapter를 주입하지 않으면 스토리지 정리가 건너뛰어지고 에러 없이 동작한다.

### Feature 토글
- [ ] `features.tags: false`로 설정하면 태그 관련 서비스와 라우트가 null로 반환되고, 글 생성/수정 시 tagIds가 무시된다.
- [ ] `features.comments: { enabled: false }`로 설정하면 댓글 관련 서비스와 라우트가 null로 반환된다.
- [ ] `features.search: false`로 설정하면 검색 서비스와 라우트가 null로 반환된다.
- [ ] `features.scheduler: { enabled: false }`로 설정하면 스케줄러 서비스와 라우트가 null로 반환된다.

### 기본 UI
- [ ] 글 목록 컴포넌트를 렌더링하면 페이지네이션, 검색, 카테고리 필터, 정렬, 일괄 작업이 동작한다.
- [ ] 글 편집 폼 컴포넌트를 렌더링하면 slug 자동 생성, 중복 체크, 대표 이미지 업로드, 첨부파일 관리, 공개/추천 토글이 동작한다.
- [ ] 기본 에디터(textarea/rich-text)로 본문 작성 및 저장이 가능하다.
- [ ] 댓글 모더레이션 패널 컴포넌트가 상태 필터, 개별/일괄 작업을 지원한다.
- [ ] 태그 피커 컴포넌트가 검색, 선택, 즉석 생성을 지원한다.

### 확장 UI
- [ ] `@withwiz/block-editor`가 설치된 환경에서 확장 에디터 컴포넌트를 렌더링하면 Block Editor가 표시된다.
- [ ] Block Editor에서 작성한 블록 데이터가 기존 block-editor 포맷과 호환되어 저장/로드된다.

### 공개 UI
- [ ] 글 목록 컴포넌트가 카테고리 탭, 태그 필터, 페이지네이션을 지원한다.
- [ ] 글 상세 컴포넌트가 본문 렌더링, 첨부파일, 이전/다음 네비게이션을 표시한다.
- [ ] 댓글 목록 컴포넌트가 트리 구조로 대댓글을 들여쓰기하여 표시한다.
- [ ] 댓글 작성 폼이 이름, 이메일, 내용 입력과 제출을 지원한다.

### Headless 모드
- [ ] UI 컴포넌트를 전혀 import하지 않고 services + routes만 사용하여 블로그를 운영할 수 있다.
- [ ] 모든 타입, Zod 스키마, i18n 문자열, 에러 코드, SEO 유틸리티가 별도로 import 가능하다.

### 외부 의존성
- [ ] `@withwiz/blog-system` 또는 `@withwiz/pms`에 대한 의존성이 0이다.
- [ ] `@withwiz/block-editor`는 선택적 peer dependency로만 참조된다.
- [ ] `@withwiz/toolkit`은 dependency 또는 내재화된 유틸리티로 사용된다.

### 에러 처리
- [ ] 서비스 계층에서 발생하는 에러는 BlogError 인스턴스로 코드(BlogErrorCode)와 영문 메시지를 포함한다.
- [ ] 라우트 핸들러에서 BlogError를 적절한 HTTP 상태 코드로 변환하여 `{ success: false, error: { code, message } }` 형태로 응답한다.
- [ ] 모든 에러 코드는 상수 객체(BLOG_ERROR_CODES)로 export되어 호스트가 i18n 매핑에 사용할 수 있다.

### 임베딩
- [ ] 기본/확장 UI 컴포넌트가 호스트 프로젝트의 임의 레이아웃(AdminShell, 사이드바, 탭 등) 안에 끼워넣어 사용할 수 있다.
- [ ] 컴포넌트가 자체 전역 스타일을 오염시키지 않는다 (CSS 변수/모듈 기반 스코핑).

`SPEC_READY: spec.md`
