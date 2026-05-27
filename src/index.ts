/**
 * @withwiz/blog-core 메인 진입점
 *
 * createBlog() 팩토리 함수와 핵심 타입/유틸리티를 export한다.
 *
 * 이 엔트리는 서버 전용이다(createBlog/services/routes/Prisma/node:crypto).
 * 경계는 엔트리포인트 분리 + 서버 전용 Node API 특성으로 강제된다.
 * 클라이언트 UI는 `@withwiz/blog-core/components/*`에서 import한다.
 */
import type { BlogConfig, CommentFeatureConfig, SchedulerFeatureConfig } from './types/config';
import type { BlogService } from './services/blog.service';
import type { TagService } from './services/tag.service';
import type { CommentService } from './services/comment.service';
import type { SearchService } from './services/search.service';
import type { SchedulerService } from './services/scheduler.service';
import type { PostPublicRoutes, PostAdminRoutes } from './routes/post.routes';
import type { TagPublicRoutes, TagAdminRoutes } from './routes/tag.routes';
import type { CommentPublicRoutes, CommentAdminRoutes } from './routes/comment.routes';
import type { SearchPublicRoutes } from './routes/search.routes';
import type { SchedulerAdminRoutes } from './routes/scheduler.routes';
import { createBlogService } from './services/blog.service';
import { createTagService } from './services/tag.service';
import { createCommentService } from './services/comment.service';
import { createSearchService } from './services/search.service';
import { createSchedulerService } from './services/scheduler.service';
import { createPostRoutes } from './routes/post.routes';
import { createTagRoutes } from './routes/tag.routes';
import { createCommentRoutes } from './routes/comment.routes';
import { createSearchRoutes } from './routes/search.routes';
import { createSchedulerRoutes } from './routes/scheduler.routes';

// ── createBlog 반환 타입 ──

export interface BlogInstance {
  services: {
    posts: BlogService;
    tags: TagService | null;
    comments: CommentService | null;
    search: SearchService | null;
    scheduler: SchedulerService | null;
  };
  routes: {
    public: {
      posts: PostPublicRoutes;
      tags: TagPublicRoutes | null;
      comments: CommentPublicRoutes | null;
      search: SearchPublicRoutes | null;
    };
    admin: {
      posts: PostAdminRoutes;
      tags: TagAdminRoutes | null;
      comments: CommentAdminRoutes | null;
      scheduler: SchedulerAdminRoutes | null;
    };
  };
}

// ── 팩토리 함수 ──

/**
 * 블로그 인스턴스를 생성한다.
 *
 * @param config - 블로그 설정 (Prisma 인스턴스, 카테고리, 경로 등)
 * @returns services 객체와 routes 객체를 포함한 BlogInstance
 *
 * @example
 * ```typescript
 * import { createBlog } from '@withwiz/blog-core';
 * import { prisma } from '@/lib/prisma';
 *
 * const blog = createBlog({
 *   prisma,
 *   modelName: 'blogPost',
 *   categories: { news: { key: 'news', label: '뉴스', ... } },
 *   basePath: '/blog',
 *   adminBasePath: '/admin/blog',
 *   apiBasePath: '/api/blog',
 *   adminApiBasePath: '/api/admin/blog',
 * });
 *
 * // route.ts에서:
 * export const GET = blog.routes.public.posts.list.GET;
 * ```
 */
export function createBlog(config: BlogConfig): BlogInstance {
  const features = config.features ?? {};
  const tagsEnabled = features.tags !== false;
  const commentsConfig = features.comments;
  const commentsEnabled = commentsConfig !== undefined
    && commentsConfig !== null
    && (commentsConfig as CommentFeatureConfig).enabled !== false;
  const searchEnabled = features.search !== false;
  const schedulerConfig = features.scheduler;
  const schedulerEnabled = schedulerConfig !== undefined
    && schedulerConfig !== null
    && (schedulerConfig as SchedulerFeatureConfig).enabled !== false;

  const postTagModelName = config.postTagModelName ?? 'postTag';
  const tagModelName = config.tagModelName ?? 'tag';
  const commentModelName = config.commentModelName ?? 'comment';

  // BlogService 생성
  const blogService = createBlogService(config.prisma, {
    modelName: config.modelName,
    enableTags: tagsEnabled,
    tagModelName,
    postTagModelName,
    storage: config.storage,
    sanitizeContent: config.sanitizeContent,
    onViewCount: config.onViewCount,
  });

  // 라우트 핸들러 생성 (i18n 에러 메시지 주입)
  const postRoutes = createPostRoutes(blogService, {
    pageSize: config.pageSize,
    authMiddleware: config.authMiddleware,
    maxAttachments: config.maxAttachments,
    i18n: config.i18n,
  });

  // TagService / TagRoutes 생성 (feature 토글에 따라)
  let tagService: TagService | null = null;
  let tagRoutes: { public: TagPublicRoutes; admin: TagAdminRoutes } | null = null;

  if (tagsEnabled) {
    tagService = createTagService(config.prisma, {
      tagModelName,
      postModelName: config.modelName,
      postTagModelName,
    });
    tagRoutes = createTagRoutes(tagService, {
      pageSize: config.pageSize,
      authMiddleware: config.authMiddleware,
      i18n: config.i18n,
    });
  }

  // CommentService / CommentRoutes 생성 (feature 토글에 따라)
  let commentService: CommentService | null = null;
  let commentRoutes: { public: CommentPublicRoutes; admin: CommentAdminRoutes } | null = null;

  if (commentsEnabled) {
    const commentConfig = commentsConfig as CommentFeatureConfig;
    commentService = createCommentService(config.prisma, {
      commentModelName,
      autoApprove: commentConfig.autoApprove,
      requireLogin: commentConfig.requireLogin,
      maxDepth: commentConfig.maxDepth,
      rateLimit: commentConfig.rateLimit,
    });
    commentRoutes = createCommentRoutes(commentService, {
      authMiddleware: config.authMiddleware,
      hmacSecret: config.commentHmacSecret,
      i18n: config.i18n,
      ipHeader: commentConfig.ipHeader,
    });
  }

  // SearchService / SearchRoutes 생성 (feature 토글에 따라)
  let searchService: SearchService | null = null;
  let searchRoutes: { public: SearchPublicRoutes } | null = null;

  if (searchEnabled) {
    searchService = createSearchService(config.prisma, {
      postModelName: config.modelName,
      tableName: config.searchTableName ?? 'blog_posts',
      lang: config.searchLang,
    });
    searchRoutes = createSearchRoutes(searchService, {
      pageSize: config.pageSize,
    });
  }

  // SchedulerService / SchedulerRoutes 생성 (feature 토글에 따라)
  let schedulerService: SchedulerService | null = null;
  let schedulerRoutes: { admin: SchedulerAdminRoutes } | null = null;

  if (schedulerEnabled) {
    const schedConfig = schedulerConfig as SchedulerFeatureConfig;
    schedulerService = createSchedulerService(config.prisma, {
      modelName: config.modelName,
    });
    schedulerRoutes = createSchedulerRoutes(schedulerService, {
      authMiddleware: config.authMiddleware,
      cronSecret: schedConfig.cronSecret,
    });
  }

  return {
    services: {
      posts: blogService,
      tags: tagService,
      comments: commentService,
      search: searchService,
      scheduler: schedulerService,
    },
    routes: {
      public: {
        posts: postRoutes.public,
        tags: tagRoutes?.public ?? null,
        comments: commentRoutes?.public ?? null,
        search: searchRoutes?.public ?? null,
      },
      admin: {
        posts: postRoutes.admin,
        tags: tagRoutes?.admin ?? null,
        comments: commentRoutes?.admin ?? null,
        scheduler: schedulerRoutes?.admin ?? null,
      },
    },
  };
}

// ── Re-exports ──

// Types
export type {
  Attachment,
  BlogListItem,
  BlogDetail,
  BlogNav,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  CategoryTheme,
  DashboardStats,
} from './types/blog';

export type { PaginatedResult, SortOrder } from './types/common';

export type {
  Tag,
  TagWithCount,
  CreateTagInput,
  UpdateTagInput,
} from './types/tag';

export type {
  Comment,
  CommentStatus,
  CreateCommentInput,
  UpdateCommentStatusInput,
} from './types/comment';

export type {
  BlogConfig,
  BlogFeatures,
  CommentFeatureConfig,
  SchedulerFeatureConfig,
  StorageAdapter,
  AuthMiddleware,
  AuthUser,
  PrismaClientLike,
} from './types/config';

// Services
export { createBlogService } from './services/blog.service';
export type { BlogService, BlogServiceConfig } from './services/blog.service';

export { createTagService } from './services/tag.service';
export type { TagService, TagServiceConfig } from './services/tag.service';

export { createCommentService } from './services/comment.service';
export type { CommentService, CommentServiceConfig } from './services/comment.service';

export { createSearchService } from './services/search.service';
export type { SearchService, SearchServiceConfig, SearchOptions, SearchResult } from './services/search.service';

export { createSchedulerService } from './services/scheduler.service';
export type { SchedulerService, SchedulerServiceConfig, ProcessScheduledResult } from './services/scheduler.service';

// Routes
export { createPostRoutes } from './routes/post.routes';
export type { PostPublicRoutes, PostAdminRoutes, PostRoutesConfig } from './routes/post.routes';

export { createTagRoutes } from './routes/tag.routes';
export type { TagPublicRoutes, TagAdminRoutes, TagRoutesConfig } from './routes/tag.routes';

export { createCommentRoutes } from './routes/comment.routes';
export type { CommentPublicRoutes, CommentAdminRoutes, CommentRoutesConfig } from './routes/comment.routes';

export { createSearchRoutes } from './routes/search.routes';
export type { SearchPublicRoutes, SearchRoutesConfig as SearchRoutesConfigType } from './routes/search.routes';

export { createSchedulerRoutes } from './routes/scheduler.routes';
export type { SchedulerAdminRoutes, SchedulerRoutesConfig as SchedulerRoutesConfigType } from './routes/scheduler.routes';

// Errors
export { BlogError, BLOG_ERROR_CODES } from './errors';
export type { BlogErrorCode } from './errors';

// Utils
export {
  buildPaginatedResult,
  toLocalDatetime,
  formatDateTime,
  formatDate,
  formatDateISO,
  formatDateRelative,
  sanitizeHtmlContent,
  createSanitizer,
  generateSlug,
  isValidSlug,
  SLUG_PATTERN,
  formatFileSize,
  getFileIcon,
  hashIp,
  createIpHasher,
  createCategoryThemeVars,
} from './utils';
export type { SanitizerConfig } from './utils';

// SEO
export {
  generateMetadata,
  generateListMetadata,
  prepareOGImageData,
  createSitemap,
  createRSSFeed,
  escapeXml,
  toRfc822,
  generateJsonLd,
  generateBreadcrumbJsonLd,
} from './seo';
export type {
  Metadata,
  MetadataOptions,
  ListMetadataOptions,
  OGImageData,
  SitemapEntry,
  SitemapOptions,
  SitemapChangeFrequency,
  RSSOptions,
  RSSFeedItem,
  JsonLdOptions,
  BreadcrumbItem,
} from './seo';

// i18n
export { resolveI18n, DEFAULT_I18N_KO } from './i18n';
export type { BlogI18nStrings } from './i18n';

// Validators
export {
  slugSchema,
  optionalUrlSchema,
  attachmentSchema,
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  BulkUpdateSchema,
  createBlogSchemas,
  CreateTagSchema,
  UpdateTagSchema,
  createTagSchemas,
  CreateCommentSchema,
  UpdateCommentStatusSchema,
  createCommentSchemas,
} from './validators';
export type {
  CreateBlogPostData,
  UpdateBlogPostData,
  BulkUpdateData,
  BlogSchemaConfig,
  BlogSchemas,
  CreateTagData,
  UpdateTagData,
  TagSchemaConfig,
  TagSchemas,
  CreateCommentData,
  UpdateCommentStatusData,
  CommentSchemaConfig,
  CommentSchemas,
} from './validators';

// Storage
export { createS3StorageAdapter } from './storage';
export type { S3StorageConfig } from './storage';

// ── Design System Injection (types only — runtime exports via ./components/admin) ──

export type { BlogThemeProviderProps } from './context/BlogUIContext';

export type {
  BlogUIComponents,
  ButtonProps as BlogButtonProps,
  ToggleProps as BlogToggleProps,
  InputProps as BlogInputProps,
  TextareaProps as BlogTextareaProps,
  SelectProps as BlogSelectProps,
  BadgeProps as BlogBadgeProps,
  CardProps as BlogCardProps,
  LinkProps as BlogLinkProps,
} from './types/ui-components';
