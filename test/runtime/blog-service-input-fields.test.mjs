/**
 * 블로그 서비스 입력 필드 허용 목록 회귀 테스트
 *
 * 관리자 라우트는 `pickPostInput()` 으로 허용 필드만 넘기지만, 소비 프로젝트가
 * `BlogService.create()`·`update()` 를 직접 호출하는 경로(호스트 뉴스 서비스 등)는
 * 라우트를 거치지 않는다. 서비스 계층에서도 같은 목록만 Prisma 로 전달해야 한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlogService } from '../../dist/services/index.mjs';

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

const baseInput = { slug: 'hello', category: 'news', title: '제목', content: '<p>본문</p>' };

test('create: 허용 목록 밖 필드는 Prisma 로 전달하지 않는다', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.create(
    { ...baseInput, id: 'forged-id', viewCount: 9999, comments: { create: [{ content: 'x' }] } },
    'author-1',
  );
  const data = calls.create[0];
  assert.equal(data.id, undefined);
  assert.equal(data.viewCount, undefined);
  assert.equal(data.comments, undefined);
});

test('create: authorId 는 입력이 아니라 인자 값을 쓴다', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.create({ ...baseInput, authorId: 'forged-author' }, 'author-1');
  assert.equal(calls.create[0].authorId, 'author-1');
});

test('update: 허용 목록 밖 필드는 Prisma 로 전달하지 않는다', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.update('post-1', {
    title: '바뀐 제목',
    id: 'forged-id',
    authorId: 'forged-author',
    comments: { deleteMany: {} },
  });
  const data = calls.update[0];
  assert.equal(data.title, '바뀐 제목');
  assert.equal(data.id, undefined);
  assert.equal(data.authorId, undefined);
  assert.equal(data.comments, undefined);
});

test('create·update: 허용 필드는 그대로 전달한다', async () => {
  const { prisma, calls } = createFakePrisma();
  const service = createBlogService(prisma, { modelName: 'blogPost' });
  await service.create(
    { ...baseInput, excerpt: '요약', editorType: 'block', featured: true, published: true },
    'author-1',
  );
  const created = calls.create[0];
  assert.equal(created.title, '제목');
  assert.equal(created.excerpt, '요약');
  assert.equal(created.editorType, 'block');
  assert.equal(created.featured, true);
  assert.equal(created.published, true);

  await service.update('post-1', { excerpt: '새 요약', featured: false });
  assert.equal(calls.update[0].excerpt, '새 요약');
  assert.equal(calls.update[0].featured, false);
});
