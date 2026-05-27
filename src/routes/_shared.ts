/**
 * 라우트 핸들러 공용 헬퍼 (내부 전용, 공개 엔트리 아님)
 *
 * post/tag/comment/search/scheduler 라우트가 중복 구현하던 응답/인증/페이지네이션
 * 헬퍼를 단일화한다. 동작은 기존과 동일하며, 라우트 그룹별로 다른 로그 라벨만
 * makeRouteKit(label)로 주입한다.
 */
import type { AuthMiddleware, AuthUser } from '../types/config';
import { BlogError, BLOG_ERROR_CODES } from '../errors';

// ── Next.js 라우트 핸들러 타입 (duck typing) ──

export type RouteHandler = (
  req: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

// ── 응답 헬퍼 ──

export function jsonResponse(
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function successResponse(
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return jsonResponse({ success: true, data }, status, headers);
}

export function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

// ── 쿼리스트링 헬퍼 ──

export function getSearchParams(req: Request): URLSearchParams {
  const url = new URL(req.url);
  return url.searchParams;
}

export function getSearchParam(req: Request, key: string): string | undefined {
  const value = getSearchParams(req).get(key);
  return value ?? undefined;
}

/**
 * page/limit 파싱. 호출부가 기존 파일별 기본값을 명시적으로 전달하므로
 * 시그니처 기본값은 가장 보편적인 값(20/100)으로 둔다.
 */
export function parsePagination(
  req: Request,
  defaultPageSize = 20,
  maxPageSize = 100,
): { page: number; limit: number } {
  const params = getSearchParams(req);
  const rawPage = params.get('page');
  const rawLimit = params.get('limit');
  const page = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1;
  const limit = rawLimit
    ? Math.min(maxPageSize, Math.max(1, parseInt(rawLimit, 10) || defaultPageSize))
    : defaultPageSize;
  return { page, limit };
}

// ── 라우트 파라미터 ──

export async function getRouteParam(
  context: { params: Promise<Record<string, string>> } | undefined,
  key: string,
): Promise<string> {
  if (!context) {
    throw new BlogError(BLOG_ERROR_CODES.VALIDATION_FAILED, `Missing route parameter: ${key}`);
  }
  const params = await context.params;
  const value = params[key];
  if (!value) {
    throw new BlogError(BLOG_ERROR_CODES.VALIDATION_FAILED, `Missing route parameter: ${key}`);
  }
  return value;
}

// ── 입력 검증 헬퍼 ──

export function validateIds(
  ids: unknown,
): { valid: true; ids: string[] } | { valid: false; response: Response } {
  if (!Array.isArray(ids) || ids.length === 0) {
    return {
      valid: false,
      response: errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'ids array is required', 400),
    };
  }
  return { valid: true, ids: ids as string[] };
}

/**
 * Zod 스키마로 입력을 검증한다.
 * ZodType 대신 duck typing(safeParse)을 사용하여 zod import를 회피한다.
 */
export function validateWithSchema(
  schema:
    | {
        safeParse: (data: unknown) => {
          success: boolean;
          error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
          data?: unknown;
        };
      }
    | undefined,
  data: unknown,
): { valid: true; data: unknown } | { valid: false; response: Response } {
  if (!schema) {
    return { valid: true, data };
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error?.issues[0];
    const message = firstError
      ? `${firstError.path.map(String).join('.')}: ${firstError.message}`
      : 'Validation failed';
    return {
      valid: false,
      response: errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, message, 400),
    };
  }
  return { valid: true, data: result.data };
}

// ── 라우트 그룹별 에러 핸들러 / 인증 래퍼 팩토리 ──

export interface RouteKit {
  handleError(err: unknown): Response;
  withAuth(
    authMiddleware: AuthMiddleware | undefined,
    handler: (
      req: Request,
      user: AuthUser,
      context?: { params: Promise<Record<string, string>> },
    ) => Promise<Response>,
  ): RouteHandler;
  withPublic(
    handler: (
      req: Request,
      context?: { params: Promise<Record<string, string>> },
    ) => Promise<Response>,
  ): RouteHandler;
}

/**
 * 라우트 그룹별 로그 라벨을 주입해 에러 핸들러/인증 래퍼를 생성한다.
 * @param errorLogLabel 예: '[@withwiz/blog-core] Unhandled error:'
 */
export function makeRouteKit(errorLogLabel: string): RouteKit {
  function handleError(err: unknown): Response {
    if (err instanceof BlogError) {
      return errorResponse(err.code, err.message, err.statusCode);
    }
    // eslint-disable-next-line no-console
    console.error(errorLogLabel, err);
    return errorResponse(
      BLOG_ERROR_CODES.INTERNAL_ERROR,
      err instanceof Error ? err.message : 'Internal server error',
      500,
    );
  }

  function withAuth(
    authMiddleware: AuthMiddleware | undefined,
    handler: (
      req: Request,
      user: AuthUser,
      context?: { params: Promise<Record<string, string>> },
    ) => Promise<Response>,
  ): RouteHandler {
    return async (req, context) => {
      try {
        // fail-closed: authMiddleware 미주입 시 더미 사용자로 통과시키지 않고
        // 즉시 401. commentHmacSecret과 동일한 "무조건 주입" 보안 정책으로,
        // 호스트가 인증을 깜빡하면 admin 라우트가 무인증 노출되던 결함을 차단한다.
        if (!authMiddleware) {
          return errorResponse(
            BLOG_ERROR_CODES.UNAUTHORIZED,
            'authMiddleware is not configured; admin routes are disabled',
            401,
          );
        }
        const user = await authMiddleware(req);
        if (!user) {
          return errorResponse(BLOG_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
        }
        return await handler(req, user, context);
      } catch (err) {
        return handleError(err);
      }
    };
  }

  function withPublic(
    handler: (
      req: Request,
      context?: { params: Promise<Record<string, string>> },
    ) => Promise<Response>,
  ): RouteHandler {
    return async (req, context) => {
      try {
        return await handler(req, context);
      } catch (err) {
        return handleError(err);
      }
    };
  }

  return { handleError, withAuth, withPublic };
}
