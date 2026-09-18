/**
 * 댓글 requireLogin 설정과 공개 작성 라우트 연동 회귀 테스트 (TC-A-004)
 *
 * 공개 작성 라우트는 사용자 식별 수단 없이 서비스에 userId: undefined 를 고정으로 넘겨,
 * requireLogin: true 이면 로그인 사용자도 항상 403 을 받았다. 관리자 라우트의 authMiddleware 와
 * 같은 형태(AuthMiddleware)의 공개 라우트용 사용자 식별 설정으로 로그인 사용자를 판별한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommentRoutes } from '../../dist/routes/index.mjs';
import { createCommentService } from '../../dist/services/index.mjs';
import { createBlog } from '../../dist/index.mjs';

const HMAC = 'test-hmac-secret';
const ctx = { params: Promise.resolve({ postId: 'p1' }) };

function createFakePrisma() {
  const created = [];
  const delegate = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    count: async () => 0,
    create: async ({ data }) => {
      created.push(data);
      return { id: `c${created.length}`, createdAt: new Date(), ...data };
    },
    update: async () => ({}),
    updateMany: async () => ({ count: 0 }),
    delete: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
  };
  const prisma = new Proxy(
    { $transaction: async (fn) => fn(prisma), $queryRawUnsafe: async () => [] },
    { get: (t, p) => (p in t ? t[p] : delegate) },
  );
  return { prisma, created };
}

const postReq = (body) =>
  new Request('https://x.test/api/posts/p1/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'session=logged-in' },
    body: JSON.stringify(body),
  });

async function readJson(res) {
  return JSON.parse(await res.text());
}

function setup({ requireLogin, routesConfig = {} }) {
  const { prisma, created } = createFakePrisma();
  const svc = createCommentService(prisma, { requireLogin });
  const routes = createCommentRoutes(svc, { hmacSecret: HMAC, ...routesConfig });
  return { routes, created };
}

test('requireLogin: true + 사용자 식별 설정 없음 → 기존처럼 403 이고 저장하지 않는다 (fail-closed 유지)', async () => {
  const { routes, created } = setup({ requireLogin: true });
  const res = await routes.public.create.POST(postReq({ content: 'hi' }), ctx);
  assert.equal(res.status, 403);
  assert.equal((await readJson(res)).error.code, 'COMMENT_LOGIN_REQUIRED');
  assert.equal(created.length, 0);
});

test('requireLogin: true + publicAuthMiddleware 가 사용자를 반환 → 201, 작성자 id 로 저장', async () => {
  const seen = [];
  const { routes, created } = setup({
    requireLogin: true,
    routesConfig: {
      publicAuthMiddleware: async (req) => {
        seen.push(req.headers.get('cookie'));
        return { id: 'user-1' };
      },
    },
  });
  const res = await routes.public.create.POST(
    postReq({ content: 'hi', guestName: '게스트', guestEmail: 'g@example.com' }),
    ctx,
  );
  assert.equal(res.status, 201);
  assert.deepEqual(seen, ['session=logged-in'], '요청 객체를 미들웨어에 전달');
  assert.equal(created.length, 1);
  assert.equal(created[0].authorId, 'user-1');
  assert.equal(created[0].guestName, null, '로그인 사용자는 게스트 정보를 저장하지 않음');
  assert.equal(created[0].guestEmail, null);
});

test('requireLogin: true + publicAuthMiddleware 가 null → 403 이고 저장하지 않는다', async () => {
  const { routes, created } = setup({
    requireLogin: true,
    routesConfig: { publicAuthMiddleware: async () => null },
  });
  const res = await routes.public.create.POST(postReq({ content: 'hi' }), ctx);
  assert.equal(res.status, 403);
  assert.equal((await readJson(res)).error.code, 'COMMENT_LOGIN_REQUIRED');
  assert.equal(created.length, 0);
});

test('관리자 authMiddleware 는 공개 작성 라우트의 사용자 식별에 쓰지 않는다', async () => {
  let adminCalls = 0;
  const { routes, created } = setup({
    requireLogin: true,
    routesConfig: {
      authMiddleware: async () => {
        adminCalls += 1;
        return { id: 'admin-1', role: 'admin' };
      },
    },
  });
  const res = await routes.public.create.POST(postReq({ content: 'hi' }), ctx);
  assert.equal(res.status, 403);
  assert.equal(adminCalls, 0);
  assert.equal(created.length, 0);
});

test('requireLogin: false 에서 기존 게스트 작성 동작 유지, 본문의 authorId·userId 는 작성자로 쓰지 않는다', async () => {
  const guest = setup({ requireLogin: false });
  const res1 = await guest.routes.public.create.POST(
    postReq({ content: 'hi', guestName: '게스트', authorId: 'forged', userId: 'forged' }),
    ctx,
  );
  assert.equal(res1.status, 201);
  assert.equal(guest.created[0].authorId, null);
  assert.equal(guest.created[0].guestName, '게스트');

  const anonymous = setup({ requireLogin: false, routesConfig: { publicAuthMiddleware: async () => null } });
  const res2 = await anonymous.routes.public.create.POST(postReq({ content: 'hi', userId: 'forged' }), ctx);
  assert.equal(res2.status, 201);
  assert.equal(anonymous.created[0].authorId, null);
});

test('requireLogin: false + publicAuthMiddleware 가 사용자를 반환 → 작성자 id 를 기록한다', async () => {
  const { routes, created } = setup({
    requireLogin: false,
    routesConfig: { publicAuthMiddleware: async () => ({ id: 'user-2' }) },
  });
  const res = await routes.public.create.POST(postReq({ content: 'hi' }), ctx);
  assert.equal(res.status, 201);
  assert.equal(created[0].authorId, 'user-2');
});

test('검증 실패는 사용자 식별보다 먼저 400 으로 응답한다', async () => {
  let calls = 0;
  const { routes, created } = setup({
    requireLogin: true,
    routesConfig: {
      publicAuthMiddleware: async () => {
        calls += 1;
        return { id: 'user-1' };
      },
    },
  });
  const res = await routes.public.create.POST(postReq({}), ctx);
  assert.equal(res.status, 400);
  assert.equal(calls, 0);
  assert.equal(created.length, 0);
});

test('createBlog: commentAuthMiddleware 를 공개 댓글 작성 라우트에 전달한다', async () => {
  const { prisma, created } = createFakePrisma();
  const base = {
    prisma,
    modelName: 'blogPost',
    categories: {},
    basePath: '/b',
    adminBasePath: '/admin/b',
    apiBasePath: '/api/b',
    adminApiBasePath: '/api/admin/b',
    commentHmacSecret: HMAC,
    features: { comments: { enabled: true, requireLogin: true } },
  };

  const warns = [];
  const origWarn = console.warn;
  console.warn = (...args) => warns.push(args.join(' '));
  let withUser;
  let withoutUser;
  try {
    withUser = createBlog({ ...base, commentAuthMiddleware: async () => ({ id: 'user-3' }) });
    assert.equal(warns.length, 0, '설정이 있으면 경고하지 않음');
    withoutUser = createBlog({ ...base });
  } finally {
    console.warn = origWarn;
  }

  const ok = await withUser.routes.public.comments.create.POST(postReq({ content: 'hi' }), ctx);
  assert.equal(ok.status, 201);
  assert.equal(created.at(-1).authorId, 'user-3');

  const denied = await withoutUser.routes.public.comments.create.POST(postReq({ content: 'hi' }), ctx);
  assert.equal(denied.status, 403);
  assert.equal(created.length, 1, '403 요청은 저장하지 않음');
  assert.equal(warns.filter((m) => /commentAuthMiddleware/.test(m)).length, 1, '설정 누락 경고 1회');
});
