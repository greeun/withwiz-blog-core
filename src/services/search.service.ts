/**
 * 블로그 전문 검색(Full-text search) 서비스 팩토리
 *
 * PostgreSQL의 tsvector / to_tsquery / ts_rank를 사용한 FTS 구현.
 * Prisma의 $queryRawUnsafe를 활용하여 매개변수화된 안전한 쿼리를 수행한다.
 *
 * 주의: 이 서비스는 PostgreSQL 전용이며, unaccent 확장과
 * 선택적으로 search_vector 생성 컬럼을 활용할 수 있다.
 */
import type { BlogListItem } from '../types/blog';
import type { PaginatedResult } from '../types/common';
import { buildPaginatedResult } from '../utils/pagination';

// ── Prisma 타입 ──

type PrismaClient = {
  [key: string]: any;
  $queryRawUnsafe: (sql: string, ...values: any[]) => Promise<any[]>;
};

// ── 서비스 설정 ──

export interface SearchServiceConfig {
  /** Prisma 모델명 (예: "blogPost") — 존재 확인용 */
  postModelName: string;
  /** 실제 DB 테이블명 (예: "blog_posts") */
  tableName: string;
  /** FTS 언어 설정 (default: 'simple') */
  lang?: string;
}

// ── 검색 옵션/결과 타입 ──

export interface SearchOptions {
  /** 검색어 (공백 구분) */
  query: string;
  page?: number;
  limit?: number;
  category?: string;
  /** 하이라이팅 요약(ts_headline) 포함 여부 (default: false) */
  highlight?: boolean;
  /** FTS 언어 (default: config.lang 또는 'simple') */
  lang?: string;
}

export interface SearchResult extends BlogListItem {
  /** ts_rank 점수 */
  rank: number;
  /** 하이라이팅된 요약 (highlight=true일 때만) */
  headline?: string;
}

export interface SearchService {
  /** 검색 실행 */
  search(options: SearchOptions): Promise<PaginatedResult<SearchResult>>;
  /** 사용자 입력을 to_tsquery 친화적 문자열로 변환 */
  buildQuery(input: string): string;
}

// ── 내부 유틸 ──

/**
 * 영숫자/한글이 아닌 문자는 제거하고 공백 기준으로 나눈다.
 * 각 토큰 끝에 ':*' 를 붙여 prefix match(접두사 검색)를 활성화하며,
 * ' & ' 로 조인하여 AND 조건을 구성한다.
 *
 * 예: "태그 검색" → "태그:* & 검색:*"
 * 예: "hello-world!!!" → "hello:* & world:*"
 * 예: "" → ""
 */
function buildTsQuery(input: string): string {
  if (typeof input !== 'string') return '';
  // 영문/숫자/한글/CJK 문자만 허용, 나머지는 공백으로 치환
  const sanitized = input
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .trim();
  if (!sanitized) return '';

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  return tokens.map((t) => `${t}:*`).join(' & ');
}

/**
 * 테이블명/식별자 검증: 영숫자와 underscore만 허용.
 * SQL injection 방지를 위해 식별자는 매개변수화할 수 없으므로 형식 검사 후 문자열 결합.
 */
function validateIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return name;
}

// ── 팩토리 ──

/**
 * 검색 서비스 인스턴스를 생성한다.
 *
 * @param prisma - Prisma 클라이언트 인스턴스
 * @param config - 검색 서비스 설정
 */
export function createSearchService(
  prisma: PrismaClient,
  config: SearchServiceConfig,
): SearchService {
  // 모델 존재 검증
  if (!prisma[config.postModelName]) {
    throw new Error(
      `Prisma model "${config.postModelName}" not found. Check SearchServiceConfig.postModelName.`,
    );
  }
  const table = validateIdentifier(config.tableName);
  const defaultLang = config.lang ?? 'simple';

  return {
    buildQuery(input: string): string {
      return buildTsQuery(input);
    },

    async search(options: SearchOptions): Promise<PaginatedResult<SearchResult>> {
      const page = Number.isFinite(options.page) ? Math.max(1, options.page as number) : 1;
      const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit as number) : 12;
      const offset = (page - 1) * limit;

      const tsQuery = buildTsQuery(options.query || '');
      // 빈 검색어는 빈 결과를 반환
      if (!tsQuery) {
        return buildPaginatedResult<SearchResult>([], 0, page, limit);
      }

      const lang = validateIdentifier(options.lang ?? defaultLang);
      const highlight = options.highlight === true;
      const category = options.category;

      // 매개변수화 인덱스: $1=tsQuery, $2=limit, $3=offset, [$4=category]
      const headlineSelect = highlight
        ? `, ts_headline('${lang}', content, to_tsquery('${lang}', unaccent($1)), 'MaxWords=30, MinWords=10') AS headline`
        : '';

      const categoryWhere = category ? ' AND category = $4' : '';
      const params: any[] = [tsQuery, limit, offset];
      if (category) params.push(category);

      // search_vector 생성 컬럼 + GIN 인덱스를 활용한다.
      const listSql = `
        SELECT
          id, slug, category, title, excerpt, cover_image_url AS "coverImageUrl",
          attachments, featured, published, published_at AS "publishedAt",
          created_at AS "createdAt", updated_at AS "updatedAt",
          ts_rank(search_vector, to_tsquery('${lang}', unaccent($1))) AS rank
          ${headlineSelect}
        FROM ${table}
        WHERE search_vector @@ to_tsquery('${lang}', unaccent($1))
          AND published = true
          ${categoryWhere}
        ORDER BY rank DESC, published_at DESC NULLS LAST
        LIMIT $2 OFFSET $3
      `;

      const countParams: any[] = [tsQuery];
      let countSql = `
        SELECT COUNT(*)::int AS count
        FROM ${table}
        WHERE search_vector @@ to_tsquery('${lang}', unaccent($1))
          AND published = true
      `;
      if (category) {
        countSql += ' AND category = $2';
        countParams.push(category);
      }

      const [rows, countRows] = await Promise.all([
        prisma.$queryRawUnsafe(listSql, ...params),
        prisma.$queryRawUnsafe(countSql, ...countParams),
      ]);

      const total = Array.isArray(countRows) && countRows[0]?.count
        ? Number(countRows[0].count)
        : 0;

      const items: SearchResult[] = (rows as any[]).map((row) => {
        const attachments = row.attachments;
        const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
        const { attachments: _a, ...rest } = row;
        void _a;
        return {
          ...rest,
          hasAttachments,
        } as SearchResult;
      });

      return buildPaginatedResult<SearchResult>(items, total, page, limit);
    },
  };
}
