/**
 * 공개 UI 컴포넌트 타입 정의
 */
import type { Attachment, BlogDetail, BlogListItem, BlogNav, CategoryTheme } from '../../types/blog';
import type { Tag, TagWithCount } from '../../types/tag';
import type { Comment } from '../../types/comment';
import type { PaginatedResult } from '../../types/common';
import type { BlogI18nStrings } from '../../i18n/types';

// ── BlogListPage Props ──

/** 태그 클라우드 아이템 (목록 페이지 내장용) */
export interface TagCloudItem {
  name: string;
  slug: string;
  postCount: number;
}

export interface BlogListPageProps {
  /** 페이지네이션된 글 목록 결과 */
  result: PaginatedResult<BlogListItem>;
  /** 카테고리 목록 및 테마 */
  categories: Record<string, CategoryTheme>;
  /** 공개 URL 기본 경로 (예: "/blog") */
  basePath: string;
  /** 초기 선택된 카테고리 (default: "all") */
  initialCategory?: string;
  /** 현재 페이지 (default: 1) */
  currentPage?: number;
  /** 카테고리 변경 콜백 (미제공 시 Link로 이동) */
  onCategoryChange?: (category: string) => void;
  /** 페이지 변경 콜백 (미제공 시 Link로 이동) */
  onPageChange?: (page: number) => void;
  /** 이미지 URL 변환기 (예: R2 variant 적용) */
  imageUrlTransformer?: (url: string, size: string) => string;
  /** 히어로 영역 영문 타이틀 (default: "Blog") */
  heroTitle?: string;
  /** 태그 클라우드 데이터 */
  tags?: TagCloudItem[];
  /** 현재 선택된 태그 slug */
  activeTag?: string;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 추가 CSS 클래스 */
  className?: string;
  /** sessionStorage 키 (default: "blogListUrl") */
  sessionStorageKey?: string;
}

// ── BlogDetailPage Props ──

export interface BlogDetailPageProps {
  /** 글 상세 정보 */
  post: BlogDetail;
  /** 이전 글 (없으면 null) */
  prev: BlogNav | null;
  /** 다음 글 (없으면 null) */
  next: BlogNav | null;
  /** 카테고리 목록 및 테마 */
  categories: Record<string, CategoryTheme>;
  /** 공개 URL 기본 경로 (예: "/blog") */
  basePath: string;
  /** 어드민 미리보기에서 사용 시 true — Link를 span으로 렌더링 */
  staticLinks?: boolean;
  /** 이미지 URL 변환기 (예: R2 variant 적용) */
  imageUrlTransformer?: (url: string, size: string) => string;
  /** 조회수 카운팅 콜백 (미리보기에서는 호출하지 않음) */
  onViewCount?: (slug: string) => void;
  /** CTA 기능 활성화 여부 (default: true) */
  enableCta?: boolean;
  /** 첨부파일 기능 활성화 여부 (default: true) */
  enableAttachments?: boolean;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 추가 CSS 클래스 */
  className?: string;
  /** sessionStorage 키 (default: "blogListUrl") */
  sessionStorageKey?: string;
}

// ── CommentList Props ──

export interface CommentListProps {
  /** 트리 구조 댓글 목록 (루트 + replies) */
  comments: Comment[];
  /** 답글 버튼 클릭 시 호출 — parentId 전달 */
  onReply?: (parentId: string) => void;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ── CommentForm Props ──

export interface CommentFormProps {
  /** 대상 포스트 ID */
  postId: string;
  /** 대댓글 작성 시 부모 댓글 ID */
  parentId?: string;
  /** 댓글 API 베이스 경로 (예: "/api/blog/posts/{postId}/comments") */
  apiBasePath: string;
  /** true면 로그인 필수 — 비로그인 시 폼 대신 안내 표시 */
  requireLogin?: boolean;
  /** 현재 로그인 사용자 ID (있으면 게스트 필드 숨김) */
  currentUserId?: string;
  /** 작성 성공 후 콜백 */
  onSubmitted?: () => void;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ── TagBadge Props ──

export interface TagBadgeProps {
  /** 표시할 태그 */
  tag: Tag;
  /** 클릭 시 이동할 기본 경로 (예: "/blog") — 최종: `${basePath}?tag=${tag.slug}` */
  basePath?: string;
  /** 직접 지정할 href (basePath보다 우선) */
  href?: string;
  /** 클릭 콜백 (Link 대신 이벤트 핸들링) */
  onClick?: (tag: Tag) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ── TagCloud Props ──

export interface TagCloudProps {
  /** 표시할 태그 목록 (postCount 포함) */
  tags: TagWithCount[];
  /** 태그 링크 기본 경로 (예: "/blog") — 최종: `${basePath}?tag=${tag.slug}` */
  basePath: string;
  /** 최소 폰트 크기(em) — default: 0.8 */
  minSize?: number;
  /** 최대 폰트 크기(em) — default: 1.8 */
  maxSize?: number;
  /** 태그 클릭 콜백 (Link 대신 이벤트 핸들링) */
  onTagClick?: (tag: TagWithCount) => void;
  /** i18n 오버라이드 */
  i18n?: Partial<BlogI18nStrings>;
  /** 추가 CSS 클래스 */
  className?: string;
}
