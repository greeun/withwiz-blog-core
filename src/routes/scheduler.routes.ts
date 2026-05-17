/**
 * 예약 발행(스케줄러) API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 반환한다.
 *
 * - POST /admin/scheduler/process: 예약 발행 처리 (Cron에서 호출, cronSecret 인증)
 * - GET /admin/scheduler/pending: 예약 대기 글 목록
 * - POST /admin/scheduler/[id]/cancel: 예약 취소
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { SchedulerService } from '../services/scheduler.service';
import type { AuthMiddleware } from '../types/config';
import { BLOG_ERROR_CODES } from '../errors';
import {
  successResponse,
  errorResponse,
  getRouteParam,
  makeRouteKit,
  type RouteHandler,
} from './_shared';

const { handleError, withAuth } = makeRouteKit('[blog-core-v2] Scheduler error:');

/**
 * 길이 노출 없는 상수시간 문자열 비교.
 * 양쪽을 SHA-256 고정 길이 다이제스트로 만든 뒤 timingSafeEqual로 비교하여
 * 타이밍 공격 및 길이 불일치 예외를 회피한다.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * cronSecret 인증 검증
 * Authorization: Bearer {cronSecret} 헤더로 인증한다 (상수시간 비교).
 */
function verifyCronSecret(request: Request, cronSecret: string): boolean {
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) return false;
  return constantTimeEquals(authHeader, `Bearer ${cronSecret}`);
}

// ── 라우트 타입 ──

export interface SchedulerAdminRoutes {
  process: {
    POST: RouteHandler;
    /** Vercel Cron은 GET 요청을 보낸다 */
    GET: RouteHandler;
  };
  pending: { GET: RouteHandler };
  cancel: { POST: RouteHandler };
}

export interface SchedulerRoutesConfig {
  authMiddleware?: AuthMiddleware;
  /** Cron 시크릿 (process 호출 인증에 사용) */
  cronSecret?: string;
}

// ── 팩토리 함수 ──

/**
 * 스케줄러 라우트 핸들러를 생성한다.
 *
 * 사용 예:
 *   // app/api/admin/blog/scheduler/process/route.ts
 *   export const POST = blog.routes.admin.scheduler.process.POST;
 *   export const GET = blog.routes.admin.scheduler.process.GET;
 *
 *   // app/api/admin/blog/scheduler/pending/route.ts
 *   export const GET = blog.routes.admin.scheduler.pending.GET;
 *
 *   // app/api/admin/blog/scheduler/[id]/cancel/route.ts
 *   export const POST = blog.routes.admin.scheduler.cancel.POST;
 */
export function createSchedulerRoutes(
  schedulerService: SchedulerService,
  config?: SchedulerRoutesConfig,
): { admin: SchedulerAdminRoutes } {
  const authMiddleware = config?.authMiddleware;
  const cronSecret = config?.cronSecret;

  // process 핸들러: cronSecret이 설정된 경우 cronSecret 인증,
  // 설정되지 않은 경우 일반 admin 인증
  const processHandler: RouteHandler = async (req) => {
    try {
      // cronSecret 인증
      if (cronSecret) {
        if (!verifyCronSecret(req, cronSecret)) {
          return errorResponse(BLOG_ERROR_CODES.UNAUTHORIZED, 'Invalid cron secret', 401);
        }
      } else if (authMiddleware) {
        // cronSecret이 없으면 admin 인증으로 폴백
        const user = await authMiddleware(req);
        if (!user) {
          return errorResponse(BLOG_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
        }
      } else {
        // fail-closed: cronSecret·authMiddleware 둘 다 미주입 시 더 이상
        // 무인증으로 예약 발행을 실행하지 않는다(withAuth와 동일한 정책).
        return errorResponse(
          BLOG_ERROR_CODES.UNAUTHORIZED,
          'scheduler requires cronSecret or authMiddleware; process endpoint is disabled',
          401,
        );
      }

      const result = await schedulerService.processScheduledPosts();
      return successResponse(result);
    } catch (err) {
      return handleError(err);
    }
  };

  return {
    admin: {
      process: {
        POST: processHandler,
        GET: processHandler,
      },

      pending: {
        GET: withAuth(authMiddleware, async (req) => {
          const url = new URL(req.url);
          const rawLimit = url.searchParams.get('limit');
          const limit = rawLimit ? Math.max(1, parseInt(rawLimit, 10) || 50) : undefined;

          const items = await schedulerService.listScheduled({ limit });
          return successResponse(items);
        }),
      },

      cancel: {
        POST: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          await schedulerService.cancelSchedule(id);
          return successResponse({ cancelled: true });
        }),
      },
    },
  };
}
