/**
 * 검색 API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 반환한다.
 */
import type { SearchService } from '../services/search.service';
import { BlogError, BLOG_ERROR_CODES } from '../errors';

// ── 타입 ──

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

function getSearchParam(req: Request, key: string): string | undefined {
  const url = new URL(req.url);
  const value = url.searchParams.get(key);
  return value ?? undefined;
}

function parsePagination(req: Request, defaultPageSize = 12, maxPageSize = 50) {
  const url = new URL(req.url);
  const rawPage = url.searchParams.get('page');
  const rawLimit = url.searchParams.get('limit');
  const page = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1;
  const limit = rawLimit
    ? Math.min(maxPageSize, Math.max(1, parseInt(rawLimit, 10) || defaultPageSize))
    : defaultPageSize;
  return { page, limit };
}

function handleError(err: unknown): Response {
  if (err instanceof BlogError) {
    return errorResponse(err.code, err.message, err.statusCode);
  }
  // eslint-disable-next-line no-console
  console.error('[blog-core-v2] Search error:', err);
  return errorResponse(
    BLOG_ERROR_CODES.INTERNAL_ERROR,
    err instanceof Error ? err.message : 'Internal server error',
    500,
  );
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

export interface SearchPublicRoutes {
  search: { GET: RouteHandler };
}

export interface SearchRoutesConfig {
  pageSize?: number;
}

// ── 팩토리 함수 ──

/**
 * 검색 라우트 핸들러를 생성한다.
 *
 * 사용 예:
 *   // app/api/blog/search/route.ts
 *   export const GET = blog.routes.public.search.search.GET;
 */
export function createSearchRoutes(
  searchService: SearchService,
  config?: SearchRoutesConfig,
): { public: SearchPublicRoutes } {
  const pageSize = config?.pageSize ?? 12;

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  };

  return {
    public: {
      search: {
        GET: withPublic(async (req) => {
          const query = getSearchParam(req, 'q') ?? getSearchParam(req, 'query') ?? '';
          const { page, limit } = parsePagination(req, pageSize);
          const category = getSearchParam(req, 'category');
          const highlight = getSearchParam(req, 'highlight') === '1'
            || getSearchParam(req, 'highlight') === 'true';

          const result = await searchService.search({
            query,
            page,
            limit,
            category,
            highlight,
          });

          return successResponse(result, 200, cacheHeaders);
        }),
      },
    },
  };
}
