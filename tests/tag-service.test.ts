/**
 * 태그 서비스 단위 테스트
 * Mock Prisma delegate를 주입하여 서비스 로직만 검증한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTagService } from '@withwiz/blog-core/services';
import type { TagServiceConfig } from '@withwiz/blog-core/services';

// ── Mock Prisma delegate 팩토리 ──

function createMockDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
  };
}

function createMockPrisma() {
  const tag = createMockDelegate();
  const blogPost = createMockDelegate();
  const postTag = createMockDelegate();
  const prisma: any = {
    tag,
    blogPost,
    postTag,
    $transaction: vi.fn(async (fn: any) => fn({ tag, blogPost, postTag })),
  };
  return { prisma, tag, blogPost, postTag };
}

const baseConfig: TagServiceConfig = {
  modelName: 'tag',
  postModelName: 'blogPost',
  postTagModelName: 'postTag',
};

describe('createTagService', () => {
  let mocks: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mocks = createMockPrisma();
  });

  // BC-TS-00
  it('tag 모델이 없으면 Error를 throw한다', () => {
    const prisma: any = { blogPost: {}, postTag: {}, $transaction: vi.fn() };
    expect(() => createTagService(prisma, baseConfig)).toThrow(/Prisma model "tag" not found/);
  });

  // BC-TS-00b
  it('postModelName이 prisma에 없으면 Error를 throw한다', () => {
    const prisma: any = { tag: {}, postTag: {}, $transaction: vi.fn() };
    expect(() => createTagService(prisma, baseConfig)).toThrow(/Prisma model "blogPost" not found/);
  });

  describe('CRUD', () => {
    // BC-TS-01
    it('create: 태그를 생성한다', async () => {
      mocks.tag.create.mockResolvedValue({ id: 't1', slug: 'news', name: 'News' });
      const svc = createTagService(mocks.prisma, baseConfig);
      const result = await svc.create({ slug: 'news', name: 'News' });
      expect(mocks.tag.create).toHaveBeenCalledWith({
        data: { slug: 'news', name: 'News' },
      });
      expect(result.id).toBe('t1');
    });

    // BC-TS-02
    it('getById: 존재하는 id의 태그를 반환한다', async () => {
      mocks.tag.findUnique.mockResolvedValue({ id: 't1', slug: 'news', name: 'News' });
      const svc = createTagService(mocks.prisma, baseConfig);
      const tag = await svc.getById('t1');
      expect(tag?.slug).toBe('news');
      expect(mocks.tag.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    // BC-TS-03
    it('getById: 없는 id에 null을 반환한다', async () => {
      mocks.tag.findUnique.mockResolvedValue(null);
      const svc = createTagService(mocks.prisma, baseConfig);
      const tag = await svc.getById('nope');
      expect(tag).toBeNull();
    });

    // BC-TS-04
    it('getBySlug: slug로 태그를 조회한다', async () => {
      mocks.tag.findUnique.mockResolvedValue({ id: 't1', slug: 'news', name: 'News' });
      const svc = createTagService(mocks.prisma, baseConfig);
      const tag = await svc.getBySlug('news');
      expect(tag?.slug).toBe('news');
      expect(mocks.tag.findUnique).toHaveBeenCalledWith({ where: { slug: 'news' } });
    });

    // BC-TS-05
    it('update: 태그를 수정한다', async () => {
      mocks.tag.update.mockResolvedValue({ id: 't1', slug: 'news', name: 'Updated' });
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.update('t1', { name: 'Updated' });
      expect(mocks.tag.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { name: 'Updated' },
      });
    });

    // BC-TS-06
    it('remove: 태그를 삭제한다', async () => {
      mocks.tag.delete.mockResolvedValue({});
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.remove('t1');
      expect(mocks.tag.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    // BC-TS-07
    it('create: slug 중복 시 Prisma 에러를 그대로 전파한다', async () => {
      mocks.tag.create.mockRejectedValue(new Error('Unique constraint failed: slug'));
      const svc = createTagService(mocks.prisma, baseConfig);
      await expect(svc.create({ slug: 'dup', name: 'Dup' })).rejects.toThrow(/Unique constraint/);
    });
  });

  describe('listAll', () => {
    // BC-TS-10
    it('페이지네이션 결과 구조를 반환한다', async () => {
      mocks.tag.findMany.mockResolvedValue([
        { id: 't1', slug: 'a', name: 'A', _count: { posts: 3 } },
        { id: 't2', slug: 'b', name: 'B', _count: { posts: 1 } },
      ]);
      mocks.tag.count.mockResolvedValue(2);
      const svc = createTagService(mocks.prisma, baseConfig);
      const result = await svc.listAll({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].postCount).toBe(3);
      expect(result.pagination.total).toBe(2);
    });

    // BC-TS-11
    it('search 파라미터로 검색 조건을 적용한다', async () => {
      mocks.tag.findMany.mockResolvedValue([]);
      mocks.tag.count.mockResolvedValue(0);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.listAll({ search: '뉴스' });
      expect(mocks.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: '뉴스' }) }),
            ]),
          }),
        }),
      );
    });

    // BC-TS-12
    it('page<1을 1로 보정한다', async () => {
      mocks.tag.findMany.mockResolvedValue([]);
      mocks.tag.count.mockResolvedValue(0);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.listAll({ page: -5, limit: 10 });
      expect(mocks.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });

  describe('getTagCloud', () => {
    // BC-TS-20
    it('postCount 내림차순 정렬 후 limit까지만 반환한다', async () => {
      mocks.tag.findMany.mockResolvedValue([
        { id: 't1', slug: 'a', name: 'A', _count: { posts: 1 } },
        { id: 't2', slug: 'b', name: 'B', _count: { posts: 5 } },
        { id: 't3', slug: 'c', name: 'C', _count: { posts: 3 } },
      ]);
      const svc = createTagService(mocks.prisma, baseConfig);
      const cloud = await svc.getTagCloud(10);
      expect(cloud.map((t) => t.slug)).toEqual(['b', 'c', 'a']);
      expect(cloud[0].postCount).toBe(5);
    });

    // BC-TS-21
    it('limit을 지정하면 take로 전달한다', async () => {
      mocks.tag.findMany.mockResolvedValue([]);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.getTagCloud(5);
      expect(mocks.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    // BC-TS-22: limit 상한 클램핑 (최대 500)
    it('limit이 500을 초과하면 500으로 클램핑한다', async () => {
      mocks.tag.findMany.mockResolvedValue([]);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.getTagCloud(100000);
      expect(mocks.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });

    // BC-TS-23: limit이 0 이하이면 최소 1로 클램핑한다
    it('limit이 0 이하이면 최소 1로 클램핑한다', async () => {
      mocks.tag.findMany.mockResolvedValue([]);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.getTagCloud(0);
      expect(mocks.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });
  });

  describe('getPostsByTag', () => {
    // BC-TS-30
    it('태그 slug로 공개된 포스트 목록을 반환한다', async () => {
      mocks.blogPost.findMany.mockResolvedValue([
        {
          id: 'p1', slug: 'hello', category: 'NOTICE', title: 'Hello',
          excerpt: null, coverImageUrl: null, attachments: [],
          featured: false, published: true,
          publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
        },
      ]);
      mocks.blogPost.count.mockResolvedValue(1);
      const svc = createTagService(mocks.prisma, baseConfig);
      const result = await svc.getPostsByTag('news', { page: 1, limit: 12 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe('hello');
      expect(mocks.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            published: true,
            tags: expect.objectContaining({
              some: expect.objectContaining({
                tag: expect.objectContaining({ slug: 'news' }),
              }),
            }),
          }),
        }),
      );
    });

    // BC-TS-31
    it('페이지네이션 기본값은 page=1, limit=12', async () => {
      mocks.blogPost.findMany.mockResolvedValue([]);
      mocks.blogPost.count.mockResolvedValue(0);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.getPostsByTag('news');
      expect(mocks.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 12 }),
      );
    });
  });

  describe('getTagsByPost', () => {
    // BC-TS-40
    it('PostTag 관계로부터 태그 목록을 반환한다', async () => {
      mocks.postTag.findMany.mockResolvedValue([
        { postId: 'p1', tagId: 't1', tag: { id: 't1', slug: 'a', name: 'A' } },
        { postId: 'p1', tagId: 't2', tag: { id: 't2', slug: 'b', name: 'B' } },
      ]);
      const svc = createTagService(mocks.prisma, baseConfig);
      const tags = await svc.getTagsByPost('p1');
      expect(tags).toHaveLength(2);
      expect(tags[0].slug).toBe('a');
    });
  });

  describe('getRelatedPosts', () => {
    // BC-TS-50
    it('태그가 없으면 빈 배열을 반환한다', async () => {
      mocks.postTag.findMany.mockResolvedValue([]);
      const svc = createTagService(mocks.prisma, baseConfig);
      const result = await svc.getRelatedPosts('p1', 5);
      expect(result).toEqual([]);
    });

    // BC-TS-51
    it('공유 태그 수가 많은 순으로 정렬하여 반환한다', async () => {
      // 현재 포스트 p1의 태그: t1, t2
      mocks.postTag.findMany.mockResolvedValue([
        { tagId: 't1' },
        { tagId: 't2' },
      ]);
      // 후보 포스트들
      mocks.blogPost.findMany.mockResolvedValue([
        {
          id: 'p2', slug: 'b', category: 'N', title: 'B',
          excerpt: null, coverImageUrl: null, attachments: [],
          featured: false, published: true, publishedAt: new Date(),
          createdAt: new Date(), updatedAt: new Date(),
          tags: [{ tagId: 't1' }], // 공유 1개
        },
        {
          id: 'p3', slug: 'c', category: 'N', title: 'C',
          excerpt: null, coverImageUrl: null, attachments: [],
          featured: false, published: true, publishedAt: new Date(),
          createdAt: new Date(), updatedAt: new Date(),
          tags: [{ tagId: 't1' }, { tagId: 't2' }], // 공유 2개
        },
      ]);
      const svc = createTagService(mocks.prisma, baseConfig);
      const result = await svc.getRelatedPosts('p1', 5);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p3'); // 공유 태그 수 많은 쪽이 먼저
      expect(result[1].id).toBe('p2');
    });

    // BC-TS-52
    it('자기 자신 제외 조건이 where에 포함된다', async () => {
      mocks.postTag.findMany.mockResolvedValue([{ tagId: 't1' }]);
      mocks.blogPost.findMany.mockResolvedValue([]);
      const svc = createTagService(mocks.prisma, baseConfig);
      await svc.getRelatedPosts('p1', 5);
      expect(mocks.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'p1' },
            published: true,
          }),
        }),
      );
    });
  });
});
