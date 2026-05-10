/**
 * 댓글 API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 구조화된 객체로 반환한다.
 */
import type { CommentService } from '../services/comment.service';
import type { CommentStatus, CreateCommentInput } from '../types/comment';
import type { AuthMiddleware, AuthUser } from '../types/config';
import type { BlogI18nStrings } from '../i18n/types';
import { BlogError, BLOG_ERROR_CODES } from '../errors';
import { hashIp } from '../utils/ip-hash';
import { createCommentSchemas } from '../validators/comment.validator';

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

// ── IP 추출 ──

/** 요청에서 클라이언트 IP를 추출한다 (CF > X-Real-IP > X-Forwarded-For) */
function extractClientIp(request: Request): string | null {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return cf.trim();

  const real = request.headers.get('x-real-ip');
  if (real && real.trim()) return real.trim();

  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

// ── CommentStatus 검증 ──

const COMMENT_STATUS_VALUES: CommentStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'SPAM'];

function isCommentStatus(value: unknown): value is CommentStatus {
  return typeof value === 'string' && COMMENT_STATUS_VALUES.includes(value as CommentStatus);
}

function validateIds(ids: unknown): { valid: true; ids: string[] } | { valid: false; response: Response } {
  if (!Array.isArray(ids) || ids.length === 0) {
    return {
      valid: false,
      response: errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'ids array is required', 400),
    };
  }
  return { valid: true, ids: ids as string[] };
}

// ── 라우트 타입 ──

export interface CommentPublicRoutes {
  list: { GET: RouteHandler };
  create: { POST: RouteHandler };
}

export interface CommentAdminRoutes {
  list: { GET: RouteHandler };
  detail: {
    PATCH: RouteHandler;
    DELETE: RouteHandler;
  };
  bulk: {
    PATCH: RouteHandler;
    DELETE: RouteHandler;
  };
  pendingCount: { GET: RouteHandler };
}

export interface CommentRoutesConfig {
  authMiddleware?: AuthMiddleware;
  /** IP 해시에 사용할 HMAC 시크릿 */
  hmacSecret?: string;
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

export function createCommentRoutes(
  commentService: CommentService,
  config?: CommentRoutesConfig,
): { public: CommentPublicRoutes; admin: CommentAdminRoutes } {
  const authMiddleware = config?.authMiddleware;
  const hmacSecret = config?.hmacSecret ?? process.env.JWT_SECRET ?? 'comment-ip-hash-default';
  const enableValidation = config?.enableValidation !== false;

  // Zod 스키마 생성 (i18n 에러 메시지 주입)
  const schemas = enableValidation
    ? createCommentSchemas({ i18n: config?.i18n })
    : undefined;

  return {
    public: {
      list: {
        GET: withPublic(async (req, context) => {
          const postId = await getRouteParam(context, 'postId');
          const includeRepliesParam = getSearchParam(req, 'includeReplies');
          const includeReplies = includeRepliesParam !== 'false';

          const comments = await commentService.listByPost(postId, { includeReplies });

          return successResponse(comments, 200, {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          });
        }),
      },

      create: {
        POST: withPublic(async (req, context) => {
          const postId = await getRouteParam(context, 'postId');
          const body = (await req.json()) as Record<string, unknown>;

          // Zod 스키마 검증 (활성화 시)
          const validationBody = { ...body, postId };
          if (schemas) {
            const check = validateWithSchema(schemas.CreateCommentSchema, validationBody);
            if (!check.valid) return check.response;
          } else {
            if (typeof body.content !== 'string' || !(body.content as string).trim()) {
              return errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'content is required', 400);
            }
          }

          const { parentId, content, guestName, guestEmail, honeypot } = body;

          const input: CreateCommentInput = {
            postId,
            content: (content as string).trim(),
          };
          if (typeof parentId === 'string' && parentId.trim()) {
            input.parentId = parentId.trim();
          }
          if (typeof guestName === 'string') input.guestName = guestName;
          if (typeof guestEmail === 'string') input.guestEmail = guestEmail;
          if (typeof honeypot === 'string') input.honeypot = honeypot;

          const ip = extractClientIp(req);
          const ipHash = ip ? hashIp(ip, hmacSecret) : undefined;

          // honeypot이 트리거된 경우 서비스에서 SPAM으로 저장하지만 클라이언트에는 성공으로 표시
          const created = await commentService.create(input, {
            userId: undefined,
            ipHash,
          });

          return successResponse(created, 201);
        }),
      },
    },

    admin: {
      list: {
        GET: withAuth(authMiddleware, async (req) => {
          const { page, limit } = parsePagination(req);
          const statusParam = getSearchParam(req, 'status');
          const postId = getSearchParam(req, 'postId');

          const status = isCommentStatus(statusParam) ? statusParam : undefined;

          const result = await commentService.listAll({
            page,
            limit,
            status,
            postId,
          });

          return successResponse(result);
        }),
      },

      detail: {
        PATCH: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const body = (await req.json()) as Record<string, unknown>;
          const { status } = body;

          if (!isCommentStatus(status)) {
            return errorResponse(
              BLOG_ERROR_CODES.VALIDATION_FAILED,
              `status must be one of: ${COMMENT_STATUS_VALUES.join(', ')}`,
              400,
            );
          }

          const updated = await commentService.updateStatus(id, status);
          return successResponse(updated);
        }),

        DELETE: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          await commentService.remove(id);
          return new Response(null, { status: 204 });
        }),
      },

      bulk: {
        PATCH: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;
          const { ids, status } = body;

          const check = validateIds(ids);
          if (!check.valid) return check.response;

          if (!isCommentStatus(status)) {
            return errorResponse(
              BLOG_ERROR_CODES.VALIDATION_FAILED,
              `status must be one of: ${COMMENT_STATUS_VALUES.join(', ')}`,
              400,
            );
          }

          const count = await commentService.bulkUpdateStatus(check.ids, status);
          return successResponse({ count });
        }),

        DELETE: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;
          const check = validateIds(body.ids);
          if (!check.valid) return check.response;

          const count = await commentService.removeMany(check.ids);
          return successResponse({ count });
        }),
      },

      pendingCount: {
        GET: withAuth(authMiddleware, async () => {
          const count = await commentService.getPendingCount();
          return successResponse({ count });
        }),
      },
    },
  };
}
