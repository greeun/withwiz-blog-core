/**
 * 스케줄러 Cron 라우트 핸들러 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { createSchedulerRoutes } from '@withwiz/blog-core/routes';
import type { SchedulerService } from '@withwiz/blog-core/services';

function makeService(overrides: Partial<SchedulerService> = {}): SchedulerService {
  return {
    processScheduledPosts: vi.fn().mockResolvedValue({ processed: 3, postIds: ['a', 'b', 'c'] }),
    listScheduled: vi.fn().mockResolvedValue([]),
    cancelSchedule: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as SchedulerService;
}

function makeRequest(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/cron/blog-publish', {
    method: 'GET',
    headers,
  });
}

describe('createSchedulerRoutes', () => {
  const CRON_SECRET = 'test-secret-123';

  // BC-SCR-01
  it('올바른 cronSecret 요청 → 200 + processed 결과 반환', async () => {
    const schedulerService = makeService();
    const routes = createSchedulerRoutes({ schedulerService, cronSecret: CRON_SECRET });
    const res = await routes.publishScheduled.GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(3);
    expect(body.postIds).toEqual(['a', 'b', 'c']);
    expect(schedulerService.processScheduledPosts).toHaveBeenCalledTimes(1);
  });

  // BC-SCR-02
  it('잘못된 Authorization → 401', async () => {
    const schedulerService = makeService();
    const routes = createSchedulerRoutes({ schedulerService, cronSecret: CRON_SECRET });
    const res = await routes.publishScheduled.GET(makeRequest('Bearer wrong-secret'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(schedulerService.processScheduledPosts).not.toHaveBeenCalled();
  });

  // BC-SCR-03
  it('Authorization 헤더가 없으면 → 401', async () => {
    const schedulerService = makeService();
    const routes = createSchedulerRoutes({ schedulerService, cronSecret: CRON_SECRET });
    const res = await routes.publishScheduled.GET(makeRequest());
    expect(res.status).toBe(401);
    expect(schedulerService.processScheduledPosts).not.toHaveBeenCalled();
  });

  // BC-SCR-04
  it('서비스 내부 오류 발생 시 → 500', async () => {
    const schedulerService = makeService({
      processScheduledPosts: vi.fn().mockRejectedValue(new Error('db down')),
    });
    const routes = createSchedulerRoutes({ schedulerService, cronSecret: CRON_SECRET });
    const res = await routes.publishScheduled.POST(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('db down');
  });

  // BC-SCR-05
  it('GET/POST 모두 동일 핸들러 로직 사용 (POST도 인증 확인)', async () => {
    const schedulerService = makeService();
    const routes = createSchedulerRoutes({ schedulerService, cronSecret: CRON_SECRET });
    const req = new Request('http://localhost/api/cron/blog-publish', {
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await routes.publishScheduled.POST(req);
    expect(res.status).toBe(200);
  });

  // BC-SCR-06
  it('cronSecret 빈 문자열이면 모든 요청을 401 처리 (오구성 방어)', async () => {
    const schedulerService = makeService();
    const routes = createSchedulerRoutes({ schedulerService, cronSecret: '' });
    const res = await routes.publishScheduled.GET(makeRequest('Bearer '));
    expect(res.status).toBe(401);
  });
});
