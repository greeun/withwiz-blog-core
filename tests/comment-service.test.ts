/**
 * 댓글 서비스 단위 테스트
 *
 * Mock Prisma delegate를 주입하여 서비스 로직만 검증한다.
 * @withwiz/pms 의존성 없음.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommentService } from '@withwiz/blog-core/services';
import type { CommentServiceConfig } from '@withwiz/blog-core/services';

// ── Mock Prisma delegate ──

function createMockDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  };
}

function createMockPrisma() {
  const comment = createMockDelegate();
  const prisma: any = {
    comment,
    $transaction: vi.fn(async (fn: any) => fn({ comment })),
  };
  return { prisma, comment };
}

const baseConfig: CommentServiceConfig = {
  modelName: 'comment',
};

describe('createCommentService', () => {
  let mocks: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mocks = createMockPrisma();
  });

  // BC-CS-00
  it('comment 모델이 없으면 Error를 throw한다', () => {
    const prisma: any = { $transaction: vi.fn() };
    expect(() => createCommentService(prisma, baseConfig)).toThrow(
      /Prisma model "comment" not found/,
    );
  });

  describe('create', () => {
    // BC-CS-01: 정상 생성, autoApprove=true → APPROVED
    it('autoApprove=true면 APPROVED 상태로 저장한다', async () => {
      mocks.comment.create.mockImplementation(async (args: any) => ({
        id: 'c1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const svc = createCommentService(mocks.prisma, {
        ...baseConfig,
        autoApprove: true,
      });
      const result = await svc.create(
        { postId: 'p1', content: '좋은 글입니다' },
        { userId: 'u1' },
      );

      expect(result.status).toBe('APPROVED');
      expect(mocks.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postId: 'p1',
            content: '좋은 글입니다',
            status: 'APPROVED',
            authorId: 'u1',
          }),
        }),
      );
    });

    // BC-CS-01b: autoApprove=false → PENDING
    it('기본값(autoApprove=false)이면 PENDING 상태로 저장한다', async () => {
      mocks.comment.create.mockImplementation(async (args: any) => ({
        id: 'c1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const svc = createCommentService(mocks.prisma, baseConfig);
      const result = await svc.create(
        { postId: 'p1', content: '안녕하세요', guestName: '홍길동' },
        {},
      );
      expect(result.status).toBe('PENDING');
    });

    // BC-CS-02: honeypot 채워지면 SPAM
    it('honeypot 필드가 채워지면 SPAM 상태로 저장한다', async () => {
      mocks.comment.create.mockImplementation(async (args: any) => ({
        id: 'c1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const svc = createCommentService(mocks.prisma, {
        ...baseConfig,
        autoApprove: true,
      });
      const result = await svc.create(
        {
          postId: 'p1',
          content: '스팸 댓글',
          guestName: 'bot',
          honeypot: 'https://spam.example.com',
        },
        {},
      );
      expect(result.status).toBe('SPAM');
    });

    // BC-CS-03: requireLogin + userId 없음 → 에러
    it('requireLogin=true인데 userId가 없으면 에러를 던진다', async () => {
      const svc = createCommentService(mocks.prisma, {
        ...baseConfig,
        requireLogin: true,
      });
      await expect(
        svc.create(
          { postId: 'p1', content: '로그인 안 한 댓글' },
          {},
        ),
      ).rejects.toThrow(/Login required|COMMENT_LOGIN_REQUIRED/);
    });

    // BC-CS-04: rate limit 초과 → 에러
    it('rate limit(시간당 5건) 초과 시 에러를 던진다', async () => {
      mocks.comment.count.mockResolvedValue(5); // 이미 5건 기록됨

      const svc = createCommentService(mocks.prisma, {
        ...baseConfig,
        rateLimit: { maxPerHour: 5 },
      });
      await expect(
        svc.create(
          { postId: 'p1', content: 'hi', guestName: 'x' },
          { ipHash: 'ip-hash-abc' },
        ),
      ).rejects.toThrow(/Rate limit|COMMENT_RATE_LIMIT_EXCEEDED/);
    });

    // BC-CS-05: maxDepth 초과 → 에러
    it('maxDepth=2인데 대댓글의 대댓글을 달려고 하면 에러', async () => {
      // parent(c1)의 parentId가 c0 → 새 댓글이 달릴 자리 depth=3
      mocks.comment.findUnique.mockImplementation(async (args: any) => {
        if (args.where.id === 'c1') return { id: 'c1', parentId: 'c0' };
        if (args.where.id === 'c0') return { id: 'c0', parentId: null };
        return null;
      });

      const svc = createCommentService(mocks.prisma, {
        ...baseConfig,
        maxDepth: 2,
      });
      await expect(
        svc.create(
          { postId: 'p1', parentId: 'c1', content: '깊은 답글', guestName: 'x' },
          {},
        ),
      ).rejects.toThrow(/깊이|depth/i);
    });

    // BC-CS-06: 스팸 필터 매칭 → SPAM
    it('spamFilter가 true를 반환하면 SPAM 상태로 저장한다', async () => {
      mocks.comment.create.mockImplementation(async (args: any) => ({
        id: 'c1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const svc = createCommentService(mocks.prisma, {
        ...baseConfig,
        autoApprove: true,
        spamFilter: (content) => content.includes('viagra'),
      });
      const result = await svc.create(
        { postId: 'p1', content: 'buy viagra now', guestName: 'x' },
        {},
      );
      expect(result.status).toBe('SPAM');
    });
  });

  describe('listByPost', () => {
    // BC-CS-10: APPROVED만 반환, 트리 구조
    it('APPROVED 상태만 조회하고 트리 구조로 반환한다', async () => {
      const now = new Date();
      mocks.comment.findMany.mockResolvedValue([
        {
          id: 'r1',
          postId: 'p1',
          parentId: null,
          authorId: null,
          guestName: '게스트1',
          guestEmail: null,
          content: '루트 댓글',
          status: 'APPROVED',
          ipHash: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'rep1',
          postId: 'p1',
          parentId: 'r1',
          authorId: null,
          guestName: '게스트2',
          guestEmail: null,
          content: '답글',
          status: 'APPROVED',
          ipHash: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const svc = createCommentService(mocks.prisma, baseConfig);
      const result = await svc.listByPost('p1');

      expect(mocks.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            postId: 'p1',
            status: 'APPROVED',
          }),
        }),
      );
      expect(result).toHaveLength(1); // 루트 1개
      expect(result[0].id).toBe('r1');
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies?.[0].id).toBe('rep1');
    });
  });

  describe('listAll', () => {
    // BC-CS-20: 상태 필터 + 페이지네이션
    it('status 필터와 페이지네이션을 적용한다', async () => {
      mocks.comment.findMany.mockResolvedValue([
        {
          id: 'c1',
          postId: 'p1',
          parentId: null,
          authorId: null,
          guestName: 'x',
          guestEmail: null,
          content: 'pending',
          status: 'PENDING',
          ipHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mocks.comment.count.mockResolvedValue(1);

      const svc = createCommentService(mocks.prisma, baseConfig);
      const result = await svc.listAll({
        page: 1,
        limit: 20,
        status: 'PENDING',
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mocks.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('updateStatus', () => {
    // BC-CS-30: PENDING → APPROVED
    it('댓글 상태를 APPROVED로 변경한다', async () => {
      mocks.comment.update.mockResolvedValue({
        id: 'c1',
        postId: 'p1',
        parentId: null,
        authorId: null,
        guestName: 'x',
        guestEmail: null,
        content: 'hi',
        status: 'APPROVED',
        ipHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const svc = createCommentService(mocks.prisma, baseConfig);
      const result = await svc.updateStatus('c1', 'APPROVED');
      expect(result.status).toBe('APPROVED');
      expect(mocks.comment.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'APPROVED' },
      });
    });
  });

  describe('bulkUpdateStatus', () => {
    // BC-CS-40: 일괄 승인
    it('여러 댓글의 상태를 일괄 변경하고 count를 반환한다', async () => {
      mocks.comment.updateMany.mockResolvedValue({ count: 3 });

      const svc = createCommentService(mocks.prisma, baseConfig);
      const count = await svc.bulkUpdateStatus(
        ['c1', 'c2', 'c3'],
        'APPROVED',
      );
      expect(count).toBe(3);
      expect(mocks.comment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1', 'c2', 'c3'] } },
        data: { status: 'APPROVED' },
      });
    });

    it('빈 배열이면 0을 반환하고 updateMany를 호출하지 않는다', async () => {
      const svc = createCommentService(mocks.prisma, baseConfig);
      const count = await svc.bulkUpdateStatus([], 'APPROVED');
      expect(count).toBe(0);
      expect(mocks.comment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove / removeMany', () => {
    // BC-CS-50
    it('remove: 단일 댓글을 삭제한다 (cascade는 Prisma가 처리)', async () => {
      mocks.comment.delete.mockResolvedValue({});
      const svc = createCommentService(mocks.prisma, baseConfig);
      await svc.remove('c1');
      expect(mocks.comment.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('removeMany: 여러 댓글을 삭제하고 count를 반환한다', async () => {
      mocks.comment.deleteMany.mockResolvedValue({ count: 2 });
      const svc = createCommentService(mocks.prisma, baseConfig);
      const count = await svc.removeMany(['c1', 'c2']);
      expect(count).toBe(2);
    });
  });

  describe('getPendingCount', () => {
    // BC-CS-60
    it('PENDING 상태 댓글 개수를 반환한다', async () => {
      mocks.comment.count.mockResolvedValue(7);
      const svc = createCommentService(mocks.prisma, baseConfig);
      const count = await svc.getPendingCount();
      expect(count).toBe(7);
      expect(mocks.comment.count).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
    });
  });
});
