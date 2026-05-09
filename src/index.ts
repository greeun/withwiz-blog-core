/**
 * @withwiz/blog-core 패키지 진입점
 * 모든 public API를 re-export한다.
 */

// 타입
export type {
  Attachment,
  BlogListItem,
  BlogDetail,
  BlogNav,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  CategoryTheme,
  BlogConfig,
  BlogServiceConfig,
  R2Helpers,
  BlogI18nStrings,
  DashboardStats,
} from './types';
export type { PaginatedResult, SortOrder } from './types';

// 태그 타입
export type {
  Tag,
  TagWithCount,
  CreateTagInput,
  UpdateTagInput,
} from './types';

// 댓글 타입
export type {
  Comment,
  CommentStatus,
  CreateCommentInput,
  UpdateCommentStatusInput,
} from './types';

// 서비스
export {
  createBlogService,
  createTagService,
  createCommentService,
  createSearchService,
  createSchedulerService,
} from './services';
export type {
  BlogService,
  TagService,
  TagServiceConfig,
  CommentService,
  CommentServiceConfig,
  SearchService,
  SearchServiceConfig,
  SearchOptions,
  SearchResult,
  SchedulerService,
  SchedulerServiceConfig,
  ProcessScheduledResult,
} from './services';

// 라우트 핸들러 팩토리
export { createSchedulerRoutes } from './routes';
export type {
  SchedulerRoutes,
  SchedulerRoutesConfig,
} from './routes';

// 유효성 검사
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

// 유틸리티
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
  formatFileSize,
  getFileIcon,
  hashIp,
  createIpHasher,
} from './utils';
export type { SanitizerConfig } from './utils';

// 블록 에디터 프리셋
export {
  BLOG_PRESET,
  BLOG_CAT_CLASSES,
  createBlogPreset,
  DEFAULT_BLOCKS,
  createCategoryBlocks,
} from './presets';
export type { CategoryConfig } from './presets/block-editor';

// i18n
export { DEFAULT_I18N_KO, resolveI18n } from './i18n';

// 도메인 에러
export { BlogError, BLOG_ERROR_CODES } from './errors';
export type { BlogErrorCode } from './errors';

// SEO 유틸리티
export {
  generateMetadata,
  generateListMetadata,
  prepareOGImageData,
  createSitemap,
  createRSSFeed,
  generateJsonLd,
  generateBreadcrumbJsonLd,
  escapeXml,
  toRfc822,
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
  JsonLdOptions,
  BreadcrumbItem,
} from './seo';
