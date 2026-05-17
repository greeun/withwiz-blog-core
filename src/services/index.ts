/**
 * blog-core-v2 서비스 re-export (서버 전용 — 엔트리 분리로 경계 강제)
 */
export { createBlogService } from './blog.service';
export type { BlogService, BlogServiceConfig } from './blog.service';

export { createTagService } from './tag.service';
export type { TagService, TagServiceConfig } from './tag.service';

export { createCommentService } from './comment.service';
export type { CommentService, CommentServiceConfig } from './comment.service';

export { createSearchService } from './search.service';
export type { SearchService, SearchServiceConfig, SearchOptions, SearchResult } from './search.service';

export { createSchedulerService } from './scheduler.service';
export type { SchedulerService, SchedulerServiceConfig, ProcessScheduledResult } from './scheduler.service';
