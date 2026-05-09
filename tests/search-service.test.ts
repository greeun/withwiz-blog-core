/**
 * 검색 서비스 단위 테스트 — 실제 Postgres 없이 $queryRawUnsafe를 mock으로 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSearchService } from '@withwiz/blog-core/services';
import type { SearchServiceConfig } from '@withwiz/blog-core/services';

function createMockPrisma() {
  const $queryRawUnsafe = vi.fn();
  const $queryRaw = vi.fn();
  const prisma: any = {
    blogPost: { findMany: vi.fn() },
    $queryRawUnsafe,
    $queryRaw,
  };
  return { prisma, $queryRawUnsafe };
}

const baseConfig: SearchServiceConfig = {
  postModelName: 'blogPost',
  tableName: 'blog_posts',
};

describe('createSearchService', () => {
  let mocks: ReturnType<typeof createMockPrisma>;
  beforeEach(() => {
    mocks = createMockPrisma();
  });

  // BC-SS-00
  it('postModelName 이 존재하지 않으면 에러를 던진다', () => {
    const prisma: any = { $queryRawUnsafe: vi.fn() };
    expect(() => createSearchService(prisma, baseConfig)).toThrow(/Prisma model "blogPost"/);
  });

  // BC-SS-00b
  it('tableName 이 식별자 형식이 아니면 에러를 던진다', () => {
    expect(() =>
      createSearchService(mocks.prisma, { postModelName: 'blogPost', tableName: 'blog posts' }),
    ).toThrow(/Invalid SQL identifier/);
  });

  describe('buildQuery', () => {
    // BC-SS-01
    it('공백 구분 토큰을 prefix match(":*") + AND("&")로 변환한다', () => {
      const svc = createSearchService(mocks.prisma, baseConfig);
      expect(svc.buildQuery('태그 검색')).toBe('태그:* & 검색:*');
      expect(svc.buildQuery('hello world')).toBe('hello:* & world:*');
    });

    // BC-SS-02
    it('특수 문자는 제거하고 빈 문자열은 빈 결과를 반환한다', () => {
      const svc = createSearchService(mocks.prisma, baseConfig);
      expect(svc.buildQuery('hello-world!!!')).toBe('hello:* & world:*');
      expect(svc.buildQuery('   ')).toBe('');
      expect(svc.buildQuery('')).toBe('');
      expect(svc.buildQuery('!@#$%')).toBe('');
    });
  });

  describe('search', () => {
    // BC-SS-03
    it('search: $queryRawUnsafe를 tsQuery/limit/offset 매개변수와 함께 호출한다', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([]) // list
        .mockResolvedValueOnce([{ count: 0 }]); // count
      const svc = createSearchService(mocks.prisma, baseConfig);
      await svc.search({ query: '검색어', page: 2, limit: 10 });

      expect(mocks.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      const firstCall = mocks.$queryRawUnsafe.mock.calls[0];
      const sql = firstCall[0] as string;
      const params = firstCall.slice(1);
      expect(sql).toContain('FROM blog_posts');
      expect(sql).toContain('LIMIT $2 OFFSET $3');
      expect(params[0]).toBe('검색어:*');
      expect(params[1]).toBe(10);
      expect(params[2]).toBe(10); // offset = (2-1) * 10
    });

    // BC-SS-04
    it('빈 검색어 입력 시 DB 호출 없이 빈 결과를 반환한다', async () => {
      const svc = createSearchService(mocks.prisma, baseConfig);
      const result = await svc.search({ query: '   ', page: 1, limit: 12 });
      expect(mocks.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    // BC-SS-05
    it('pagination: OFFSET은 (page-1) * limit 로 계산된다', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);
      const svc = createSearchService(mocks.prisma, baseConfig);
      await svc.search({ query: 'x', page: 5, limit: 20 });
      const params = mocks.$queryRawUnsafe.mock.calls[0].slice(1);
      expect(params[1]).toBe(20);
      expect(params[2]).toBe(80);
    });

    // BC-SS-06
    it('category 필터가 있으면 WHERE 절과 $4 파라미터가 추가된다', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);
      const svc = createSearchService(mocks.prisma, baseConfig);
      await svc.search({ query: 'x', category: 'NEWS' });
      const listCall = mocks.$queryRawUnsafe.mock.calls[0];
      expect(listCall[0]).toContain('AND category = $4');
      expect(listCall[4]).toBe('NEWS');

      // count 쿼리는 $2로 category 바인딩
      const countCall = mocks.$queryRawUnsafe.mock.calls[1];
      expect(countCall[0]).toContain('AND category = $2');
      expect(countCall[2]).toBe('NEWS');
    });

    // BC-SS-07
    it('highlight=true 이면 SELECT에 ts_headline이 포함된다', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);
      const svc = createSearchService(mocks.prisma, baseConfig);
      await svc.search({ query: 'x', highlight: true });
      const sql = mocks.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('ts_headline');
      expect(sql).toContain('AS headline');
    });

    // BC-SS-07b
    it('highlight 미지정 시 ts_headline은 포함되지 않는다', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);
      const svc = createSearchService(mocks.prisma, baseConfig);
      await svc.search({ query: 'x' });
      const sql = mocks.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).not.toContain('ts_headline');
    });

    // BC-SS-08
    it('결과 row에 rank 필드가 그대로 유지되며 hasAttachments가 계산된다', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            id: 'p1',
            slug: 's1',
            category: 'NEWS',
            title: 'Hello',
            excerpt: null,
            coverImageUrl: null,
            attachments: [{ name: 'a.pdf', url: '', key: '', size: 1, type: 'application/pdf' }],
            featured: false,
            published: true,
            publishedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            rank: 0.5,
          },
        ])
        .mockResolvedValueOnce([{ count: 1 }]);
      const svc = createSearchService(mocks.prisma, baseConfig);
      const result = await svc.search({ query: 'hello' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].rank).toBe(0.5);
      expect(result.items[0].hasAttachments).toBe(true);
      expect(result.pagination.total).toBe(1);
    });

    // BC-SS-08b: GIN 인덱스를 활용하도록 search_vector 컬럼을 직접 사용한다
    it('SQL이 search_vector 컬럼을 WHERE 조건으로 사용한다 (GIN 인덱스 활용)', async () => {
      mocks.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);
      const svc = createSearchService(mocks.prisma, baseConfig);
      await svc.search({ query: 'hello', page: 1, limit: 10 });
      const listSql = mocks.$queryRawUnsafe.mock.calls[0][0] as string;
      const countSql = mocks.$queryRawUnsafe.mock.calls[1][0] as string;

      // 인라인 to_tsvector(...) 대신 search_vector 컬럼을 사용해야 함
      expect(listSql).toContain('search_vector @@ to_tsquery');
      expect(countSql).toContain('search_vector @@ to_tsquery');

      // 생성 컬럼이 unaccent로 정의되었으므로 쿼리 측에도 unaccent 적용
      expect(listSql).toContain('unaccent($1)');
      expect(countSql).toContain('unaccent($1)');

      // 인라인 to_tsvector(..., unaccent(coalesce(title ...))) 패턴이 제거되어야 함
      expect(listSql).not.toMatch(/to_tsvector\([^)]*coalesce\(title/);
    });

    // BC-SS-09
    it('lang 옵션은 식별자 형식만 허용한다', async () => {
      const svc = createSearchService(mocks.prisma, baseConfig);
      await expect(svc.search({ query: 'x', lang: "english'; DROP" })).rejects.toThrow(
        /Invalid SQL identifier/,
      );
    });
  });
});
