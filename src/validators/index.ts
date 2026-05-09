/**
 * 블로그 패키지 유효성 검사 스키마 re-export
 */
export {
  slugSchema,
  optionalUrlSchema,
  attachmentSchema,
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  BulkUpdateSchema,
  createBlogSchemas,
} from './blog.validator';

export type {
  CreateBlogPostData,
  UpdateBlogPostData,
  BulkUpdateData,
  BlogSchemaConfig,
  BlogSchemas,
} from './blog.validator';

// 태그 스키마
export {
  CreateTagSchema,
  UpdateTagSchema,
  createTagSchemas,
} from './tag.validator';
export type {
  CreateTagData,
  UpdateTagData,
  TagSchemaConfig,
  TagSchemas,
} from './tag.validator';

// 댓글 스키마
export {
  CreateCommentSchema,
  UpdateCommentStatusSchema,
  createCommentSchemas,
} from './comment.validator';
export type {
  CreateCommentData,
  UpdateCommentStatusData,
  CommentSchemaConfig,
  CommentSchemas,
} from './comment.validator';
