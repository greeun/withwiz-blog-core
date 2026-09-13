/**
 * 블로그 서비스 본문 새니타이즈 저장값 회귀 테스트
 *
 * 새니타이즈 결과가 빈 문자열(위험 요소만 있는 본문)이거나 null 이어도
 * 원본으로 되돌리지 않고 결과(null 은 빈 문자열)를 저장해야 한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlogService } from '../../dist/services/index.mjs';

// 폴백 새니타이저 1회 경고가 테스트 출력에 섞이지 않게 한다
console.warn = () => {};

function createFakePrisma() {
  const calls = { create: [], update: [] };
  const delegate = {
    findFirst: async () => null,
    findMany: async () => [],
    findUnique: async ({ where }) => ({ id: where.id, published: false }),
    create: async ({ data }) => {
      calls.create.push(data);
      return { id: 'post-1', ...data };
    },
    update: async ({ where, data }) => {
      calls.update.push(data);
      return { id: where.id, ...data };
    },
  };
  const prisma = {
    blogPost: delegate,
    $transaction: async (fn) => fn(prisma),
  };
  return { prisma, calls };
}

const baseInput = { slug: 'hello', category: 'news', title: '제목' };
const DANGER_ONLY = '<script>alert(1)</script>';

test('create: 위험 요소만 있는 본문은 원본이 아니라 빈 문자열로 저장', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.create({ ...baseInput, content: DANGER_ONLY }, 'author-1');
  assert.equal(calls.create[0].content, '');
});

test('update: 위험 요소만 있는 본문은 원본이 아니라 빈 문자열로 저장', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.update('post-1', { content: DANGER_ONLY });
  assert.equal(calls.update[0].content, '');
});

test('create·update: 사용자 새니타이저가 null 을 돌려주면 빈 문자열로 저장', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost', sanitizeContent: () => null });
  await service.create({ ...baseInput, content: '<p>원본</p>' }, 'author-1');
  await service.update('post-1', { content: '<p>원본</p>' });
  assert.equal(calls.create[0].content, '');
  assert.equal(calls.update[0].content, '');
});

test('create·update: 새니타이즈 결과를 그대로 저장', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  const content = '<p>ok</p><img src="x" onerror="alert(1)">';
  await service.create({ ...baseInput, content }, 'author-1');
  await service.update('post-1', { content });
  assert.equal(calls.create[0].content, '<p>ok</p><img src="x">');
  assert.equal(calls.update[0].content, '<p>ok</p><img src="x">');
});

test('update: content 를 보내지 않으면 content 는 변경 대상에 넣지 않는다', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.update('post-1', { title: '새 제목' });
  assert.equal('content' in calls.update[0], false);
});
