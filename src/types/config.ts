/**
 * blog-core-v2 설정 타입 정의
 */
import type { CategoryTheme } from './blog';
import type { BlogI18nStrings } from '../i18n/types';

// ── Feature 토글 ──

/** 댓글 기능 설정 */
export interface CommentFeatureConfig {
  enabled: boolean;
  /** 자동 승인 여부 (default: false, PENDING 상태로 저장) */
  autoApprove?: boolean;
  /** 로그인 필수 여부 (default: false, 게스트 댓글 허용) */
  requireLogin?: boolean;
  /** 대댓글 최대 깊이 (default: 3) */
  maxDepth?: number;
  /** 레이트 리밋 설정 */
  rateLimit?: {
    /** 동일 IP의 시간당 최대 댓글 수 (default: 10) */
    maxPerHour?: number;
  };
}

/** 스케줄러 기능 설정 */
export interface SchedulerFeatureConfig {
  enabled: boolean;
  /** Cron 시크릿 (설정 시 process 호출에 시크릿 검증 추가) */
  cronSecret?: string;
}

/** Feature 토글 */
export interface BlogFeatures {
  /** 태그 시스템 (default: true) */
  tags?: boolean;
  /** 댓글 시스템 */
  comments?: CommentFeatureConfig | { enabled: false };
  /** 전문 검색 (default: true) */
  search?: boolean;
  /** 예약 발행 */
  scheduler?: SchedulerFeatureConfig | { enabled: false };
}

// ── 스토리지 어댑터 ──

/** 스토리지 어댑터 인터페이스 */
export interface StorageAdapter {
  /** 스토리지 키 목록을 삭제한다 */
  deleteKeys(keys: string[]): Promise<void>;
  /** HTML 콘텐츠 내 이미지 URL에서 스토리지 키를 추출한다 */
  collectKeysFromHtml(html: string | null): string[];
}

// ── Auth 미들웨어 ──

/** 인증된 사용자 정보 */
export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/** 인증 미들웨어 함수 타입 */
export type AuthMiddleware = (req: Request) => Promise<AuthUser | null>;

// ── 메인 설정 ──

/**
 * createBlog() 팩토리 함수 설정
 */
export interface BlogConfig {
  /** Prisma 클라이언트 인스턴스 (호스트 프로젝트에서 주입) */
  prisma: PrismaClientLike;
  /** Prisma 모델명 (예: "blogPost", "news") */
  modelName: string;
  /** 태그 모델명 (default: 'tag') */
  tagModelName?: string;
  /** PostTag 중계 모델명 (default: 'postTag') */
  postTagModelName?: string;
  /** 댓글 모델명 (default: 'comment') */
  commentModelName?: string;
  /** 카테고리 목록 및 테마 */
  categories: Record<string, CategoryTheme>;
  /** 공개 URL 기본 경로 (예: "/news", "/blog") */
  basePath: string;
  /** 관리자 URL 경로 (예: "/admin/news") */
  adminBasePath: string;
  /** 공개 API 경로 (예: "/api/news") */
  apiBasePath: string;
  /** 관리자 API 경로 (예: "/api/admin/news") */
  adminApiBasePath: string;

  /** 기본 페이지 크기 (default: 12) */
  pageSize?: number;
  /** 최대 첨부파일 수 (default: 5) */
  maxAttachments?: number;
  /** CTA 버튼 기능 활성화 (default: true) */
  enableCta?: boolean;
  /** 첨부파일 기능 활성화 (default: true) */
  enableAttachments?: boolean;
  /** 이미지 업로드 API 경로 */
  uploadEndpoint?: string;

  /** Feature 토글 */
  features?: BlogFeatures;

  /** 스토리지 어댑터 (optional) */
  storage?: StorageAdapter;

  /** 인증 미들웨어 (optional, admin 라우트에서 사용) */
  authMiddleware?: AuthMiddleware;

  /** 댓글 IP 해시에 사용할 HMAC 시크릿 (optional) */
  commentHmacSecret?: string;

  /** 검색용 DB 테이블명 (default: 'blog_posts') */
  searchTableName?: string;
  /** 검색 FTS 언어 (default: 'simple') */
  searchLang?: string;

  /** HTML 새니타이즈 함수 (optional, 미제공 시 내장 함수 사용) */
  sanitizeContent?: (html: string | null | undefined) => string | null;

  /** 조회수 처리 콜백 (optional) */
  onViewCount?: (entityType: string, ids: string[]) => Promise<Map<string, number>>;

  /** i18n 문자열 오버라이드 (optional, 미제공 시 한국어 기본값) */
  i18n?: Partial<BlogI18nStrings>;
}

/**
 * Prisma 클라이언트 최소 인터페이스 (덕 타이핑).
 * 호스트 Prisma 클라이언트의 생성된 타입을 직접 import하지 않는다.
 */
export type PrismaClientLike = {
  [key: string]: any;
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
  $queryRawUnsafe: (sql: string, ...values: any[]) => Promise<any[]>;
};
