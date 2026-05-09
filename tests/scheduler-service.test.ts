/**
 * 스케줄러 서비스 단위 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSchedulerService } from '@withwiz/blog-core/services';

function createMockDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
}

function createMockPrisma() {
  const blogPost = createMockDelegate();
  const prisma: any = { blogPost };
  return { prisma, blogPost };
}

describe('createSchedulerService', () => {
  let mocks: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mocks = createMockPrisma();
  });

  // BC-SCH-00
  it('모델명이 존재하지 않으면 에러를 던진다', () => {
    const prisma: any = {};
    expect(() => createSchedulerService(prisma, { modelName: 'blogPost' })).toThrow(
      /Prisma model "blogPost" not found/,
    );
  });

  // BC-SCH-01
  it('processScheduledPosts: 예약 시간이 지난 글만 published=true로 전환한다', async () => {
    mocks.blogPost.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    mocks.blogPost.updateMany.mockResolvedValue({ count: 2 });

    const svc = createSchedulerService(mocks.prisma);
    const result = await svc.processScheduledPosts();

    // 조회 조건에 published=false, publishedAt <= now 포함
    const findCall = mocks.blogPost.findMany.mock.calls[0][0];
    expect(findCall.where.published).toBe(false);
    expect(findCall.where.publishedAt.not).toBeNull();
    expect(findCall.where.publishedAt.lte).toBeInstanceOf(Date);

    // updateMany 호출 확인
    expect(mocks.blogPost.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2'] } },
      data: { published: true },
    });

    expect(result.processed).toBe(2);
    expect(result.postIds).toEqual(['p1', 'p2']);
  });

  // BC-SCH-02
  it('processScheduledPosts: 미래 예약 글은 findMany에서 제외되어 아무것도 업데이트하지 않는다', async () => {
    // findMany에서 빈 배열 반환 (조건에 매칭 X)
    mocks.blogPost.findMany.mockResolvedValue([]);

    const svc = createSchedulerService(mocks.prisma);
    const result = await svc.processScheduledPosts();

    expect(mocks.blogPost.updateMany).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
    expect(result.postIds).toEqual([]);
  });

  // BC-SCH-03
  it('processScheduledPosts: publishedAt null 글은 조회 조건에 의해 제외된다', async () => {
    mocks.blogPost.findMany.mockResolvedValue([]);
    const svc = createSchedulerService(mocks.prisma);
    await svc.processScheduledPosts();
    const findCall = mocks.blogPost.findMany.mock.calls[0][0];
    // publishedAt이 not null 조건
    expect(findCall.where.publishedAt.not).toBeNull();
  });

  // BC-SCH-04
  it('listScheduled: 미래 예약 글만 조회한다 (publishedAt > now)', async () => {
    mocks.blogPost.findMany.mockResolvedValue([
      {
        id: 'p1',
        slug: 's1',
        category: 'NEWS',
        title: 'Future',
        excerpt: null,
        coverImageUrl: null,
        attachments: [],
        featured: false,
        published: false,
        publishedAt: new Date(Date.now() + 10_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const svc = createSchedulerService(mocks.prisma);
    const items = await svc.listScheduled({ limit: 10 });

    const findCall = mocks.blogPost.findMany.mock.calls[0][0];
    expect(findCall.where.published).toBe(false);
    expect(findCall.where.publishedAt.gt).toBeInstanceOf(Date);
    expect(findCall.orderBy).toEqual({ publishedAt: 'asc' });
    expect(findCall.take).toBe(10);

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('p1');
    expect(items[0].hasAttachments).toBe(false);
  });

  // BC-SCH-05
  it('cancelSchedule: publishedAt을 null로 설정한다', async () => {
    const svc = createSchedulerService(mocks.prisma);
    await svc.cancelSchedule('post-abc');
    expect(mocks.blogPost.update).toHaveBeenCalledWith({
      where: { id: 'post-abc' },
      data: { publishedAt: null },
    });
  });

  // BC-SCH-06
  it('processScheduledPosts 반환 구조: { processed, postIds }', async () => {
    mocks.blogPost.findMany.mockResolvedValue([{ id: 'a' }]);
    mocks.blogPost.updateMany.mockResolvedValue({ count: 1 });
    const svc = createSchedulerService(mocks.prisma);
    const result = await svc.processScheduledPosts();
    expect(Object.keys(result).sort()).toEqual(['postIds', 'processed']);
    expect(typeof result.processed).toBe('number');
    expect(Array.isArray(result.postIds)).toBe(true);
  });
});
