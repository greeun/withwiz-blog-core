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

test('createBlog: 댓글 활성 + commentHmacSecret 미주입 → 즉시 throw(fail-fast, env 미사용)', () => {
  assert.throws(
    () =>
      createBlog({
        ...baseConfig,
        features: { comments: { enabled: true } },
      }),
    /IP 해시 시크릿 주입이 필수/,
  );
});

test('createBlog: 댓글 활성 + commentHmacSecret 주입 → 정상 생성', () => {
  const blog = createBlog({
    ...baseConfig,
    commentHmacSecret: 'injected-secret',
    features: { comments: { enabled: true } },
  });
  assert.equal(typeof blog.services.posts, 'object');
  assert.ok(blog.routes.public.comments, '댓글 public 라우트 존재');
});

test('createBlog: 댓글 비활성 → 시크릿 없이도 정상', () => {
  const blog = createBlog({
    ...baseConfig,
    features: { comments: { enabled: false } },
  });
  assert.equal(blog.services.comments, null);
});
