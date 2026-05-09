import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlogService } from '@withwiz/blog-core/services';
import type { BlogServiceConfig } from '@withwiz/blog-core/types';

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
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
  };
}

function createMockPrisma(modelName: string, delegate: ReturnType<typeof createMockDelegate>) {
  return {
    [modelName]: delegate,
    $transaction: vi.fn(async (fn: any) => fn({
      [modelName]: delegate,
    })),
  };
}

const baseConfig: BlogServiceConfig = {
  modelName: 'blogPost',
};

describe('createBlogService', () => {
  let delegate: ReturnType<typeof createMockDelegate>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    delegate = createMockDelegate();
    prisma = createMockPrisma('blogPost', delegate);
  });

  // BC-BS-01
  it('config.modelName이 prisma에 없으면 Error를 throw한다', () => {
    expect(() => createBlogService(prisma as any, { modelName: 'nonExistent' })).toThrow(
      'Prisma model "nonExistent" not found',
    );
  });

  describe('listPublished', () => {
    // BC-BS-02
    it('page<1을 1로 보정한다', async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.listPublished({ page: -5, limit: 10 });
      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    // BC-BS-03
    it('limit<1을 1로 보정한다', async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.listPublished({ page: 1, limit: -5 });
      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    // BC-BS-04
    it('카테고리 필터를 적용한다', async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.listPublished({ page: 1, limit: 10, category: 'NOTICE' });
      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'NOTICE' }),
        }),
      );
    });

    // BC-BS-05
    it('검색어 필터를 적용한다', async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.listPublished({ page: 1, limit: 10, search: '테스트' });
      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: '테스트' }) }),
            ]),
          }),
        }),
      );
    });

    // BC-BS-06
    it('페이지네이션 결과 구조를 반환한다', async () => {
      const mockItem = {
        id: '1', slug: 'test', category: 'NOTICE', title: 'Test',
        excerpt: null, coverImageUrl: null, attachments: [],
        featured: false, published: true, publishedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
      };
      delegate.findMany.mockResolvedValue([mockItem]);
      delegate.count.mockResolvedValue(1);
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.listPublished({ page: 1, limit: 10 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('totalPages');
      expect(result.pagination).toHaveProperty('hasMore');
    });
  });

  describe('getPublishedBySlug', () => {
    // BC-BS-07
    it('존재하는 slug의 상세를 반환한다', async () => {
      const mockPost = {
        id: '1', slug: 'test', category: 'NOTICE', title: 'Test',
        excerpt: null, coverImageUrl: null, coverImageKey: null,
        attachments: [{ name: 'f.pdf', url: 'u', key: 'k', size: 1, type: 't' }],
        featured: false, published: true, publishedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(), content: '<p>hi</p>',
        authorId: 'a1',
      };
      delegate.findFirst.mockResolvedValue(mockPost);
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.getPublishedBySlug('test');
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test');
    });

    // BC-BS-08
    it('없는 slug에 null을 반환한다', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.getPublishedBySlug('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getFeatured', () => {
    // BC-BS-09
    it('기본 limit=1로 호출한다', async () => {
      delegate.findMany.mockResolvedValue([]);
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.getFeatured();
      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });
  });

  describe('checkSlugAvailable', () => {
    // BC-BS-10
    it('사용 가능한 slug에 true를 반환한다', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.checkSlugAvailable('new-slug');
      expect(result).toBe(true);
    });

    // BC-BS-11
    it('중복 slug에 false를 반환한다', async () => {
      delegate.findFirst.mockResolvedValue({ id: 'existing' });
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.checkSlugAvailable('existing-slug');
      expect(result).toBe(false);
    });

    // BC-BS-12
    it('excludeId로 자기 자신을 제외한다', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.checkSlugAvailable('my-slug', 'self-id');
      expect(delegate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slug: 'my-slug',
            id: { not: 'self-id' },
          }),
        }),
      );
    });
  });

  describe('create', () => {
    // BC-BS-13
    it('published=true이고 publishedAt 없을 때 자동 설정한다', async () => {
      // uniqueSlug: no conflict
      delegate.findFirst.mockResolvedValue(null);
      delegate.create.mockImplementation(async (args: any) => ({
        ...args.data,
        id: 'new-1',
        attachments: args.data.attachments || [],
      }));
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.create(
        { slug: 'test', category: 'NOTICE', title: 'T', content: '<p>c</p>', published: true },
        'author-1',
      );
      expect(delegate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            publishedAt: expect.any(Date),
          }),
        }),
      );
    });

    // BC-BS-14
    it('slug 충돌 시 suffix를 자동 증가한다', async () => {
      // First findFirst (exact match) returns existing
      delegate.findFirst.mockResolvedValueOnce({ id: 'existing' });
      // findMany for similar slugs
      delegate.findMany.mockResolvedValueOnce([{ slug: 'test-2' }]);
      delegate.create.mockImplementation(async (args: any) => ({
        ...args.data,
        id: 'new-1',
        attachments: args.data.attachments || [],
      }));
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.create(
        { slug: 'test', category: 'NOTICE', title: 'T', content: '<p>c</p>' },
        'author-1',
      );
      expect(delegate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'test-3' }),
        }),
      );
    });

    // BC-BS-15
    it('sanitizeHtmlContent를 호출한다', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const mockSanitize = vi.fn((html: string | null | undefined) => html ? `sanitized:${html}` : null);
      const configWithSanitize: BlogServiceConfig = {
        ...baseConfig,
        sanitizeContent: mockSanitize,
      };
      delegate.create.mockImplementation(async (args: any) => ({
        ...args.data,
        id: 'new-1',
        attachments: [],
      }));
      const svc = createBlogService(prisma as any, configWithSanitize);
      await svc.create(
        { slug: 'test', category: 'NOTICE', title: 'T', content: '<p>c</p>' },
        'author-1',
      );
      expect(mockSanitize).toHaveBeenCalledWith('<p>c</p>');
    });
  });

  describe('update', () => {
    // BC-BS-16
    it('published 전환 시 $transaction을 사용한다', async () => {
      delegate.findUnique.mockResolvedValue({ published: false });
      delegate.update.mockResolvedValue({
        id: '1', slug: 'test', category: 'NOTICE', title: 'T',
        content: '<p>c</p>', excerpt: null, coverImageUrl: null,
        coverImageKey: null, attachments: [], featured: false,
        published: true, publishedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(), authorId: 'a1',
      });
      const svc = createBlogService(prisma as any, baseConfig);
      await svc.update('1', { published: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    // BC-BS-16a: tagIds가 명시되었을 때 update + 태그 동기화가 단일 $transaction으로 실행된다
    it('tagIds 동기화 시 update + postTag deleteMany/createMany가 단일 $transaction 내에서 실행된다', async () => {
      // postTag 델리게이트를 추가하고, $transaction이 해당 델리게이트도 전달하도록 구성
      const postTagDelegate = {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      };
      const prismaWithTags: any = {
        blogPost: delegate,
        postTag: postTagDelegate,
        $transaction: vi.fn(async (fn: any) =>
          fn({ blogPost: delegate, postTag: postTagDelegate }),
        ),
      };
      delegate.update.mockResolvedValue({
        id: '1', slug: 'test', category: 'NOTICE', title: 'T',
        content: '<p>c</p>', excerpt: null, coverImageUrl: null,
        coverImageKey: null, attachments: [], featured: false,
        published: true, publishedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(), authorId: 'a1',
      });
      const svc = createBlogService(prismaWithTags, baseConfig);
      await svc.update('1', { tagIds: ['t1', 't2'] });

      expect(prismaWithTags.$transaction).toHaveBeenCalledTimes(1);
      expect(postTagDelegate.deleteMany).toHaveBeenCalledWith({ where: { postId: '1' } });
      expect(postTagDelegate.createMany).toHaveBeenCalled();
    });

    // BC-BS-16b: 트랜잭션 내 오류 발생 시 롤백 (update 실패 → postTag 호출되지 않음)
    it('update 단계 실패 시 postTag 연산이 실행되지 않고 롤백된다', async () => {
      const postTagDelegate = {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      };
      const prismaWithTags: any = {
        blogPost: delegate,
        postTag: postTagDelegate,
        $transaction: vi.fn(async (fn: any) =>
          fn({ blogPost: delegate, postTag: postTagDelegate }),
        ),
      };
      delegate.update.mockRejectedValue(new Error('DB fail'));
      const svc = createBlogService(prismaWithTags, baseConfig);
      await expect(
        svc.update('1', { tagIds: ['t1'] }),
      ).rejects.toThrow('DB fail');
      expect(postTagDelegate.deleteMany).not.toHaveBeenCalled();
      expect(postTagDelegate.createMany).not.toHaveBeenCalled();
    });

    // BC-BS-16c: create + tagIds도 동일 트랜잭션 내에서 실행된다
    it('create 시 tagIds가 있으면 $transaction 내에서 create + postTag.createMany가 실행된다', async () => {
      const postTagDelegate = {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      };
      const prismaWithTags: any = {
        blogPost: delegate,
        postTag: postTagDelegate,
        $transaction: vi.fn(async (fn: any) =>
          fn({ blogPost: delegate, postTag: postTagDelegate }),
        ),
      };
      delegate.findFirst.mockResolvedValue(null);
      delegate.create.mockResolvedValue({
        id: 'new-1', slug: 'test', category: 'NOTICE', title: 'T',
        content: '<p>c</p>', excerpt: null, coverImageUrl: null,
        coverImageKey: null, attachments: [], featured: false,
        published: false, publishedAt: null,
        createdAt: new Date(), updatedAt: new Date(), authorId: 'a1',
      });
      const svc = createBlogService(prismaWithTags, baseConfig);
      await svc.create(
        { slug: 'test', category: 'NOTICE', title: 'T', content: '<p>c</p>', tagIds: ['t1', 't2'] } as any,
        'a1',
      );

      expect(prismaWithTags.$transaction).toHaveBeenCalledTimes(1);
      expect(postTagDelegate.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            { postId: 'new-1', tagId: 't1' },
            { postId: 'new-1', tagId: 't2' },
          ],
          skipDuplicates: true,
        }),
      );
    });
  });

  describe('togglePublish', () => {
    // BC-BS-17
    it('존재하지 않는 id에 Error를 throw한다', async () => {
      delegate.findUnique.mockResolvedValue(null);
      const svc = createBlogService(prisma as any, baseConfig);
      await expect(svc.togglePublish('nonexistent')).rejects.toThrow('Blog post not found');
    });

    // BC-BS-18
    it('true에서 false로 토글한다', async () => {
      delegate.findUnique.mockResolvedValue({ published: true });
      delegate.update.mockResolvedValue({ published: false, publishedAt: null });
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.togglePublish('1');
      expect(result.published).toBe(false);
      expect(delegate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ published: false, publishedAt: null }),
        }),
      );
    });
  });

  describe('remove', () => {
    // BC-BS-19
    it('enableR2Cleanup=false일 때 R2를 호출하지 않는다', async () => {
      delegate.findUnique.mockResolvedValue({ coverImageKey: 'key', content: 'c', attachments: [] });
      delegate.delete.mockResolvedValue({});
      const mockR2 = {
        isEnabled: vi.fn().mockReturnValue(true),
        collectKeys: vi.fn().mockReturnValue([]),
        deleteKeys: vi.fn().mockResolvedValue(undefined),
      };
      const svc = createBlogService(prisma as any, {
        ...baseConfig,
        enableR2Cleanup: false,
        r2Helpers: mockR2,
      });
      await svc.remove('1');
      expect(mockR2.deleteKeys).not.toHaveBeenCalled();
    });
  });

  describe('removeMany', () => {
    // BC-BS-20
    it('여러 id를 삭제한다', async () => {
      delegate.deleteMany.mockResolvedValue({ count: 3 });
      const svc = createBlogService(prisma as any, baseConfig);
      const count = await svc.removeMany(['1', '2', '3']);
      expect(count).toBe(3);
      expect(delegate.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['1', '2', '3'] } },
        }),
      );
    });
  });

  describe('bulkUpdatePublished', () => {
    // BC-BS-21
    it('ids 배열로 일괄 공개 상태를 변경한다', async () => {
      delegate.updateMany.mockResolvedValue({ count: 2 });
      const svc = createBlogService(prisma as any, baseConfig);
      const count = await svc.bulkUpdatePublished(['1', '2'], true);
      expect(count).toBe(2);
      expect(delegate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['1', '2'] } },
          data: expect.objectContaining({ published: true }),
        }),
      );
    });
  });

  describe('bulkUpdateFeatured', () => {
    // BC-BS-22
    it('ids 배열로 일괄 추천 상태를 변경한다', async () => {
      delegate.updateMany.mockResolvedValue({ count: 2 });
      const svc = createBlogService(prisma as any, baseConfig);
      const count = await svc.bulkUpdateFeatured(['1', '2'], true);
      expect(count).toBe(2);
      expect(delegate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['1', '2'] } },
          data: expect.objectContaining({ featured: true }),
        }),
      );
    });
  });

  describe('getDashboardStats', () => {
    // BC-BS-23
    it('unpublished = total - published로 계산한다', async () => {
      delegate.count
        .mockResolvedValueOnce(10)   // total
        .mockResolvedValueOnce(7)    // published
        .mockResolvedValueOnce(2);   // featured
      delegate.groupBy.mockResolvedValue([
        { category: 'NOTICE', _count: { _all: 5 } },
      ]);
      delegate.findMany.mockResolvedValue([]);
      const svc = createBlogService(prisma as any, baseConfig);
      const stats = await svc.getDashboardStats();
      expect(stats.total).toBe(10);
      expect(stats.published).toBe(7);
      expect(stats.unpublished).toBe(3);
      expect(stats.featured).toBe(2);
    });
  });

  describe('toListItem (내부 변환)', () => {
    // BC-BS-24
    it('attachments 존재 시 hasAttachments=true를 반환한다', async () => {
      const mockItem = {
        id: '1', slug: 'test', category: 'NOTICE', title: 'Test',
        excerpt: null, coverImageUrl: null,
        attachments: [{ name: 'f.pdf', url: 'u', key: 'k', size: 1, type: 't' }],
        featured: false, published: true, publishedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
      };
      delegate.findMany.mockResolvedValue([mockItem]);
      delegate.count.mockResolvedValue(1);
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.listPublished({ page: 1, limit: 10 });
      expect(result.items[0].hasAttachments).toBe(true);
    });

    // BC-BS-25
    it('attachments 빈 배열 시 hasAttachments=false를 반환한다', async () => {
      const mockItem = {
        id: '1', slug: 'test', category: 'NOTICE', title: 'Test',
        excerpt: null, coverImageUrl: null,
        attachments: [],
        featured: false, published: true, publishedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
      };
      delegate.findMany.mockResolvedValue([mockItem]);
      delegate.count.mockResolvedValue(1);
      const svc = createBlogService(prisma as any, baseConfig);
      const result = await svc.listPublished({ page: 1, limit: 10 });
      expect(result.items[0].hasAttachments).toBe(false);
    });
  });
});
