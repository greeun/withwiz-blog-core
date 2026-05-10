/**
 * 태그 API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 구조화된 객체로 반환한다.
 */
import type { TagService } from '../services/tag.service';
import type { AuthMiddleware, AuthUser } from '../types/config';
import type { BlogI18nStrings } from '../i18n/types';
import { BlogError, BLOG_ERROR_CODES } from '../errors';
import { createTagSchemas } from '../validators/tag.validator';

// ── Next.js 타입 (duck typing) ──

type RouteHandler = (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

// ── 헬퍼 ──

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function successResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return jsonResponse({ success: true, data }, status, headers);
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

function getSearchParams(req: Request): URLSearchParams {
  const url = new URL(req.url);
  return url.searchParams;
}

function getSearchParam(req: Request, key: string): string | undefined {
  const value = getSearchParams(req).get(key);
  return value ?? undefined;
}

function parsePagination(req: Request, defaultPageSize = 20, maxPageSize = 100) {
  const params = getSearchParams(req);
  const rawPage = params.get('page');
  const rawLimit = params.get('limit');
  const page = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1;
  const limit = rawLimit
    ? Math.min(maxPageSize, Math.max(1, parseInt(rawLimit, 10) || defaultPageSize))
    : defaultPageSize;
  return { page, limit };
}

async function getRouteParam(context: { params: Promise<Record<string, string>> } | undefined, key: string): Promise<string> {
  if (!context) throw new BlogError(BLOG_ERROR_CODES.VALIDATION_FAILED, `Missing route parameter: ${key}`);
  const params = await context.params;
  const value = params[key];
  if (!value) throw new BlogError(BLOG_ERROR_CODES.VALIDATION_FAILED, `Missing route parameter: ${key}`);
  return value;
}

function handleError(err: unknown): Response {
  if (err instanceof BlogError) {
    return errorResponse(err.code, err.message, err.statusCode);
  }
  // eslint-disable-next-line no-console
  console.error('[blog-core-v2] Unhandled error:', err);
  return errorResponse(
    BLOG_ERROR_CODES.INTERNAL_ERROR,
    err instanceof Error ? err.message : 'Internal server error',
    500,
  );
}

function withAuth(
  authMiddleware: AuthMiddleware | undefined,
  handler: (req: Request, user: AuthUser, context?: { params: Promise<Record<string, string>> }) => Promise<Response>,
): RouteHandler {
  return async (req, context) => {
    try {
      if (authMiddleware) {
        const user = await authMiddleware(req);
        if (!user) {
          return errorResponse(BLOG_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
        }
        return await handler(req, user, context);
      }
      return await handler(req, { id: 'anonymous' }, context);
    } catch (err) {
      return handleError(err);
    }
  };
}

function withPublic(
  handler: (req: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>,
): RouteHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      return handleError(err);
    }
  };
}

// ── 라우트 타입 ──

export interface TagPublicRoutes {
  list: { GET: RouteHandler };
  cloud: { GET: RouteHandler };
  posts: { GET: RouteHandler };
}

export interface TagAdminRoutes {
  list: {
    GET: RouteHandler;
    POST: RouteHandler;
  };
  detail: {
    GET: RouteHandler;
    PUT: RouteHandler;
    DELETE: RouteHandler;
  };
}

export interface TagRoutesConfig {
  pageSize?: number;
  authMiddleware?: AuthMiddleware;
  /** i18n 오버라이드 (validators 에러 메시지에 적용) */
  i18n?: Partial<BlogI18nStrings>;
  /** Zod 입력 유효성 검사 활성화 (default: true) */
  enableValidation?: boolean;
}

/**
 * Zod 스키마로 입력을 검증한다.
 * ZodType 대신 duck typing(safeParse)을 사용하여 zod import를 회피한다.
 */
function validateWithSchema(
  schema: { safeParse: (data: unknown) => { success: boolean; error?: { errors: Array<{ path: (string | number)[]; message: string }> }; data?: unknown } } | undefined,
  data: unknown,
): { valid: true; data: unknown } | { valid: false; response: Response } {
  if (!schema) {
    return { valid: true, data };
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error?.errors[0];
    const message = firstError
      ? `${firstError.path.join('.')}: ${firstError.message}`
      : 'Validation failed';
    return {
      valid: false,
      response: errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, message, 400),
    };
  }
  return { valid: true, data: result.data };
}

// ── 팩토리 함수 ──

export function createTagRoutes(
  tagService: TagService,
  config?: TagRoutesConfig,
): { public: TagPublicRoutes; admin: TagAdminRoutes } {
  const pageSize = config?.pageSize ?? 20;
  const authMiddleware = config?.authMiddleware;
  const enableValidation = config?.enableValidation !== false;

  // Zod 스키마 생성 (i18n 에러 메시지 주입)
  const schemas = enableValidation
    ? createTagSchemas({ i18n: config?.i18n })
    : undefined;

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  };

  return {
    public: {
      list: {
        GET: withPublic(async (req) => {
          const { page, limit } = parsePagination(req, pageSize);
          const search = getSearchParam(req, 'search');

          const result = await tagService.listAll({ page, limit, search });

          return successResponse(result, 200, cacheHeaders);
        }),
      },

      cloud: {
        GET: withPublic(async (req) => {
          const limitParam = getSearchParam(req, 'limit');
          const limit = limitParam ? parseInt(limitParam, 10) : undefined;

          const result = await tagService.getTagCloud(
            Number.isFinite(limit) ? (limit as number) : undefined,
          );

          return successResponse(result, 200, {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
          });
        }),
      },

      posts: {
        GET: withPublic(async (req, context) => {
          const slug = await getRouteParam(context, 'slug');
          const { page, limit } = parsePagination(req, 12, 50);

          const result = await tagService.getPostsByTag(slug, { page, limit });

          return successResponse(result, 200, cacheHeaders);
        }),
      },
    },

    admin: {
      list: {
        GET: withAuth(authMiddleware, async (req) => {
          const { page, limit } = parsePagination(req, pageSize);
          const search = getSearchParam(req, 'search');

          const result = await tagService.listAll({ page, limit, search });

          return successResponse(result);
        }),

        POST: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;

          // Zod 스키마 검증 (활성화 시)
          if (schemas) {
            const check = validateWithSchema(schemas.CreateTagSchema, body);
            if (!check.valid) return check.response;
          } else {
            const { slug, name } = body;
            if (typeof slug !== 'string' || !slug.trim()) {
              return errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'slug is required', 400);
            }
            if (typeof name !== 'string' || !name.trim()) {
              return errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'name is required', 400);
            }
          }

          const { slug, name, description } = body as { slug: string; name: string; description?: string };
          const created = await tagService.create({
            slug: slug.trim(),
            name: name.trim(),
            description: typeof description === 'string' ? description : undefined,
          });

          return successResponse(created, 201);
        }),
      },

      detail: {
        GET: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const tag = await tagService.getById(id);
          if (!tag) {
            return errorResponse(BLOG_ERROR_CODES.TAG_NOT_FOUND, 'Tag not found', 404);
          }
          return successResponse(tag);
        }),

        PUT: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const body = (await req.json()) as Record<string, unknown>;

          const existing = await tagService.getById(id);
          if (!existing) {
            return errorResponse(BLOG_ERROR_CODES.TAG_NOT_FOUND, 'Tag not found', 404);
          }

          // Zod 스키마 검증 (활성화 시)
          if (schemas) {
            const check = validateWithSchema(schemas.UpdateTagSchema, body);
            if (!check.valid) return check.response;
          }

          const { slug, name, description } = body;
          const data: Record<string, unknown> = {};
          if (typeof slug === 'string') data.slug = slug.trim();
          if (typeof name === 'string') data.name = name.trim();
          if (typeof description === 'string') data.description = description;

          const updated = await tagService.update(id, data);
          return successResponse(updated);
        }),

        DELETE: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          await tagService.remove(id);
          return new Response(null, { status: 204 });
        }),
      },
    },
  };
}
