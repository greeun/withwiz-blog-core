import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlogService } from '@withwiz/blog-core/services';
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

describe('통합: 서비스 + 슬러그 생성/고유성', () => {
  let delegate: ReturnType<typeof createMockDelegate>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    delegate = createMockDelegate();
    prisma = createMockPrisma('blogPost', delegate);
  });

  it('slug 충돌이 없으면 원본 slug가 그대로 사용된다', async () => {
    // findFirst (slug 존재 확인) → null (충돌 없음)
    delegate.findFirst.mockResolvedValue(null);

    const svc = createBlogService(prisma as any, config);
    await svc.create(
      { slug: 'my-post', category: 'NOTICE', title: 'T', content: '<p>c</p>' },
      'author-1',
    );

    const savedSlug = delegate.create.mock.calls[0][0].data.slug;
    expect(savedSlug).toBe('my-post');
  });

  it('slug 충돌 시 -2 접미사가 자동 추가된다', async () => {
    // 첫 findFirst → 기존 항목 발견 (충돌)
    delegate.findFirst.mockResolvedValueOnce({ id: 'existing' });
    // findMany → 유사 slug 없음
    delegate.findMany.mockResolvedValueOnce([]);

    const svc = createBlogService(prisma as any, config);
    await svc.create(
      { slug: 'my-post', category: 'NOTICE', title: 'T', content: '<p>c</p>' },
      'author-1',
    );

    const savedSlug = delegate.create.mock.calls[0][0].data.slug;
    expect(savedSlug).toBe('my-post-2');
  });

  it('slug 충돌 + 기존 -2가 있으면 -3이 생성된다', async () => {
    // 첫 findFirst → 기존 항목 발견 (충돌)
    delegate.findFirst.mockResolvedValueOnce({ id: 'existing' });
    // findMany → my-post-2 이미 존재
    delegate.findMany.mockResolvedValueOnce([{ slug: 'my-post-2' }]);

    const svc = createBlogService(prisma as any, config);
    await svc.create(
      { slug: 'my-post', category: 'NOTICE', title: 'T', content: '<p>c</p>' },
      'author-1',
    );

    const savedSlug = delegate.create.mock.calls[0][0].data.slug;
    expect(savedSlug).toBe('my-post-3');
  });

  it('명시적 slug가 제공되면 해당 slug를 사용한다 (충돌 없는 경우)', async () => {
    delegate.findFirst.mockResolvedValue(null);

    const svc = createBlogService(prisma as any, config);
    await svc.create(
      { slug: 'custom-slug', category: 'NOTICE', title: 'T', content: '<p>c</p>' },
      'author-1',
    );

    const savedSlug = delegate.create.mock.calls[0][0].data.slug;
    expect(savedSlug).toBe('custom-slug');
  });

  it('checkSlugAvailable + create 흐름을 함께 테스트한다', async () => {
    const svc = createBlogService(prisma as any, config);

    // 1단계: slug 가용성 확인 → 사용 가능
    delegate.findFirst.mockResolvedValueOnce(null);
    const available = await svc.checkSlugAvailable('new-slug');
    expect(available).toBe(true);

    // 2단계: create (slug 충돌 없음)
    delegate.findFirst.mockResolvedValueOnce(null);
    await svc.create(
      { slug: 'new-slug', category: 'NOTICE', title: '새 글', content: '<p>내용</p>' },
      'author-1',
    );

    const savedSlug = delegate.create.mock.calls[0][0].data.slug;
    expect(savedSlug).toBe('new-slug');
  });

  it('checkSlugAvailable이 false이면 create 시 suffix가 추가된다', async () => {
    const svc = createBlogService(prisma as any, config);

    // 1단계: slug 가용성 확인 → 사용 불가
    delegate.findFirst.mockResolvedValueOnce({ id: 'existing' });
    const available = await svc.checkSlugAvailable('taken-slug');
    expect(available).toBe(false);

    // 2단계: create (충돌 발생 → suffix)
    delegate.findFirst.mockResolvedValueOnce({ id: 'existing' });
    delegate.findMany.mockResolvedValueOnce([]);

    await svc.create(
      { slug: 'taken-slug', category: 'NOTICE', title: '중복 제목', content: '<p>내용</p>' },
      'author-1',
    );

    const savedSlug = delegate.create.mock.calls[0][0].data.slug;
    expect(savedSlug).toBe('taken-slug-2');
  });
});
