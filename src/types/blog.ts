/**
 * 블로그 핵심 타입 정의
 * 기존 src/types/news.ts를 일반화하여 category를 문자열 기반으로 변환
 */
import type { Tag } from './tag';

// ── 첨부파일 ──

/** 첨부파일 정보 */
export interface Attachment {
  /** 원본 파일명 */
  name: string;
  /** 공개 URL */
  url: string;
  /** 스토리지 키 (삭제용) */
  key: string;
  /** 파일 크기 (바이트) */
  size: number;
  /** MIME 타입 */
  type: string;
}

// ── 블로그 데이터 타입 ──

/** 블로그 목록 항목 */
export interface BlogListItem {
  id: string;
  slug: string;
  /** 카테고리 (문자열 기반, enum 의존 없음) */
  category: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  hasAttachments: boolean;
  featured: boolean;
  published: boolean;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  /** 조회수 (선택적, 서비스에서 주입) */
  viewCount?: number;
  /** 태그 목록 (선택적, include 시 주입) */
  tags?: Tag[];
}

/** 블로그 상세 정보 */
export interface BlogDetail extends BlogListItem {
  content: string;
  coverImageKey: string | null;
  attachments: Attachment[];
  authorId: string;
}

/** 블로그 네비게이션 (이전/다음) */
export interface BlogNav {
  slug: string;
  title: string;
}

// ── 입력 타입 ──

/** 블로그 글 생성 입력 */
export interface CreateBlogPostInput {
  slug: string;
  /** 카테고리 (문자열 기반) */
  category: string;
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  attachments?: Attachment[];
  featured?: boolean;
  published?: boolean;
  publishedAt?: Date | string | null;
  /** 연결할 태그 ID 배열 (optional) */
  tagIds?: string[];
  /** 연결할 태그 slug 배열 (optional, tagIds 우선) */
  tagSlugs?: string[];
}

/** 블로그 글 수정 입력 */
export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {}

// ── 카테고리 테마 ──

/** 카테고리별 색상 테마 */
export interface CategoryTheme {
  /** CSS 클래스 접미사 */
  key: string;
  /** 주요 색상 (hex) */
  main: string;
  /** 히어로 색상 (RGB 숫자) */
  heroColor: string;
  /** 배경 틴트 색상 */
  bgTint: string;
  /** 인용 배경 색상 */
  bgQuote: string;
  /** 테두리 색상 */
  border: string;
  /** 구분선 색상 */
  divider: string;
  /** 표시 라벨 */
  label: string;
}

// ── 패키지 설정 ──

/** 블로그 패키지 설정 */
export interface BlogConfig {
  /** 카테고리 목록 및 테마 */
  categories: Record<string, CategoryTheme>;
  /** URL 기본 경로 (예: "/news", "/blog") */
  basePath: string;
  /** 관리자 URL 경로 (예: "/admin/news") */
  adminBasePath: string;
  /** API 경로 (예: "/api/news") */
  apiBasePath: string;
  /** 관리자 API 경로 (예: "/api/admin/news") */
  adminApiBasePath: string;
  /** Prisma 모델명 (예: "news", "blogPost") */
  modelName: string;
  /** 이미지 업로드 API 경로 */
  uploadEndpoint: string;
  /** 기본 페이지 크기 (default: 12) */
  pageSize?: number;
  /** 최대 첨부파일 수 (default: 5) */
  maxAttachments?: number;
  /** CTA 버튼 기능 활성화 (default: true) */
  enableCta?: boolean;
  /** 홈 표시(추천) 기능 활성화 (default: true) */
  enableFeatured?: boolean;
  /** 첨부파일 기능 활성화 (default: true) */
  enableAttachments?: boolean;
  /** 다국어 문자열 오버라이드 */
  i18n?: BlogI18nStrings;
  /** 인증 토큰 갱신 API 경로 (기본값: '/api/admin/auth/refresh') */
  authRefreshPath?: string;
  /** 로그인 페이지 경로 (기본값: '/admin/login') */
  loginPath?: string;
  /**
   * 목록 URL 복원에 사용할 sessionStorage 키 (기본값: 'blogListUrl').
   * 한 호스트에 여러 블로그 인스턴스가 공존할 때 충돌을 피하기 위해 인스턴스별로 다르게 설정한다.
   */
  sessionStorageKey?: string;
}

// ── 서비스 설정 ──

/** R2 헬퍼 함수 인터페이스 */
export interface R2Helpers {
  /** R2 활성화 여부 */
  isEnabled: () => boolean;
  /** 삭제 대상 R2 키 수집 */
  collectKeys: (primaryKey: string | null, ...htmlContents: (string | null)[]) => string[];
  /** R2 키 삭제 */
  deleteKeys: (keys: string[]) => Promise<void>;
}

/** 블로그 서비스 설정 */
export interface BlogServiceConfig {
  /** Prisma delegate 접근에 사용할 모델명 */
  modelName: string;
  /** R2 스토리지 정리 활성화 여부 (default: false) */
  enableR2Cleanup?: boolean;
  /** R2 정리 함수 (optional, 미제공 시 R2 정리 건너뜀) */
  r2Helpers?: R2Helpers;
  /** HTML 새니타이즈 함수 (optional, 미제공 시 내장 함수 사용) */
  sanitizeContent?: (html: string | null | undefined) => string | null;
  /** 조회수 처리 콜백 (optional) */
  onViewCount?: (entityType: string, ids: string[]) => Promise<Map<string, number>>;
  /** 태그 관계(PostTag) 활성화 여부 (default: false) — 호스트 스키마에 tags 관계가 있을 때만 true */
  enableTags?: boolean;
}

// ── 다국어 문자열 ──

/**
 * 블로그 i18n 문자열 인터페이스
 *
 * 모든 키는 optional이며, 미설정 시 `resolveI18n()`이 한국어 기본값(`DEFAULT_I18N_KO`)을 채워준다.
 * 호스트는 필요한 키만 오버라이드하면 된다.
 */
export interface BlogI18nStrings {
  // ── 관리자 UI (목록/공통) ──
  /** 관리자 목록 제목 (예: "뉴스 관리") */
  adminListTitle?: string;
  /** 새 글 생성 버튼 */
  adminCreateButton?: string;
  /** 글 작성 페이지 제목 */
  adminCreateTitle?: string;
  /** 글 편집 페이지 제목 */
  adminEditTitle?: string;
  /** 저장 버튼 */
  adminSaveButton?: string;
  /** 취소 버튼 */
  adminCancelButton?: string;
  /** 공개 상태 라벨 */
  adminPublishedLabel?: string;
  /** 비공개 상태 라벨 */
  adminUnpublishedLabel?: string;
  /** 홈 표시 라벨 */
  adminFeaturedLabel?: string;
  /** 단건 삭제 확인 메시지 */
  adminDeleteConfirm?: string;
  /** 일괄 삭제 확인 메시지 */
  adminBulkDeleteConfirm?: string;

  // ── 관리자 폼 (편집 폼) ──
  /** 제목 라벨 */
  adminTitleLabel?: string;
  /** 제목 필수 검증 메시지 */
  adminTitleRequired?: string;
  /** 본문 라벨 */
  adminContentLabel?: string;
  /** 본문 필수 검증 메시지 */
  adminContentRequired?: string;
  /** Slug(고유주소) 라벨 */
  adminSlugLabel?: string;
  /** Slug 자동생성 placeholder */
  adminSlugAutoGenerated?: string;
  /** Slug 중복 메시지 */
  adminSlugDuplicate?: string;
  /** Slug 형식 오류 메시지 */
  adminSlugInvalid?: string;
  /** 카테고리 라벨 */
  adminCategoryLabel?: string;
  /** 요약/부제 라벨 */
  adminExcerptLabel?: string;
  /** 대표 이미지 라벨 */
  adminCoverImageLabel?: string;
  /** 첨부파일 라벨 */
  adminAttachmentsLabel?: string;
  /** 콘텐츠 블록 라벨 */
  adminBlocksLabel?: string;
  /** CTA 라벨 */
  adminCtaLabel?: string;
  /** 발행일시 라벨 */
  adminPublishedAtLabel?: string;
  /** 기본 정보 섹션 라벨 */
  adminBasicInfoLabel?: string;
  /** 필수 표시 태그 */
  adminRequiredLabel?: string;
  /** 업로드 실패 메시지 */
  adminUploadFailed?: string;
  /** 미지원 파일 형식 메시지 */
  adminUnsupportedFileType?: string;
  /** 파일 업로드 오류 메시지 */
  adminFileUploadError?: string;

  // ── 관리자 매니저(목록 관리) ──
  /** 일괄 공개 버튼 */
  adminBulkPublish?: string;
  /** 일괄 비공개 버튼 */
  adminBulkUnpublish?: string;
  /** 일괄 홈 표시 버튼 */
  adminBulkFeature?: string;
  /** 일괄 홈 해제 버튼 */
  adminBulkUnfeature?: string;
  /** 선택 해제 버튼 */
  adminBulkClear?: string;
  /** "N건 선택" 라벨 (값이 함수형이 아니라 정적 단어일 때 — 호스트가 ${}로 합성) */
  adminBulkSelectedSuffix?: string;
  /** 목록 비어있음 안내 */
  adminListEmpty?: string;
  /** 알 수 없는 오류 메시지 */
  adminUnknownError?: string;
  /** 저장 완료 메시지 */
  adminPublishedSuffix?: string;
  /** 수정 완료 메시지 */
  adminDraftSuffix?: string;
  /** 검색 placeholder */
  adminSearchPlaceholder?: string;
  /** 전체 선택 title */
  adminSelectAll?: string;
  /** 카테고리 전체 옵션 */
  adminCategoryAll?: string;
  /** "건" 단위 접미사 */
  adminCountSuffix?: string;
  /** 정렬: 등록일순 */
  adminSortCreatedAt?: string;
  /** 정렬: 발행일순 */
  adminSortPublishedAt?: string;
  /** 정렬: 수정일순 */
  adminSortUpdatedAt?: string;
  /** 뷰 탭: 편집 */
  adminViewEdit?: string;
  /** 뷰 탭: 상세 미리보기 */
  adminViewPreviewDetail?: string;
  /** 뷰 탭: 목록 미리보기 */
  adminViewPreviewList?: string;
  /** 발행 라벨 (목록 메타) */
  adminMetaPublishedAt?: string;
  /** 등록 라벨 (목록 메타) */
  adminMetaCreatedAt?: string;
  /** 수정 라벨 (목록 메타) */
  adminMetaUpdatedAt?: string;
  /** 첨부파일 아이콘 title */
  adminAttachmentTitle?: string;
  /** 홈 표시 짧은 배지 */
  adminFeaturedShort?: string;
  /** 예시 콘텐츠 버튼 */
  adminSampleButton?: string;
  /** 저장 진행 중 라벨 */
  adminSaving?: string;
  /** 로딩 중 라벨 */
  adminLoading?: string;
  /** 업로드 중 라벨 */
  adminUploading?: string;
  /** 이미지 최적화 중 라벨 */
  adminImageResizing?: string;
  /** 드래그 오버 안내 */
  adminDropHere?: string;
  /** 이미지 업로드 버튼 */
  adminImageUploadButton?: string;
  /** 이미지 비율 안내 */
  adminImageRatioHint?: string;
  /** 콘텐츠 블록 부가 설명 */
  adminBlocksHint?: string;
  /** CTA 안내 문구 */
  adminCtaDescription?: string;
  /** CTA 토글 라벨 */
  adminCtaToggle?: string;
  /** CTA 메시지 라벨 */
  adminCtaMessageLabel?: string;
  /** CTA 메시지 placeholder */
  adminCtaMessagePlaceholder?: string;
  /** CTA 버튼 텍스트 라벨 */
  adminCtaButtonLabel?: string;
  /** CTA 버튼 텍스트 placeholder */
  adminCtaButtonPlaceholder?: string;
  /** CTA URL 라벨 */
  adminCtaUrlLabel?: string;
  /** 첨부파일 안내 */
  adminAttachmentsHint?: string;
  /** 파일 추가 버튼 접두 */
  adminAttachmentAddButton?: string;
  /** 첨부파일 최대 개수 초과 메시지 */
  adminAttachmentMaxExceeded?: string;
  /** 이미지 파일만 허용 메시지 */
  adminImageOnlyAllowed?: string;
  /** 항목 없음 placeholder */
  adminItemNoTitle?: string;
  /** 부제/요약 placeholder */
  adminExcerptPlaceholder?: string;
  /** 제목 placeholder */
  adminTitlePlaceholder?: string;
  /** 선택 접미사 (예: "선택") */
  adminOptionalLabel?: string;
  /** 텍스트/이미지 자유 편집 표기 */
  adminBlocksTag?: string;

  // ── 공개 UI ──
  /** 카테고리 전체 탭 라벨 */
  publicAllCategory?: string;
  /** 페이지네이션 이전 */
  publicPrevPage?: string;
  /** 페이지네이션 다음 */
  publicNextPage?: string;
  /** 목록으로 돌아가기 버튼 */
  publicBackToList?: string;
  /** 첨부파일 섹션 라벨 */
  publicAttachmentsLabel?: string;
  /** 이전 글 네비게이션 */
  publicPrevPost?: string;
  /** 다음 글 네비게이션 */
  publicNextPost?: string;

  // ── 댓글(공개 UI) ──
  /** 댓글 비어있음 안내 */
  commentEmptyState?: string;
  /** 답글 버튼 */
  commentReplyButton?: string;
  /** 회원 표기 라벨 */
  commentMemberLabel?: string;
  /** 게스트 표기 라벨 */
  commentGuestLabel?: string;
  /** 폼 — 이름 라벨 */
  commentFormNameLabel?: string;
  /** 폼 — 이메일 라벨 */
  commentFormEmailLabel?: string;
  /** 폼 — 내용 라벨 */
  commentFormContentLabel?: string;
  /** 폼 — 제출 버튼 */
  commentFormSubmitButton?: string;
  /** 폼 — 제출 진행 중 라벨 */
  commentFormSubmitting?: string;
  /** 폼 — 제출 성공 안내 */
  commentFormSuccess?: string;
  /** 폼 — 제출 실패 메시지 */
  commentFormError?: string;
  /** 폼 — 글자 수 안내 */
  commentMaxLengthHint?: string;
  /** 로그인 필요 안내 */
  commentLoginRequired?: string;
  /** 댓글 더 작성하기 버튼 */
  commentResetButton?: string;

  // ── 태그 피커(관리자) ──
  /** placeholder */
  tagPickerPlaceholder?: string;
  /** 로딩 중 표시 */
  tagPickerLoading?: string;
  /** 유효하지 않은 이름 메시지 */
  tagPickerInvalidName?: string;
  /** 일치 항목 없음 안내 */
  tagPickerNoMatch?: string;
  /** 새 태그 생성 버튼(접두) */
  tagPickerCreateNew?: string;

  // ── 댓글 모더레이션(관리자) ──
  moderationTitle?: string;
  moderationAll?: string;
  moderationPending?: string;
  moderationApproved?: string;
  moderationRejected?: string;
  moderationSpam?: string;
  moderationBulkApprove?: string;
  moderationBulkReject?: string;
  moderationBulkSpam?: string;
  moderationBulkDelete?: string;
  moderationEmpty?: string;
  moderationLoadError?: string;
  moderationDeleteConfirm?: string;
  moderationBulkDeleteConfirm?: string;

  // ── 공통 오류 ──
  errorUnknown?: string;
  errorNetwork?: string;
  errorUnauthorized?: string;
  errorForbidden?: string;
  errorNotFound?: string;
  errorValidation?: string;
}

// ── 대시보드 통계 ──

/** 대시보드 통계 */
export interface DashboardStats {
  /** 전체 글 수 */
  total: number;
  /** 공개된 글 수 */
  published: number;
  /** 비공개 글 수 */
  unpublished: number;
  /** 추천(featured) 글 수 */
  featured: number;
  /** 카테고리별 글 수 */
  byCategory: Record<string, number>;
  /** 최근 글 목록 */
  recentPosts: BlogListItem[];
}
