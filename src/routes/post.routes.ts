/**
 * 포스트 API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 구조화된 객체로 반환한다.
 * @withwiz/toolkit 미들웨어에 의존하지 않고 독립적으로 동작한다.
 */
import type { BlogService } from '../services/blog.service';
import type { AuthMiddleware } from '../types/config';
import type { BlogI18nStrings } from '../i18n/types';
import { BLOG_ERROR_CODES } from '../errors';
import { createBlogSchemas } from '../validators/blog.validator';
import {
  successResponse,
  errorResponse,
  getSearchParam,
  getSearchParams,
  parsePagination,
  getRouteParam,
  validateIds,
  validateWithSchema,
  makeRouteKit,
  type RouteHandler,
} from './_shared';

const { withAuth, withPublic } = makeRouteKit('[@withwiz/blog-core] Unhandled error:');

const VALID_SORT_KEYS = ['createdAt', 'publishedAt', 'updatedAt'] as const;

function parseSortKey(params: URLSearchParams): 'createdAt' | 'publishedAt' | 'updatedAt' {
  const raw = params.get('sortBy');
  if (raw && (VALID_SORT_KEYS as readonly string[]).includes(raw)) {
    return raw as 'createdAt' | 'publishedAt' | 'updatedAt';
  }
  return 'updatedAt';
}

// 응답/인증/검증/페이지네이션 헬퍼는 ./_shared로 단일화되었다.

// ── 라우트 타입 ──

export interface PostPublicRoutes {
  list: { GET: RouteHandler };
  detail: { GET: RouteHandler };
  featured: { GET: RouteHandler };
}

export interface PostAdminRoutes {
  list: {
    GET: RouteHandler;
    POST: RouteHandler;
    DELETE: RouteHandler;
  };
  detail: {
    GET: RouteHandler;
    PUT: RouteHandler;
    DELETE: RouteHandler;
  };
  publish: { PATCH: RouteHandler };
  bulk: {
    PATCH: RouteHandler;
    DELETE: RouteHandler;
  };
  slugCheck: { GET: RouteHandler };
  dashboard: { GET: RouteHandler };
}

export interface PostRoutesConfig {
  pageSize?: number;
  authMiddleware?: AuthMiddleware;
  /** 최대 첨부파일 수 (validators에 전달) */
  maxAttachments?: number;
  /** i18n 오버라이드 (validators 에러 메시지에 적용) */
  i18n?: Partial<BlogI18nStrings>;
  /** Zod 입력 유효성 검사 활성화 (default: true) */
  enableValidation?: boolean;
}

// ── 팩토리 함수 ──

export function createPostRoutes(
  blogService: BlogService,
  config?: PostRoutesConfig,
): { public: PostPublicRoutes; admin: PostAdminRoutes } {
  const pageSize = config?.pageSize ?? 12;
  const authMiddleware = config?.authMiddleware;
  const enableValidation = config?.enableValidation !== false;

  // Zod 스키마 생성 (i18n 에러 메시지 주입)
  const schemas = enableValidation
    ? createBlogSchemas({
        maxAttachments: config?.maxAttachments,
        i18n: config?.i18n,
      })
    : undefined;

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  };

  return {
    public: {
      list: {
        GET: withPublic(async (req) => {
          const { page, limit } = parsePagination(req, pageSize, 50);
          const category = getSearchParam(req, 'category');
          const search = getSearchParam(req, 'search');
          const tagSlug = getSearchParam(req, 'tagSlug');

          const result = await blogService.listPublished({
            page,
            limit,
            category,
            search,
            tagSlug,
          });

          return successResponse(result, 200, cacheHeaders);
        }),
      },

      detail: {
        GET: withPublic(async (req, context) => {
          const slug = await getRouteParam(context, 'slug');
          const post = await blogService.getPublishedBySlug(slug);

          if (!post) {
            return errorResponse(BLOG_ERROR_CODES.POST_NOT_FOUND, 'Post not found', 404);
          }

          return successResponse(post, 200, cacheHeaders);
        }),
      },

      featured: {
        GET: withPublic(async (req) => {
          const limitParam = getSearchParam(req, 'limit');
          const limit = limitParam ? parseInt(limitParam, 10) : undefined;

          const result = await blogService.getFeatured(limit);

          return successResponse(result, 200, cacheHeaders);
        }),
      },
    },

    admin: {
      list: {
        GET: withAuth(authMiddleware, async (req) => {
          const { page, limit } = parsePagination(req, 12, 50);
          const params = getSearchParams(req);
          const category = getSearchParam(req, 'category');
          const published = getSearchParam(req, 'published');
          const search = getSearchParam(req, 'search');
          const sortBy = parseSortKey(params);

          const result = await blogService.listAll({
            page,
            limit,
            category,
            published,
            search,
            sortBy,
          });

          return successResponse(result);
        }),

        POST: withAuth(authMiddleware, async (req, user) => {
          const body = (await req.json()) as Record<string, unknown>;

          // Zod 스키마 검증 (활성화 시)
          if (schemas) {
            const check = validateWithSchema(schemas.CreateBlogPostSchema, body);
            if (!check.valid) return check.response;
          } else {
            // 폴백: 기본 검증
            if (!body.title || !body.content || !body.category || !body.slug) {
              return errorResponse(
                BLOG_ERROR_CODES.VALIDATION_FAILED,
                'title, content, category, and slug are required',
                400,
              );
            }
          }

          const post = await blogService.create(body as any, user.id);
          return successResponse(post, 201);
        }),

        DELETE: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;
          const check = validateIds(body.ids);
          if (!check.valid) return check.response;

          const deleted = await blogService.removeMany(check.ids);
          return successResponse({ deleted });
        }),
      },

      detail: {
        GET: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const post = await blogService.getById(id);

          if (!post) {
            return errorResponse(BLOG_ERROR_CODES.POST_NOT_FOUND, 'Post not found', 404);
          }

          return successResponse(post);
        }),

        PUT: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const body = (await req.json()) as Record<string, unknown>;

          const existing = await blogService.getById(id);
          if (!existing) {
            return errorResponse(BLOG_ERROR_CODES.POST_NOT_FOUND, 'Post not found', 404);
          }

          // Zod 스키마 검증 (활성화 시)
          if (schemas) {
            const check = validateWithSchema(schemas.UpdateBlogPostSchema, body);
            if (!check.valid) return check.response;
          }

          const post = await blogService.update(id, body as any);
          return successResponse(post);
        }),

        DELETE: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          await blogService.remove(id);
          return new Response(null, { status: 204 });
        }),
      },

      publish: {
        PATCH: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const result = await blogService.togglePublish(id);
          return successResponse(result);
        }),
      },

      bulk: {
        PATCH: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;

          // Zod 스키마 검증 (활성화 시)
          if (schemas) {
            const check = validateWithSchema(schemas.BulkUpdateSchema, body);
            if (!check.valid) return check.response;
          }

          const { ids, published, featured } = body as {
            ids: unknown;
            published?: boolean;
            featured?: boolean;
          };

          if (!Array.isArray(ids) || ids.length === 0) {
            return errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'ids array is required', 400);
          }

          let count = 0;
          if (published !== undefined) {
            count += await blogService.bulkUpdatePublished(ids as string[], published);
          }
          if (featured !== undefined) {
            count += await blogService.bulkUpdateFeatured(ids as string[], featured);
          }

          return successResponse({ count });
        }),

        DELETE: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;
          const check = validateIds(body.ids);
          if (!check.valid) return check.response;

          const deleted = await blogService.removeMany(check.ids);
          return successResponse({ deleted });
        }),
      },

      slugCheck: {
        GET: withAuth(authMiddleware, async (req) => {
          const slug = getSearchParam(req, 'slug')?.trim();
          const excludeId = getSearchParam(req, 'excludeId');

          if (!slug) {
            return errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'slug parameter is required', 400);
          }

          const available = await blogService.checkSlugAvailable(slug, excludeId);

          return successResponse(
            { available },
            200,
            { 'Cache-Control': 'private, max-age=10' },
          );
        }),
      },

      dashboard: {
        GET: withAuth(authMiddleware, async () => {
          const stats = await blogService.getDashboardStats();
          return successResponse(stats);
        }),
      },
    },
  };
}
