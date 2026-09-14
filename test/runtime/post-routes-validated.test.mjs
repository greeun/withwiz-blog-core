/**
 * 관리자 포스트 라우트가 zod 검증 결과를 서비스에 전달하는지 검증하는 회귀 테스트
 *
 * 검증을 통과해도 원본 body 를 넘기면 id·createdAt·authorId·중첩 쓰기 같은 스키마 밖
 * 필드가 Prisma 까지 전달된다. 검증을 수행한 경우에는 검증 결과만 넘겨야 한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPostRoutes } from '../../dist/routes/index.mjs';
import { createBlogService } from '../../dist/services/index.mjs';

// 폴백 새니타이저 1회 경고가 테스트 출력에 섞이지 않게 한다
console.warn = () => {};

const ADMIN = { id: 'admin-1', role: 'admin' };
const authMiddleware = async () => ADMIN;

const INJECTED_FIELDS = {
  id: 'forged-id',
  createdAt: '2000-01-01T00:00:00.000Z',
  updatedAt: '2000-01-01T00:00:00.000Z',
  authorId: 'someone-else',
  author: { connect: { id: 'someone-else' } },
  tags: { create: [{ tag: { create: { slug: 'x', name: 'x' } } }] },
  comments: { create: [{ content: 'spam' }] },
  viewCount: 999,
};
const FORBIDDEN_KEYS = Object.keys(INJECTED_FIELDS);

const validCreateBody = {
  title: '제목',
  content: '<p>본문</p>',
  category: 'news',
  slug: 'hello-world',
  publishedAt: '2026-09-01T00:00:00.000Z',
};

const jsonRequest = (method, body) =>
  new Request('http://x/api/admin/posts', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const idContext = (id) => ({ params: Promise.resolve({ id }) });

function createFakeService() {
  const calls = { create: [], update: [] };
  return {
    calls,
    service: {
      async create(data, authorId) {
        calls.create.push({ data, authorId });
        return { id: 'p1', ...data };
      },
      async update(id, data) {
        calls.update.push({ id, data });
        return { id, ...data };
      },
      async getById(id) {
        return { id };
      },
    },
  };
}

function assertNoInjectedKeys(data) {
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(key in data, false, `스키마 밖 필드 ${key} 가 서비스로 전달됨`);
  }
}

test('POST: 검증 결과만 서비스로 전달 (스키마 밖 필드 제거)', async () => {
  const { service, calls } = createFakeService();
  const routes = createPostRoutes(service, { authMiddleware });
  const res = await routes.admin.list.POST(jsonRequest('POST', { ...validCreateBody, ...INJECTED_FIELDS }));
  assert.equal(res.status, 201);
  assert.equal(calls.create.length, 1);
  const { data, authorId } = calls.create[0];
  assertNoInjectedKeys(data);
  assert.equal(authorId, ADMIN.id, '작성자는 인증 사용자');
  assert.equal(data.title, '제목');
  assert.equal(data.slug, 'hello-world');
});

test('PUT: 검증 결과만 서비스로 전달 (스키마 밖 필드 제거)', async () => {
  const { service, calls } = createFakeService();
  const routes = createPostRoutes(service, { authMiddleware });
  const res = await routes.admin.detail.PUT(
    jsonRequest('PUT', { title: '수정', ...INJECTED_FIELDS }),
    idContext('p1'),
  );
  assert.equal(res.status, 200);
  assert.equal(calls.update.length, 1);
  assert.equal(calls.update[0].id, 'p1');
  assert.deepEqual(calls.update[0].data, { title: '수정' });
});

test('POST·PUT: 검증 실패는 기존처럼 400 이고 서비스를 부르지 않는다', async () => {
  const { service, calls } = createFakeService();
  const routes = createPostRoutes(service, { authMiddleware });
  const created = await routes.admin.list.POST(jsonRequest('POST', { ...validCreateBody, slug: 'Bad Slug' }));
  const updated = await routes.admin.detail.PUT(jsonRequest('PUT', { published: 'yes' }), idContext('p1'));
  assert.equal(created.status, 400);
  assert.equal(updated.status, 400);
  assert.equal(calls.create.length + calls.update.length, 0);
});

test('한계(동작 불변): enableValidation: false 이면 스키마가 없어 원본 body 를 그대로 전달', async () => {
  const { service, calls } = createFakeService();
  const routes = createPostRoutes(service, { authMiddleware, enableValidation: false });
  await routes.admin.list.POST(jsonRequest('POST', { ...validCreateBody, id: 'forged-id' }));
  await routes.admin.detail.PUT(jsonRequest('PUT', { title: '수정', id: 'forged-id' }), idContext('p1'));
  assert.equal(calls.create[0].data.id, 'forged-id');
  assert.equal(calls.update[0].data.id, 'forged-id');
});

// ── 실제 서비스와의 호환: zod 기본값·publishedAt(Date) 이 Prisma 입력으로 올바르게 이어지는지 ──

function createFakePrisma() {
  const calls = { create: [], update: [] };
  const delegate = {
    findFirst: async () => null,
    findMany: async () => [],
    findUnique: async ({ where }) => ({ id: where.id, published: false }),
    create: async ({ data }) => {
      calls.create.push(data);
      return { id: 'p1', ...data };
    },
    update: async ({ where, data }) => {
      calls.update.push(data);
      return { id: where.id, ...data };
    },
  };
  const prisma = { blogPost: delegate, $transaction: async (fn) => fn(prisma) };
  return { prisma, calls };
}

test('서비스 호환: POST 는 zod 기본값을 적용하고 Prisma 에 스키마 밖 필드를 넘기지 않는다', async () => {
  const { prisma, calls } = createFakePrisma();
  const routes = createPostRoutes(createBlogService(prisma, { modelName: 'blogPost' }), { authMiddleware });
  const res = await routes.admin.list.POST(
    jsonRequest('POST', { ...validCreateBody, content: '<p>본문</p><img src="x" onerror="alert(1)">', ...INJECTED_FIELDS }),
  );
  assert.equal(res.status, 201);
  const data = calls.create[0];
  for (const key of FORBIDDEN_KEYS.filter((k) => k !== 'authorId')) {
    assert.equal(key in data, false, `Prisma create 에 ${key} 전달됨`);
  }
  assert.equal(data.authorId, ADMIN.id);
  assert.equal(data.editorType, 'rich');
  assert.deepEqual(data.attachments, []);
  assert.equal(data.featured, false);
  assert.equal(data.published, false);
  assert.ok(data.publishedAt instanceof Date, 'publishedAt 은 Date');
  assert.equal(data.publishedAt.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(data.coverImageUrl, null);
  assert.equal(data.coverImageKey, null);
  assert.equal(data.content, '<p>본문</p><img src="x">');
});

test('서비스 호환: PUT 은 보낸 필드만 갱신하고 publishedAt 문자열·null 을 올바르게 저장한다', async () => {
  const { prisma, calls } = createFakePrisma();
  const routes = createPostRoutes(createBlogService(prisma, { modelName: 'blogPost' }), { authMiddleware });
  const res1 = await routes.admin.detail.PUT(
    jsonRequest('PUT', { title: '수정', publishedAt: '2026-09-02T03:04:05.000Z', ...INJECTED_FIELDS }),
    idContext('p1'),
  );
  const res2 = await routes.admin.detail.PUT(jsonRequest('PUT', { publishedAt: null }), idContext('p1'));
  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);
  const [first, second] = calls.update;
  assert.deepEqual(Object.keys(first).sort(), ['publishedAt', 'title']);
  assert.equal(first.publishedAt.toISOString(), '2026-09-02T03:04:05.000Z');
  assert.deepEqual(second, { publishedAt: null });
});
