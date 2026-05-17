import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlog } from '../../dist/index.mjs';

// 덕타이핑 가짜 Prisma: 모든 모델 키에 대해 델리게이트 스텁 반환
const delegate = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async () => ({}),
  update: async () => ({}),
  delete: async () => ({}),
  deleteMany: async () => ({ count: 0 }),
  updateMany: async () => ({ count: 0 }),
  count: async () => 0,
  groupBy: async () => [],
};
const fixed = {
  $transaction: async (fn) => fn(fixed),
  $queryRawUnsafe: async () => [],
};
const fakePrisma = new Proxy(fixed, {
  get(t, p) {
    if (p in t) return t[p];
    return delegate;
  },
});

const baseConfig = {
  prisma: fakePrisma,
  modelName: 'blogPost',
  categories: {},
  basePath: '/b',
  adminBasePath: '/admin/b',
  apiBasePath: '/api/b',
  adminApiBasePath: '/api/admin/b',
};

const adminReq = () => new Request('http://x/api/admin/b');

test('admin 라우트: authMiddleware 미주입 → 더미 통과 없이 401(fail-closed)', async () => {
  const blog = createBlog({ ...baseConfig });
  const res = await blog.routes.admin.posts.list.GET(adminReq());
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'UNAUTHORIZED');
});

test('admin 라우트: authMiddleware가 null 반환 → 401(기존 동작 유지)', async () => {
  const blog = createBlog({ ...baseConfig, authMiddleware: async () => null });
  const res = await blog.routes.admin.posts.list.GET(adminReq());
  assert.equal(res.status, 401);
});

test('admin 라우트: authMiddleware가 사용자 반환 → 정상 통과(200)', async () => {
  const blog = createBlog({
    ...baseConfig,
    authMiddleware: async () => ({ id: 'admin-1', role: 'admin' }),
  });
  const res = await blog.routes.admin.posts.list.GET(adminReq());
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

const schedReq = (headers) =>
  new Request('http://x/api/admin/b/scheduler/process', { method: 'POST', headers });

test('scheduler process: cronSecret·authMiddleware 모두 미주입 → 무인증 실행 차단 401(fail-closed)', async () => {
  const blog = createBlog({
    ...baseConfig,
    features: { scheduler: { enabled: true } },
  });
  const res = await blog.routes.admin.scheduler.process.POST(schedReq());
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, 'UNAUTHORIZED');
});

test('scheduler process: cronSecret 일치 → 정상 실행(200)', async () => {
  const blog = createBlog({
    ...baseConfig,
    features: { scheduler: { enabled: true, cronSecret: 's3cr3t' } },
  });
  const res = await blog.routes.admin.scheduler.process.POST(
    schedReq({ Authorization: 'Bearer s3cr3t' }),
  );
  assert.equal(res.status, 200);
});

test('scheduler process: authMiddleware 폴백 + 사용자 반환 → 정상 실행(200)', async () => {
  const blog = createBlog({
    ...baseConfig,
    authMiddleware: async () => ({ id: 'admin-1' }),
    features: { scheduler: { enabled: true } },
  });
  const res = await blog.routes.admin.scheduler.process.POST(schedReq());
  assert.equal(res.status, 200);
});
