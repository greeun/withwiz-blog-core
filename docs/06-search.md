# 06. 전문 검색 (Full-Text Search)

`createSearchService`는 **PostgreSQL tsvector + GIN 인덱스 + unaccent** 기반의 전문 검색을 제공한다.

> **주의**: 이 서비스는 PostgreSQL 전용이다. MySQL/SQLite 호스트에서는 사용할 수 없으며,
> `BlogService.listPublished({ search })`의 ILIKE 검색으로 대체해야 한다.

## 팩토리

```ts
import { createSearchService, type SearchService } from '@withwiz/blog-core';

const searchService: SearchService = createSearchService(prisma, {
  postModelName: 'news',    // Prisma delegate 이름 (존재 확인용)
  tableName: 'news',        // 실제 DB 테이블명 (raw SQL용)
  lang: 'simple',           // 기본 'simple' (unaccent 사용 시 권장)
});
```

### `SearchServiceConfig`

| 필드 | 설명 |
|---|---|
| `postModelName` | Prisma delegate 이름 — 존재 검증 |
| `tableName` | raw SQL `FROM "..."`에 사용될 실제 테이블명 |
| `lang` | `to_tsvector(lang, ...)`에 사용. 한국어는 `'simple'` + `unaccent` 조합이 실용적 |

> **주의**: `tableName`은 **식별자 주입(SQL injection) 방지**를 위해 서비스 내부에서 정규식 검증
> (`^[A-Za-z_][A-Za-z0-9_]*$`) 후 결합된다. 잘못된 문자가 들어가면 즉시 에러.

## 마이그레이션 SQL

Search가 작동하려면 아래 SQL을 호스트의 Prisma 마이그레이션에 포함시켜야 한다.

```sql
-- 1. unaccent 확장
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. 생성 컬럼 (title + excerpt + content)
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      unaccent(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
    )
  ) STORED;

-- 3. GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_news_search_vector
  ON news USING GIN (search_vector);
```

다양한 테이블명 버전은 `packages/blog-core/prisma/migrations/fulltext-search.sql`,
`fulltext-search-news.sql` 참조.

## API

```ts
interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  category?: string;
  highlight?: boolean;   // 요약 하이라이팅
  lang?: string;         // per-query override
}

interface SearchResult extends BlogListItem {
  rank: number;          // ts_rank 점수
  headline?: string;     // highlight=true일 때 ts_headline 결과
}

searchService.search(options: SearchOptions): Promise<PaginatedResult<SearchResult>>;
searchService.buildQuery(input: string): string;   // 내부 tsquery 변환
```

## `buildQuery` 변환 규칙

사용자 입력을 `to_tsquery`에 안전하게 전달하도록 변환한다.

| 입력 | 변환 결과 |
|---|---|
| `"태그 검색"` | `태그:* & 검색:*` |
| `"hello-world!!!"` | `hello:* & world:*` |
| `""` | `""` (빈 쿼리는 빈 결과) |

규칙 요약:
- 영문/숫자/유니코드 문자만 허용 (`\p{L}\p{N}`)
- 나머지 문자는 공백으로 치환
- 각 토큰에 `:*` prefix match 접미사 추가
- 토큰은 `&`(AND)로 결합

## 사용 예

### 검색 페이지 API

```ts
// app/api/search/route.ts
import { searchService } from '@/lib/services/search';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await searchService.search({
    query: searchParams.get('q') ?? '',
    page: Number(searchParams.get('page') ?? 1),
    limit: 20,
    highlight: true,
  });
  return Response.json(result);
}
```

### 카테고리 필터 + 하이라이팅

```ts
const { items } = await searchService.search({
  query: '봄 정기공연',
  category: 'performance',
  highlight: true,
  page: 1,
  limit: 10,
});

for (const r of items) {
  console.log(r.rank, r.title, r.headline);
  // headline: "봄 <b>정기공연</b>의 일정을 안내드립니다..."
}
```

### 클라이언트 렌더링

```tsx
{items.map((r) => (
  <article key={r.id}>
    <h3>{r.title}</h3>
    <p dangerouslySetInnerHTML={{ __html: r.headline ?? r.excerpt ?? '' }} />
    <small>점수: {r.rank.toFixed(3)}</small>
  </article>
))}
```

> **주의**: `headline`은 `ts_headline`이 반환하는 **`<b>` 태그 포함 HTML**이다.
> 그대로 `dangerouslySetInnerHTML`에 넣되, 다른 필드는 새니타이즈 후 사용하자.

## 검색 품질 팁

1. **언어 설정**: 한국어는 `'simple' + unaccent` 조합이 범용적이다.
   품질을 더 높이려면 pg 확장 `mecab-ko` 등을 고려하되, 운영 비용이 증가한다.

2. **인덱스 재생성**: 대량 데이터 로드 후 `REINDEX INDEX idx_news_search_vector`로 재조정.

3. **search_vector 유지**: `GENERATED ALWAYS AS ... STORED` 컬럼이라 INSERT/UPDATE 시 자동 갱신된다.
   수동 관리 불필요.

4. **카테고리 필터 성능**: 복합 인덱스를 고려한다.
   ```sql
   CREATE INDEX idx_news_category_published ON news (category, published);
   ```

## 자주 겪는 이슈

> **주의**: `search_vector` 컬럼이 없는 테이블에서 `SearchService.search`를 호출하면 raw SQL이 실패한다.
> 마이그레이션 누락 여부를 먼저 확인하자.

> **주의**: `unaccent` 확장은 superuser 권한이 필요하다.
> Supabase는 SQL Editor에서 `CREATE EXTENSION unaccent;`로 활성화할 수 있다.

## 관련 문서

- [02-prisma-schema.md](./02-prisma-schema.md) — FTS 마이그레이션 SQL
- [03-blog-service.md](./03-blog-service.md) — 기본 ILIKE 검색 (비-FTS 폴백)
