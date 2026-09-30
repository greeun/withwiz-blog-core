/**
 * 비공개 전환 시 발행 시각 규칙 회귀 테스트
 *
 * 스케줄러는 `published=false` 이고 `publishedAt` 이 지난 글을 예약 글로 보고 공개한다.
 * 비공개로 저장·일괄 전환하면서 과거 발행 시각을 남기면, 다음 스케줄러 실행이 그 글을
 * 다시 공개한다. 비공개 글에는 미래(예약) 시각만 남아야 한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlogService } from '../../dist/services/index.mjs';
import {
  UpdateBlogPostSchema,
  CreateBlogPostSchema,
  createBlogSchemas,
} from '../../dist/validators/index.mjs';

console.warn = () => {};

const HOUR = 60 * 60 * 1000;
const past = () => new Date(Date.now() - 24 * HOUR);
const future = () => new Date(Date.now() + 24 * HOUR);

/** updateMany 의 where 조건(id in, publishedAt null/lte)을 흉내 내는 메모리 저장소 */
function createFakePrisma(rows) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]));
  const calls = { create: [], update: [], updateMany: [] };

  const matches = (row, where) => {
    if (where.id?.in && !where.id.in.includes(row.id)) return false;
    if (typeof where.id === 'string' && row.id !== where.id) return false;
    if ('publishedAt' in where) {
      const cond = where.publishedAt;
      if (cond === null) return row.publishedAt === null;
      if (cond.lte && !(row.publishedAt && row.publishedAt.getTime() <= cond.lte.getTime())) return false;
    }
    return true;
  };

  const delegate = {
    findFirst: async () => null,
    findMany: async () => [],
    findUnique: async ({ where }) => store.get(where.id) ?? null,
    create: async ({ data }) => {
      calls.create.push(data);
      return { id: 'new-1', ...data };
    },
    update: async ({ where, data }) => {
      calls.update.push(data);
      const next = { ...store.get(where.id), ...data };
      store.set(where.id, next);
      return next;
    },
    updateMany: async ({ where, data }) => {
      calls.updateMany.push({ where, data });
      let count = 0;
      for (const row of store.values()) {
        if (!matches(row, where)) continue;
        Object.assign(row, data);
        count += 1;
      }
      return { count };
    },
  };
  const prisma = {
    blogPost: delegate,
    $transaction: async (fn) => fn(prisma),
  };
  return { prisma, store, calls };
}

const baseInput = { slug: 'hello', category: 'news', title: '제목', content: '<p>본문</p>' };

// ── bulkUpdatePublished ──

test('bulkUpdatePublished(false): 과거 발행 시각은 지우고 미래 예약 시각은 남긴다', async () => {
  const reserved = future();
  const { prisma, store } = createFakePrisma([
    { id: 'a', published: true, publishedAt: past() },
    { id: 'b', published: false, publishedAt: reserved },
    { id: 'c', published: true, publishedAt: null },
  ]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  const count = await service.bulkUpdatePublished(['a', 'b', 'c'], false);

  assert.equal(count, 3);
  assert.deepEqual(
    [...store.values()].map((r) => [r.id, r.published, r.publishedAt]),
    [
      ['a', false, null],
      ['b', false, reserved],
      ['c', false, null],
    ],
  );
});

test('bulkUpdatePublished(true): 발행 시각이 없는 글만 지금 시각으로 채운다', async () => {
  const original = past();
  const { prisma, store } = createFakePrisma([
    { id: 'a', published: false, publishedAt: null },
    { id: 'b', published: false, publishedAt: original },
  ]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  const before = Date.now();
  const count = await service.bulkUpdatePublished(['a', 'b'], true);

  assert.equal(count, 2);
  const a = store.get('a');
  const b = store.get('b');
  assert.equal(a.published, true);
  assert.ok(a.publishedAt instanceof Date && a.publishedAt.getTime() >= before);
  assert.equal(b.published, true);
  assert.equal(b.publishedAt, original);
});

test('bulkUpdatePublished: 대상 밖 글은 건드리지 않는다', async () => {
  const kept = past();
  const { prisma, store } = createFakePrisma([
    { id: 'a', published: true, publishedAt: past() },
    { id: 'z', published: true, publishedAt: kept },
  ]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.bulkUpdatePublished(['a'], false);

  assert.equal(store.get('z').published, true);
  assert.equal(store.get('z').publishedAt, kept);
});

// ── update ──

test('update: 비공개로 저장하며 과거 발행 시각을 함께 보내면 null 로 저장한다', async () => {
  const { prisma, calls } = createFakePrisma([{ id: 'p', published: true, publishedAt: past() }]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.update('p', { published: false, publishedAt: past().toISOString() });

  assert.equal(calls.update[0].publishedAt, null);
});

test('update: 비공개로만 바꾸면 기존 과거 발행 시각을 null 로 저장한다', async () => {
  const { prisma, calls } = createFakePrisma([{ id: 'p', published: true, publishedAt: past() }]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.update('p', { published: false });

  assert.equal(calls.update[0].publishedAt, null);
});

test('update: 비공개 + 미래 시각(예약)은 그대로 저장한다', async () => {
  const reserved = future();
  const { prisma, calls } = createFakePrisma([{ id: 'p', published: false, publishedAt: null }]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.update('p', { published: false, publishedAt: reserved.toISOString() });

  assert.equal(calls.update[0].publishedAt.getTime(), reserved.getTime());
});

test('update: 기존 미래 예약 글을 비공개로 다시 저장해도 예약 시각을 유지한다', async () => {
  const { prisma, calls } = createFakePrisma([{ id: 'p', published: false, publishedAt: future() }]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.update('p', { published: false, title: '바뀐 제목' });

  assert.equal('publishedAt' in calls.update[0], false);
});

test('update: published 를 보내지 않으면 발행 시각 규칙을 적용하지 않는다', async () => {
  const at = past();
  const { prisma, calls } = createFakePrisma([{ id: 'p', published: false, publishedAt: null }]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.update('p', { publishedAt: at.toISOString() });

  assert.equal(calls.update[0].publishedAt.getTime(), at.getTime());
});

// ── create ──

test('create: 비공개 + 과거 발행 시각은 null 로 저장한다', async () => {
  const { prisma, calls } = createFakePrisma([]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.create({ ...baseInput, published: false, publishedAt: past().toISOString() }, 'author-1');

  assert.equal(calls.create[0].publishedAt, null);
});

test('create: 비공개 + 미래 시각(예약)과 공개 + 과거 시각은 그대로 저장한다', async () => {
  const reserved = future();
  const at = past();
  const { prisma, calls } = createFakePrisma([]);
  const service = createBlogService(prisma, { modelName: 'blogPost' });

  await service.create({ ...baseInput, published: false, publishedAt: reserved.toISOString() }, 'author-1');
  await service.create({ ...baseInput, published: true, publishedAt: at.toISOString() }, 'author-1');

  assert.equal(calls.create[0].publishedAt.getTime(), reserved.getTime());
  assert.equal(calls.create[1].publishedAt.getTime(), at.getTime());
});

// ── coverImageUrl 검증 ──

const factory = createBlogSchemas();
const schemas = [
  ['정적 Update', UpdateBlogPostSchema],
  ['정적 Create', CreateBlogPostSchema.partial()],
  ['팩토리 Update', factory.UpdateBlogPostSchema],
];

for (const [label, schema] of schemas) {
  test(`${label}: coverImageUrl 은 절대 URL·루트 상대 경로·빈 문자열을 허용한다`, () => {
    for (const value of ['https://cdn.example.com/a.png', '/assets/cover.png', '/a/b-c_d.webp?v=1', '']) {
      assert.equal(schema.safeParse({ coverImageUrl: value }).success, true, value);
    }
  });

  test(`${label}: coverImageUrl 의 위험 값은 거부한다`, () => {
    for (const value of [
      '//evil.example/a.png',
      '/\\evil.example/a.png',
      'assets/cover.png',
      '/has space.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'file:///etc/passwd',
    ]) {
      assert.equal(schema.safeParse({ coverImageUrl: value }).success, false, value);
    }
  });
}
