/**
 * 동시성 가드 회귀 테스트
 *
 * - 댓글 레이트 리밋: count() → create() 사이의 경쟁 조건
 * - 예약 발행: findMany() → updateMany() 사이의 이중 집계
 *
 * 인메모리 fake Prisma 로 경쟁 조건을 재현한다. 모든 델리게이트 메서드는
 * 시작 시 매크로태스크 한 틱을 양보하므로, Promise.all 로 띄운 동시 호출들이
 * 단계별로 인터리빙된다(= 모든 사전 조회가 끝난 뒤 모든 쓰기가 실행되는,
 * 실제 DB 에서 관측된 최악의 순서를 그대로 모사).
 * 반면 updateMany 의 조건 평가 + 변경은 틱 이후 동기적으로 수행되어
 * DB 의 행 잠금(단일 UPDATE 문의 원자성)을 모사한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCommentService,
  createSchedulerService,
} from '../../dist/services/index.mjs';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// 레이트 리밋 창(1시간)·예약 시각 비교는 실행 시점 기준이므로 상대 시각을 쓴다.
const NOW = Date.now();
const MINUTE = 60 * 1000;
const ago = (minutes) => new Date(NOW - minutes * MINUTE);
const ahead = (minutes) => new Date(NOW + minutes * MINUTE);

// ── 최소 Prisma where 매처 ──

function normalize(value) {
  return value instanceof Date ? value.getTime() : value;
}

function matchField(value, cond) {
  if (cond === null) return value === null || value === undefined;
  if (cond instanceof Date) return normalize(value) === normalize(cond);
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    for (const [op, operand] of Object.entries(cond)) {
      const left = normalize(value);
      const right = normalize(operand);
      const isNullish = value === null || value === undefined;
      if (isNullish && op !== 'not' && op !== 'in') return false;
      if (op === 'gte' && !(left >= right)) return false;
      if (op === 'lte' && !(left <= right)) return false;
      if (op === 'gt' && !(left > right)) return false;
      if (op === 'lt' && !(left < right)) return false;
      if (op === 'in' && !operand.includes(value)) return false;
      if (op === 'not') {
        if (operand === null) {
          if (value === null || value === undefined) return false;
        } else if (left === right) {
          return false;
        }
      }
    }
    return true;
  }
  return value === cond;
}

function matchWhere(row, where = {}) {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!cond.some((sub) => matchWhere(row, sub))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!cond.every((sub) => matchWhere(row, sub))) return false;
      continue;
    }
    if (!matchField(row[key], cond)) return false;
  }
  return true;
}

// ── 댓글용 fake ──

function createFakeCommentPrisma({ rows = [], fixedCreatedAt = null } = {}) {
  const store = rows.map((r) => ({ ...r }));
  const calls = { count: 0, create: 0, delete: 0 };
  let seq = store.length;

  const comment = {
    async count({ where } = {}) {
      calls.count += 1;
      await tick();
      return store.filter((r) => matchWhere(r, where)).length;
    },
    async create({ data }) {
      calls.create += 1;
      await tick();
      seq += 1;
      const row = {
        ...data,
        id: `c${String(seq).padStart(4, '0')}`,
        // 밀리초 충돌(동일 createdAt)을 강제해 (createdAt, id) 타이브레이크를 검증한다.
        createdAt: fixedCreatedAt ?? new Date(),
      };
      store.push(row);
      return { ...row };
    },
    async delete({ where }) {
      calls.delete += 1;
      await tick();
      const idx = store.findIndex((r) => r.id === where.id);
      if (idx < 0) throw new Error(`comment ${where.id} not found`);
      return store.splice(idx, 1)[0];
    },
    async findUnique({ where }) {
      await tick();
      return store.find((r) => r.id === where.id) ?? null;
    },
    async findMany({ where } = {}) {
      await tick();
      return store.filter((r) => matchWhere(r, where)).map((r) => ({ ...r }));
    },
  };

  const prisma = { comment, $transaction: async (fn) => fn(prisma) };
  return { prisma, store, calls };
}

// ── 스케줄러용 fake ──

function createFakeSchedulerPrisma(posts, { beforeUpdateMany } = {}) {
  const store = posts.map((p) => ({ ...p }));

  const blogPost = {
    async findMany({ where } = {}) {
      await tick();
      return store.filter((r) => matchWhere(r, where)).map((r) => ({ ...r }));
    },
    async updateMany({ where, data }) {
      await tick();
      if (beforeUpdateMany) beforeUpdateMany(where, store);
      // 틱 이후는 동기 — 단일 UPDATE 문의 원자성(행 잠금)을 모사한다.
      const targets = store.filter((r) => matchWhere(r, where));
      for (const target of targets) Object.assign(target, data);
      return { count: targets.length };
    },
    async update({ where, data }) {
      await tick();
      const target = store.find((r) => r.id === where.id);
      if (!target) throw new Error(`post ${where.id} not found`);
      Object.assign(target, data);
      return { ...target };
    },
  };

  return { prisma: { blogPost }, store };
}

// ── 버그 1: 댓글 레이트 리밋 경쟁 조건 ──

test('댓글 동시 생성: 제한 5건에 동시 6건 → 5건만 살아남고 1건은 429', async () => {
  const { prisma, store, calls } = createFakeCommentPrisma({
    fixedCreatedAt: ago(1),
  });
  const service = createCommentService(prisma, {
    rateLimit: { maxPerHour: 5 },
    autoApprove: true,
  });

  const results = await Promise.allSettled(
    Array.from({ length: 6 }, (_, i) =>
      service.create(
        { postId: 'p1', content: `동시 댓글 ${i}`, guestName: 'g' },
        { ipHash: 'ip-A' },
      ),
    ),
  );

  const ok = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(ok.length, 5, '제한과 동일한 5건만 성공해야 한다');
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.code, 'COMMENT_RATE_LIMIT_EXCEEDED');
  assert.equal(rejected[0].reason.statusCode, 429);
  assert.equal(store.length, 5, 'DB 최종 상태도 5건이어야 한다');

  // 사전 count() 만으로는 6건 모두 통과했음을 확인 → 사후 순번 검증이 실제 장치.
  assert.equal(calls.create, 6, '경쟁 조건상 6건 모두 삽입까지 진행된다');
  assert.equal(calls.delete, 1, '초과 1건은 보상 삭제로 되돌려진다');

  // 살아남은 댓글의 id 는 서로 달라야 하고, 되돌려진 행은 store 에 없어야 한다.
  const ids = ok.map((r) => r.value.id);
  assert.equal(new Set(ids).size, 5);
  for (const id of ids) {
    assert.ok(store.some((r) => r.id === id));
  }
});

test('댓글 동시 생성: 기존 4건 + 동시 3건(제한 5) → 1건만 성공', async () => {
  const createdAt = ago(1);
  const existing = Array.from({ length: 4 }, (_, i) => ({
    id: `c000${i + 1}`,
    postId: 'p1',
    ipHash: 'ip-A',
    content: 'old',
    status: 'APPROVED',
    createdAt: ago(5),
  }));
  const { prisma, store } = createFakeCommentPrisma({
    rows: existing,
    fixedCreatedAt: createdAt,
  });
  const service = createCommentService(prisma, { rateLimit: { maxPerHour: 5 } });

  const results = await Promise.allSettled(
    Array.from({ length: 3 }, (_, i) =>
      service.create({ postId: 'p1', content: `c${i}` }, { ipHash: 'ip-A' }),
    ),
  );

  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    results.filter(
      (r) =>
        r.status === 'rejected' &&
        r.reason.code === 'COMMENT_RATE_LIMIT_EXCEEDED',
    ).length,
    2,
  );
  assert.equal(store.length, 5);
});

test('댓글 레이트 리밋: 서로 다른 ipHash 는 서로에게 영향을 주지 않는다', async () => {
  const { prisma, store } = createFakeCommentPrisma({
    fixedCreatedAt: ago(1),
  });
  const service = createCommentService(prisma, { rateLimit: { maxPerHour: 2 } });

  const results = await Promise.allSettled([
    service.create({ postId: 'p1', content: 'a' }, { ipHash: 'ip-A' }),
    service.create({ postId: 'p1', content: 'b' }, { ipHash: 'ip-A' }),
    service.create({ postId: 'p1', content: 'c' }, { ipHash: 'ip-B' }),
    service.create({ postId: 'p1', content: 'd' }, { ipHash: 'ip-B' }),
  ]);

  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 4);
  assert.equal(store.length, 4);
});

test('댓글 레이트 리밋: 순차 초과 요청은 삽입 없이 사전 차단(빠른 경로 유지)', async () => {
  const { prisma, store, calls } = createFakeCommentPrisma();
  const service = createCommentService(prisma, { rateLimit: { maxPerHour: 2 } });

  await service.create({ postId: 'p1', content: '1' }, { ipHash: 'ip-A' });
  await service.create({ postId: 'p1', content: '2' }, { ipHash: 'ip-A' });
  await assert.rejects(
    () => service.create({ postId: 'p1', content: '3' }, { ipHash: 'ip-A' }),
    (err) => err.code === 'COMMENT_RATE_LIMIT_EXCEEDED' && err.statusCode === 429,
  );

  assert.equal(store.length, 2);
  assert.equal(calls.create, 2, '초과 요청은 create 까지 가지 않는다');
  assert.equal(calls.delete, 0, '보상 삭제도 필요 없다');
});

test('댓글 레이트 리밋: ipHash 가 없으면 제한을 적용하지 않는다', async () => {
  const { prisma, store, calls } = createFakeCommentPrisma();
  const service = createCommentService(prisma, { rateLimit: { maxPerHour: 1 } });

  await service.create({ postId: 'p1', content: '1' }, {});
  await service.create({ postId: 'p1', content: '2' }, {});

  assert.equal(store.length, 2);
  assert.equal(calls.count, 0, 'ipHash 없으면 순번 검증도 수행하지 않는다');
});

test('댓글 허니팟: 제한을 채운 상태에서도 SPAM 으로 저장되고 429 가 아니다', async () => {
  const existing = [
    {
      id: 'c0001',
      postId: 'p1',
      ipHash: 'ip-A',
      content: 'old',
      status: 'APPROVED',
      createdAt: new Date(),
    },
  ];
  const { prisma, store } = createFakeCommentPrisma({ rows: existing });
  const service = createCommentService(prisma, {
    rateLimit: { maxPerHour: 1 },
    autoApprove: true,
  });

  const created = await service.create(
    { postId: 'p1', content: 'bot', honeypot: 'filled' },
    { ipHash: 'ip-A' },
  );

  assert.equal(created.status, 'SPAM');
  assert.equal(store.length, 2);
});

test('댓글 생성 기존 동작 유지: autoApprove / spamFilter / 깊이 제한', async () => {
  const { prisma } = createFakeCommentPrisma();
  const approved = createCommentService(prisma, { autoApprove: true });
  const root = await approved.create({ postId: 'p1', content: 'hello' }, {});
  assert.equal(root.status, 'APPROVED');

  const spam = createCommentService(prisma, {
    autoApprove: true,
    spamFilter: (content) => content.includes('casino'),
  });
  const flagged = await spam.create({ postId: 'p1', content: 'buy casino' }, {});
  assert.equal(flagged.status, 'SPAM');

  const shallow = createCommentService(prisma, { autoApprove: true, maxDepth: 1 });
  await assert.rejects(
    () => shallow.create({ postId: 'p1', parentId: root.id, content: 'reply' }, {}),
    (err) => err.code === 'COMMENT_MAX_DEPTH_EXCEEDED',
  );

  await assert.rejects(
    () => approved.create({ postId: 'p1', parentId: 'nope', content: 'x' }, {}),
    (err) => err.code === 'COMMENT_PARENT_NOT_FOUND',
  );
});

// ── 버그 2: 예약 발행 이중 집계 ──

function scheduledPosts(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    published: false,
    publishedAt: ago(5),
  }));
}

test('예약 발행 동시 트리거: 3회 동시 실행 시 postId 가 중복 집계되지 않는다', async () => {
  const { prisma, store } = createFakeSchedulerPrisma(scheduledPosts(3));
  const scheduler = createSchedulerService(prisma);

  const results = await Promise.all([
    scheduler.processScheduledPosts(),
    scheduler.processScheduledPosts(),
    scheduler.processScheduledPosts(),
  ]);

  const all = results.flatMap((r) => r.postIds);
  assert.equal(all.length, 3, '전체 반환 id 개수 = 실제 전환 건수');
  assert.equal(new Set(all).size, 3, '같은 postId 가 두 호출에서 반환되면 안 된다');
  assert.deepEqual([...all].sort(), ['p1', 'p2', 'p3']);

  for (const r of results) {
    assert.equal(r.processed, r.postIds.length, 'processed 와 postIds 길이 일치');
  }
  assert.equal(
    results.reduce((sum, r) => sum + r.processed, 0),
    3,
  );
  // 전환에 실패한 호출은 빈 결과를 받아야 한다(후처리 중복 실행 방지).
  assert.ok(results.some((r) => r.processed === 0 && r.postIds.length === 0));
  assert.ok(store.every((p) => p.published === true));
});

test('예약 발행: 단일 실행은 기존과 동일하게 모든 대상 id 를 반환', async () => {
  const { prisma, store } = createFakeSchedulerPrisma([
    ...scheduledPosts(2),
    { id: 'future', published: false, publishedAt: ahead(60) },
    { id: 'draft', published: false, publishedAt: null },
    { id: 'live', published: true, publishedAt: ago(60) },
  ]);
  const scheduler = createSchedulerService(prisma);

  const result = await scheduler.processScheduledPosts();

  assert.equal(result.processed, 2);
  assert.deepEqual([...result.postIds].sort(), ['p1', 'p2']);
  assert.equal(store.find((p) => p.id === 'future').published, false);
  assert.equal(store.find((p) => p.id === 'draft').published, false);
});

test('예약 발행: 대상 없음 → processed 0', async () => {
  const { prisma } = createFakeSchedulerPrisma([]);
  const scheduler = createSchedulerService(prisma);
  assert.deepEqual(await scheduler.processScheduledPosts(), {
    processed: 0,
    postIds: [],
  });
});

test('예약 발행: 조회와 갱신 사이에 예약이 미래로 변경되면 전환하지 않는다', async () => {
  let moved = false;
  const { prisma, store } = createFakeSchedulerPrisma(scheduledPosts(2), {
    beforeUpdateMany(where, rows) {
      if (moved) return;
      moved = true;
      // p1 을 갱신하려는 순간 관리자가 p2 예약을 미래로 옮긴 상황
      const p2 = rows.find((r) => r.id === 'p2');
      p2.publishedAt = ahead(60);
    },
  });
  const scheduler = createSchedulerService(prisma);

  const result = await scheduler.processScheduledPosts();

  assert.deepEqual(result.postIds, ['p1']);
  assert.equal(result.processed, 1);
  assert.equal(store.find((p) => p.id === 'p2').published, false);
});
