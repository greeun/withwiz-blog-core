/**
 * 검색 API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 반환한다.
 */
import type { SearchService } from '../services/search.service';
import {
  successResponse,
  getSearchParam,
  parsePagination,
  makeRouteKit,
  type RouteHandler,
} from './_shared';

const { withPublic } = makeRouteKit('[@withwiz/blog-core] Search error:');

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
          const { page, limit } = parsePagination(req, pageSize, 50);
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
