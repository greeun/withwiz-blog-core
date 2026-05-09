/**
 * 예약 발행 Cron 라우트 핸들러 팩토리
 *
 * Vercel Cron은 GET 요청을 보내며, 수동 트리거는 POST를 사용한다.
 * Authorization: Bearer {cronSecret} 헤더로 인증한다.
 *
 * Next.js Request/Response는 표준 Web API 기반.
 */
import type { SchedulerService } from '../services/scheduler.service';

// ── 설정 ──

export interface SchedulerRoutesConfig {
  /** 스케줄러 서비스 인스턴스 */
  schedulerService: SchedulerService;
  /** Cron 인증용 시크릿 문자열 */
  cronSecret: string;
}

// Next.js App Router 호환 핸들러 시그니처
type RouteHandler = (request: Request) => Promise<Response>;

export interface SchedulerRoutes {
  publishScheduled: {
    GET: RouteHandler;
    POST: RouteHandler;
  };
}

// ── 헬퍼 ──

function unauthorized(): Response {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verifyAuthorization(request: Request, cronSecret: string): boolean {
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) return false;
  const expected = `Bearer ${cronSecret}`;
  return authHeader === expected;
}

// ── 팩토리 ──

/**
 * 예약 발행 Cron 라우트를 생성한다.
 *
 * 사용 예:
 *   // app/api/cron/blog-publish/route.ts
 *   const routes = createSchedulerRoutes({ schedulerService, cronSecret: process.env.CRON_SECRET });
 *   export const GET = routes.publishScheduled.GET;
 *   export const POST = routes.publishScheduled.POST;
 */
export function createSchedulerRoutes(config: SchedulerRoutesConfig): SchedulerRoutes {
  const { schedulerService, cronSecret } = config;

  const handler: RouteHandler = async (request: Request): Promise<Response> => {
    if (!verifyAuthorization(request, cronSecret)) {
      return unauthorized();
    }

    try {
      const result = await schedulerService.processScheduledPosts();
      return new Response(
        JSON.stringify({
          success: true,
          processed: result.processed,
          postIds: result.postIds,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ success: false, error: message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  };

  return {
    publishScheduled: {
      GET: handler,
      POST: handler,
    },
  };
}
