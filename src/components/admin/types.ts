/**
 * 관리자 UI 컴포넌트 공통 타입 정의
 */
import type { Attachment, BlogListItem, CategoryTheme, DashboardStats } from '../../types/blog';
import type { Tag } from '../../types/tag';
import type { Comment, CommentStatus } from '../../types/comment';
import type { PaginatedResult } from '../../types/common';
import type { BlogI18nStrings } from '../../i18n/types';

// ── API 통신 Props ──

/** API 통신에 필요한 기본 props */
export interface BlogAdminApiProps {
  /** 공개 API 기본 경로 (예: "/api/blog") */
  apiBasePath: string;
  /** 관리자 API 기본 경로 (예: "/api/admin/blog") */
  adminApiBasePath: string;
  /** 인증 헤더 (optional, cookie 기반 인증 시 불필요) */
  authHeaders?: Record<string, string>;
  /** 파일 업로드 API 경로 (예: "/api/admin/upload") */
  uploadEndpoint?: string;
}

// ── 카테고리 관련 ──

/** 카테고리 설정 */
export type CategoryMap = Record<string, CategoryTheme>;

// ── BlogManagerClient Props ──

export type AdminMode = 'list' | 'edit' | 'preview-detail' | 'preview-list' | 'dashboard' | 'comments';

export interface BlogManagerClientProps extends BlogAdminApiProps {
  /** 카테고리 목록 및 테마 */
  categories: CategoryMap;
  /** 공개 URL 기본 경로 (예: "/blog") */
  basePath: string;
  /** 기본 페이지 크기 (default: 12) */
  pageSize?: number;
  /** CTA 기능 활성화 (default: true) */
  enableCta?: boolean;
  /** 첨부파일 기능 활성화 (default: true) */
  enableAttachments?: boolean;
  /** 최대 첨부파일 수 (default: 5) */
  maxAttachments?: number;
  /** 태그 기능 활성화 (default: false) */
  enableTags?: boolean;
  /** 댓글 기능 활성화 (default: false) */
  enableComments?: boolean;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 저장 후 콜백 */
  onSave?: (post: BlogListItem) => void;
  /** 삭제 후 콜백 */
  onDelete?: (ids: string[]) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ── BlogListView Props ──

export type SortField = 'createdAt' | 'publishedAt' | 'updatedAt';

export interface BlogListViewProps extends BlogAdminApiProps {
  categories: CategoryMap;
  pageSize?: number;
  i18n?: Partial<BlogI18nStrings>;
  /** 행 클릭 시 */
  onSelect: (id: string) => void;
  /** 새 글 추가 클릭 시 */
  onCreate: () => void;
  /** 대시보드 클릭 시 */
  onDashboard?: () => void;
  /** 댓글 관리 클릭 시 */
  onComments?: () => void;
}

// ── BlogEditForm Props ──

/** 편집 폼 데이터 */
export interface BlogFormData {
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageKey: string;
  attachments: Attachment[];
  featured: boolean;
  published: boolean;
  publishedAt: string;
  tagIds: string[];
  ctaEnabled: boolean;
  ctaMsg: string;
  ctaBtn: string;
  ctaUrl: string;
}

export type SlugStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'invalid';

export interface BlogEditFormProps extends BlogAdminApiProps {
  categories: CategoryMap;
  /** 편집 대상 ID (null = 신규) */
  editId: string | null;
  /** CTA 기능 활성화 */
  enableCta?: boolean;
  /** 첨부파일 기능 활성화 */
  enableAttachments?: boolean;
  /** 최대 첨부파일 수 */
  maxAttachments?: number;
  /** 태그 기능 활성화 */
  enableTags?: boolean;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 저장 성공 후 콜백 */
  onSave: (post: BlogListItem) => void;
  /** 취소 시 콜백 */
  onCancel: () => void;
}

// ── 미리보기 Props ──

export interface BlogDetailPreviewProps {
  /** 미리보기용 폼 데이터 */
  form: BlogFormData;
  categories: CategoryMap;
  basePath: string;
  i18n?: Partial<BlogI18nStrings>;
}

export interface BlogListPreviewProps extends BlogAdminApiProps {
  categories: CategoryMap;
  basePath: string;
  pageSize?: number;
  i18n?: Partial<BlogI18nStrings>;
  /** 항목 클릭 시 편집 이동 */
  onSelectItem?: (id: string) => void;
}

// ── TagPicker Props ──

export interface TagPickerProps {
  /** 현재 선택된 태그 ID 배열 */
  selectedTagIds: string[];
  /** 변경 콜백 */
  onChange: (ids: string[]) => void;
  /** 태그 API 기본 경로 (예: "/api/admin/tags") */
  apiBasePath: string;
  /** 인증 헤더 */
  authHeaders?: Record<string, string>;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 디바운스 ms (default: 200) */
  debounceMs?: number;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
}

// ── CommentModerationPanel Props ──

export interface CommentModerationPanelProps extends BlogAdminApiProps {
  /** 페이지당 기본 개수 (default: 20) */
  defaultLimit?: number;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ── BlogDashboard Props ──

export interface BlogDashboardProps extends BlogAdminApiProps {
  categories: CategoryMap;
  i18n?: Partial<BlogI18nStrings>;
  /** 통계 항목 클릭 시 콜백 */
  onNavigate?: (filter: { published?: boolean; featured?: boolean; category?: string }) => void;
}
