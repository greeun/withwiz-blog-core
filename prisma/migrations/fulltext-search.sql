-- Full-text search 지원 (PostgreSQL 전용)
-- 이 마이그레이션은 참고용이며, 호스트 프로젝트의 실제 마이그레이션에 포함시켜야 한다.

-- 1. unaccent 확장 (악센트 제거 — 국제화 검색 품질 향상)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. tsvector 생성 컬럼 (선택적 — 검색 성능 최적화)
-- 'simple' 언어 설정을 사용하여 한국어 친화적으로 동작한다.
-- (한국어 전용 stemming이 필요하면 pg_trgm 또는 별도 텍스트 검색 설정 검토)
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      unaccent(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
    )
  ) STORED;

-- 3. GIN 인덱스 (tsvector 검색 가속)
CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector
  ON blog_posts USING GIN (search_vector);

-- 참고:
-- search.service.ts는 인라인 to_tsvector(...)를 사용하여 search_vector 컬럼 없이도 동작한다.
-- search_vector 컬럼이 존재할 경우, 쿼리를 "WHERE search_vector @@ to_tsquery(...)"로
-- 리팩터링하면 인덱스를 활용한 성능 향상이 가능하다.
