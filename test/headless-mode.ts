/**
 * Headless 모드 검증 파일
 *
 * UI 컴포넌트를 import하지 않고 services + routes만 사용하여
 * 블로그가 동작함을 검증한다.
 *
 * 검증 방법: `npx tsc --noEmit --strict test/headless-mode.ts`
 * (이 파일은 런타임에 실행하지 않고, 타입 수준에서만 검증한다.)
 */

// ── 1. 메인 팩토리 함수 import ──
import { createBlog } from '../src/index';
import type { BlogInstance } from '../src/index';

// ── 2. types 서브패스에서 타입 import ──
import type {
  BlogConfig,
  BlogFeatures,
  BlogListItem,
  BlogDetail,
  BlogNav,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  CategoryTheme,
  DashboardStats,
  PaginatedResult,
  SortOrder,
  Tag,
  TagWithCount,
  Comment,
  CommentStatus,
  CreateCommentInput,
  Attachment,
  StorageAdapter,
  AuthMiddleware,
  AuthUser,
  PrismaClientLike,
} from '../src/types';

// ── 3. services 서브패스에서 import ──
import { createBlogService } from '../src/services';
import type {
  BlogService,
  BlogServiceConfig,
  TagService,
  CommentService,
  SearchService,
  SchedulerService,
} from '../src/services';

// ── 4. routes 서브패스에서 import ──
import { createPostRoutes } from '../src/routes';
import type {
  PostPublicRoutes,
  PostAdminRoutes,
  TagPublicRoutes,
  TagAdminRoutes,
  CommentPublicRoutes,
  CommentAdminRoutes,
  SearchPublicRoutes,
  SchedulerAdminRoutes,
} from '../src/routes';

// ── 5. utils 서브패스에서 import ──
import {
  generateSlug,
  isValidSlug,
  buildPaginatedResult,
  formatFileSize,
  getFileIcon,
  formatDate,
  createCategoryThemeVars,
} from '../src/utils';

// ── 6. errors 서브패스에서 import ──
import { BlogError, BLOG_ERROR_CODES } from '../src/errors';
import type { BlogErrorCode } from '../src/errors';

// ── 7. seo 서브패스에서 import ──
import {
  generateMetadata,
  generateListMetadata,
  generateJsonLd,
  generateBreadcrumbJsonLd,
  createRSSFeed,
  createSitemap,
  prepareOGImageData,
} from '../src/seo';

// ── 8. i18n 서브패스에서 import ──
import { resolveI18n, DEFAULT_I18N_KO } from '../src/i18n';
import type { BlogI18nStrings } from '../src/i18n';

// ── 9. validators 서브패스에서 import ──
import {
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  createBlogSchemas,
  CreateTagSchema,
  CreateCommentSchema,
} from '../src/validators';

// ── 10. storage 서브패스에서 import ──
import { createS3StorageAdapter } from '../src/storage';
import type { S3StorageConfig } from '../src/storage';

// ── Headless 사용 시나리오 (타입 검증용) ──

/** 가짜 Prisma 클라이언트 (타입 검증용) */
const fakePrisma: PrismaClientLike = {
  blogPost: {} as any,
  tag: {} as any,
  postTag: {} as any,
  comment: {} as any,
  $transaction: async (fn: any) => fn(fakePrisma),
  $queryRawUnsafe: async () => [],
};

/** 카테고리 설정 */
const categories: Record<string, CategoryTheme> = {
  news: {
    key: 'news',
    main: '#2563eb',
    heroColor: '#1d4ed8',
    bgTint: '#eff6ff',
    bgQuote: '#dbeafe',
    border: '#93c5fd',
    divider: '#bfdbfe',
    label: '뉴스',
  },
};

/** createBlog 호출 (Headless 모드) */
function verifyHeadlessMode() {
  const blog: BlogInstance = createBlog({
    prisma: fakePrisma,
    modelName: 'blogPost',
    categories,
    basePath: '/blog',
    adminBasePath: '/admin/blog',
    apiBasePath: '/api/blog',
    adminApiBasePath: '/api/admin/blog',
    features: {
      tags: true,
      comments: { enabled: true, autoApprove: false },
      search: true,
      scheduler: { enabled: true, cronSecret: 'secret' },
    },
    onViewCount: async (_entityType, ids) => {
      const map = new Map<string, number>();
      ids.forEach((id) => map.set(id, 0));
      return map;
    },
  });

  // services 접근 — UI 없이 사용
  const _posts: BlogService = blog.services.posts;
  const _tags: TagService | null = blog.services.tags;
  const _comments: CommentService | null = blog.services.comments;
  const _search: SearchService | null = blog.services.search;
  const _scheduler: SchedulerService | null = blog.services.scheduler;

  // routes 접근 — Next.js route.ts에서 연결
  const _publicPosts: PostPublicRoutes = blog.routes.public.posts;
  const _adminPosts: PostAdminRoutes = blog.routes.admin.posts;

  // 유틸리티 사용
  const _slug: string = generateSlug('Hello World');
  const _valid: boolean = isValidSlug('hello-world');
  const _paginated = buildPaginatedResult<string>([], 0, 1, 10);
  const _size: string = formatFileSize(1024);
  const _icon: string = getFileIcon('application/pdf');
  const _date: string = formatDate(new Date());
  const _themeVars = createCategoryThemeVars(categories.news);

  // 에러 시스템
  const _error = new BlogError(BLOG_ERROR_CODES.POST_NOT_FOUND, 'Not found', 404);
  const _code: BlogErrorCode = BLOG_ERROR_CODES.POST_NOT_FOUND;

  // i18n
  const _t = resolveI18n({ adminListTitle: 'Blog Manager' });
  const _defaultT = DEFAULT_I18N_KO;

  // SEO (타입만 검증)
  type _MetaType = ReturnType<typeof generateMetadata>;
  type _JsonLdType = ReturnType<typeof generateJsonLd>;

  // Validator (타입만 검증)
  const _schemas = createBlogSchemas({ i18n: resolveI18n() });

  // 참조만으로도 import가 보장됨
  void _posts;
  void _tags;
  void _comments;
  void _search;
  void _scheduler;
  void _publicPosts;
  void _adminPosts;
  void _slug;
  void _valid;
  void _paginated;
  void _size;
  void _icon;
  void _date;
  void _themeVars;
  void _error;
  void _code;
  void _t;
  void _defaultT;
  void _schemas;
}

verifyHeadlessMode();
