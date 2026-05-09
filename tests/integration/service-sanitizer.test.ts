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
    update: vi.fn().mockImplementation(async (args: any) => ({
      id: '1',
      slug: 'test',
      category: 'NOTICE',
      title: 'T',
      excerpt: null,
      coverImageUrl: null,
      coverImageKey: null,
      attachments: [],
      featured: false,
      published: false,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: 'a1',
      ...args.data,
    })),
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

describe('통합: 서비스 + 새니타이저', () => {
  let delegate: ReturnType<typeof createMockDelegate>;
  let prisma: ReturnType<typeof createMockPrisma>;

  // 내장 sanitizeHtmlContent를 실제로 사용 (sanitizeContent 미지정)
  const config: BlogServiceConfig = { modelName: 'blogPost' };

  beforeEach(() => {
    delegate = createMockDelegate();
    prisma = createMockPrisma('blogPost', delegate);
    // slug 충돌 없음
    delegate.findFirst.mockResolvedValue(null);
  });

  it('create 시 <script> 태그가 제거된 콘텐츠가 저장된다', async () => {
    const svc = createBlogService(prisma as any, config);
    await svc.create(
      {
        slug: 'test',
        category: 'NOTICE',
        title: '테스트',
        content: '<p>안전</p><script>alert("xss")</script>',
      },
      'author-1',
    );

    const savedData = delegate.create.mock.calls[0][0].data;
    expect(savedData.content).not.toContain('<script>');
    expect(savedData.content).toContain('<p>안전</p>');
  });

  it('create 시 안전한 HTML은 보존된다', async () => {
    const safeHtml = '<p>정상 콘텐츠</p><strong>강조</strong><a href="https://example.com">링크</a>';
    const svc = createBlogService(prisma as any, config);
    await svc.create(
      { slug: 'safe', category: 'NOTICE', title: '안전', content: safeHtml },
      'author-1',
    );

    const savedData = delegate.create.mock.calls[0][0].data;
    expect(savedData.content).toContain('<p>정상 콘텐츠</p>');
    expect(savedData.content).toContain('<strong>강조</strong>');
    expect(savedData.content).toContain('<a href="https://example.com">링크</a>');
  });

  it('update 시 위험한 콘텐츠가 새니타이즈된다', async () => {
    // update에서 published 변경 없는 경로
    const svc = createBlogService(prisma as any, config);
    await svc.update('1', {
      content: '<p>본문</p><script>document.cookie</script><img onerror="alert(1)" src="x">',
    });

    const savedData = delegate.update.mock.calls[0][0].data;
    expect(savedData.content).not.toContain('<script>');
    expect(savedData.content).not.toContain('onerror');
    expect(savedData.content).toContain('<p>본문</p>');
  });

  it('create 시 이벤트 핸들러 속성이 제거된다', async () => {
    const svc = createBlogService(prisma as any, config);
    await svc.create(
      {
        slug: 'evt',
        category: 'NOTICE',
        title: '이벤트핸들러',
        content: '<div onclick="alert(1)">클릭</div><img onload="steal()" src="ok.jpg">',
      },
      'author-1',
    );

    const savedData = delegate.create.mock.calls[0][0].data;
    expect(savedData.content).not.toContain('onclick');
    expect(savedData.content).not.toContain('onload');
  });

  it('create 시 위험한 URL 프로토콜이 무력화된다', async () => {
    const svc = createBlogService(prisma as any, config);
    await svc.create(
      {
        slug: 'proto',
        category: 'NOTICE',
        title: '프로토콜',
        content: '<a href="javascript:alert(1)">링크</a>',
      },
      'author-1',
    );

    const savedData = delegate.create.mock.calls[0][0].data;
    expect(savedData.content).not.toContain('javascript:');
  });
});
