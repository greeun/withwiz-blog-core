/**
 * @withwiz/blog-core 라우트 핸들러 re-export (서버 전용 — 엔트리 분리로 경계 강제)
 */
export { createPostRoutes } from './post.routes';
export type { PostPublicRoutes, PostAdminRoutes, PostRoutesConfig } from './post.routes';

export { createTagRoutes } from './tag.routes';
export type { TagPublicRoutes, TagAdminRoutes, TagRoutesConfig } from './tag.routes';

export { createCommentRoutes } from './comment.routes';
export type { CommentPublicRoutes, CommentAdminRoutes, CommentRoutesConfig } from './comment.routes';

export { createSearchRoutes } from './search.routes';
export type { SearchPublicRoutes, SearchRoutesConfig } from './search.routes';

export { createSchedulerRoutes } from './scheduler.routes';
export type { SchedulerAdminRoutes, SchedulerRoutesConfig } from './scheduler.routes';
