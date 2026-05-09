import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlogService } from '@withwiz/blog-core/services';
import {
  CreateBlogPostSchema,
  BulkUpdateSchema,
} from '@withwiz/blog-core/validators';
import type { BlogServiceConfig } from '@withwiz/blog-core/types';

// ── Mock Prisma delegate 팩토리 ──

function createMockDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (args: any) => ({
      ...args.data,
      id: 'new-1',
      attachments: args.data.attachments || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
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
    $transaction: vi.fn(async (fn: any) => fn({ [modelName]: delegate })),
  };
}

const config: BlogServiceConfig = { modelName: 'blogPost' };

describe('통합: 유효성 검사 + 서비스', () => {
  let delegate: ReturnType<typeof createMockDelegate>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    delegate = createMockDelegate();
    prisma = createMockPrisma('blogPost', delegate);
    delegate.findFirst.mockResolvedValue(null);
  });

  it('유효한 CreateBlogPostSchema 데이터로 service.create가 성공한다', async () => {
    const input = {
      title: '테스트 제목',
      content: '<p>본문 내용</p>',
      category: 'NOTICE',
      slug: 'test-title',
      published: false,
      featured: false,
    };

    // 유효성 검사 통과
    const parsed = CreateBlogPostSchema.parse(input);
    expect(parsed.title).toBe('테스트 제목');
    expect(parsed.slug).toBe('test-title');

    // 서비스 호출
    const svc = createBlogService(prisma as any, config);
    const result = await svc.create(parsed, 'author-1');
    expect(delegate.create).toHaveBeenCalled();
    expect(result.slug).toBe('test-title');
  });

  it('유효하지 않은 데이터는 유효성 검사 단계에서 실패한다', () => {
    // 빈 제목
    const invalidInput = {
      title: '',
      content: '<p>본문</p>',
      category: 'NOTICE',
      slug: 'test',
    };

    const result = CreateBlogPostSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleError = result.error.issues.find(i => i.path.includes('title'));
      expect(titleError).toBeDefined();
    }
  });

  it('빈 본문은 유효성 검사에서 실패한다', () => {
    const invalidInput = {
      title: '제목',
      content: '',
      category: 'NOTICE',
      slug: 'test',
    };

    const result = CreateBlogPostSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('잘못된 slug 형식은 유효성 검사에서 실패한다', () => {
    const invalidInput = {
      title: '제목',
      content: '<p>본문</p>',
      category: 'NOTICE',
      slug: 'Invalid Slug With Spaces!',
    };

    const result = CreateBlogPostSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const slugError = result.error.issues.find(i => i.path.includes('slug'));
      expect(slugError).toBeDefined();
    }
  });

  it('카테고리 없음은 유효성 검사에서 실패한다', () => {
    const invalidInput = {
      title: '제목',
      content: '<p>본문</p>',
      category: '',
      slug: 'test',
    };

    const result = CreateBlogPostSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('BulkUpdateSchema → bulkUpdatePublished 흐름이 동작한다', async () => {
    const bulkInput = {
      ids: ['id-1', 'id-2', 'id-3'],
      published: true,
    };

    // 유효성 검사 통과
    const parsed = BulkUpdateSchema.parse(bulkInput);
    expect(parsed.ids).toHaveLength(3);

    // 서비스 호출
    delegate.updateMany.mockResolvedValue({ count: 3 });
    const svc = createBlogService(prisma as any, config);
    const count = await svc.bulkUpdatePublished(parsed.ids, parsed.published!);
    expect(count).toBe(3);
  });

  it('BulkUpdateSchema → bulkUpdateFeatured 흐름이 동작한다', async () => {
    const bulkInput = {
      ids: ['id-1', 'id-2'],
      featured: true,
    };

    const parsed = BulkUpdateSchema.parse(bulkInput);
    expect(parsed.ids).toHaveLength(2);

    delegate.updateMany.mockResolvedValue({ count: 2 });
    const svc = createBlogService(prisma as any, config);
    const count = await svc.bulkUpdateFeatured(parsed.ids, parsed.featured!);
    expect(count).toBe(2);
  });

  it('BulkUpdateSchema에 빈 ids 배열은 실패한다', () => {
    const result = BulkUpdateSchema.safeParse({ ids: [], published: true });
    expect(result.success).toBe(false);
  });

  it('유효성 검사 + create 전체 파이프라인: 첨부파일 포함', async () => {
    const input = {
      title: '첨부파일 테스트',
      content: '<p>본문</p>',
      category: 'NOTICE',
      slug: 'attach-test',
      attachments: [
        { name: 'doc.pdf', url: 'https://example.com/doc.pdf', key: 'k1', size: 1024, type: 'application/pdf' },
      ],
    };

    const parsed = CreateBlogPostSchema.parse(input);
    expect(parsed.attachments).toHaveLength(1);

    const svc = createBlogService(prisma as any, config);
    await svc.create(parsed, 'author-1');
    expect(delegate.create).toHaveBeenCalled();
    const savedData = delegate.create.mock.calls[0][0].data;
    expect(savedData.attachments).toHaveLength(1);
  });
});
