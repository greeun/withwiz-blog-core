/**
 * 블로그 핵심 타입 정의
 */
import type { Tag } from './tag';

// ── 첨부파일 ──

/** 첨부파일 정보 */
export interface Attachment {
  name: string;
  url: string;
  key: string;
  size: number;
  type: string;
}

// ── 블로그 데이터 타입 ──

/** 블로그 목록 항목 */
export interface BlogListItem {
  id: string;
  slug: string;
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
  viewCount?: number;
  tags?: Tag[];
}

/** 에디터 타입 */
export type EditorType = 'textarea' | 'rich' | 'block';

/** 블로그 상세 정보 */
export interface BlogDetail extends BlogListItem {
  content: string;
  editorType: EditorType;
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
  category: string;
  title: string;
  content: string;
  editorType?: EditorType;
  excerpt?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  attachments?: Attachment[];
  featured?: boolean;
  published?: boolean;
  publishedAt?: Date | string | null;
  tagIds?: string[];
  tagSlugs?: string[];
}

/** 블로그 글 수정 입력 */
export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {}

// ── 카테고리 테마 ──

/** 카테고리별 색상 테마 */
export interface CategoryTheme {
  key: string;
  main: string;
  heroColor: string;
  bgTint: string;
  bgQuote: string;
  border: string;
  divider: string;
  label: string;
}

// ── 대시보드 통계 ──

/** 대시보드 통계 */
export interface DashboardStats {
  total: number;
  published: number;
  unpublished: number;
  featured: number;
  byCategory: Record<string, number>;
  recentPosts: BlogListItem[];
}
