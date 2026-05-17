import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchedulerRoutes } from '../../dist/routes/index.mjs';

const fakeScheduler = {
  async processScheduledPosts() {
    return { published: 0, ids: [] };
  },
  async listScheduled() {
    return [];
  },
  async cancelSchedule() {},
};

function reqWithAuth(value) {
  const headers = value === undefined ? {} : { authorization: value };
  return new Request('https://x.test/api/admin/scheduler/process', {
    method: 'POST',
    headers,
  });
}

test('cronSecret: 올바른 Bearer → 200 success', async () => {
  const { admin } = createSchedulerRoutes(fakeScheduler, { cronSecret: 'top-secret' });
  const res = await admin.process.POST(reqWithAuth('Bearer top-secret'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

test('cronSecret: 틀린 Bearer → 401', async () => {
  const { admin } = createSchedulerRoutes(fakeScheduler, { cronSecret: 'top-secret' });
  const res = await admin.process.POST(reqWithAuth('Bearer wrong'));
  assert.equal(res.status, 401);
});

test('cronSecret: Authorization 헤더 없음 → 401', async () => {
  const { admin } = createSchedulerRoutes(fakeScheduler, { cronSecret: 'top-secret' });
  const res = await admin.process.POST(reqWithAuth(undefined));
  assert.equal(res.status, 401);
});

test('cronSecret: 길이 다른 토큰도 안전 비교(예외 없이 401)', async () => {
  const { admin } = createSchedulerRoutes(fakeScheduler, { cronSecret: 'top-secret' });
  const res = await admin.process.POST(reqWithAuth('Bearer ' + 'a'.repeat(500)));
  assert.equal(res.status, 401, '길이 불일치에서 timingSafeEqual 예외 없이 거부');
});
