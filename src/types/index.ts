/**
 * @withwiz/blog-core 타입 re-export
 */
export type {
  Attachment,
  BlogListItem,
  BlogDetail,
  BlogNav,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  CategoryTheme,
  DashboardStats,
  EditorType,
} from './blog';

export type { PaginatedResult, SortOrder } from './common';

export type {
  Tag,
  TagWithCount,
  CreateTagInput,
  UpdateTagInput,
} from './tag';

export type {
  Comment,
  CommentStatus,
  CreateCommentInput,
  UpdateCommentStatusInput,
} from './comment';

export type {
  BlogConfig,
  BlogFeatures,
  CommentFeatureConfig,
  SchedulerFeatureConfig,
  StorageAdapter,
  AuthMiddleware,
  AuthUser,
  PrismaClientLike,
} from './config';

export type { BlogI18nStrings } from '../i18n/types';
